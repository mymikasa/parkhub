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

// RefreshTokenRepoSet is the Wire provider set for RefreshTokenRepo.
var RefreshTokenRepoSet = wire.NewSet(NewRefreshTokenRepo)

type refreshTokenRepo struct {
	db *gorm.DB
}

func NewRefreshTokenRepo(db *gorm.DB) repository.RefreshTokenRepo {
	return &refreshTokenRepo{db: db}
}

func (r *refreshTokenRepo) Create(ctx context.Context, token *domain.RefreshToken) error {
	return r.db.WithContext(ctx).Create(dao.ToRefreshTokenDAO(token)).Error
}

func (r *refreshTokenRepo) FindByTokenHash(ctx context.Context, tokenHash string) (*domain.RefreshToken, error) {
	var d dao.RefreshTokenDAO
	if err := r.db.WithContext(ctx).Where("token_hash = ?", tokenHash).First(&d).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return d.ToDomain(), nil
}

func (r *refreshTokenRepo) Revoke(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Model(&dao.RefreshTokenDAO{}).Where("id = ?", id).Update("revoked", true).Error
}

func (r *refreshTokenRepo) RevokeByUserID(ctx context.Context, userID string) error {
	return r.db.WithContext(ctx).Model(&dao.RefreshTokenDAO{}).Where("user_id = ?", userID).Update("revoked", true).Error
}

func (r *refreshTokenRepo) DeleteExpired(ctx context.Context) error {
	return r.db.WithContext(ctx).Where("expires_at < ? OR revoked = ?", time.Now(), true).Delete(&dao.RefreshTokenDAO{}).Error
}
