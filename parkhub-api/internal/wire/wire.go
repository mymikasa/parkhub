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
	"github.com/parkhub/api/internal/ws"
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
		repoimpl.LoginLogRepoSet,
		repoimpl.AuditLogRepoSet,
		repoimpl.ParkingLotRepoSet,
		repoimpl.GateRepoSet,
		repoimpl.DeviceRepoSet,
		repoimpl.DeviceControlLogRepoSet,
		repoimpl.BillingRuleRepoSet,
		repoimpl.TransitRecordRepoSet,
		svcimpl.AuthServiceSet,
		svcimpl.TenantServiceSet,
		svcimpl.UserServiceSet,
		svcimpl.AuditLogServiceSet,
		svcimpl.ParkingLotServiceSet,
		svcimpl.GateServiceSet,
		svcimpl.DeviceServiceSet,
		svcimpl.DeviceControlServiceSet,
		svcimpl.BillingRuleServiceSet,
		svcimpl.TransitRecordServiceSet,
		ws.AlertHubSet,
		handler.AuthHandlerSet,
		handler.TenantHandlerSet,
		handler.UserHandlerSet,
		handler.ParkingLotHandlerSet,
		handler.GateHandlerSet,
		handler.DeviceHandlerSet,
		handler.WebSocketHandlerSet,
		handler.BillingRuleHandlerSet,
		handler.TransitRecordHandlerSet,
		router.RouterSet,
	)
	return nil, nil
}
