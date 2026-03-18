package repository

import (
	"context"

	"time"

	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository/dao"
)

// TenantRepo 租户数据访问接口
type TenantRepo interface {
	Create(ctx context.Context, tenant *domain.Tenant) error
	Update(ctx context.Context, tenant *domain.Tenant) error
	FindByID(ctx context.Context, id string) (*domain.Tenant, error)
	FindAll(ctx context.Context, filter TenantFilter) ([]*domain.Tenant, int64, error)
	ExistsByCompanyName(ctx context.Context, companyName string) (bool, error)
}

// TenantFilter 租户查询过滤器
type TenantFilter struct {
	Status   *domain.TenantStatus
	Keyword  string
	Page     int
	PageSize int
}

// UserRepo 用户数据访问接口
type UserRepo interface {
	Create(ctx context.Context, user *domain.User) error
	Update(ctx context.Context, user *domain.User) error
	FindByID(ctx context.Context, id string) (*domain.User, error)
	FindByUsername(ctx context.Context, username string) (*domain.User, error)
	FindByEmail(ctx context.Context, email string) (*domain.User, error)
	FindByPhone(ctx context.Context, phone string) (*domain.User, error)
	FindByTenantID(ctx context.Context, tenantID string, filter UserFilter) ([]*domain.User, int64, error)
	FindAll(ctx context.Context, filter UserFilter) ([]*domain.User, int64, error)
	ExistsByUsername(ctx context.Context, username string) (bool, error)
	ExistsByEmail(ctx context.Context, email string) (bool, error)
	ExistsByPhone(ctx context.Context, phone string) (bool, error)
	Delete(ctx context.Context, id string) error
	CountStats(ctx context.Context, tenantID string) (*UserStats, error)
}

// UserStats 用户统计信息
type UserStats struct {
	Total         int64
	ActiveCount   int64
	FrozenCount   int64
	AdminCount    int64
	OperatorCount int64
}

// UserFilter 用户查询过滤器
type UserFilter struct {
	TenantID string
	Role     *domain.UserRole
	Status   *domain.UserStatus
	Keyword  string
	Page     int
	PageSize int
}

// RefreshTokenRepo 刷新令牌数据访问接口
type RefreshTokenRepo interface {
	Create(ctx context.Context, token *domain.RefreshToken) error
	FindByTokenHash(ctx context.Context, tokenHash string) (*domain.RefreshToken, error)
	Revoke(ctx context.Context, id string) error
	RevokeByUserID(ctx context.Context, userID string) error
	DeleteExpired(ctx context.Context) error
}

// SmsCodeRepo 短信验证码数据访问接口
type SmsCodeRepo interface {
	Create(ctx context.Context, code *domain.SmsCode) error
	FindLatestValid(ctx context.Context, phone, purpose string) (*domain.SmsCode, error)
	MarkUsed(ctx context.Context, id string) error
	DeleteExpired(ctx context.Context) error
	CheckSendFrequency(ctx context.Context, phone string) (bool, error)
}

// LoginLogRepo 登录日志数据访问接口
type LoginLogRepo interface {
	Create(ctx context.Context, log *domain.LoginLog) error
	FindByUserID(ctx context.Context, userID string, page, pageSize int) ([]*domain.LoginLog, int64, error)
}

// AuditLogRepo 审计日志数据访问接口
type AuditLogRepo interface {
	Create(ctx context.Context, log *domain.AuditLog) error
	FindAll(ctx context.Context, filter AuditLogFilter) ([]*domain.AuditLog, int64, error)
}

// AuditLogFilter 审计日志查询过滤器
type AuditLogFilter struct {
	TenantID string
	UserID   string
	Action   string
	Page     int
	PageSize int
}

// ParkingLotRepo 停车场数据访问接口
type ParkingLotRepo interface {
	Create(ctx context.Context, lot *domain.ParkingLot) error
	Update(ctx context.Context, lot *domain.ParkingLot) error
	FindByID(ctx context.Context, id string) (*domain.ParkingLot, error)
	FindByTenantID(ctx context.Context, tenantID string, filter ParkingLotFilter) ([]*dao.ParkingLotWithStats, int64, error)
	ExistsByName(ctx context.Context, tenantID, name string) (bool, error)
	Delete(ctx context.Context, id string) error
	GetStats(ctx context.Context, tenantID string) (*ParkingLotStats, error)
}

// ParkingLotFilter 停车场查询过滤器
type ParkingLotFilter struct {
	Status   *domain.ParkingLotStatus
	Keyword  string
	Page     int
	PageSize int
}

// ParkingLotStats 停车场统计信息
type ParkingLotStats struct {
	TotalSpaces      int64
	AvailableSpaces  int64
	OccupiedVehicles int64
	TotalGates       int64
}

// DeviceRepo 设备数据访问接口
type DeviceRepo interface {
	Create(ctx context.Context, device *domain.Device) error
	ExistsByID(ctx context.Context, id string) (bool, error)
	FindByID(ctx context.Context, id string) (*domain.Device, error)
	FindByIDGlobal(ctx context.Context, id string) (*domain.Device, error)
	FindAll(ctx context.Context, tenantID string, filter DeviceFilter) ([]*domain.DeviceListItem, int64, error)
	CountByGateID(ctx context.Context, gateID string) (int64, error)
	FindByGateID(ctx context.Context, gateID string) ([]*domain.Device, error)
	Update(ctx context.Context, device *domain.Device) error
	UpdateHeartbeat(ctx context.Context, device *domain.Device) error
	UnbindByGateID(ctx context.Context, gateID string) error
	FindTimedOutDevices(ctx context.Context, threshold time.Time) ([]*domain.Device, error)
	BatchUpdateStatus(ctx context.Context, ids []string, status domain.DeviceStatus) error
	CountByStatus(ctx context.Context, tenantID string) (*DeviceStats, error)
}

// DeviceStats 设备统计信息
type DeviceStats struct {
	Total    int64
	Active   int64
	Offline  int64
	Pending  int64
	Disabled int64
}

// DeviceFilter 设备查询过滤器
type DeviceFilter struct {
	ParkingLotID string
	GateID       string
	Status       *domain.DeviceStatus
	Keyword      string
	Page         int
	PageSize     int
}

// GateRepo 出入口数据访问接口
type GateRepo interface {
	Create(ctx context.Context, gate *domain.Gate) error
	Update(ctx context.Context, gate *domain.Gate) error
	FindByID(ctx context.Context, id string) (*domain.Gate, error)
	FindByParkingLotID(ctx context.Context, parkingLotID string) ([]*domain.GateWithDevice, error)
	ExistsByName(ctx context.Context, parkingLotID, name string) (bool, error)
	Delete(ctx context.Context, id string) error
	CountByParkingLotID(ctx context.Context, parkingLotID string) (entryCount, exitCount int64, err error)
	CountByParkingLotIDAndType(ctx context.Context, parkingLotID string, gateType domain.GateType) (int64, error)
}
