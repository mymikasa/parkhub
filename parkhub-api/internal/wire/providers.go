package wire

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/parkhub/api/internal/config"
	"github.com/parkhub/api/internal/pkg/jwt"
)

// NewGinEngine creates a configured gin.Engine.
func NewGinEngine(cfg *config.Config) *gin.Engine {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
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
