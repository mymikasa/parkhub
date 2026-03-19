package dao

import (
	"time"

	"github.com/parkhub/api/internal/domain"
)

// BillingRuleDAO is the GORM database model for the billing_rules table.
type BillingRuleDAO struct {
	ID           string    `gorm:"column:id;primaryKey"`
	TenantID     string    `gorm:"column:tenant_id"`
	ParkingLotID string    `gorm:"column:parking_lot_id"`
	FreeMinutes  int       `gorm:"column:free_minutes"`
	PricePerHour float64   `gorm:"column:price_per_hour"`
	DailyCap     float64   `gorm:"column:daily_cap"`
	CreatedAt    time.Time `gorm:"column:created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at"`
}

func (BillingRuleDAO) TableName() string { return "billing_rules" }

// ToBillingRuleDAO converts a domain.BillingRule to a BillingRuleDAO.
func ToBillingRuleDAO(b *domain.BillingRule) *BillingRuleDAO {
	return &BillingRuleDAO{
		ID:           b.ID,
		TenantID:     b.TenantID,
		ParkingLotID: b.ParkingLotID,
		FreeMinutes:  b.FreeMinutes,
		PricePerHour: b.PricePerHour,
		DailyCap:     b.DailyCap,
		CreatedAt:    b.CreatedAt,
		UpdatedAt:    b.UpdatedAt,
	}
}

// ToDomain converts a BillingRuleDAO to a domain.BillingRule.
func (d *BillingRuleDAO) ToDomain() *domain.BillingRule {
	return &domain.BillingRule{
		ID:           d.ID,
		TenantID:     d.TenantID,
		ParkingLotID: d.ParkingLotID,
		FreeMinutes:  d.FreeMinutes,
		PricePerHour: d.PricePerHour,
		DailyCap:     d.DailyCap,
		CreatedAt:    d.CreatedAt,
		UpdatedAt:    d.UpdatedAt,
	}
}
