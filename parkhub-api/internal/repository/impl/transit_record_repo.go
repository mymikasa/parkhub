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

// TransitRecordRepoSet is the Wire provider set for TransitRecordRepo.
var TransitRecordRepoSet = wire.NewSet(NewTransitRecordRepo)

type transitRecordRepo struct {
	db *gorm.DB
}

func NewTransitRecordRepo(db *gorm.DB) repository.TransitRecordRepo {
	return &transitRecordRepo{db: db}
}

func (r *transitRecordRepo) Create(ctx context.Context, record *domain.TransitRecord) error {
	return r.db.WithContext(ctx).Create(dao.ToTransitRecordDAO(record)).Error
}

func (r *transitRecordRepo) FindByID(ctx context.Context, id string) (*domain.TransitRecordListItem, error) {
	var row dao.TransitRecordListDAO
	err := r.db.WithContext(ctx).
		Table("transit_records").
		Select("transit_records.*, parking_lots.name as parking_lot_name, gates.name as gate_name").
		Joins("LEFT JOIN parking_lots ON parking_lots.id = transit_records.parking_lot_id").
		Joins("LEFT JOIN gates ON gates.id = transit_records.gate_id").
		Where("transit_records.id = ?", id).
		First(&row).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrTransitRecordNotFound
		}
		return nil, err
	}
	return row.ToTransitRecordListItem(), nil
}

func (r *transitRecordRepo) FindAll(ctx context.Context, filter repository.TransitRecordFilter) ([]*domain.TransitRecordListItem, int64, error) {
	q := r.listQuery(ctx)

	if filter.TenantID != "" {
		q = q.Where("transit_records.tenant_id = ?", filter.TenantID)
	}
	if filter.ParkingLotID != "" {
		q = q.Where("transit_records.parking_lot_id = ?", filter.ParkingLotID)
	}
	if filter.PlateNumber != "" {
		q = q.Where("transit_records.plate_number LIKE ?", "%"+filter.PlateNumber+"%")
	}
	if filter.Type != nil {
		q = q.Where("transit_records.type = ?", string(*filter.Type))
	}
	if filter.Status != nil {
		q = q.Where("transit_records.status = ?", string(*filter.Status))
	}
	if filter.StartDate != nil {
		q = q.Where("transit_records.created_at >= ?", *filter.StartDate)
	}
	if filter.EndDate != nil {
		q = q.Where("transit_records.created_at <= ?", *filter.EndDate)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if filter.Page > 0 && filter.PageSize > 0 {
		q = q.Offset((filter.Page - 1) * filter.PageSize).Limit(filter.PageSize)
	}

	q = q.Order("transit_records.created_at DESC")

	var rows []dao.TransitRecordListDAO
	if err := q.Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	results := make([]*domain.TransitRecordListItem, len(rows))
	for i := range rows {
		results[i] = rows[i].ToTransitRecordListItem()
	}
	return results, total, nil
}

func (r *transitRecordRepo) FindLatest(ctx context.Context, tenantID string, limit int) ([]*domain.TransitRecordListItem, error) {
	q := r.listQuery(ctx)

	if tenantID != "" {
		q = q.Where("transit_records.tenant_id = ?", tenantID)
	}

	q = q.Order("transit_records.created_at DESC").Limit(limit)

	var rows []dao.TransitRecordListDAO
	if err := q.Find(&rows).Error; err != nil {
		return nil, err
	}

	results := make([]*domain.TransitRecordListItem, len(rows))
	for i := range rows {
		results[i] = rows[i].ToTransitRecordListItem()
	}
	return results, nil
}

func (r *transitRecordRepo) FindLatestUnmatchedEntry(ctx context.Context, parkingLotID, plateNumber string, before *time.Time) (*domain.TransitRecord, error) {
	var row dao.TransitRecordDAO
	q := r.db.WithContext(ctx).
		Table("transit_records t").
		Select("t.*").
		Where("t.parking_lot_id = ? AND t.plate_number = ? AND t.type = ?", parkingLotID, plateNumber, string(domain.TransitTypeEntry)).
		Where("NOT EXISTS (SELECT 1 FROM transit_records t2 WHERE t2.entry_record_id = t.id)")

	if before != nil {
		q = q.Where("t.created_at < ?", *before)
	}

	err := q.Order("t.created_at DESC").
		Limit(1).
		First(&row).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // 无匹配记录不是错误
		}
		return nil, err
	}
	return row.ToDomain(), nil
}

func (r *transitRecordRepo) Update(ctx context.Context, record *domain.TransitRecord) error {
	d := dao.ToTransitRecordDAO(record)
	result := r.db.WithContext(ctx).Model(d).Updates(map[string]any{
		"plate_number":    d.PlateNumber,
		"status":          d.Status,
		"fee":             d.Fee,
		"entry_record_id": d.EntryRecordID,
		"parking_duration": d.ParkingDuration,
		"remark":          d.Remark,
		"resolved_at":     d.ResolvedAt,
		"resolved_by":     d.ResolvedBy,
		"updated_at":      d.UpdatedAt,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrTransitRecordNotFound
	}
	return nil
}

func (r *transitRecordRepo) CountTodayStats(ctx context.Context, tenantID string) (*repository.TransitStats, error) {
	type statsResult struct {
		EntryCount   int64   `gorm:"column:entry_count"`
		ExitCount    int64   `gorm:"column:exit_count"`
		TodayRevenue float64 `gorm:"column:today_revenue"`
	}

	today := time.Now().Format("2006-01-02")

	var result statsResult
	q := r.db.WithContext(ctx).
		Table("transit_records").
		Select(`
			COUNT(CASE WHEN type = 'entry' AND DATE(created_at) = ? THEN 1 END) as entry_count,
			COUNT(CASE WHEN type = 'exit' AND DATE(created_at) = ? THEN 1 END) as exit_count,
			COALESCE(SUM(CASE WHEN type = 'exit' AND DATE(created_at) = ? THEN fee END), 0) as today_revenue
		`, today, today, today)

	if tenantID != "" {
		q = q.Where("tenant_id = ?", tenantID)
	}

	if err := q.Scan(&result).Error; err != nil {
		return nil, err
	}

	// 在场车辆：有入场记录但无匹配出场记录
	var onSiteCount int64
	q2 := r.db.WithContext(ctx).
		Table("transit_records t").
		Where("t.type = ? AND t.status IN ?", string(domain.TransitTypeEntry), []string{
			string(domain.TransitStatusNormal),
			string(domain.TransitStatusNoExit),
		}).
		Where("NOT EXISTS (SELECT 1 FROM transit_records t2 WHERE t2.entry_record_id = t.id)")

	if tenantID != "" {
		q2 = q2.Where("t.tenant_id = ?", tenantID)
	}

	if err := q2.Count(&onSiteCount).Error; err != nil {
		return nil, err
	}

	return &repository.TransitStats{
		EntryCount:   result.EntryCount,
		ExitCount:    result.ExitCount,
		OnSiteCount:  onSiteCount,
		TodayRevenue: result.TodayRevenue,
	}, nil
}

func (r *transitRecordRepo) FindOverstay(ctx context.Context, tenantID string, threshold time.Time) ([]*domain.TransitRecordListItem, error) {
	q := r.listQuery(ctx).
		Where("transit_records.type = ?", string(domain.TransitTypeEntry)).
		Where("transit_records.status IN ?", []string{
			string(domain.TransitStatusNormal),
			string(domain.TransitStatusNoExit),
		}).
		Where("transit_records.created_at < ?", threshold).
		Where("NOT EXISTS (SELECT 1 FROM transit_records t2 WHERE t2.entry_record_id = transit_records.id)")

	if tenantID != "" {
		q = q.Where("transit_records.tenant_id = ?", tenantID)
	}

	q = q.Order("transit_records.created_at ASC")

	var rows []dao.TransitRecordListDAO
	if err := q.Find(&rows).Error; err != nil {
		return nil, err
	}

	results := make([]*domain.TransitRecordListItem, len(rows))
	for i := range rows {
		results[i] = rows[i].ToTransitRecordListItem()
	}
	return results, nil
}

func (r *transitRecordRepo) CountExceptions(ctx context.Context, tenantID string) (int64, error) {
	var count int64
	q := r.db.WithContext(ctx).
		Table("transit_records").
		Where("status IN ?", []string{
			string(domain.TransitStatusNoExit),
			string(domain.TransitStatusNoEntry),
			string(domain.TransitStatusRecognitionFailed),
		}).
		Where("resolved_at IS NULL")

	if tenantID != "" {
		q = q.Where("tenant_id = ?", tenantID)
	}

	if err := q.Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *transitRecordRepo) FindUnmatchedEntriesBefore(ctx context.Context, threshold time.Time) ([]*domain.TransitRecord, error) {
	var rows []dao.TransitRecordDAO
	err := r.db.WithContext(ctx).
		Table("transit_records t").
		Select("t.*").
		Where("t.type = ? AND t.status = ?", string(domain.TransitTypeEntry), string(domain.TransitStatusNormal)).
		Where("t.created_at < ?", threshold).
		Where("NOT EXISTS (SELECT 1 FROM transit_records t2 WHERE t2.entry_record_id = t.id)").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}

	results := make([]*domain.TransitRecord, len(rows))
	for i := range rows {
		results[i] = rows[i].ToDomain()
	}
	return results, nil
}

// listQuery 构建带关联名称的基础查询
func (r *transitRecordRepo) listQuery(ctx context.Context) *gorm.DB {
	return r.db.WithContext(ctx).
		Table("transit_records").
		Select("transit_records.*, parking_lots.name as parking_lot_name, gates.name as gate_name").
		Joins("LEFT JOIN parking_lots ON parking_lots.id = transit_records.parking_lot_id").
		Joins("LEFT JOIN gates ON gates.id = transit_records.gate_id")
}
