package bootstrap

import (
	"context"
	"fmt"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/runtime"
	"go.opentelemetry.io/otel"
	otlpmetricgrpc "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	stdoutmetric "go.opentelemetry.io/otel/exporters/stdout/stdoutmetric"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"

	"github.com/parkhub/api/internal/monolith/config"
)

// InitOTel initialises the OpenTelemetry SDK (TracerProvider + MeterProvider).
//
// Exporter selection:
//   - cfg.OTELEndpoint non-empty → OTLP gRPC exporter
//   - cfg.OTELEndpoint empty      → stdout exporter (development / CI)
//
// Returns a shutdown function that flushes pending telemetry; callers MUST
// invoke it (with a timeout context) before process exit.
func InitOTel(ctx context.Context, cfg *config.MonolithConfig) (func(context.Context) error, error) {
	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName("parkhub-monolith"),
			semconv.ServiceVersion("0.0.1"),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("otel resource: %w", err)
	}

	// --- Tracer exporter ---
	var traceExporter sdktrace.SpanExporter
	if cfg.OTELEndpoint != "" {
		traceExporter, err = otlptracegrpc.New(ctx,
			otlptracegrpc.WithEndpoint(cfg.OTELEndpoint),
			otlptracegrpc.WithInsecure(),
		)
	} else {
		traceExporter, err = stdouttrace.New(stdouttrace.WithPrettyPrint())
	}
	if err != nil {
		return nil, fmt.Errorf("otel trace exporter: %w", err)
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(traceExporter),
		sdktrace.WithResource(res),
	)
	otel.SetTracerProvider(tp)

	// W3C TraceContext propagator so trace IDs flow across gRPC metadata.
	otel.SetTextMapPropagator(propagation.TraceContext{})

	// --- Metric exporter + provider ---
	var metricReader metric.Reader
	if cfg.OTELEndpoint != "" {
		metricExp, metErr := otlpmetricgrpc.New(ctx,
			otlpmetricgrpc.WithEndpoint(cfg.OTELEndpoint),
			otlpmetricgrpc.WithInsecure(),
		)
		if metErr != nil {
			return nil, fmt.Errorf("otel metric exporter: %w", metErr)
		}
		metricReader = metric.NewPeriodicReader(metricExp, metric.WithInterval(30*time.Second))
	} else {
		metricExp, metErr := stdoutmetric.New()
		if metErr != nil {
			return nil, fmt.Errorf("otel stdout metric exporter: %w", metErr)
		}
		metricReader = metric.NewPeriodicReader(metricExp, metric.WithInterval(30*time.Second))
	}

	mp := metric.NewMeterProvider(
		metric.WithReader(metricReader),
		metric.WithResource(res),
	)
	otel.SetMeterProvider(mp)

	// Collect Go runtime metrics every 10s.
	if err := runtime.Start(runtime.WithMinimumReadMemStatsInterval(10 * time.Second)); err != nil {
		return nil, fmt.Errorf("otel runtime metrics: %w", err)
	}

	shutdown := func(ctx context.Context) error {
		if err := mp.Shutdown(ctx); err != nil {
			return err
		}
		return tp.Shutdown(ctx)
	}
	return shutdown, nil
}
