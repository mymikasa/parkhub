package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	AppPort string
	AppEnv  string

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string

	DBMaxOpenConns int
	DBMaxIdleConns int

	JWTSecret     string
	JWTAccessTTL  time.Duration
	JWTRefreshTTL time.Duration
	JWTIssuer     string

	// MQTT
	MQTTBrokerURL string
	MQTTUsername  string
	MQTTPassword  string

	// Redis
	RedisURL string

	// Heartbeat
	HeartbeatTimeoutSeconds int

	LogLevel string
}

// Load reads configuration from environment variables.
// Required variables: APP_PORT, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET.
func Load() (*Config, error) {
	cfg := &Config{
		AppPort:        getEnv("APP_PORT", "8080"),
		AppEnv:         getEnv("APP_ENV", "development"),
		DBHost:         getEnv("DB_HOST", ""),
		DBPort:         getEnv("DB_PORT", "3306"),
		DBUser:         getEnv("DB_USER", ""),
		DBPassword:     getEnv("DB_PASSWORD", ""),
		DBName:         getEnv("DB_NAME", ""),
		DBMaxOpenConns: getEnvInt("DB_MAX_OPEN_CONNS", 25),
		DBMaxIdleConns: getEnvInt("DB_MAX_IDLE_CONNS", 5),
		JWTSecret:      getEnv("JWT_SECRET", ""),
		JWTIssuer:      getEnv("JWT_ISSUER", "parkhub"),
		MQTTBrokerURL:  getEnv("MQTT_BROKER_URL", "tcp://localhost:1883"),
		MQTTUsername:    getEnv("MQTT_BACKEND_USERNAME", ""),
		MQTTPassword:    getEnv("MQTT_BACKEND_PASSWORD", ""),
		RedisURL:        getEnv("REDIS_URL", "redis://localhost:6379"),
		HeartbeatTimeoutSeconds: getEnvInt("HEARTBEAT_TIMEOUT_SECONDS", 300),
		LogLevel:       getEnv("LOG_LEVEL", "info"),
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	cfg.JWTAccessTTL = getEnvDuration("JWT_ACCESS_TTL", 2*time.Hour)
	cfg.JWTRefreshTTL = getEnvDuration("JWT_REFRESH_TTL", 7*24*time.Hour)

	return cfg, nil
}

// DSN returns the MySQL DSN connection string.
func (c *Config) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName,
	)
}

func (c *Config) validate() error {
	required := map[string]string{
		"DB_HOST":    c.DBHost,
		"DB_USER":    c.DBUser,
		"DB_PASSWORD": c.DBPassword,
		"DB_NAME":    c.DBName,
		"JWT_SECRET": c.JWTSecret,
	}
	for key, val := range required {
		if val == "" {
			return fmt.Errorf("required environment variable %s is not set", key)
		}
	}
	if len(c.JWTSecret) < 32 {
		return fmt.Errorf("JWT_SECRET must be at least 32 characters")
	}
	return nil
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

func getEnvDuration(key string, defaultVal time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return defaultVal
}
