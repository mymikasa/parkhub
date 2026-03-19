package wire

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/parkhub/api/internal/config"
	"github.com/parkhub/api/internal/pkg/jwt"
	"github.com/parkhub/api/internal/pkg/validator"
	svcimpl "github.com/parkhub/api/internal/service/impl"
)

// NewGinEngine creates a configured gin.Engine.
func NewGinEngine(cfg *config.Config) *gin.Engine {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Register custom validators
	validator.RegisterMobileValidator()

	return gin.Default()
}

// NewJWTManager creates a JWTManager from config.
func NewJWTManager(cfg *config.Config) *jwt.JWTManager {
	accessTTL := cfg.JWTAccessTTL
	if accessTTL == 0 {
		accessTTL = 2 * time.Hour
	}
	refreshTTL := cfg.JWTRefreshTTL
	if refreshTTL == 0 {
		refreshTTL = 7 * 24 * time.Hour
	}
	return jwt.NewJWTManager(cfg.JWTSecret, accessTTL, refreshTTL, cfg.JWTIssuer)
}

// NewMinIOConfig creates MinIOStorageConfig from app config.
func NewMinIOConfig(cfg *config.Config) svcimpl.MinIOStorageConfig {
	return svcimpl.MinIOStorageConfig{
		Endpoint:  cfg.MinIOEndpoint,
		AccessKey: cfg.MinIOAccessKey,
		SecretKey: cfg.MinIOSecretKey,
		Bucket:    cfg.MinIOBucket,
		UseSSL:    cfg.MinIOUseSSL,
	}
}
