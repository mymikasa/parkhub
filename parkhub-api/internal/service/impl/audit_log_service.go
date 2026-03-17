package impl

import (
	"context"

	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/service"
)

// AuditLogServiceSet is the Wire provider set for AuditLogService.
var AuditLogServiceSet = wire.NewSet(NewAuditLogService)

type auditLogServiceImpl struct {
	auditLogRepo repository.AuditLogRepo
}

func NewAuditLogService(auditLogRepo repository.AuditLogRepo) service.AuditLogService {
	return &auditLogServiceImpl{
		auditLogRepo: auditLogRepo,
	}
}

func (s *auditLogServiceImpl) Log(ctx context.Context, log *domain.AuditLog) error {
	return s.auditLogRepo.Create(ctx, log)
}

func (s *auditLogServiceImpl) List(ctx context.Context, req *service.ListAuditLogsRequest) (*service.AuditLogListResponse, error) {
	filter := repository.AuditLogFilter{
		UserID:   req.UserID,
		Action:   req.Action,
		Page:     req.Page,
		PageSize: req.PageSize,
	}

	// tenant_admin 只能看到自己租户的审计日志
	if req.OperatorRole == string(domain.RoleTenantAdmin) {
		filter.TenantID = req.OperatorTenantID
	}

	logs, total, err := s.auditLogRepo.FindAll(ctx, filter)
	if err != nil {
		return nil, err
	}

	return &service.AuditLogListResponse{
		Items:    logs,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, nil
}
