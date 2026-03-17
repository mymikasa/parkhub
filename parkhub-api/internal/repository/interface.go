package repository

import (
	"context"

	"github.com/parkhub/api/internal/domain"
)

// TenantRepo 租户数据访问接口
type TenantRepo interface {
	Create(ctx context.Context, tenant *domain.Tenant) error
	Update(ctx context.Context, tenant *domain.Tenant) error
	FindByID(ctx context.Context, id string) (*domain.Tenant, error)
	FindAll(ctx context.Context, filter TenantFilter) ([]*domain.Tenant, int64, error)
	ExistsByCompanyName(ctx context.Context, companyName string) (bool, error)
	ExistsByCompanyNameExcluding(ctx context.Context, companyName string, excludeID string) (bool, error)
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
	ExistsByUsername(ctx context.Context, username string) (bool, error)
	ExistsByEmail(ctx context.Context, email string) (bool, error)
	ExistsByPhone(ctx context.Context, phone string) (bool, error)
	Delete(ctx context.Context, id string) error
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
