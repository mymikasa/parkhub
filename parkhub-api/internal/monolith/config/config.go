package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// LoadFile loads environment variables from the given .env file path before
// reading them. Variables already set in the process environment take
// precedence (godotenv does not overwrite existing vars).
//
// Call this before Load() when you want file-based configuration:
//
//	config.LoadFile(".env.monolith")
//	cfg, err := config.Load()
func LoadFile(path string) error {
	return godotenv.Load(path)
}

// MonolithConfig holds all runtime configuration for cmd/monolith.
// All values are loaded from environment variables; missing required
// variables are reported together (not one-at-a-time).
type MonolithConfig struct {
	AppPort string
	AppEnv  string
	LogLevel string

	JWTSecret string

	// Per-domain DSNs (required).
	CoreDSN    string
	IoTDSN     string
	EventDSN   string
	BillingDSN string
	PaymentDSN string

	// Per-domain connection pool limits (optional, defaults applied).
	CoreMaxOpenConns    int
	IoTMaxOpenConns     int
	EventMaxOpenConns   int
	BillingMaxOpenConns int
	PaymentMaxOpenConns int

	DefaultMaxOpenConns int
	DefaultMaxIdleConns int
	DefaultConnMaxLife  time.Duration

	// OTel Collector OTLP gRPC endpoint (no scheme).
	// Empty → otelx defaults to "localhost:4317".
	// When no collector is reachable the OTel SDK silently drops exports.
	OTELEndpoint string
}

// Load reads MonolithConfig from environment variables.
// All missing required variables are collected and reported at once.
func Load() (*MonolithConfig, error) {
	cfg := &MonolithConfig{
		AppPort:             getEnv("APP_PORT", "8080"),
		AppEnv:              getEnv("APP_ENV", "development"),
		LogLevel:            getEnv("LOG_LEVEL", "info"),
		JWTSecret:           getEnv("JWT_SECRET", ""),
		CoreDSN:             getEnv("CORE_DB_DSN", ""),
		IoTDSN:              getEnv("IOT_DB_DSN", ""),
		EventDSN:            getEnv("EVENT_DB_DSN", ""),
		BillingDSN:          getEnv("BILLING_DB_DSN", ""),
		PaymentDSN:          getEnv("PAYMENT_DB_DSN", ""),
		OTELEndpoint:        getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", ""),
		DefaultMaxOpenConns: 5,
		DefaultMaxIdleConns: 2,
		DefaultConnMaxLife:  30 * time.Minute,
	}

	// Per-domain pool overrides.
	cfg.CoreMaxOpenConns    = getEnvInt("CORE_DB_MAX_OPEN_CONNS",    cfg.DefaultMaxOpenConns)
	cfg.IoTMaxOpenConns     = getEnvInt("IOT_DB_MAX_OPEN_CONNS",     cfg.DefaultMaxOpenConns)
	cfg.EventMaxOpenConns   = getEnvInt("EVENT_DB_MAX_OPEN_CONNS",   cfg.DefaultMaxOpenConns)
	cfg.BillingMaxOpenConns = getEnvInt("BILLING_DB_MAX_OPEN_CONNS", cfg.DefaultMaxOpenConns)
	cfg.PaymentMaxOpenConns = getEnvInt("PAYMENT_DB_MAX_OPEN_CONNS", cfg.DefaultMaxOpenConns)

	var missing []string
	required := map[string]string{
		"JWT_SECRET":      cfg.JWTSecret,
		"CORE_DB_DSN":     cfg.CoreDSN,
		"IOT_DB_DSN":      cfg.IoTDSN,
		"EVENT_DB_DSN":    cfg.EventDSN,
		"BILLING_DB_DSN":  cfg.BillingDSN,
		"PAYMENT_DB_DSN":  cfg.PaymentDSN,
	}
	for k, v := range required {
		if v == "" {
			missing = append(missing, k)
		}
	}
	if len(missing) > 0 {
		return nil, fmt.Errorf("missing required environment variables: %s", strings.Join(missing, ", "))
	}

	return cfg, nil
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return defaultVal
}
