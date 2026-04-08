package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/parkhub/api/internal/monolith/bootstrap"
	"github.com/parkhub/api/internal/monolith/config"
	"github.com/parkhub/api/internal/monolith/health"
	"github.com/parkhub/api/internal/pkg/logger"
)

const shutdownTimeout = 15 * time.Second

func main() {
	// ── 1. Configuration ────────────────────────────────────────────────────
	cfgFile := flag.String("config", ".env.monolith", "path to .env config file (set to \"\" to use env vars only)")
	flag.Parse()

	if *cfgFile != "" {
		if err := config.LoadFile(*cfgFile); err != nil {
			slog.Warn("config file not loaded", "path", *cfgFile, "error", err)
		} else {
			slog.Info("config loaded from file", "path", *cfgFile)
		}
	}

	cfg, err := config.Load()
	if err != nil {
		slog.Error("config error", "error", err)
		os.Exit(1)
	}

	// ── 2. Logger ────────────────────────────────────────────────────────────
	logFormat := "json"
	if cfg.AppEnv == "development" {
		logFormat = "text"
	}
	logger.Init(cfg.LogLevel, logFormat)

	slog.Info("monolith starting",
		"env", cfg.AppEnv,
		"port", cfg.AppPort,
		"otel_endpoint", cfg.OTELEndpoint,
	)

	// ── 3. OpenTelemetry ─────────────────────────────────────────────────────
	otelCtx := context.Background()
	otelShutdown, err := bootstrap.InitOTel(otelCtx, cfg)
	if err != nil {
		slog.Error("otel init failed", "error", err)
		os.Exit(1)
	}

	// ── 4. Databases (5 pools, with Ping) ────────────────────────────────────
	dbs, dbCleanup, err := bootstrap.InitDatabases(cfg)
	if err != nil {
		slog.Error("db init failed", "error", err)
		os.Exit(1)
	}

	// ── 5. In-process gRPC server ────────────────────────────────────────────
	grpcSrv, bufLis := bootstrap.InitGRPCServer()
	go func() {
		if serveErr := grpcSrv.Serve(bufLis); serveErr != nil {
			slog.Error("grpc serve error", "error", serveErr)
		}
	}()
	slog.Info("in-process gRPC server started")

	// ── 6. HTTP mux + healthz ────────────────────────────────────────────────
	// /healthz is registered directly on the raw ServeMux — NOT wrapped by
	// any OTel HTTP middleware — to avoid generating trace spans from probes.
	mux := http.NewServeMux()
	mux.Handle("/healthz", health.NewHandler(dbs))

	httpSrv := &http.Server{
		Addr:    fmt.Sprintf(":%s", cfg.AppPort),
		Handler: mux,
	}

	// ── 7. Start HTTP server ─────────────────────────────────────────────────
	go func() {
		slog.Info("monolith started", "addr", httpSrv.Addr)
		if serveErr := httpSrv.ListenAndServe(); serveErr != nil && serveErr != http.ErrServerClosed {
			slog.Error("http serve error", "error", serveErr)
			os.Exit(1)
		}
	}()

	// ── Signal handling + graceful shutdown ───────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutdown signal received, stopping…")

	shutCtx, shutCancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer shutCancel()

	// Shutdown order: HTTP → gRPC → DB → OTel
	if err := httpSrv.Shutdown(shutCtx); err != nil {
		slog.Error("http shutdown error", "error", err)
	}

	grpcSrv.GracefulStop()

	dbCleanup()

	if err := otelShutdown(shutCtx); err != nil {
		slog.Error("otel shutdown error", "error", err)
	}

	select {
	case <-shutCtx.Done():
		slog.Error("shutdown deadline exceeded, forcing exit")
		os.Exit(1)
	default:
		slog.Info("monolith stopped cleanly")
	}
}
