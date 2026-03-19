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

// BillingRuleRepoSet is the Wire provider set for BillingRuleRepo.
var BillingRuleRepoSet = wire.NewSet(NewBillingRuleRepo)

type billingRuleRepo struct {
	db *gorm.DB
}

func NewBillingRuleRepo(db *gorm.DB) repository.BillingRuleRepo {
	return &billingRuleRepo{db: db}
}

func (r *billingRuleRepo) Create(ctx context.Context, rule *domain.BillingRule) error {
	return r.db.WithContext(ctx).Create(dao.ToBillingRuleDAO(rule)).Error
}

func (r *billingRuleRepo) Update(ctx context.Context, rule *domain.BillingRule) error {
	d := dao.ToBillingRuleDAO(rule)
	result := r.db.WithContext(ctx).Model(d).Updates(map[string]any{
		"free_minutes":   d.FreeMinutes,
		"price_per_hour": d.PricePerHour,
		"daily_cap":      d.DailyCap,
		"updated_at":     d.UpdatedAt,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrBillingRuleNotFound
	}
	return nil
}

func (r *billingRuleRepo) FindByID(ctx context.Context, id string) (*domain.BillingRule, error) {
	var d dao.BillingRuleDAO
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&d).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrBillingRuleNotFound
		}
		return nil, err
	}
	return d.ToDomain(), nil
}

func (r *billingRuleRepo) FindByParkingLotID(ctx context.Context, parkingLotID string) (*domain.BillingRule, error) {
	var d dao.BillingRuleDAO
	if err := r.db.WithContext(ctx).Where("parking_lot_id = ?", parkingLotID).First(&d).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrBillingRuleNotFound
		}
		return nil, err
	}
	return d.ToDomain(), nil
}
