package dao

import (
	"time"

	"github.com/parkhub/api/internal/domain"
)

// RefreshTokenDAO is the GORM database model for the refresh_tokens table.
type RefreshTokenDAO struct {
	ID         string     `gorm:"column:id;primaryKey"`
	UserID     string     `gorm:"column:user_id"`
	TokenHash  string     `gorm:"column:token_hash"`
	DeviceInfo *string    `gorm:"column:device_info"`
	IPAddress  *string    `gorm:"column:ip_address"`
	ExpiresAt  time.Time  `gorm:"column:expires_at"`
	Revoked    bool       `gorm:"column:revoked"`
	CreatedAt  time.Time  `gorm:"column:created_at"`
}

func (RefreshTokenDAO) TableName() string { return "refresh_tokens" }

// ToRefreshTokenDAO converts a domain.RefreshToken to a RefreshTokenDAO.
func ToRefreshTokenDAO(t *domain.RefreshToken) *RefreshTokenDAO {
	return &RefreshTokenDAO{
		ID:         t.ID,
		UserID:     t.UserID,
		TokenHash:  t.TokenHash,
		DeviceInfo: t.DeviceInfo,
		IPAddress:  t.IPAddress,
		ExpiresAt:  t.ExpiresAt,
		Revoked:    t.Revoked,
		CreatedAt:  t.CreatedAt,
	}
}

// ToDomain converts a RefreshTokenDAO to a domain.RefreshToken.
func (d *RefreshTokenDAO) ToDomain() *domain.RefreshToken {
	return &domain.RefreshToken{
		ID:         d.ID,
		UserID:     d.UserID,
		TokenHash:  d.TokenHash,
		DeviceInfo: d.DeviceInfo,
		IPAddress:  d.IPAddress,
		ExpiresAt:  d.ExpiresAt,
		Revoked:    d.Revoked,
		CreatedAt:  d.CreatedAt,
	}
}
