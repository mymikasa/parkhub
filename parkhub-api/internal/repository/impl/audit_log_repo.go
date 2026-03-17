package impl

import (
	"context"

	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/repository/dao"
	"gorm.io/gorm"
)

// AuditLogRepoSet is the Wire provider set for AuditLogRepo.
var AuditLogRepoSet = wire.NewSet(NewAuditLogRepo)

type auditLogRepo struct {
	db *gorm.DB
}

func NewAuditLogRepo(db *gorm.DB) repository.AuditLogRepo {
	return &auditLogRepo{db: db}
}

func (r *auditLogRepo) Create(ctx context.Context, log *domain.AuditLog) error {
	return r.db.WithContext(ctx).Create(dao.ToAuditLogDAO(log)).Error
}

func (r *auditLogRepo) FindAll(ctx context.Context, filter repository.AuditLogFilter) ([]*domain.AuditLog, int64, error) {
	q := r.db.WithContext(ctx).Model(&dao.AuditLogDAO{})

	if filter.TenantID != "" {
		q = q.Where("tenant_id = ?", filter.TenantID)
	}
	if filter.UserID != "" {
		q = q.Where("user_id = ?", filter.UserID)
	}
	if filter.Action != "" {
		q = q.Where("action = ?", filter.Action)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if filter.Page > 0 && filter.PageSize > 0 {
		q = q.Offset((filter.Page - 1) * filter.PageSize).Limit(filter.PageSize)
	}

	q = q.Order("created_at DESC")

	var rows []dao.AuditLogDAO
	if err := q.Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	logs := make([]*domain.AuditLog, len(rows))
	for i := range rows {
		logs[i] = rows[i].ToDomain()
	}
	return logs, total, nil
}
