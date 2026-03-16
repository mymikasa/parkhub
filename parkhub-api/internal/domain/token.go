package domain

import "time"

// RefreshToken 刷新令牌实体
type RefreshToken struct {
	ID         string
	UserID     string
	TokenHash  string
	DeviceInfo *string
	IPAddress  *string
	ExpiresAt  time.Time
	Revoked    bool
	CreatedAt  time.Time
}
