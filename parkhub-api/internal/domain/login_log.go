package domain

import "time"

// LoginLogStatus 登录日志状态
type LoginLogStatus string

const (
	LoginLogStatusSuccess LoginLogStatus = "success"
	LoginLogStatusFailed  LoginLogStatus = "failed"
)

// LoginLog 登录日志实体
type LoginLog struct {
	ID        string
	UserID    string
	IP        string
	UserAgent string
	Status    LoginLogStatus
	Reason    string
	CreatedAt time.Time
}
