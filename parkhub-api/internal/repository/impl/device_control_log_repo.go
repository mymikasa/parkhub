package impl

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"gorm.io/gorm"
)

type DeviceControlLogDAO struct {
	ID           string    `gorm:"primaryKey;column:id"`
	TenantID     string    `gorm:"column:tenant_id;index"`
	DeviceID     string    `gorm:"column:device_id;index"`
	OperatorID   string    `gorm:"column:operator_id"`
	OperatorName string    `gorm:"column:operator_name"`
	Command      string    `gorm:"column:command"`
	CreatedAt    time.Time `gorm:"column:created_at;index"`
}

func (DeviceControlLogDAO) TableName() string {
	return "device_control_logs"
}

type deviceControlLogRepoImpl struct {
	db *gorm.DB
}

func NewDeviceControlLogRepo(db *gorm.DB) repository.DeviceControlLogRepo {
	return &deviceControlLogRepoImpl{db: db}
}

func (r *deviceControlLogRepoImpl) Create(ctx context.Context, log *domain.DeviceControlLog) error {
	if log.ID == "" {
		log.ID = uuid.NewString()
	}
	if log.CreatedAt.IsZero() {
		log.CreatedAt = time.Now()
	}

	dao := &DeviceControlLogDAO{
		ID:           log.ID,
		TenantID:     log.TenantID,
		DeviceID:     log.DeviceID,
		OperatorID:   log.OperatorID,
		OperatorName: log.OperatorName,
		Command:      log.Command,
		CreatedAt:    log.CreatedAt,
	}

	return r.db.WithContext(ctx).Create(dao).Error
}

func (r *deviceControlLogRepoImpl) FindByDeviceID(ctx context.Context, deviceID string, page, pageSize int) ([]*domain.DeviceControlLog, int64, error) {
	var daos []*DeviceControlLogDAO
	var total int64

	offset := (page - 1) * pageSize

	if err := r.db.WithContext(ctx).Model(&DeviceControlLogDAO{}).
		Where("device_id = ?", deviceID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := r.db.WithContext(ctx).
		Where("device_id = ?", deviceID).
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&daos).Error; err != nil {
		return nil, 0, err
	}

	logs := make([]*domain.DeviceControlLog, len(daos))
	for i, dao := range daos {
		logs[i] = &domain.DeviceControlLog{
			ID:           dao.ID,
			TenantID:     dao.TenantID,
			DeviceID:     dao.DeviceID,
			OperatorID:   dao.OperatorID,
			OperatorName: dao.OperatorName,
			Command:      dao.Command,
			CreatedAt:    dao.CreatedAt,
		}
	}

	return logs, total, nil
}

var DeviceControlLogRepoSet = wire.NewSet(NewDeviceControlLogRepo)
