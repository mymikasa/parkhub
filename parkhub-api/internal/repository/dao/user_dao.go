package dao

import (
	"time"

	"github.com/parkhub/api/internal/domain"
)

// UserDAO is the GORM database model for the users table.
type UserDAO struct {
	ID           string     `gorm:"column:id;primaryKey"`
	TenantID     *string    `gorm:"column:tenant_id"`
	Username     string     `gorm:"column:username"`
	Email        *string    `gorm:"column:email"`
	Phone        *string    `gorm:"column:phone"`
	PasswordHash string     `gorm:"column:password_hash"`
	RealName     string     `gorm:"column:real_name"`
	Role         string     `gorm:"column:role"`
	Status       string     `gorm:"column:status"`
	LastLoginAt  *time.Time `gorm:"column:last_login_at"`
	CreatedAt    time.Time  `gorm:"column:created_at"`
	UpdatedAt    time.Time  `gorm:"column:updated_at"`
}

func (UserDAO) TableName() string { return "users" }

// ToDAO converts a domain.User to a UserDAO.
func ToUserDAO(u *domain.User) *UserDAO {
	return &UserDAO{
		ID:           u.ID,
		TenantID:     u.TenantID,
		Username:     u.Username,
		Email:        u.Email,
		Phone:        u.Phone,
		PasswordHash: u.PasswordHash,
		RealName:     u.RealName,
		Role:         string(u.Role),
		Status:       string(u.Status),
		LastLoginAt:  u.LastLoginAt,
		CreatedAt:    u.CreatedAt,
		UpdatedAt:    u.UpdatedAt,
	}
}

// ToDomain converts a UserDAO to a domain.User.
func (d *UserDAO) ToDomain() *domain.User {
	return &domain.User{
		ID:           d.ID,
		TenantID:     d.TenantID,
		Username:     d.Username,
		Email:        d.Email,
		Phone:        d.Phone,
		PasswordHash: d.PasswordHash,
		RealName:     d.RealName,
		Role:         domain.UserRole(d.Role),
		Status:       domain.UserStatus(d.Status),
		LastLoginAt:  d.LastLoginAt,
		CreatedAt:    d.CreatedAt,
		UpdatedAt:    d.UpdatedAt,
	}
}
