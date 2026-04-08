package otelx

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"time"

	"go.opentelemetry.io/contrib/bridges/otelslog"
	logglobal "go.opentelemetry.io/otel/log/global"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
	otlpmetricgrpc "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.37.0"
)

const (
	logBridgeName  = "parkhub"
	metricInterval = 15 * time.Second
)

type Providers struct {
	TracerProvider *sdktrace.TracerProvider
	MeterProvider  *metric.MeterProvider
	LoggerProvider *sdklog.LoggerProvider
}

type initOptions struct {
	traceExporter sdktrace.SpanExporter
	metricReader  metric.Reader
	logExporter   sdklog.Exporter
	hostname      string
}

func Init(ctx context.Context, cfg Config) (*Providers, error) {
	return initWithOptions(ctx, cfg, initOptions{})
}

func (p *Providers) Shutdown(ctx context.Context) error {
	if p == nil {
		return nil
	}

	var err error
	if p.LoggerProvider != nil {
		err = errors.Join(err, p.LoggerProvider.Shutdown(ctx))
	}
	if p.MeterProvider != nil {
		err = errors.Join(err, p.MeterProvider.Shutdown(ctx))
	}
	if p.TracerProvider != nil {
		err = errors.Join(err, p.TracerProvider.Shutdown(ctx))
	}
	return err
}

func initWithOptions(ctx context.Context, cfg Config, opts initOptions) (*Providers, error) {
	cfg = cfg.withDefaults()
	if err := cfg.validate(); err != nil {
		return nil, err
	}

	res, err := newResource(cfg, opts.hostname)
	if err != nil {
		return nil, err
	}

	tracerProvider, err := newTracerProvider(ctx, cfg, res, opts)
	if err != nil {
		return nil, err
	}

	meterProvider, err := newMeterProvider(ctx, cfg, res, opts)
	if err != nil {
		_ = tracerProvider.Shutdown(ctx)
		return nil, err
	}

	loggerProvider, err := newLoggerProvider(ctx, cfg, res, opts)
	if err != nil {
		_ = meterProvider.Shutdown(ctx)
		_ = tracerProvider.Shutdown(ctx)
		return nil, err
	}

	otel.SetTracerProvider(tracerProvider)
	otel.SetMeterProvider(meterProvider)
	otel.SetTextMapPropagator(
		propagation.NewCompositeTextMapPropagator(
			propagation.TraceContext{},
			propagation.Baggage{},
		),
	)
	logglobal.SetLoggerProvider(loggerProvider)
	slog.SetDefault(otelslog.NewLogger(
		logBridgeName,
		otelslog.WithLoggerProvider(loggerProvider),
		otelslog.WithVersion(cfg.ServiceVersion),
	))

	return &Providers{
		TracerProvider: tracerProvider,
		MeterProvider:  meterProvider,
		LoggerProvider: loggerProvider,
	}, nil
}

func newResource(cfg Config, hostname string) (*resource.Resource, error) {
	if hostname == "" {
		currentHostname, err := os.Hostname()
		if err != nil {
			return nil, fmt.Errorf("resolve hostname: %w", err)
		}
		hostname = currentHostname
	}

	attrs := []attribute.KeyValue{
		semconv.ServiceName(cfg.ServiceName),
		semconv.ServiceVersion(cfg.ServiceVersion),
		semconv.DeploymentEnvironmentName(deploymentEnvironment()),
	}
	if hostname != "" {
		attrs = append(attrs, semconv.HostName(hostname))
	}

	return resource.NewWithAttributes(semconv.SchemaURL, attrs...), nil
}

func newTracerProvider(ctx context.Context, cfg Config, res *resource.Resource, opts initOptions) (*sdktrace.TracerProvider, error) {
	spanExporter := opts.traceExporter
	if spanExporter == nil {
		exporter, err := otlptracegrpc.New(ctx, traceExporterOptions(cfg)...)
		if err != nil {
			return nil, fmt.Errorf("init trace exporter: %w", err)
		}
		spanExporter = exporter
	}

	options := []sdktrace.TracerProviderOption{
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.TraceIDRatioBased(cfg.TraceSampleRate)),
	}
	if opts.traceExporter != nil {
		options = append(options, sdktrace.WithSyncer(spanExporter))
	} else {
		options = append(options, sdktrace.WithBatcher(spanExporter))
	}

	return sdktrace.NewTracerProvider(options...), nil
}

func newMeterProvider(ctx context.Context, cfg Config, res *resource.Resource, opts initOptions) (*metric.MeterProvider, error) {
	reader := opts.metricReader
	if reader == nil {
		exporter, err := otlpmetricgrpc.New(ctx, metricExporterOptions(cfg)...)
		if err != nil {
			return nil, fmt.Errorf("init metric exporter: %w", err)
		}
		reader = metric.NewPeriodicReader(exporter, metric.WithInterval(metricInterval))
	}

	return metric.NewMeterProvider(
		metric.WithReader(reader),
		metric.WithResource(res),
	), nil
}

func newLoggerProvider(ctx context.Context, cfg Config, res *resource.Resource, opts initOptions) (*sdklog.LoggerProvider, error) {
	logExporter := opts.logExporter
	if logExporter == nil {
		exporter, err := otlploggrpc.New(ctx, logExporterOptions(cfg)...)
		if err != nil {
			return nil, fmt.Errorf("init log exporter: %w", err)
		}
		logExporter = exporter
	}

	var processor sdklog.Processor
	if opts.logExporter != nil {
		processor = sdklog.NewSimpleProcessor(logExporter)
	} else {
		processor = sdklog.NewBatchProcessor(logExporter)
	}

	return sdklog.NewLoggerProvider(
		sdklog.WithProcessor(processor),
		sdklog.WithResource(res),
	), nil
}

func traceExporterOptions(cfg Config) []otlptracegrpc.Option {
	options := []otlptracegrpc.Option{
		otlptracegrpc.WithEndpoint(cfg.OTLPEndpoint),
	}
	if cfg.Insecure {
		options = append(options, otlptracegrpc.WithInsecure())
	}
	return options
}

func metricExporterOptions(cfg Config) []otlpmetricgrpc.Option {
	options := []otlpmetricgrpc.Option{
		otlpmetricgrpc.WithEndpoint(cfg.OTLPEndpoint),
	}
	if cfg.Insecure {
		options = append(options, otlpmetricgrpc.WithInsecure())
	}
	return options
}

func logExporterOptions(cfg Config) []otlploggrpc.Option {
	options := []otlploggrpc.Option{
		otlploggrpc.WithEndpoint(cfg.OTLPEndpoint),
	}
	if cfg.Insecure {
		options = append(options, otlploggrpc.WithInsecure())
	}
	return options
}
