package impl

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/service"
)

// Mock BillingRuleRepo

type mockBillingRuleRepo struct {
	rules map[string]*domain.BillingRule
}

func newMockBillingRuleRepo() *mockBillingRuleRepo {
	return &mockBillingRuleRepo{rules: make(map[string]*domain.BillingRule)}
}

func (m *mockBillingRuleRepo) Create(ctx context.Context, rule *domain.BillingRule) error {
	m.rules[rule.ID] = rule
	return nil
}

func (m *mockBillingRuleRepo) Update(ctx context.Context, rule *domain.BillingRule) error {
	if _, ok := m.rules[rule.ID]; !ok {
		return domain.ErrBillingRuleNotFound
	}
	m.rules[rule.ID] = rule
	return nil
}

func (m *mockBillingRuleRepo) FindByID(ctx context.Context, id string) (*domain.BillingRule, error) {
	if rule, ok := m.rules[id]; ok {
		return rule, nil
	}
	return nil, domain.ErrBillingRuleNotFound
}

func (m *mockBillingRuleRepo) FindByParkingLotID(ctx context.Context, parkingLotID string) (*domain.BillingRule, error) {
	for _, rule := range m.rules {
		if rule.ParkingLotID == parkingLotID {
			return rule, nil
		}
	}
	return nil, domain.ErrBillingRuleNotFound
}

// Mock AuditLogRepo

type mockAuditLogRepo struct {
	logs []*domain.AuditLog
}

func (m *mockAuditLogRepo) Create(ctx context.Context, log *domain.AuditLog) error {
	m.logs = append(m.logs, log)
	return nil
}

func (m *mockAuditLogRepo) FindAll(ctx context.Context, filter repository.AuditLogFilter) ([]*domain.AuditLog, int64, error) {
	return m.logs, int64(len(m.logs)), nil
}

// Test helpers

func setupTestBillingRuleService() (service.BillingRuleService, *mockBillingRuleRepo, *mockParkingLotRepo, *mockAuditLogRepo) {
	billingRepo := newMockBillingRuleRepo()
	parkingRepo := newMockParkingLotRepo()
	auditRepo := &mockAuditLogRepo{}
	svc := NewBillingRuleService(billingRepo, parkingRepo, auditRepo)
	return svc, billingRepo, parkingRepo, auditRepo
}

func createTestBillingRule(repo *mockBillingRuleRepo, id, tenantID, parkingLotID string) *domain.BillingRule {
	rule := domain.NewBillingRule(id, tenantID, parkingLotID)
	repo.rules[id] = rule
	return rule
}

// Tests - GetByParkingLotID

func TestBillingRuleService_GetByParkingLotID_Success(t *testing.T) {
	svc, billingRepo, parkingRepo, _ := setupTestBillingRuleService()
	createTestParkingLot(parkingRepo, "lot-1", "tenant-1", "阳光停车场")
	createTestBillingRule(billingRepo, "rule-1", "tenant-1", "lot-1")

	rule, err := svc.GetByParkingLotID(context.Background(), &service.GetBillingRuleRequest{
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
		ParkingLotID:     "lot-1",
	})

	if err != nil {
		t.Fatalf("GetByParkingLotID() error = %v", err)
	}
	if rule.FreeMinutes != 15 {
		t.Errorf("FreeMinutes = %v, want 15", rule.FreeMinutes)
	}
}

func TestBillingRuleService_GetByParkingLotID_TenantIsolation(t *testing.T) {
	svc, billingRepo, parkingRepo, _ := setupTestBillingRuleService()
	createTestParkingLot(parkingRepo, "lot-1", "tenant-1", "阳光停车场")
	createTestBillingRule(billingRepo, "rule-1", "tenant-1", "lot-1")

	_, err := svc.GetByParkingLotID(context.Background(), &service.GetBillingRuleRequest{
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-2",
		ParkingLotID:     "lot-1",
	})

	if err == nil {
		t.Error("should return error for cross-tenant access")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "FORBIDDEN" {
		t.Errorf("error = %v, want FORBIDDEN", err)
	}
}

func TestBillingRuleService_GetByParkingLotID_PlatformAdmin(t *testing.T) {
	svc, billingRepo, parkingRepo, _ := setupTestBillingRuleService()
	createTestParkingLot(parkingRepo, "lot-1", "tenant-1", "阳光停车场")
	createTestBillingRule(billingRepo, "rule-1", "tenant-1", "lot-1")

	rule, err := svc.GetByParkingLotID(context.Background(), &service.GetBillingRuleRequest{
		OperatorRole:     "platform_admin",
		OperatorTenantID: "",
		ParkingLotID:     "lot-1",
	})

	if err != nil {
		t.Fatalf("platform_admin should access any tenant, got error: %v", err)
	}
	if rule.ID != "rule-1" {
		t.Errorf("ID = %v, want rule-1", rule.ID)
	}
}

// Tests - Update

func TestBillingRuleService_Update_Success(t *testing.T) {
	svc, billingRepo, _, auditRepo := setupTestBillingRuleService()
	createTestBillingRule(billingRepo, "rule-1", "tenant-1", "lot-1")

	rule, err := svc.Update(context.Background(), &service.UpdateBillingRuleRequest{
		OperatorID:       "user-1",
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
		ID:               "rule-1",
		FreeMinutes:      30,
		PricePerHour:     5.00,
		DailyCap:         50.00,
		IP:               "127.0.0.1",
	})

	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if rule.FreeMinutes != 30 {
		t.Errorf("FreeMinutes = %v, want 30", rule.FreeMinutes)
	}
	if rule.PricePerHour != 5.00 {
		t.Errorf("PricePerHour = %v, want 5.00", rule.PricePerHour)
	}
	if rule.DailyCap != 50.00 {
		t.Errorf("DailyCap = %v, want 50.00", rule.DailyCap)
	}
	// 验证审计日志
	if len(auditRepo.logs) != 1 {
		t.Errorf("audit logs count = %v, want 1", len(auditRepo.logs))
	}
	if auditRepo.logs[0].Action != domain.AuditActionBillingRuleUpdated {
		t.Errorf("audit action = %v, want billing_rule_updated", auditRepo.logs[0].Action)
	}
}

func TestBillingRuleService_Update_TenantIsolation(t *testing.T) {
	svc, billingRepo, _, _ := setupTestBillingRuleService()
	createTestBillingRule(billingRepo, "rule-1", "tenant-1", "lot-1")

	_, err := svc.Update(context.Background(), &service.UpdateBillingRuleRequest{
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-2",
		ID:               "rule-1",
		FreeMinutes:      30,
		PricePerHour:     5.00,
		DailyCap:         50.00,
	})

	if err == nil {
		t.Error("should return error for cross-tenant update")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "FORBIDDEN" {
		t.Errorf("error = %v, want FORBIDDEN", err)
	}
}

func TestBillingRuleService_Update_InvalidFreeMinutes(t *testing.T) {
	svc, billingRepo, _, _ := setupTestBillingRuleService()
	createTestBillingRule(billingRepo, "rule-1", "tenant-1", "lot-1")

	_, err := svc.Update(context.Background(), &service.UpdateBillingRuleRequest{
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
		ID:               "rule-1",
		FreeMinutes:      150,
		PricePerHour:     5.00,
		DailyCap:         50.00,
	})

	if err == nil {
		t.Error("should return error for invalid free_minutes")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != domain.CodeInvalidFreeMinutes {
		t.Errorf("error = %v, want INVALID_FREE_MINUTES", err)
	}
}

func TestBillingRuleService_Update_NotFound(t *testing.T) {
	svc, _, _, _ := setupTestBillingRuleService()

	_, err := svc.Update(context.Background(), &service.UpdateBillingRuleRequest{
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
		ID:               "nonexistent",
		FreeMinutes:      15,
		PricePerHour:     2.00,
		DailyCap:         20.00,
	})

	if err == nil {
		t.Error("should return error for nonexistent rule")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != domain.CodeBillingRuleNotFound {
		t.Errorf("error = %v, want BILLING_RULE_NOT_FOUND", err)
	}
}

// Tests - Calculate

func TestBillingRuleService_Calculate_FreePark(t *testing.T) {
	svc, billingRepo, parkingRepo, _ := setupTestBillingRuleService()
	createTestParkingLot(parkingRepo, "lot-1", "tenant-1", "阳光停车场")
	createTestBillingRule(billingRepo, "rule-1", "tenant-1", "lot-1")

	entry := time.Date(2024, 1, 1, 8, 0, 0, 0, time.UTC)
	exit := entry.Add(10 * time.Minute)

	result, err := svc.Calculate(context.Background(), &service.CalculateFeeRequest{
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
		ParkingLotID:     "lot-1",
		EntryTime:        entry.Format(time.RFC3339),
		ExitTime:         exit.Format(time.RFC3339),
	})

	if err != nil {
		t.Fatalf("Calculate() error = %v", err)
	}
	if result.FinalFee != 0.00 {
		t.Errorf("FinalFee = %v, want 0.00", result.FinalFee)
	}
}

func TestBillingRuleService_Calculate_InvalidTimeRange(t *testing.T) {
	svc, billingRepo, parkingRepo, _ := setupTestBillingRuleService()
	createTestParkingLot(parkingRepo, "lot-1", "tenant-1", "阳光停车场")
	createTestBillingRule(billingRepo, "rule-1", "tenant-1", "lot-1")

	now := time.Now()

	_, err := svc.Calculate(context.Background(), &service.CalculateFeeRequest{
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
		ParkingLotID:     "lot-1",
		EntryTime:        now.Format(time.RFC3339),
		ExitTime:         now.Add(-1 * time.Hour).Format(time.RFC3339),
	})

	if err == nil {
		t.Error("should return error for exit before entry")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != domain.CodeInvalidTimeRange {
		t.Errorf("error = %v, want INVALID_TIME_RANGE", err)
	}
}

func TestBillingRuleService_Calculate_NoRule(t *testing.T) {
	svc, _, parkingRepo, _ := setupTestBillingRuleService()
	createTestParkingLot(parkingRepo, "lot-1", "tenant-1", "阳光停车场")

	now := time.Now()

	_, err := svc.Calculate(context.Background(), &service.CalculateFeeRequest{
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
		ParkingLotID:     "lot-1",
		EntryTime:        now.Format(time.RFC3339),
		ExitTime:         now.Add(1 * time.Hour).Format(time.RFC3339),
	})

	if err == nil {
		t.Error("should return error when no billing rule exists")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != domain.CodeBillingRuleNotFound {
		t.Errorf("error = %v, want BILLING_RULE_NOT_FOUND", err)
	}
}
