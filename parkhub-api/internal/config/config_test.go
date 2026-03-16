package config

import (
	"os"
	"testing"
	"time"
)

func setRequiredEnv(t *testing.T) {
	t.Helper()
	envs := map[string]string{
		"APP_PORT":    "8080",
		"DB_HOST":     "localhost",
		"DB_PORT":     "5432",
		"DB_USER":     "parkhub",
		"DB_PASSWORD": "secret",
		"DB_NAME":     "parkhub_db",
		"JWT_SECRET":  "this-is-a-very-long-secret-key-for-testing",
	}
	for k, v := range envs {
		t.Setenv(k, v)
	}
}

func TestLoad_Success(t *testing.T) {
	setRequiredEnv(t)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if cfg.DBHost != "localhost" {
		t.Errorf("expected DBHost=localhost, got %s", cfg.DBHost)
	}
	if cfg.JWTAccessTTL != 2*time.Hour {
		t.Errorf("expected JWTAccessTTL=2h, got %v", cfg.JWTAccessTTL)
	}
	if cfg.DBMaxOpenConns != 25 {
		t.Errorf("expected DBMaxOpenConns=25, got %d", cfg.DBMaxOpenConns)
	}
}

func TestLoad_MissingRequired(t *testing.T) {
	required := []string{"DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET"}
	for _, key := range required {
		t.Run("missing_"+key, func(t *testing.T) {
			setRequiredEnv(t)
			os.Unsetenv(key)
			_, err := Load()
			if err == nil {
				t.Fatalf("expected error when %s is missing, got nil", key)
			}
		})
	}
}

func TestLoad_JWTSecretTooShort(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("JWT_SECRET", "short")
	_, err := Load()
	if err == nil {
		t.Fatal("expected error for short JWT_SECRET")
	}
}

func TestLoad_CustomDuration(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("JWT_ACCESS_TTL", "1h")
	t.Setenv("JWT_REFRESH_TTL", "24h")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.JWTAccessTTL != time.Hour {
		t.Errorf("expected 1h, got %v", cfg.JWTAccessTTL)
	}
	if cfg.JWTRefreshTTL != 24*time.Hour {
		t.Errorf("expected 24h, got %v", cfg.JWTRefreshTTL)
	}
}
