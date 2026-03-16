package dao

import (
	"time"

	"github.com/parkhub/api/internal/domain"
)

// TenantDAO is the GORM database model for the tenants table.
type TenantDAO struct {
	ID           string    `gorm:"column:id;primaryKey"`
	CompanyName  string    `gorm:"column:company_name"`
	ContactName  string    `gorm:"column:contact_name"`
	ContactPhone string    `gorm:"column:contact_phone"`
	Status       string    `gorm:"column:status"`
	CreatedAt    time.Time `gorm:"column:created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at"`
}

func (TenantDAO) TableName() string { return "tenants" }

// ToTenantDAO converts a domain.Tenant to a TenantDAO.
func ToTenantDAO(t *domain.Tenant) *TenantDAO {
	return &TenantDAO{
		ID:           t.ID,
		CompanyName:  t.CompanyName,
		ContactName:  t.ContactName,
		ContactPhone: t.ContactPhone,
		Status:       string(t.Status),
		CreatedAt:    t.CreatedAt,
		UpdatedAt:    t.UpdatedAt,
	}
}

// ToDomain converts a TenantDAO to a domain.Tenant.
func (d *TenantDAO) ToDomain() *domain.Tenant {
	return &domain.Tenant{
		ID:           d.ID,
		CompanyName:  d.CompanyName,
		ContactName:  d.ContactName,
		ContactPhone: d.ContactPhone,
		Status:       domain.TenantStatus(d.Status),
		CreatedAt:    d.CreatedAt,
		UpdatedAt:    d.UpdatedAt,
	}
}
