package impl

import (
	"context"
	"errors"

	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/repository/dao"
	"gorm.io/gorm"
)

// DeviceRepoSet is the Wire provider set for DeviceRepo.
var DeviceRepoSet = wire.NewSet(NewDeviceRepo)

type deviceRepo struct {
	db *gorm.DB
}

func NewDeviceRepo(db *gorm.DB) repository.DeviceRepo {
	return &deviceRepo{db: db}
}

func (r *deviceRepo) FindByID(ctx context.Context, id string) (*domain.Device, error) {
	var d dao.DeviceDAO
	if err := r.db.WithContext(ctx).Where("id = ? AND deleted_at IS NULL", id).First(&d).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrDeviceNotFound
		}
		return nil, err
	}
	return d.ToDomain(), nil
}

func (r *deviceRepo) FindAll(ctx context.Context, tenantID string, filter repository.DeviceFilter) ([]*domain.DeviceListItem, int64, error) {
	q := r.db.WithContext(ctx).
		Table("devices").
		Select("devices.*, parking_lots.name as parking_lot_name, gates.name as gate_name").
		Joins("LEFT JOIN parking_lots ON parking_lots.id = devices.parking_lot_id").
		Joins("LEFT JOIN gates ON gates.id = devices.gate_id").
		Where("devices.deleted_at IS NULL")

	// 平台管理员(tenantID为空)可查看所有租户数据
	if tenantID != "" {
		q = q.Where("devices.tenant_id = ?", tenantID)
	}

	if filter.ParkingLotID != "" {
		q = q.Where("devices.parking_lot_id = ?", filter.ParkingLotID)
	}
	if filter.GateID != "" {
		q = q.Where("devices.gate_id = ?", filter.GateID)
	}
	if filter.Status != nil {
		q = q.Where("devices.status = ?", string(*filter.Status))
	}
	if filter.Keyword != "" {
		like := "%" + filter.Keyword + "%"
		q = q.Where("(devices.name LIKE ? OR devices.id LIKE ?)", like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if filter.Page > 0 && filter.PageSize > 0 {
		q = q.Offset((filter.Page - 1) * filter.PageSize).Limit(filter.PageSize)
	}

	q = q.Order("devices.created_at DESC")

	var rows []dao.DeviceListDAO
	if err := q.Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	results := make([]*domain.DeviceListItem, len(rows))
	for i := range rows {
		results[i] = rows[i].ToDeviceListItem()
	}
	return results, total, nil
}

func (r *deviceRepo) CountByStatus(ctx context.Context, tenantID string) (*repository.DeviceStats, error) {
	type statusCount struct {
		Status string `gorm:"column:status"`
		Count  int64  `gorm:"column:count"`
	}

	q := r.db.WithContext(ctx).
		Table("devices").
		Select("status, COUNT(*) as count").
		Where("deleted_at IS NULL")

	if tenantID != "" {
		q = q.Where("tenant_id = ?", tenantID)
	}

	q = q.Group("status")

	var rows []statusCount
	if err := q.Find(&rows).Error; err != nil {
		return nil, err
	}

	stats := &repository.DeviceStats{}
	for _, row := range rows {
		switch domain.DeviceStatus(row.Status) {
		case domain.DeviceStatusActive:
			stats.Active = row.Count
		case domain.DeviceStatusOffline:
			stats.Offline = row.Count
		case domain.DeviceStatusPending:
			stats.Pending = row.Count
		case domain.DeviceStatusDisabled:
			stats.Disabled = row.Count
		}
		stats.Total += row.Count
	}

	return stats, nil
}

func (r *deviceRepo) Update(ctx context.Context, device *domain.Device) error {
	d := dao.ToDeviceDAO(device)
	result := r.db.WithContext(ctx).Model(d).Where("deleted_at IS NULL").Updates(map[string]any{
		"name":       d.Name,
		"updated_at": d.UpdatedAt,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrDeviceNotFound
	}
	return nil
}
