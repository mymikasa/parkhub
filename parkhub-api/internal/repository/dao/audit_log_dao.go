package dao

import (
	"time"

	"github.com/parkhub/api/internal/domain"
)

// AuditLogDAO is the GORM database model for the audit_logs table.
type AuditLogDAO struct {
	ID         string    `gorm:"column:id;primaryKey"`
	UserID     string    `gorm:"column:user_id"`
	TenantID   *string   `gorm:"column:tenant_id"`
	Action     string    `gorm:"column:action"`
	TargetType string    `gorm:"column:target_type"`
	TargetID   string    `gorm:"column:target_id"`
	Detail     string    `gorm:"column:detail"`
	IP         string    `gorm:"column:ip"`
	CreatedAt  time.Time `gorm:"column:created_at"`
}

func (AuditLogDAO) TableName() string { return "audit_logs" }

// ToAuditLogDAO converts a domain.AuditLog to an AuditLogDAO.
func ToAuditLogDAO(a *domain.AuditLog) *AuditLogDAO {
	return &AuditLogDAO{
		ID:         a.ID,
		UserID:     a.UserID,
		TenantID:   a.TenantID,
		Action:     string(a.Action),
		TargetType: a.TargetType,
		TargetID:   a.TargetID,
		Detail:     a.Detail,
		IP:         a.IP,
		CreatedAt:  a.CreatedAt,
	}
}

// ToDomain converts an AuditLogDAO to a domain.AuditLog.
func (d *AuditLogDAO) ToDomain() *domain.AuditLog {
	return &domain.AuditLog{
		ID:         d.ID,
		UserID:     d.UserID,
		TenantID:   d.TenantID,
		Action:     domain.AuditAction(d.Action),
		TargetType: d.TargetType,
		TargetID:   d.TargetID,
		Detail:     d.Detail,
		IP:         d.IP,
		CreatedAt:  d.CreatedAt,
	}
}
