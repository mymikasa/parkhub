package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/parkhub/api/internal/config"
	appdb "github.com/parkhub/api/internal/pkg/db"
	"github.com/parkhub/api/internal/pkg/logger"
	appmqtt "github.com/parkhub/api/internal/pkg/mqtt"
	appredis "github.com/parkhub/api/internal/pkg/redis"
	repoimpl "github.com/parkhub/api/internal/repository/impl"
	"github.com/parkhub/api/internal/seed"
	svcimpl "github.com/parkhub/api/internal/service/impl"
	appwire "github.com/parkhub/api/internal/wire"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	logFormat := "json"
	if cfg.AppEnv == "development" {
		logFormat = "text"
	}
	logger.Init(cfg.LogLevel, logFormat)

	slog.Info("starting parkhub-api", "env", cfg.AppEnv, "port", cfg.AppPort)

	gormDB, cleanup, err := appdb.New(cfg)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer cleanup()

	migrationsDir := "./migrations"
	if err := appdb.RunMigrations(gormDB, migrationsDir); err != nil {
		slog.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}

	if err := seed.SeedData(gormDB); err != nil {
		slog.Error("failed to seed data", "error", err)
		os.Exit(1)
	}

	r, err := appwire.InitializeApp(cfg, gormDB)
	if err != nil {
		slog.Error("failed to initialize app", "error", err)
		os.Exit(1)
	}
	r.Setup()

	// Initialize Redis
	redisClient, redisCleanup, err := appredis.New(cfg.RedisURL)
	if err != nil {
		slog.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}
	defer redisCleanup()

	// Create heartbeat service (before MQTT connect so we can pass Subscribe as OnConnect callback)
	deviceRepo := repoimpl.NewDeviceRepo(gormDB)
	heartbeatSvc := svcimpl.NewHeartbeatService(nil, redisClient, deviceRepo, cfg.HeartbeatTimeoutSeconds)

	// Initialize MQTT with re-subscribe on reconnect
	mqttClient, mqttCleanup, err := appmqtt.New(appmqtt.Config{
		BrokerURL: cfg.MQTTBrokerURL,
		Username:  cfg.MQTTUsername,
		Password:  cfg.MQTTPassword,
		ClientID:  "parkhub-api-" + cfg.AppPort,
		OnConnect: heartbeatSvc.Subscribe,
	})
	if err != nil {
		slog.Error("failed to connect to mqtt broker", "error", err)
		os.Exit(1)
	}
	defer mqttCleanup()

	// Start heartbeat service with the connected MQTT client
	heartbeatSvc.SetMQTTClient(mqttClient)
	heartbeatSvc.Start()

	srv := &http.Server{
		Addr:    ":" + cfg.AppPort,
		Handler: r.GetEngine(),
	}

	// Start server in background
	go func() {
		slog.Info("http server listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown on SIGINT/SIGTERM
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	<-ctx.Done()
	slog.Info("shutdown signal received")

	heartbeatSvc.Stop()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server shutdown error", "error", err)
	}
	slog.Info("server stopped")
}
