package impl

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/service"
)

var BillingRuleServiceSet = wire.NewSet(NewBillingRuleService)

type billingRuleServiceImpl struct {
	billingRuleRepo repository.BillingRuleRepo
	parkingLotRepo  repository.ParkingLotRepo
	auditLogRepo    repository.AuditLogRepo
}

func NewBillingRuleService(
	billingRuleRepo repository.BillingRuleRepo,
	parkingLotRepo repository.ParkingLotRepo,
	auditLogRepo repository.AuditLogRepo,
) service.BillingRuleService {
	return &billingRuleServiceImpl{
		billingRuleRepo: billingRuleRepo,
		parkingLotRepo:  parkingLotRepo,
		auditLogRepo:    auditLogRepo,
	}
}

func (s *billingRuleServiceImpl) GetByParkingLotID(ctx context.Context, req *service.GetBillingRuleRequest) (*domain.BillingRule, error) {
	// 先验证停车场存在并检查租户权限
	lot, err := s.parkingLotRepo.FindByID(ctx, req.ParkingLotID)
	if err != nil {
		if err == domain.ErrParkingLotNotFound {
			return nil, &domain.DomainError{Code: domain.CodeBillingRuleNotFound, Message: "停车场不存在"}
		}
		return nil, err
	}

	// 多租户隔离校验
	if req.OperatorRole != "platform_admin" && lot.TenantID != req.OperatorTenantID {
		return nil, &domain.DomainError{Code: "FORBIDDEN", Message: "无权访问该停车场的计费规则"}
	}

	rule, err := s.billingRuleRepo.FindByParkingLotID(ctx, req.ParkingLotID)
	if err != nil {
		if err == domain.ErrBillingRuleNotFound {
			return nil, &domain.DomainError{Code: domain.CodeBillingRuleNotFound, Message: "计费规则不存在"}
		}
		return nil, err
	}

	return rule, nil
}

func (s *billingRuleServiceImpl) Update(ctx context.Context, req *service.UpdateBillingRuleRequest) (*domain.BillingRule, error) {
	rule, err := s.billingRuleRepo.FindByID(ctx, req.ID)
	if err != nil {
		if err == domain.ErrBillingRuleNotFound {
			return nil, &domain.DomainError{Code: domain.CodeBillingRuleNotFound, Message: "计费规则不存在"}
		}
		return nil, err
	}

	// 多租户隔离校验
	if req.OperatorRole != "platform_admin" && rule.TenantID != req.OperatorTenantID {
		return nil, &domain.DomainError{Code: "FORBIDDEN", Message: "无权修改该计费规则"}
	}

	// 记录变更前值
	before := map[string]interface{}{
		"free_minutes":   rule.FreeMinutes,
		"price_per_hour": rule.PricePerHour,
		"daily_cap":      rule.DailyCap,
	}

	// 更新
	if err := rule.Update(req.FreeMinutes, req.PricePerHour, req.DailyCap); err != nil {
		switch err {
		case domain.ErrInvalidFreeMinutes:
			return nil, &domain.DomainError{Code: domain.CodeInvalidFreeMinutes, Message: err.Error()}
		case domain.ErrInvalidPricePerHour:
			return nil, &domain.DomainError{Code: domain.CodeInvalidPricePerHour, Message: err.Error()}
		case domain.ErrInvalidDailyCap:
			return nil, &domain.DomainError{Code: domain.CodeInvalidDailyCap, Message: err.Error()}
		default:
			return nil, err
		}
	}

	if err := s.billingRuleRepo.Update(ctx, rule); err != nil {
		return nil, err
	}

	// 记录审计日志
	after := map[string]interface{}{
		"free_minutes":   rule.FreeMinutes,
		"price_per_hour": rule.PricePerHour,
		"daily_cap":      rule.DailyCap,
	}
	detail, _ := json.Marshal(map[string]interface{}{
		"before": before,
		"after":  after,
	})

	tenantID := req.OperatorTenantID
	var tenantIDPtr *string
	if tenantID != "" {
		tenantIDPtr = &tenantID
	}

	_ = s.auditLogRepo.Create(ctx, &domain.AuditLog{
		ID:         uuid.New().String(),
		UserID:     req.OperatorID,
		TenantID:   tenantIDPtr,
		Action:     domain.AuditActionBillingRuleUpdated,
		TargetType: "billing_rule",
		TargetID:   rule.ID,
		Detail:     string(detail),
		IP:         req.IP,
		CreatedAt:  time.Now(),
	})

	return rule, nil
}

func (s *billingRuleServiceImpl) Calculate(ctx context.Context, req *service.CalculateFeeRequest) (*domain.CalculateResult, error) {
	entryTime, err := time.Parse(time.RFC3339, req.EntryTime)
	if err != nil {
		return nil, &domain.DomainError{Code: domain.CodeInvalidTimeRange, Message: "入场时间格式无效"}
	}

	exitTime, err := time.Parse(time.RFC3339, req.ExitTime)
	if err != nil {
		return nil, &domain.DomainError{Code: domain.CodeInvalidTimeRange, Message: "出场时间格式无效"}
	}

	// 先验证停车场存在并检查租户权限
	lot, err := s.parkingLotRepo.FindByID(ctx, req.ParkingLotID)
	if err != nil {
		if err == domain.ErrParkingLotNotFound {
			return nil, &domain.DomainError{Code: domain.CodeBillingRuleNotFound, Message: "停车场不存在"}
		}
		return nil, err
	}

	if req.OperatorRole != "platform_admin" && lot.TenantID != req.OperatorTenantID {
		return nil, &domain.DomainError{Code: "FORBIDDEN", Message: "无权访问该停车场的计费规则"}
	}

	rule, err := s.billingRuleRepo.FindByParkingLotID(ctx, req.ParkingLotID)
	if err != nil {
		if err == domain.ErrBillingRuleNotFound {
			return nil, &domain.DomainError{Code: domain.CodeBillingRuleNotFound, Message: "该停车场无计费规则"}
		}
		return nil, err
	}

	result, err := rule.Calculate(entryTime, exitTime)
	if err != nil {
		if err == domain.ErrInvalidTimeRange {
			return nil, &domain.DomainError{Code: domain.CodeInvalidTimeRange, Message: err.Error()}
		}
		return nil, err
	}

	return result, nil
}
