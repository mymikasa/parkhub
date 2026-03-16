package service

import (
	"context"

	"github.com/parkhub/api/internal/domain"
)

// AuthService 认证服务接口
type AuthService interface {
	// Login 账号密码登录
	Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error)

	// SendSmsCode 发送短信验证码
	SendSmsCode(ctx context.Context, req *SendSmsCodeRequest) error

	// SmsLogin 短信验证码登录
	SmsLogin(ctx context.Context, req *SmsLoginRequest) (*LoginResponse, error)

	// RefreshToken 刷新令牌
	RefreshToken(ctx context.Context, refreshToken string) (*LoginResponse, error)

	// Logout 登出
	Logout(ctx context.Context, userID string, refreshToken string) error

	// GetCurrentUser 获取当前用户
	GetCurrentUser(ctx context.Context, userID string) (*domain.User, error)
}

// LoginRequest 登录请求
type LoginRequest struct {
	Account  string // 用户名或邮箱
	Password string
}

// SendSmsCodeRequest 发送验证码请求
type SendSmsCodeRequest struct {
	Phone   string
	Purpose string // login, reset_password
}

// SmsLoginRequest 短信登录请求
type SmsLoginRequest struct {
	Phone string
	Code  string
}

// LoginResponse 登录响应
type LoginResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresIn    int64     `json:"expires_in"`
	User         *UserInfo `json:"user"`
}

// UserInfo 用户信息
type UserInfo struct {
	ID       string  `json:"id"`
	Username string  `json:"username"`
	Email    *string `json:"email"`
	Phone    *string `json:"phone"`
	RealName string  `json:"real_name"`
	Role     string  `json:"role"`
	TenantID *string `json:"tenant_id"`
}

// TenantService 租户服务接口
type TenantService interface {
	// Create 创建租户
	Create(ctx context.Context, req *CreateTenantRequest) (*domain.Tenant, error)

	// GetByID 根据ID获取租户
	GetByID(ctx context.Context, id string) (*domain.Tenant, error)

	// List 获取租户列表
	List(ctx context.Context, filter TenantFilter) (*TenantListResponse, error)

	// Update 更新租户
	Update(ctx context.Context, id string, req *UpdateTenantRequest) (*domain.Tenant, error)

	// Freeze 冻结租户
	Freeze(ctx context.Context, id string) error

	// Unfreeze 解冻租户
	Unfreeze(ctx context.Context, id string) error
}

// CreateTenantRequest 创建租户请求
type CreateTenantRequest struct {
	CompanyName  string
	ContactName  string
	ContactPhone string
}

// UpdateTenantRequest 更新租户请求
type UpdateTenantRequest struct {
	CompanyName  string
	ContactName  string
	ContactPhone string
}

// TenantFilter 租户查询过滤器
type TenantFilter struct {
	Status   *domain.TenantStatus
	Keyword  string
	Page     int
	PageSize int
}

// TenantListResponse 租户列表响应
type TenantListResponse struct {
	Items    []*domain.Tenant
	Total    int64
	Page     int
	PageSize int
}
