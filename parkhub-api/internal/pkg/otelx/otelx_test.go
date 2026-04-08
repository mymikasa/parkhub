package otelx

import (
	"context"
	"io"
	"log/slog"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"

	"go.opentelemetry.io/otel"
	logglobal "go.opentelemetry.io/otel/log/global"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/metric/metricdata"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
)

func TestLoadConfigFromEnvDefaults(t *testing.T) {
	t.Setenv("OTEL_SERVICE_NAME", "")
	t.Setenv("OTEL_SERVICE_VERSION", "")
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
	t.Setenv("OTEL_EXPORTER_OTLP_INSECURE", "")
	t.Setenv("OTEL_TRACES_SAMPLER_ARG", "")

	cfg, err := LoadConfigFromEnv()
	if err != nil {
		t.Fatalf("LoadConfigFromEnv() error = %v", err)
	}

	if cfg.ServiceName != defaultServiceName {
		t.Fatalf("ServiceName = %q, want %q", cfg.ServiceName, defaultServiceName)
	}
	if cfg.ServiceVersion != defaultServiceVersion {
		t.Fatalf("ServiceVersion = %q, want %q", cfg.ServiceVersion, defaultServiceVersion)
	}
	if cfg.OTLPEndpoint != defaultOTLPEndpoint {
		t.Fatalf("OTLPEndpoint = %q, want %q", cfg.OTLPEndpoint, defaultOTLPEndpoint)
	}
	if cfg.Insecure != defaultInsecure {
		t.Fatalf("Insecure = %v, want %v", cfg.Insecure, defaultInsecure)
	}
	if cfg.TraceSampleRate != defaultTraceSampleRate {
		t.Fatalf("TraceSampleRate = %v, want %v", cfg.TraceSampleRate, defaultTraceSampleRate)
	}
}

func TestLoadConfigFromEnvRejectsInvalidSampleRate(t *testing.T) {
	t.Setenv("OTEL_TRACES_SAMPLER_ARG", "1.5")

	_, err := LoadConfigFromEnv()
	if err == nil {
		t.Fatal("LoadConfigFromEnv() error = nil, want non-nil")
	}
}

func TestInitReplacesGlobalsAndExportsTelemetry(t *testing.T) {
	previousTracerProvider := otel.GetTracerProvider()
	previousMeterProvider := otel.GetMeterProvider()
	previousPropagator := otel.GetTextMapPropagator()
	previousLoggerProvider := logglobal.GetLoggerProvider()
	previousDefaultLogger := slog.Default()
	defer func() {
		otel.SetTracerProvider(previousTracerProvider)
		otel.SetMeterProvider(previousMeterProvider)
		otel.SetTextMapPropagator(previousPropagator)
		logglobal.SetLoggerProvider(previousLoggerProvider)
		slog.SetDefault(previousDefaultLogger)
	}()

	slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))

	traceExporter := tracetest.NewInMemoryExporter()
	metricReader := metric.NewManualReader()
	logExporter := newMemoryLogExporter()

	providers, err := initWithOptions(context.Background(), Config{
		ServiceName:     "otelx-test",
		ServiceVersion:  "test-version",
		TraceSampleRate: 1,
	}, initOptions{
		traceExporter: traceExporter,
		metricReader:  metricReader,
		logExporter:   logExporter,
		hostname:      "test-host",
	})
	if err != nil {
		t.Fatalf("initWithOptions() error = %v", err)
	}

	tracer := otel.Tracer("otelx-test")
	ctx, span := tracer.Start(context.Background(), "test-span")

	meter := otel.GetMeterProvider().Meter("otelx-test")
	counter, err := meter.Int64Counter("requests_total")
	if err != nil {
		t.Fatalf("Int64Counter() error = %v", err)
	}
	counter.Add(ctx, 1)

	slog.InfoContext(ctx, "hello otelx", "request_id", "req-1")
	spanContext := span.SpanContext()
	span.End()

	if err := providers.TracerProvider.ForceFlush(context.Background()); err != nil {
		t.Fatalf("TracerProvider.ForceFlush() error = %v", err)
	}
	if err := providers.LoggerProvider.ForceFlush(context.Background()); err != nil {
		t.Fatalf("LoggerProvider.ForceFlush() error = %v", err)
	}

	traceSpans := traceExporter.GetSpans()
	if len(traceSpans) == 0 {
		t.Fatal("trace exporter got no spans")
	}

	var metricPayload metricdata.ResourceMetrics
	if err := metricReader.Collect(context.Background(), &metricPayload); err != nil {
		t.Fatalf("metricReader.Collect() error = %v", err)
	}
	if !hasMetric(metricPayload, "requests_total") {
		t.Fatal("metric payload missing requests_total")
	}

	logRecords := logExporter.Records()
	if len(logRecords) == 0 {
		t.Fatal("log exporter got no records")
	}

	record := logRecords[len(logRecords)-1]
	if record.Body().AsString() != "hello otelx" {
		t.Fatalf("log body = %q, want %q", record.Body().AsString(), "hello otelx")
	}
	if record.TraceID() != spanContext.TraceID() {
		t.Fatalf("log trace_id = %s, want %s", record.TraceID(), spanContext.TraceID())
	}
	if record.SpanID() != spanContext.SpanID() {
		t.Fatalf("log span_id = %s, want %s", record.SpanID(), spanContext.SpanID())
	}

	handlerType := reflect.TypeOf(slog.Default().Handler()).String()
	if !strings.Contains(handlerType, "otelslog.Handler") {
		t.Fatalf("default slog handler = %q, want otelslog.Handler", handlerType)
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := providers.Shutdown(shutdownCtx); err != nil {
		t.Fatalf("Shutdown() error = %v", err)
	}
}

func hasMetric(payload metricdata.ResourceMetrics, name string) bool {
	for _, scopeMetric := range payload.ScopeMetrics {
		for _, metric := range scopeMetric.Metrics {
			if metric.Name == name {
				return true
			}
		}
	}
	return false
}

type memoryLogExporter struct {
	mu      sync.Mutex
	records []sdklog.Record
}

func newMemoryLogExporter() *memoryLogExporter {
	return &memoryLogExporter{}
}

func (e *memoryLogExporter) Export(_ context.Context, records []sdklog.Record) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	for _, record := range records {
		e.records = append(e.records, record.Clone())
	}
	return nil
}

func (e *memoryLogExporter) Shutdown(context.Context) error {
	return nil
}

func (e *memoryLogExporter) ForceFlush(context.Context) error {
	return nil
}

func (e *memoryLogExporter) Records() []sdklog.Record {
	e.mu.Lock()
	defer e.mu.Unlock()

	records := make([]sdklog.Record, len(e.records))
	copy(records, e.records)
	return records
}
