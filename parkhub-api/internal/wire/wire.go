//go:build wireinject
// +build wireinject

package wire

import (
	"github.com/google/wire"
	"github.com/parkhub/api/internal/config"
	"github.com/parkhub/api/internal/handler"
	repoimpl "github.com/parkhub/api/internal/repository/impl"
	"github.com/parkhub/api/internal/router"
	svcimpl "github.com/parkhub/api/internal/service/impl"
	"gorm.io/gorm"
)

// InitializeApp wires all dependencies and returns a configured Router.
// Call r.Setup() then r.GetEngine() to start serving.
func InitializeApp(cfg *config.Config, db *gorm.DB) (*router.Router, error) {
	wire.Build(
		NewGinEngine,
		NewJWTManager,
		repoimpl.UserRepoSet,
		repoimpl.TenantRepoSet,
		repoimpl.RefreshTokenRepoSet,
		repoimpl.SmsCodeRepoSet,
		svcimpl.AuthServiceSet,
		handler.AuthHandlerSet,
		router.RouterSet,
	)
	return nil, nil
}
