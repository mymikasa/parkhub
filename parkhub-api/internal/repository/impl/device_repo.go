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

// DeviceRepoSet is the Wire provider set for DeviceRepo.
var DeviceRepoSet = wire.NewSet(NewDeviceRepo)

type deviceRepo struct {
	db *gorm.DB
}

func NewDeviceRepo(db *gorm.DB) repository.DeviceRepo {
	return &deviceRepo{db: db}
}

func (r *deviceRepo) Create(ctx context.Context, device *domain.Device) error {
	d := dao.ToDeviceDAO(device)
	return r.db.WithContext(ctx).Create(d).Error
}

func (r *deviceRepo) ExistsByID(ctx context.Context, id string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&dao.DeviceDAO{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
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

func (r *deviceRepo) CountByGateID(ctx context.Context, gateID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&dao.DeviceDAO{}).
		Where("gate_id = ? AND deleted_at IS NULL", gateID).
		Count(&count).Error
	return count, err
}

func (r *deviceRepo) FindByGateID(ctx context.Context, gateID string) ([]*domain.Device, error) {
	var rows []dao.DeviceDAO
	if err := r.db.WithContext(ctx).
		Where("gate_id = ? AND deleted_at IS NULL", gateID).
		Order("created_at ASC").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	devices := make([]*domain.Device, len(rows))
	for i := range rows {
		devices[i] = rows[i].ToDomain()
	}
	return devices, nil
}

func (r *deviceRepo) CountByStatus(ctx context.Context, tenantID string) (*repository.DeviceStats, error) {
	type statusCount struct {
		Status string `gorm:"column:status"`
		Count  int64  `gorm:"column:count"`
	}

	type parkingLotStatusCount struct {
		ParkingLotID   string `gorm:"column:parking_lot_id"`
		ParkingLotName string `gorm:"column:parking_lot_name"`
		Status         string `gorm:"column:status"`
		Count          int64  `gorm:"column:count"`
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
			stats.Online = row.Count
		case domain.DeviceStatusOffline:
			stats.Offline = row.Count
		case domain.DeviceStatusPending:
			stats.Pending = row.Count
		case domain.DeviceStatusDisabled:
			stats.Disabled = row.Count
		}
		stats.Total += row.Count
	}

	lotQuery := r.db.WithContext(ctx).
		Table("devices").
		Select("devices.parking_lot_id, parking_lots.name as parking_lot_name, devices.status, COUNT(*) as count").
		Joins("JOIN parking_lots ON parking_lots.id = devices.parking_lot_id").
		Where("devices.deleted_at IS NULL AND devices.parking_lot_id IS NOT NULL")

	if tenantID != "" {
		lotQuery = lotQuery.Where("devices.tenant_id = ?", tenantID)
	}

	lotQuery = lotQuery.Group("devices.parking_lot_id, parking_lots.name, devices.status")

	var lotRows []parkingLotStatusCount
	if err := lotQuery.Find(&lotRows).Error; err != nil {
		return nil, err
	}

	byParkingLot := make(map[string]*repository.DeviceParkingLotStats)
	for _, row := range lotRows {
		item, ok := byParkingLot[row.ParkingLotID]
		if !ok {
			item = &repository.DeviceParkingLotStats{
				ParkingLotID:   row.ParkingLotID,
				ParkingLotName: row.ParkingLotName,
			}
			byParkingLot[row.ParkingLotID] = item
		}

		switch domain.DeviceStatus(row.Status) {
		case domain.DeviceStatusActive:
			item.Online = row.Count
		case domain.DeviceStatusOffline:
			item.Offline = row.Count
		case domain.DeviceStatusPending:
			item.Pending = row.Count
		case domain.DeviceStatusDisabled:
			item.Disabled = row.Count
		}
		item.Total += row.Count
	}

	stats.ByParkingLot = make([]*repository.DeviceParkingLotStats, 0, len(byParkingLot))
	for _, item := range byParkingLot {
		stats.ByParkingLot = append(stats.ByParkingLot, item)
	}

	return stats, nil
}

func (r *deviceRepo) FindByIDGlobal(ctx context.Context, id string) (*domain.Device, error) {
	var d dao.DeviceDAO
	if err := r.db.WithContext(ctx).Where("id = ? AND deleted_at IS NULL", id).First(&d).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // 返回 nil 表示不存在，不是错误
		}
		return nil, err
	}
	return d.ToDomain(), nil
}

func (r *deviceRepo) Update(ctx context.Context, device *domain.Device) error {
	d := dao.ToDeviceDAO(device)
	result := r.db.WithContext(ctx).Model(d).Where("deleted_at IS NULL").Updates(map[string]any{
		"tenant_id":      d.TenantID,
		"name":           d.Name,
		"status":         d.Status,
		"parking_lot_id": d.ParkingLotID,
		"gate_id":        d.GateID,
		"updated_at":     d.UpdatedAt,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrDeviceNotFound
	}
	return nil
}

func (r *deviceRepo) Delete(ctx context.Context, id string) error {
	now := r.db.NowFunc()
	result := r.db.WithContext(ctx).
		Model(&dao.DeviceDAO{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(map[string]any{
			"deleted_at": now,
			"updated_at": now,
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrDeviceNotFound
	}
	return nil
}

func (r *deviceRepo) UpdateHeartbeat(ctx context.Context, device *domain.Device) error {
	d := dao.ToDeviceDAO(device)
	return r.db.WithContext(ctx).Model(d).Where("deleted_at IS NULL").Updates(map[string]any{
		"status":           d.Status,
		"firmware_version": d.FirmwareVersion,
		"last_heartbeat":   d.LastHeartbeat,
		"updated_at":       d.UpdatedAt,
	}).Error
}

func (r *deviceRepo) UnbindByGateID(ctx context.Context, gateID string) error {
	return r.db.WithContext(ctx).
		Model(&dao.DeviceDAO{}).
		Where("gate_id = ? AND deleted_at IS NULL", gateID).
		Updates(map[string]any{
			"tenant_id":      domain.PlatformTenantID,
			"status":         string(domain.DeviceStatusPending),
			"parking_lot_id": nil,
			"gate_id":        nil,
			"updated_at":     r.db.NowFunc(),
		}).Error
}

func (r *deviceRepo) FindTimedOutDevices(ctx context.Context, threshold time.Time) ([]*domain.Device, error) {
	var rows []dao.DeviceDAO
	err := r.db.WithContext(ctx).
		Where("deleted_at IS NULL").
		Where("status IN ?", []string{string(domain.DeviceStatusActive), string(domain.DeviceStatusPending)}).
		Where("last_heartbeat IS NOT NULL").
		Where("last_heartbeat < ?", threshold).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	devices := make([]*domain.Device, len(rows))
	for i := range rows {
		devices[i] = rows[i].ToDomain()
	}
	return devices, nil
}

func (r *deviceRepo) BatchUpdateStatus(ctx context.Context, ids []string, status domain.DeviceStatus) error {
	if len(ids) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).
		Table("devices").
		Where("id IN ? AND deleted_at IS NULL", ids).
		Updates(map[string]any{
			"status":     string(status),
			"updated_at": r.db.NowFunc(),
		}).Error
}
