package dao

import (
	"time"

	"github.com/parkhub/api/internal/domain"
)

// SmsCodeDAO is the GORM database model for the sms_codes table.
type SmsCodeDAO struct {
	ID        string    `gorm:"column:id;primaryKey"`
	Phone     string    `gorm:"column:phone"`
	Code      string    `gorm:"column:code"`
	Purpose   string    `gorm:"column:purpose"`
	ExpiresAt time.Time `gorm:"column:expires_at"`
	Used      bool      `gorm:"column:used"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (SmsCodeDAO) TableName() string { return "sms_codes" }

// ToSmsCodeDAO converts a domain.SmsCode to a SmsCodeDAO.
func ToSmsCodeDAO(s *domain.SmsCode) *SmsCodeDAO {
	return &SmsCodeDAO{
		ID:        s.ID,
		Phone:     s.Phone,
		Code:      s.Code,
		Purpose:   string(s.Purpose),
		ExpiresAt: s.ExpiresAt,
		Used:      s.Used,
		CreatedAt: s.CreatedAt,
	}
}

// ToDomain converts a SmsCodeDAO to a domain.SmsCode.
func (d *SmsCodeDAO) ToDomain() *domain.SmsCode {
	return &domain.SmsCode{
		ID:        d.ID,
		Phone:     d.Phone,
		Code:      d.Code,
		Purpose:   domain.SmsCodePurpose(d.Purpose),
		ExpiresAt: d.ExpiresAt,
		Used:      d.Used,
		CreatedAt: d.CreatedAt,
	}
}
