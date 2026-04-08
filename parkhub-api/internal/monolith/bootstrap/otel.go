package bootstrap

import (
	"context"
	"fmt"
	"os"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/runtime"

	"github.com/parkhub/api/internal/monolith/config"
	"github.com/parkhub/api/internal/pkg/otelx"
)

// InitOTel initialises OpenTelemetry via the otelx package:
//   - TracerProvider + MeterProvider + LoggerProvider (OTLP gRPC)
//   - slog default logger bridged to OTel LoggerProvider
//   - Go runtime metrics (goroutine, GC, heap) collected every 10s
//
// If cfg.OTELEndpoint is empty the SDK falls back to "localhost:4317" and
// exports silently drop when no collector is reachable (non-fatal).
//
// Returns a shutdown function that MUST be called (with a timeout context)
// before process exit to flush all pending telemetry.
func InitOTel(ctx context.Context, cfg *config.MonolithConfig) (func(context.Context) error, error) {
	otelCfg, err := loadOTelConfig(cfg)
	if err != nil {
		return nil, fmt.Errorf("load otel config: %w", err)
	}

	providers, err := otelx.Init(ctx, otelCfg)
	if err != nil {
		return nil, fmt.Errorf("otelx init: %w", err)
	}

	// Collect Go runtime metrics (goroutine count, GC pause, heap usage…).
	if err := runtime.Start(runtime.WithMinimumReadMemStatsInterval(10 * time.Second)); err != nil {
		_ = providers.Shutdown(ctx)
		return nil, fmt.Errorf("otel runtime metrics: %w", err)
	}

	return providers.Shutdown, nil
}

func loadOTelConfig(cfg *config.MonolithConfig) (otelx.Config, error) {
	otelCfg, err := otelx.LoadConfigFromEnv()
	if err != nil {
		return otelx.Config{}, err
	}

	otelCfg.ServiceName = "parkhub-monolith"
	otelCfg.ServiceVersion = serviceVersion()
	if cfg != nil && cfg.OTELEndpoint != "" {
		otelCfg.OTLPEndpoint = cfg.OTELEndpoint
	}

	return otelCfg, nil
}

// serviceVersion returns the service version from SERVICE_VERSION env var,
// falling back to "dev" when unset.
func serviceVersion() string {
	if v := os.Getenv("SERVICE_VERSION"); v != "" {
		return v
	}
	return "dev"
}
