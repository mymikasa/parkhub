package impl

import (
	"context"

	"github.com/google/uuid"
	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/service"
)

var TenantServiceSet = wire.NewSet(NewTenantService)

type tenantServiceImpl struct {
	tenantRepo repository.TenantRepo
}

func NewTenantService(tenantRepo repository.TenantRepo) service.TenantService {
	return &tenantServiceImpl{
		tenantRepo: tenantRepo,
	}
}

func (s *tenantServiceImpl) Create(ctx context.Context, req *service.CreateTenantRequest) (*domain.Tenant, error) {
	exists, err := s.tenantRepo.ExistsByCompanyName(ctx, req.CompanyName)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, &domain.DomainError{
			Code:    "COMPANY_NAME_EXISTS",
			Message: "公司名称已存在",
		}
	}

	tenant := domain.NewTenant(
		uuid.New().String(),
		req.CompanyName,
		req.ContactName,
		req.ContactPhone,
	)

	if err := s.tenantRepo.Create(ctx, tenant); err != nil {
		return nil, err
	}

	return tenant, nil
}

func (s *tenantServiceImpl) GetByID(ctx context.Context, id string) (*domain.Tenant, error) {
	tenant, err := s.tenantRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return tenant, nil
}

func (s *tenantServiceImpl) List(ctx context.Context, filter service.TenantFilter) (*service.TenantListResponse, error) {
	repoFilter := repository.TenantFilter{
		Status:   filter.Status,
		Keyword:  filter.Keyword,
		Page:     filter.Page,
		PageSize: filter.PageSize,
	}

	tenants, total, err := s.tenantRepo.FindAll(ctx, repoFilter)
	if err != nil {
		return nil, err
	}

	return &service.TenantListResponse{
		Items:    tenants,
		Total:    total,
		Page:     filter.Page,
		PageSize: filter.PageSize,
	}, nil
}

func (s *tenantServiceImpl) Update(ctx context.Context, id string, req *service.UpdateTenantRequest) (*domain.Tenant, error) {
	tenant, err := s.tenantRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Check for duplicate company name if it changed
	if req.CompanyName != tenant.CompanyName {
		exists, err := s.tenantRepo.ExistsByCompanyNameExcluding(ctx, req.CompanyName, id)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, &domain.DomainError{
				Code:    "COMPANY_NAME_EXISTS",
				Message: "公司名称已存在",
			}
		}
	}

	tenant.UpdateCompanyName(req.CompanyName)
	tenant.UpdateContact(req.ContactName, req.ContactPhone)

	if err := s.tenantRepo.Update(ctx, tenant); err != nil {
		return nil, err
	}

	return tenant, nil
}

func (s *tenantServiceImpl) Freeze(ctx context.Context, id string) error {
	tenant, err := s.tenantRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	if !tenant.IsActive() {
		return &domain.DomainError{
			Code:    "TENANT_ALREADY_FROZEN",
			Message: "租户已处于冻结状态",
		}
	}

	tenant.Freeze()
	return s.tenantRepo.Update(ctx, tenant)
}

func (s *tenantServiceImpl) Unfreeze(ctx context.Context, id string) error {
	tenant, err := s.tenantRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	if tenant.IsActive() {
		return &domain.DomainError{
			Code:    "TENANT_ALREADY_ACTIVE",
			Message: "租户已处于正常状态",
		}
	}

	tenant.Unfreeze()
	return s.tenantRepo.Update(ctx, tenant)
}
