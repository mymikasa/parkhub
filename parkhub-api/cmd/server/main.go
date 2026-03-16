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
	"github.com/parkhub/api/internal/seed"
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

	db, cleanup, err := appdb.New(cfg)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer cleanup()

	migrationsDir := "./migrations"
	if err := appdb.RunMigrations(db, migrationsDir); err != nil {
		slog.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}

	if err := seed.SeedData(db); err != nil {
		slog.Error("failed to seed data", "error", err)
		os.Exit(1)
	}

	r, err := appwire.InitializeApp(cfg, db)
	if err != nil {
		slog.Error("failed to initialize app", "error", err)
		os.Exit(1)
	}
	r.Setup()

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

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server shutdown error", "error", err)
	}
	slog.Info("server stopped")
}
