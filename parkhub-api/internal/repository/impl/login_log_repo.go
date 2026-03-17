package impl

import (
	"context"

	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/repository/dao"
	"gorm.io/gorm"
)

// LoginLogRepoSet is the Wire provider set for LoginLogRepo.
var LoginLogRepoSet = wire.NewSet(NewLoginLogRepo)

type loginLogRepo struct {
	db *gorm.DB
}

func NewLoginLogRepo(db *gorm.DB) repository.LoginLogRepo {
	return &loginLogRepo{db: db}
}

func (r *loginLogRepo) Create(ctx context.Context, log *domain.LoginLog) error {
	return r.db.WithContext(ctx).Create(dao.ToLoginLogDAO(log)).Error
}

func (r *loginLogRepo) FindByUserID(ctx context.Context, userID string, page, pageSize int) ([]*domain.LoginLog, int64, error) {
	q := r.db.WithContext(ctx).Model(&dao.LoginLogDAO{}).Where("user_id = ?", userID)

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if page > 0 && pageSize > 0 {
		q = q.Offset((page - 1) * pageSize).Limit(pageSize)
	}

	q = q.Order("created_at DESC")

	var rows []dao.LoginLogDAO
	if err := q.Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	logs := make([]*domain.LoginLog, len(rows))
	for i := range rows {
		logs[i] = rows[i].ToDomain()
	}
	return logs, total, nil
}
