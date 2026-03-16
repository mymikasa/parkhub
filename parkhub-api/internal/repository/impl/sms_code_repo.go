package impl

import (
	"context"
	"errors"
	"time"

	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/repository/dao"
	"gorm.io/gorm"
)

// SmsCodeRepoSet is the Wire provider set for SmsCodeRepo.
var SmsCodeRepoSet = wire.NewSet(NewSmsCodeRepo)

type smsCodeRepo struct {
	db *gorm.DB
}

func NewSmsCodeRepo(db *gorm.DB) repository.SmsCodeRepo {
	return &smsCodeRepo{db: db}
}

func (r *smsCodeRepo) Create(ctx context.Context, code *domain.SmsCode) error {
	return r.db.WithContext(ctx).Create(dao.ToSmsCodeDAO(code)).Error
}

func (r *smsCodeRepo) FindLatestValid(ctx context.Context, phone, purpose string) (*domain.SmsCode, error) {
	var d dao.SmsCodeDAO
	err := r.db.WithContext(ctx).
		Where("phone = ? AND purpose = ? AND used = ? AND expires_at > ?", phone, purpose, false, time.Now()).
		Order("created_at DESC").
		First(&d).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return d.ToDomain(), nil
}

func (r *smsCodeRepo) MarkUsed(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Model(&dao.SmsCodeDAO{}).Where("id = ?", id).Update("used", true).Error
}

func (r *smsCodeRepo) DeleteExpired(ctx context.Context) error {
	return r.db.WithContext(ctx).Where("expires_at < ? OR used = ?", time.Now(), true).Delete(&dao.SmsCodeDAO{}).Error
}

// CheckSendFrequency 检查发送频率（60秒内不能重复发送）
func (r *smsCodeRepo) CheckSendFrequency(ctx context.Context, phone string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&dao.SmsCodeDAO{}).
		Where("phone = ? AND created_at > ?", phone, time.Now().Add(-60*time.Second)).
		Count(&count).Error
	return count == 0, err
}
