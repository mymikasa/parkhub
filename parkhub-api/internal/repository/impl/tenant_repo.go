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

// TenantRepoSet is the Wire provider set for TenantRepo.
var TenantRepoSet = wire.NewSet(NewTenantRepo)

type tenantRepo struct {
	db *gorm.DB
}

func NewTenantRepo(db *gorm.DB) repository.TenantRepo {
	return &tenantRepo{db: db}
}

func (r *tenantRepo) Create(ctx context.Context, tenant *domain.Tenant) error {
	return r.db.WithContext(ctx).Create(dao.ToTenantDAO(tenant)).Error
}

func (r *tenantRepo) Update(ctx context.Context, tenant *domain.Tenant) error {
	d := dao.ToTenantDAO(tenant)
	result := r.db.WithContext(ctx).Model(d).Updates(map[string]any{
		"company_name":  d.CompanyName,
		"contact_name":  d.ContactName,
		"contact_phone": d.ContactPhone,
		"status":        d.Status,
		"updated_at":    d.UpdatedAt,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrTenantNotFound
	}
	return nil
}

func (r *tenantRepo) FindByID(ctx context.Context, id string) (*domain.Tenant, error) {
	var d dao.TenantDAO
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&d).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrTenantNotFound
		}
		return nil, err
	}
	return d.ToDomain(), nil
}

func (r *tenantRepo) FindAll(ctx context.Context, filter repository.TenantFilter) ([]*domain.Tenant, int64, error) {
	q := r.db.WithContext(ctx).Model(&dao.TenantDAO{})
	if filter.Status != nil {
		q = q.Where("status = ?", string(*filter.Status))
	}
	if filter.Keyword != "" {
		like := "%" + filter.Keyword + "%"
		q = q.Where("company_name LIKE ? OR contact_name LIKE ?", like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if filter.Page > 0 && filter.PageSize > 0 {
		q = q.Offset((filter.Page - 1) * filter.PageSize).Limit(filter.PageSize)
	}

	var rows []dao.TenantDAO
	if err := q.Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	tenants := make([]*domain.Tenant, len(rows))
	for i := range rows {
		tenants[i] = rows[i].ToDomain()
	}
	return tenants, total, nil
}

func (r *tenantRepo) ExistsByCompanyName(ctx context.Context, companyName string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&dao.TenantDAO{}).Where("company_name = ?", companyName).Count(&count).Error
	return count > 0, err
}

func (r *tenantRepo) ExistsByCompanyNameExcluding(ctx context.Context, companyName string, excludeID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&dao.TenantDAO{}).
		Where("company_name = ? AND id != ?", companyName, excludeID).
		Count(&count).Error
	return count > 0, err
}
