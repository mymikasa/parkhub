package dto

// CreateUserRequest 创建用户请求
type CreateUserRequest struct {
	Username string `json:"username" binding:"required,min=3,max=30"`
	RealName string `json:"real_name" binding:"required,min=2,max=20"`
	Role     string `json:"role" binding:"required,oneof=tenant_admin operator"`
	TenantID string `json:"tenant_id" binding:"required"`
	Password string `json:"password" binding:"required,min=8"`
	Email    string `json:"email" binding:"omitempty,email"`
	Phone    string `json:"phone" binding:"omitempty"`
}

// UpdateUserRequest 更新用户请求
type UpdateUserRequest struct {
	RealName string `json:"real_name" binding:"omitempty,min=2,max=20"`
	Email    string `json:"email" binding:"omitempty,email"`
	Phone    string `json:"phone" binding:"omitempty"`
	Role     string `json:"role" binding:"omitempty,oneof=tenant_admin operator"`
}

// ResetPasswordRequest 重置密码请求
type ResetPasswordRequest struct {
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

// UpdateProfileRequest 修改个人资料请求
type UpdateProfileRequest struct {
	RealName string `json:"real_name" binding:"omitempty,min=2,max=20"`
	Email    string `json:"email" binding:"omitempty,email"`
	Phone    string `json:"phone" binding:"omitempty"`
}

// ChangePasswordRequest 修改密码请求
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

// UserDTO 用户信息
type UserDTO struct {
	ID          string  `json:"id"`
	TenantID    *string `json:"tenant_id,omitempty"`
	Username    string  `json:"username"`
	Email       *string `json:"email,omitempty"`
	Phone       *string `json:"phone,omitempty"`
	RealName    string  `json:"real_name"`
	Role        string  `json:"role"`
	Status      string  `json:"status"`
	LastLoginAt *string `json:"last_login_at,omitempty"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

// UserListResponse 用户列表响应
type UserListResponse struct {
	Items    []UserDTO `json:"items"`
	Total    int64     `json:"total"`
	Page     int       `json:"page"`
	PageSize int       `json:"page_size"`
}

// LoginLogDTO 登录日志
type LoginLogDTO struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	IP        string `json:"ip"`
	UserAgent string `json:"user_agent"`
	Status    string `json:"status"`
	Reason    string `json:"reason,omitempty"`
	CreatedAt string `json:"created_at"`
}

// LoginLogListResponse 登录日志列表响应
type LoginLogListResponse struct {
	Items    []LoginLogDTO `json:"items"`
	Total    int64         `json:"total"`
	Page     int           `json:"page"`
	PageSize int           `json:"page_size"`
}

// AuditLogDTO 审计日志
type AuditLogDTO struct {
	ID         string  `json:"id"`
	UserID     string  `json:"user_id"`
	TenantID   *string `json:"tenant_id,omitempty"`
	Action     string  `json:"action"`
	TargetType string  `json:"target_type"`
	TargetID   string  `json:"target_id"`
	Detail     string  `json:"detail,omitempty"`
	IP         string  `json:"ip,omitempty"`
	CreatedAt  string  `json:"created_at"`
}

// AuditLogListResponse 审计日志列表响应
type AuditLogListResponse struct {
	Items    []AuditLogDTO `json:"items"`
	Total    int64         `json:"total"`
	Page     int           `json:"page"`
	PageSize int           `json:"page_size"`
}

// ImportUsersRequest 批量导入用户请求
type ImportUsersRequest struct {
	Users []CreateUserRequest `json:"users" binding:"required,min=1"`
}

// ImportResultResponse 导入结果响应
type ImportResultResponse struct {
	Total   int               `json:"total"`
	Success int               `json:"success"`
	Failed  int               `json:"failed"`
	Errors  []ImportErrorItem `json:"errors,omitempty"`
}

// ImportErrorItem 导入错误项
type ImportErrorItem struct {
	Row     int    `json:"row"`
	Message string `json:"message"`
}
