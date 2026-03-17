package dao

import (
	"time"

	"github.com/parkhub/api/internal/domain"
)

// LoginLogDAO is the GORM database model for the login_logs table.
type LoginLogDAO struct {
	ID        string    `gorm:"column:id;primaryKey"`
	UserID    string    `gorm:"column:user_id"`
	IP        string    `gorm:"column:ip"`
	UserAgent string    `gorm:"column:user_agent"`
	Status    string    `gorm:"column:status"`
	Reason    string    `gorm:"column:reason"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (LoginLogDAO) TableName() string { return "login_logs" }

// ToLoginLogDAO converts a domain.LoginLog to a LoginLogDAO.
func ToLoginLogDAO(l *domain.LoginLog) *LoginLogDAO {
	return &LoginLogDAO{
		ID:        l.ID,
		UserID:    l.UserID,
		IP:        l.IP,
		UserAgent: l.UserAgent,
		Status:    string(l.Status),
		Reason:    l.Reason,
		CreatedAt: l.CreatedAt,
	}
}

// ToDomain converts a LoginLogDAO to a domain.LoginLog.
func (d *LoginLogDAO) ToDomain() *domain.LoginLog {
	return &domain.LoginLog{
		ID:        d.ID,
		UserID:    d.UserID,
		IP:        d.IP,
		UserAgent: d.UserAgent,
		Status:    domain.LoginLogStatus(d.Status),
		Reason:    d.Reason,
		CreatedAt: d.CreatedAt,
	}
}
