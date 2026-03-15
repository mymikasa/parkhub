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
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int64        `json:"expires_in"`
	User         *UserInfo    `json:"user"`
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
