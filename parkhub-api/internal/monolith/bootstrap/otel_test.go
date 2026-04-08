package bootstrap

import (
	"testing"

	"github.com/parkhub/api/internal/monolith/config"
)

func TestLoadOTelConfigFromEnv(t *testing.T) {
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "collector.internal:4317")
	t.Setenv("OTEL_EXPORTER_OTLP_INSECURE", "false")
	t.Setenv("OTEL_TRACES_SAMPLER_ARG", "0.25")
	t.Setenv("SERVICE_VERSION", "1.2.3")

	cfg, err := loadOTelConfig(&config.MonolithConfig{})
	if err != nil {
		t.Fatalf("loadOTelConfig() error = %v", err)
	}

	if cfg.ServiceName != "parkhub-monolith" {
		t.Fatalf("ServiceName = %q, want %q", cfg.ServiceName, "parkhub-monolith")
	}
	if cfg.ServiceVersion != "1.2.3" {
		t.Fatalf("ServiceVersion = %q, want %q", cfg.ServiceVersion, "1.2.3")
	}
	if cfg.OTLPEndpoint != "collector.internal:4317" {
		t.Fatalf("OTLPEndpoint = %q, want %q", cfg.OTLPEndpoint, "collector.internal:4317")
	}
	if cfg.Insecure {
		t.Fatal("Insecure = true, want false")
	}
	if cfg.TraceSampleRate != 0.25 {
		t.Fatalf("TraceSampleRate = %v, want %v", cfg.TraceSampleRate, 0.25)
	}
}

func TestLoadOTelConfigPrefersMonolithEndpoint(t *testing.T) {
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "collector.internal:4317")

	cfg, err := loadOTelConfig(&config.MonolithConfig{
		OTELEndpoint: "otel-gateway.internal:4317",
	})
	if err != nil {
		t.Fatalf("loadOTelConfig() error = %v", err)
	}

	if cfg.OTLPEndpoint != "otel-gateway.internal:4317" {
		t.Fatalf("OTLPEndpoint = %q, want %q", cfg.OTLPEndpoint, "otel-gateway.internal:4317")
	}
}
