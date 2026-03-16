package dto

// LoginRequest 账号密码登录请求
type LoginRequest struct {
	Account  string `json:"account" binding:"required"`        // 用户名或邮箱
	Password string `json:"password" binding:"required,min=6"` // 密码
	Remember bool   `json:"remember"`                          // 记住登录
}

// SendSmsCodeRequest 发送验证码请求
type SendSmsCodeRequest struct {
	Phone   string `json:"phone" binding:"required,mobile"` // 手机号
	Purpose string `json:"purpose" binding:"required"`      // 用途: login, reset_password
}

// SmsLoginRequest 验证码登录请求
type SmsLoginRequest struct {
	Phone string `json:"phone" binding:"required,mobile"` // 手机号
	Code  string `json:"code" binding:"required,len=6"`   // 验证码
}

// RefreshTokenRequest 刷新令牌请求
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"` // 刷新令牌
}

// LoginResponse 登录响应
type LoginResponse struct {
	AccessToken  string    `json:"access_token"`  // 访问令牌
	RefreshToken string    `json:"refresh_token"` // 刷新令牌
	ExpiresIn    int64     `json:"expires_in"`    // 过期时间（秒）
	User         *UserInfo `json:"user"`          // 用户信息
}

// UserInfo 用户信息
type UserInfo struct {
	ID       string  `json:"id"`
	Username string  `json:"username"`
	Email    *string `json:"email,omitempty"`
	Phone    *string `json:"phone,omitempty"`
	RealName string  `json:"real_name"`
	Role     string  `json:"role"`
	TenantID *string `json:"tenant_id,omitempty"`
}

// CurrentUserResponse 当前用户响应
type CurrentUserResponse struct {
	ID        string  `json:"id"`
	Username  string  `json:"username"`
	Email     *string `json:"email,omitempty"`
	Phone     *string `json:"phone,omitempty"`
	RealName  string  `json:"real_name"`
	Role      string  `json:"role"`
	TenantID  *string `json:"tenant_id,omitempty"`
	Status    string  `json:"status"`
	CreatedAt string  `json:"created_at"`
}

// ErrorResponse 错误响应
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// MessageResponse 通用消息响应
type MessageResponse struct {
	Message string `json:"message"`
}
