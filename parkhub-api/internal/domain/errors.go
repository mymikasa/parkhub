package domain

import (
	"errors"
	"fmt"
)

// 认证相关错误
var (
	// 登录相关
	ErrInvalidCredentials = errors.New("账号或密码错误")
	ErrAccountNotFound    = errors.New("账号不存在")
	ErrAccountFrozen      = errors.New("账号已被冻结，请联系管理员")
	ErrTenantFrozen       = errors.New("租户已暂停服务，请联系平台管理员")

	// 验证码相关
	ErrInvalidSmsCode     = errors.New("验证码错误")
	ErrSmsCodeExpired     = errors.New("验证码已过期，请重新获取")
	ErrSmsCodeTooFrequent = errors.New("验证码发送过于频繁")
	ErrPhoneNotRegistered = errors.New("该手机号未注册")

	// Token 相关
	ErrTokenExpired        = errors.New("Token 已过期")
	ErrTokenInvalid        = errors.New("无效的 Token")
	ErrTokenMissing        = errors.New("未提供认证信息")
	ErrRefreshTokenUsed    = errors.New("刷新令牌已失效")
	ErrRefreshTokenExpired = errors.New("登录已过期，请重新登录")

	// 权限相关
	ErrPermissionDenied = errors.New("权限不足")
	ErrUnauthorized     = errors.New("未授权访问")

	// 通用
	ErrNotFound = errors.New("资源不存在")

	// 用户相关
	ErrUsernameExists         = errors.New("用户名已存在")
	ErrEmailExists            = errors.New("邮箱已被使用")
	ErrPhoneExists            = errors.New("手机号已被使用")
	ErrUserNotFound           = errors.New("用户不存在")
	ErrCannotManageHigherRole = errors.New("无法管理更高权限的用户")
	ErrCannotFreezeYourself   = errors.New("不能冻结自己的账号")
	ErrPasswordTooWeak        = errors.New("密码强度不足，需要至少8位且包含大小写字母和数字")
	ErrOldPasswordIncorrect   = errors.New("原密码错误")

	// 租户相关
	ErrTenantNotFound = errors.New("租户不存在")
)

// DomainError 领域错误（带错误码）
type DomainError struct {
	Code    string
	Message string
	Err     error
}

func (e *DomainError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *DomainError) Unwrap() error {
	return e.Err
}

// NewDomainError 创建领域错误
func NewDomainError(code, message string, err error) *DomainError {
	return &DomainError{
		Code:    code,
		Message: message,
		Err:     err,
	}
}

// 错误码定义
const (
	CodeInvalidCredentials     = "INVALID_CREDENTIALS"
	CodeAccountFrozen          = "ACCOUNT_FROZEN"
	CodeTenantFrozen           = "TENANT_FROZEN"
	CodeTokenExpired           = "TOKEN_EXPIRED"
	CodeTokenInvalid           = "TOKEN_INVALID"
	CodeTokenMissing           = "TOKEN_MISSING"
	CodePermissionDenied       = "PERMISSION_DENIED"
	CodeSmsCodeInvalid         = "SMS_CODE_INVALID"
	CodeSmsCodeExpired         = "SMS_CODE_EXPIRED"
	CodeRefreshTokenExpired    = "REFRESH_TOKEN_EXPIRED"
	CodeUsernameExists         = "USERNAME_EXISTS"
	CodePhoneExists            = "PHONE_EXISTS"
	CodeNotFound               = "NOT_FOUND"
	CodeCannotManageHigherRole = "CANNOT_MANAGE_HIGHER_ROLE"
	CodeCannotFreezeYourself   = "CANNOT_FREEZE_YOURSELF"
	CodePasswordTooWeak        = "PASSWORD_TOO_WEAK"
	CodeOldPasswordIncorrect   = "OLD_PASSWORD_INCORRECT"
	CodeDeviceOffline          = "DEVICE_OFFLINE"
	CodeInvalidCommand         = "INVALID_COMMAND"
)

// IsNotFoundError 判断是否为资源未找到错误
func IsNotFoundError(err error) bool {
	return errors.Is(err, ErrNotFound) ||
		errors.Is(err, ErrUserNotFound) ||
		errors.Is(err, ErrTenantNotFound) ||
		errors.Is(err, ErrAccountNotFound)
}

// IsAuthError 判断是否为认证错误
func IsAuthError(err error) bool {
	return errors.Is(err, ErrInvalidCredentials) ||
		errors.Is(err, ErrTokenExpired) ||
		errors.Is(err, ErrTokenInvalid) ||
		errors.Is(err, ErrTokenMissing) ||
		errors.Is(err, ErrRefreshTokenExpired)
}

// IsPermissionError 判断是否为权限错误
func IsPermissionError(err error) bool {
	return errors.Is(err, ErrPermissionDenied) ||
		errors.Is(err, ErrUnauthorized)
}
