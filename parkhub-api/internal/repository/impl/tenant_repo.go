package impl

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
)

// TenantRepoSet is the Wire provider set for TenantRepo.
var TenantRepoSet = wire.NewSet(NewTenantRepo)

type tenantRepo struct {
	db *sql.DB
}

func NewTenantRepo(db *sql.DB) repository.TenantRepo {
	return &tenantRepo{db: db}
}

func (r *tenantRepo) Create(ctx context.Context, tenant *domain.Tenant) error {
	query := `
		INSERT INTO tenants (id, company_name, contact_name, contact_phone, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	_, err := r.db.ExecContext(ctx, query,
		tenant.ID,
		tenant.CompanyName,
		tenant.ContactName,
		tenant.ContactPhone,
		string(tenant.Status),
		tenant.CreatedAt,
		tenant.UpdatedAt,
	)
	return err
}

func (r *tenantRepo) Update(ctx context.Context, tenant *domain.Tenant) error {
	query := `
		UPDATE tenants
		SET company_name = ?, contact_name = ?, contact_phone = ?, status = ?, updated_at = ?
		WHERE id = ?
	`
	result, err := r.db.ExecContext(ctx, query,
		tenant.CompanyName,
		tenant.ContactName,
		tenant.ContactPhone,
		string(tenant.Status),
		time.Now(),
		tenant.ID,
	)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return domain.ErrTenantNotFound
	}
	return nil
}

func (r *tenantRepo) FindByID(ctx context.Context, id string) (*domain.Tenant, error) {
	query := `
		SELECT id, company_name, contact_name, contact_phone, status, created_at, updated_at
		FROM tenants WHERE id = ?
	`
	tenant := &domain.Tenant{}
	var status string
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&tenant.ID,
		&tenant.CompanyName,
		&tenant.ContactName,
		&tenant.ContactPhone,
		&status,
		&tenant.CreatedAt,
		&tenant.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrTenantNotFound
		}
		return nil, err
	}
	tenant.Status = domain.TenantStatus(status)
	return tenant, nil
}

func (r *tenantRepo) FindAll(ctx context.Context, filter repository.TenantFilter) ([]*domain.Tenant, int64, error) {
	// TODO: Implement with proper filtering and pagination
	return nil, 0, nil
}

func (r *tenantRepo) ExistsByCompanyName(ctx context.Context, companyName string) (bool, error) {
	query := `SELECT COUNT(*) FROM tenants WHERE company_name = ?`
	var count int
	err := r.db.QueryRowContext(ctx, query, companyName).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
