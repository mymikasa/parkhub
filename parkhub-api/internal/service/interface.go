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
	Account   string // 用户名或邮箱
	Password  string
	IP        string
	UserAgent string
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

// UserService 用户管理服务接口
type UserService interface {
	// Create 创建用户
	Create(ctx context.Context, req *CreateUserRequest) (*domain.User, error)
	// GetByID 获取用户详情
	GetByID(ctx context.Context, req *GetUserRequest) (*domain.User, error)
	// List 获取用户列表
	List(ctx context.Context, req *ListUsersRequest) (*UserListResponse, error)
	// Update 更新用户
	Update(ctx context.Context, req *UpdateUserRequest) (*domain.User, error)
	// Freeze 冻结用户
	Freeze(ctx context.Context, req *UserActionRequest) error
	// Unfreeze 解冻用户
	Unfreeze(ctx context.Context, req *UserActionRequest) error
	// ResetPassword 重置密码
	ResetPassword(ctx context.Context, req *ResetPasswordRequest) error
	// UpdateProfile 修改个人资料
	UpdateProfile(ctx context.Context, userID string, req *UpdateProfileRequest) (*domain.User, error)
	// ChangePassword 修改密码
	ChangePassword(ctx context.Context, userID string, req *ChangePasswordRequest) error
	// GetLoginLogs 获取登录日志
	GetLoginLogs(ctx context.Context, userID string, page, pageSize int) (*LoginLogListResponse, error)
	// ImportUsers 批量导入用户
	ImportUsers(ctx context.Context, req *ImportUsersRequest) (*ImportResult, error)
}

// CreateUserRequest 创建用户请求
type CreateUserRequest struct {
	OperatorID       string
	OperatorRole     string
	OperatorTenantID string
	Username         string
	RealName         string
	Role             string
	TenantID         string
	Password         string
	Email            string
	Phone            string
	IP               string
}

// GetUserRequest 获取用户请求
type GetUserRequest struct {
	OperatorRole     string
	OperatorTenantID string
	UserID           string
}

// ListUsersRequest 用户列表请求
type ListUsersRequest struct {
	OperatorRole     string
	OperatorTenantID string
	TenantID         string
	Role             string
	Status           string
	Keyword          string
	Page             int
	PageSize         int
}

// UpdateUserRequest 更新用户请求
type UpdateUserRequest struct {
	OperatorID       string
	OperatorRole     string
	OperatorTenantID string
	UserID           string
	RealName         string
	Email            string
	Phone            string
	Role             string
	IP               string
}

// UserActionRequest 用户操作请求（冻结/解冻）
type UserActionRequest struct {
	OperatorID       string
	OperatorRole     string
	OperatorTenantID string
	UserID           string
	IP               string
}

// ResetPasswordRequest 重置密码请求
type ResetPasswordRequest struct {
	OperatorID       string
	OperatorRole     string
	OperatorTenantID string
	UserID           string
	NewPassword      string
	IP               string
}

// UpdateProfileRequest 修改个人资料请求
type UpdateProfileRequest struct {
	RealName string
	Email    string
	Phone    string
}

// ChangePasswordRequest 修改密码请求
type ChangePasswordRequest struct {
	OldPassword string
	NewPassword string
}

// ImportUsersRequest 批量导入请求
type ImportUsersRequest struct {
	OperatorID       string
	OperatorRole     string
	OperatorTenantID string
	Users            []CreateUserRequest
	IP               string
}

// UserListResponse 用户列表响应
type UserListResponse struct {
	Items    []*domain.User
	Total    int64
	Page     int
	PageSize int
}

// LoginLogListResponse 登录日志列表响应
type LoginLogListResponse struct {
	Items    []*domain.LoginLog
	Total    int64
	Page     int
	PageSize int
}

// ImportResult 导入结果
type ImportResult struct {
	Total   int
	Success int
	Failed  int
	Errors  []ImportError
}

// ImportError 导入错误
type ImportError struct {
	Row     int
	Message string
}

// AuditLogService 审计日志服务接口
type AuditLogService interface {
	// Log 记录审计日志
	Log(ctx context.Context, log *domain.AuditLog) error
	// List 获取审计日志列表
	List(ctx context.Context, req *ListAuditLogsRequest) (*AuditLogListResponse, error)
}

// ListAuditLogsRequest 审计日志列表请求
type ListAuditLogsRequest struct {
	OperatorRole     string
	OperatorTenantID string
	UserID           string
	Action           string
	Page             int
	PageSize         int
}

// AuditLogListResponse 审计日志列表响应
type AuditLogListResponse struct {
	Items    []*domain.AuditLog
	Total    int64
	Page     int
	PageSize int
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
