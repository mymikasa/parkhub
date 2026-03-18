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

// GateRepoSet is the Wire provider set for GateRepo.
var GateRepoSet = wire.NewSet(NewGateRepo)

type gateRepo struct {
	db *gorm.DB
}

func NewGateRepo(db *gorm.DB) repository.GateRepo {
	return &gateRepo{db: db}
}

func (r *gateRepo) Create(ctx context.Context, gate *domain.Gate) error {
	return r.db.WithContext(ctx).Create(dao.ToGateDAO(gate)).Error
}

func (r *gateRepo) Update(ctx context.Context, gate *domain.Gate) error {
	d := dao.ToGateDAO(gate)
	result := r.db.WithContext(ctx).Model(d).Updates(map[string]any{
		"name":       d.Name,
		"device_id":  d.DeviceID,
		"updated_at": d.UpdatedAt,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrGateNotFound
	}
	return nil
}

func (r *gateRepo) FindByID(ctx context.Context, id string) (*domain.Gate, error) {
	var d dao.GateDAO
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&d).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrGateNotFound
		}
		return nil, err
	}
	return d.ToDomain(), nil
}

func (r *gateRepo) FindByParkingLotID(ctx context.Context, parkingLotID string) ([]*domain.GateWithDevice, error) {
	var rows []dao.GateWithDeviceDAO

	// 左连接查询设备和设备状态
	// 注意：devices 表可能在 Phase 2 实现，这里先返回基本信息
	err := r.db.WithContext(ctx).
		Table("gates").
		Select("gates.*, NULL as device_serial_number, NULL as device_status, NULL as device_last_heartbeat").
		Where("gates.parking_lot_id = ?", parkingLotID).
		Order("gates.created_at ASC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}

	results := make([]*domain.GateWithDevice, len(rows))
	for i := range rows {
		results[i] = rows[i].ToDomainWithDevice()
	}
	return results, nil
}

func (r *gateRepo) ExistsByName(ctx context.Context, parkingLotID, name string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&dao.GateDAO{}).
		Where("parking_lot_id = ? AND name = ?", parkingLotID, name).
		Count(&count).Error
	return count > 0, err
}

func (r *gateRepo) Delete(ctx context.Context, id string) error {
	result := r.db.WithContext(ctx).Delete(&dao.GateDAO{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrGateNotFound
	}
	return nil
}

func (r *gateRepo) CountByParkingLotID(ctx context.Context, parkingLotID string) (entryCount, exitCount int64, err error) {
	type countResult struct {
		Type  string
		Count int64
	}

	var results []countResult
	err = r.db.WithContext(ctx).
		Model(&dao.GateDAO{}).
		Select("type, COUNT(*) as count").
		Where("parking_lot_id = ?", parkingLotID).
		Group("type").
		Scan(&results).Error
	if err != nil {
		return 0, 0, err
	}

	for _, r := range results {
		if r.Type == "entry" {
			entryCount = r.Count
		} else if r.Type == "exit" {
			exitCount = r.Count
		}
	}

	return entryCount, exitCount, nil
}

func (r *gateRepo) CountByParkingLotIDAndType(ctx context.Context, parkingLotID string, gateType domain.GateType) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&dao.GateDAO{}).
		Where("parking_lot_id = ? AND type = ?", parkingLotID, string(gateType)).
		Count(&count).Error
	return count, err
}
