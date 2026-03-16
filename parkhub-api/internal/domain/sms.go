package domain

import "time"

// SmsCode 短信验证码实体
type SmsCode struct {
	ID        string
	Phone     string
	Code      string
	Purpose   SmsCodePurpose
	ExpiresAt time.Time
	Used      bool
	CreatedAt time.Time
}

// SmsCodePurpose 验证码用途
type SmsCodePurpose string

const (
	SmsCodePurposeLogin         SmsCodePurpose = "login"
	SmsCodePurposeResetPassword SmsCodePurpose = "reset_password"
)
