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

// ParkingLotRepoSet is the Wire provider set for ParkingLotRepo.
var ParkingLotRepoSet = wire.NewSet(NewParkingLotRepo)

type parkingLotRepo struct {
	db *gorm.DB
}

func NewParkingLotRepo(db *gorm.DB) repository.ParkingLotRepo {
	return &parkingLotRepo{db: db}
}

func (r *parkingLotRepo) Create(ctx context.Context, lot *domain.ParkingLot) error {
	return r.db.WithContext(ctx).Create(dao.ToParkingLotDAO(lot)).Error
}

func (r *parkingLotRepo) Update(ctx context.Context, lot *domain.ParkingLot) error {
	d := dao.ToParkingLotDAO(lot)
	result := r.db.WithContext(ctx).Model(d).Updates(map[string]any{
		"name":             d.Name,
		"address":          d.Address,
		"total_spaces":     d.TotalSpaces,
		"available_spaces": d.AvailableSpaces,
		"lot_type":         d.LotType,
		"status":           d.Status,
		"updated_at":       d.UpdatedAt,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrParkingLotNotFound
	}
	return nil
}

func (r *parkingLotRepo) FindByID(ctx context.Context, id string) (*domain.ParkingLot, error) {
	var d dao.ParkingLotDAO
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&d).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrParkingLotNotFound
		}
		return nil, err
	}
	return d.ToDomain(), nil
}

func (r *parkingLotRepo) FindByTenantID(ctx context.Context, tenantID string, filter repository.ParkingLotFilter) ([]*dao.ParkingLotWithStats, int64, error) {
	// 构建子查询获取出入口统计
	entryCountSubq := r.db.Table("gates").
		Select("COUNT(*)").
		Where("parking_lot_id = parking_lots.id AND type = ?", "entry")

	exitCountSubq := r.db.Table("gates").
		Select("COUNT(*)").
		Where("parking_lot_id = parking_lots.id AND type = ?", "exit")

	q := r.db.WithContext(ctx).
		Table("parking_lots").
		Select("parking_lots.*, (?) as entry_count, (?) as exit_count", entryCountSubq, exitCountSubq)

	// 平台管理员(tenantID为空)可查看所有租户数据
	if tenantID != "" {
		q = q.Where("tenant_id = ?", tenantID)
	}

	if filter.Status != nil {
		q = q.Where("status = ?", string(*filter.Status))
	}
	if filter.Keyword != "" {
		like := "%" + filter.Keyword + "%"
		q = q.Where("name LIKE ? OR address LIKE ?", like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if filter.Page > 0 && filter.PageSize > 0 {
		q = q.Offset((filter.Page - 1) * filter.PageSize).Limit(filter.PageSize)
	}

	q = q.Order("created_at DESC")

	var rows []dao.ParkingLotListDAO
	if err := q.Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	results := make([]*dao.ParkingLotWithStats, len(rows))
	for i := range rows {
		results[i] = rows[i].ToDomainWithStats()
	}
	return results, total, nil
}

func (r *parkingLotRepo) ExistsByName(ctx context.Context, tenantID, name string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&dao.ParkingLotDAO{}).
		Where("tenant_id = ? AND name = ?", tenantID, name).
		Count(&count).Error
	return count > 0, err
}

func (r *parkingLotRepo) Delete(ctx context.Context, id string) error {
	result := r.db.WithContext(ctx).Delete(&dao.ParkingLotDAO{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrParkingLotNotFound
	}
	return nil
}

func (r *parkingLotRepo) GetStats(ctx context.Context, tenantID string) (*repository.ParkingLotStats, error) {
	var stats repository.ParkingLotStats

	// 获取总车位和剩余车位（仅统计活跃车场）
	spaceQuery := r.db.WithContext(ctx).
		Table("parking_lots").
		Select("COALESCE(SUM(total_spaces), 0) as total_spaces, COALESCE(SUM(available_spaces), 0) as available_spaces").
		Where("status = ?", domain.ParkingLotStatusActive)
	if tenantID != "" {
		spaceQuery = spaceQuery.Where("tenant_id = ?", tenantID)
	}
	if err := spaceQuery.Scan(&stats).Error; err != nil {
		return nil, err
	}

	// 计算在场车辆
	stats.OccupiedVehicles = stats.TotalSpaces - stats.AvailableSpaces

	// 获取出入口总数（仅统计活跃车场的出入口）
	gateQuery := r.db.WithContext(ctx).
		Table("gates").
		Select("COUNT(*)").
		Joins("JOIN parking_lots ON parking_lots.id = gates.parking_lot_id").
		Where("parking_lots.status = ?", domain.ParkingLotStatusActive)
	if tenantID != "" {
		gateQuery = gateQuery.Where("parking_lots.tenant_id = ?", tenantID)
	}
	err := gateQuery.Scan(&stats.TotalGates).Error
	if err != nil {
		return nil, err
	}

	return &stats, nil
}
