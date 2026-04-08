package otelx

import (
	"fmt"
	"os"
	"strconv"
)

const (
	defaultServiceName     = "parkhub-monolith"
	defaultServiceVersion  = "dev"
	defaultOTLPEndpoint    = "localhost:4317"
	defaultInsecure        = true
	defaultTraceSampleRate = 1.0
)

type Config struct {
	ServiceName     string
	ServiceVersion  string
	OTLPEndpoint    string
	Insecure        bool
	TraceSampleRate float64
}

func LoadConfigFromEnv() (Config, error) {
	cfg := Config{
		ServiceName:     getEnv("OTEL_SERVICE_NAME", defaultServiceName),
		ServiceVersion:  getEnv("OTEL_SERVICE_VERSION", defaultServiceVersion),
		OTLPEndpoint:    getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", defaultOTLPEndpoint),
		Insecure:        defaultInsecure,
		TraceSampleRate: defaultTraceSampleRate,
	}

	if v, ok := os.LookupEnv("OTEL_EXPORTER_OTLP_INSECURE"); ok && v != "" {
		insecure, err := strconv.ParseBool(v)
		if err != nil {
			return Config{}, fmt.Errorf("parse OTEL_EXPORTER_OTLP_INSECURE: %w", err)
		}
		cfg.Insecure = insecure
	}

	if v, ok := os.LookupEnv("OTEL_TRACES_SAMPLER_ARG"); ok && v != "" {
		rate, err := strconv.ParseFloat(v, 64)
		if err != nil {
			return Config{}, fmt.Errorf("parse OTEL_TRACES_SAMPLER_ARG: %w", err)
		}
		cfg.TraceSampleRate = rate
	}

	cfg = cfg.withDefaults()
	return cfg, cfg.validate()
}

func (c Config) withDefaults() Config {
	if c.ServiceName == "" {
		c.ServiceName = defaultServiceName
	}
	if c.ServiceVersion == "" {
		c.ServiceVersion = defaultServiceVersion
	}
	if c.OTLPEndpoint == "" {
		c.OTLPEndpoint = defaultOTLPEndpoint
	}
	return c
}

func (c Config) validate() error {
	if c.TraceSampleRate < 0 || c.TraceSampleRate > 1 {
		return fmt.Errorf("OTEL_TRACES_SAMPLER_ARG must be between 0 and 1")
	}
	return nil
}

func deploymentEnvironment() string {
	return getEnv("APP_ENV", "development")
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
