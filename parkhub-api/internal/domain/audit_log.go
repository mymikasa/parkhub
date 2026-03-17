package domain

import "time"

// AuditAction 审计操作类型
type AuditAction string

const (
	AuditActionUserCreated     AuditAction = "user_created"
	AuditActionUserUpdated     AuditAction = "user_updated"
	AuditActionUserFrozen      AuditAction = "user_frozen"
	AuditActionUserUnfrozen    AuditAction = "user_unfrozen"
	AuditActionPasswordReset   AuditAction = "password_reset"
	AuditActionPasswordChanged AuditAction = "password_changed"
)

// AuditLog 审计日志实体
type AuditLog struct {
	ID         string
	UserID     string
	TenantID   *string
	Action     AuditAction
	TargetType string
	TargetID   string
	Detail     string // JSON string
	IP         string
	CreatedAt  time.Time
}
