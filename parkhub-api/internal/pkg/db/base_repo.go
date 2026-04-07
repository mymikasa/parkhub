package db

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/parkhub/api/internal/pkg/tenant"
)

// BaseRepo is embedded by all domain repositories to enforce tenant filtering.
//
// Usage:
//
//	type ParkingLotRepo struct {
//	    *BaseRepo
//	}
//
//	func (r *ParkingLotRepo) List(ctx context.Context) ([]ParkingLot, error) {
//	    var lots []ParkingLot
//	    err := r.WithTenant(ctx).Find(&lots).Error
//	    return lots, err
//	}
type BaseRepo struct {
	db *gorm.DB
}

// NewBaseRepo creates a BaseRepo backed by the given *gorm.DB.
func NewBaseRepo(db *gorm.DB) *BaseRepo {
	return &BaseRepo{db: db}
}

// DB returns the raw *gorm.DB without tenant filtering.
// Only for platform-level tables (e.g. tenants) or migrations.
// Business queries MUST use WithTenant().
func (r *BaseRepo) DB() *gorm.DB {
	return r.db
}

// WithTenant returns a *gorm.DB session with tenant_id filtering.
//
//   - Platform admin (IsPlatformAdmin=true): no filter, sees all data.
//   - Normal user (TenantID non-empty): WHERE tenant_id = <TenantID>.
//   - Missing TenantInfo: panics (programming error).
//   - Normal user with empty TenantID: panics (data inconsistency).
func (r *BaseRepo) WithTenant(ctx context.Context) *gorm.DB {
	info, ok := tenant.FromContext(ctx)
	if !ok {
		panic("db: tenant context missing — refusing unscoped query")
	}

	if info.IsPlatformAdmin {
		return r.db.WithContext(ctx)
	}

	if info.TenantID == "" {
		panic(fmt.Sprintf(
			"db: tenant_id empty for role=%s user=%s — refusing unscoped query",
			info.UserRole, info.UserID,
		))
	}

	return r.db.WithContext(ctx).Where("tenant_id = ?", info.TenantID)
}

// WithTenantExplicit allows platform admins to target a specific tenant.
// Non-admin callers have targetTenantID ignored — their own TenantID is used.
//
//   - Platform admin + targetTenantID non-empty: WHERE tenant_id = targetTenantID
//   - Platform admin + targetTenantID empty: no filter (see all)
//   - Non-admin: targetTenantID ignored, own TenantID enforced
//   - Missing TenantInfo: panics
func (r *BaseRepo) WithTenantExplicit(ctx context.Context, targetTenantID string) *gorm.DB {
	info, ok := tenant.FromContext(ctx)
	if !ok {
		panic("db: tenant context missing — refusing unscoped query")
	}

	if info.IsPlatformAdmin {
		if targetTenantID != "" {
			return r.db.WithContext(ctx).Where("tenant_id = ?", targetTenantID)
		}
		return r.db.WithContext(ctx)
	}

	if info.TenantID == "" {
		panic(fmt.Sprintf(
			"db: tenant_id empty for role=%s — refusing unscoped query",
			info.UserRole,
		))
	}
	return r.db.WithContext(ctx).Where("tenant_id = ?", info.TenantID)
}
