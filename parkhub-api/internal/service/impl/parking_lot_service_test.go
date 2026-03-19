package impl

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/repository/dao"
	"github.com/parkhub/api/internal/service"
)

// Mock ParkingLotRepo

type mockParkingLotRepo struct {
	lots map[string]*domain.ParkingLot
}

func newMockParkingLotRepo() *mockParkingLotRepo {
	return &mockParkingLotRepo{lots: make(map[string]*domain.ParkingLot)}
}

func (m *mockParkingLotRepo) Create(ctx context.Context, lot *domain.ParkingLot) error {
	m.lots[lot.ID] = lot
	return nil
}

func (m *mockParkingLotRepo) Update(ctx context.Context, lot *domain.ParkingLot) error {
	if _, ok := m.lots[lot.ID]; !ok {
		return domain.ErrParkingLotNotFound
	}
	m.lots[lot.ID] = lot
	return nil
}

func (m *mockParkingLotRepo) FindByID(ctx context.Context, id string) (*domain.ParkingLot, error) {
	if lot, ok := m.lots[id]; ok {
		return lot, nil
	}
	return nil, domain.ErrParkingLotNotFound
}

func (m *mockParkingLotRepo) FindByTenantID(ctx context.Context, tenantID string, filter repository.ParkingLotFilter) ([]*dao.ParkingLotWithStats, int64, error) {
	var results []*dao.ParkingLotWithStats
	for _, lot := range m.lots {
		if tenantID != "" && lot.TenantID != tenantID {
			continue
		}
		if filter.Status != nil && lot.Status != *filter.Status {
			continue
		}
		results = append(results, &dao.ParkingLotWithStats{
			ParkingLot: lot,
			EntryCount: 1,
			ExitCount:  1,
			UsageRate:  lot.UsageRate(),
		})
	}
	return results, int64(len(results)), nil
}

func (m *mockParkingLotRepo) ExistsByName(ctx context.Context, tenantID, name string) (bool, error) {
	for _, lot := range m.lots {
		if lot.TenantID == tenantID && lot.Name == name {
			return true, nil
		}
	}
	return false, nil
}

func (m *mockParkingLotRepo) Delete(ctx context.Context, id string) error {
	delete(m.lots, id)
	return nil
}

func (m *mockParkingLotRepo) GetStats(ctx context.Context, tenantID string) (*repository.ParkingLotStats, error) {
	var stats repository.ParkingLotStats
	for _, lot := range m.lots {
		if lot.TenantID == tenantID {
			stats.TotalSpaces += int64(lot.TotalSpaces)
			stats.AvailableSpaces += int64(lot.AvailableSpaces)
			stats.OccupiedVehicles += int64(lot.OccupiedVehicles())
		}
	}
	return &stats, nil
}

// Test helpers

func setupTestParkingLotService() (service.ParkingLotService, *mockParkingLotRepo) {
	repo := newMockParkingLotRepo()
	billingRepo := newMockBillingRuleRepo()
	svc := NewParkingLotService(repo, billingRepo)
	return svc, repo
}

func createTestParkingLot(repo *mockParkingLotRepo, id, tenantID, name string) *domain.ParkingLot {
	lot := &domain.ParkingLot{
		ID:              id,
		TenantID:        tenantID,
		Name:            name,
		Address:         "测试地址",
		TotalSpaces:     100,
		AvailableSpaces: 100,
		LotType:         domain.LotTypeUnderground,
		Status:          domain.ParkingLotStatusActive,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	repo.lots[id] = lot
	return lot
}

// Tests

func TestParkingLotService_Create_Success(t *testing.T) {
	svc, _ := setupTestParkingLotService()

	lot, err := svc.Create(context.Background(), &service.CreateParkingLotRequest{
		TenantID:    "tenant-1",
		Name:        "阳光停车场",
		Address:     "北京市朝阳区XX路1号",
		TotalSpaces: 200,
		LotType:     domain.LotTypeUnderground,
	})

	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if lot.Name != "阳光停车场" {
		t.Errorf("Name = %v, want 阳光停车场", lot.Name)
	}
	if lot.TotalSpaces != 200 {
		t.Errorf("TotalSpaces = %v, want 200", lot.TotalSpaces)
	}
	if lot.AvailableSpaces != 200 {
		t.Errorf("AvailableSpaces = %v, want 200", lot.AvailableSpaces)
	}
	if lot.Status != domain.ParkingLotStatusActive {
		t.Errorf("Status = %v, want active", lot.Status)
	}
}

func TestParkingLotService_Create_DuplicateName(t *testing.T) {
	svc, repo := setupTestParkingLotService()
	createTestParkingLot(repo, "lot-1", "tenant-1", "阳光停车场")

	_, err := svc.Create(context.Background(), &service.CreateParkingLotRequest{
		TenantID:    "tenant-1",
		Name:        "阳光停车场",
		Address:     "另一个地址",
		TotalSpaces: 100,
		LotType:     domain.LotTypeGround,
	})

	if err == nil {
		t.Error("Create() should return error for duplicate name")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "PARKING_LOT_NAME_EXISTS" {
		t.Errorf("error = %v, want PARKING_LOT_NAME_EXISTS", err)
	}
}

func TestParkingLotService_Create_SameNameDifferentTenant(t *testing.T) {
	svc, repo := setupTestParkingLotService()
	createTestParkingLot(repo, "lot-1", "tenant-1", "阳光停车场")

	lot, err := svc.Create(context.Background(), &service.CreateParkingLotRequest{
		TenantID:    "tenant-2",
		Name:        "阳光停车场",
		Address:     "上海市浦东新区",
		TotalSpaces: 150,
		LotType:     domain.LotTypeGround,
	})

	if err != nil {
		t.Fatalf("Create() error = %v, same name in different tenant should be allowed", err)
	}
	if lot.TenantID != "tenant-2" {
		t.Errorf("TenantID = %v, want tenant-2", lot.TenantID)
	}
}

func TestParkingLotService_Create_InvalidTotalSpaces(t *testing.T) {
	svc, _ := setupTestParkingLotService()

	_, err := svc.Create(context.Background(), &service.CreateParkingLotRequest{
		TenantID:    "tenant-1",
		Name:        "测试车场",
		Address:     "测试地址",
		TotalSpaces: 0,
		LotType:     domain.LotTypeUnderground,
	})

	if err == nil {
		t.Error("Create() should return error for zero total spaces")
	}
}

func TestParkingLotService_GetByID_Success(t *testing.T) {
	svc, repo := setupTestParkingLotService()
	createTestParkingLot(repo, "lot-1", "tenant-1", "阳光停车场")

	lot, err := svc.GetByID(context.Background(), "lot-1", "tenant-1")

	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if lot.Name != "阳光停车场" {
		t.Errorf("Name = %v, want 阳光停车场", lot.Name)
	}
}

func TestParkingLotService_GetByID_NotFound(t *testing.T) {
	svc, _ := setupTestParkingLotService()

	_, err := svc.GetByID(context.Background(), "nonexistent", "tenant-1")

	if err == nil {
		t.Error("GetByID() should return error for nonexistent lot")
	}
}

func TestParkingLotService_GetByID_TenantIsolation(t *testing.T) {
	svc, repo := setupTestParkingLotService()
	createTestParkingLot(repo, "lot-1", "tenant-1", "阳光停车场")

	_, err := svc.GetByID(context.Background(), "lot-1", "tenant-2")

	if err == nil {
		t.Error("GetByID() should return error for cross-tenant access")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "FORBIDDEN" {
		t.Errorf("error = %v, want FORBIDDEN", err)
	}
}

func TestParkingLotService_List_Success(t *testing.T) {
	svc, repo := setupTestParkingLotService()
	createTestParkingLot(repo, "lot-1", "tenant-1", "阳光停车场")
	createTestParkingLot(repo, "lot-2", "tenant-1", "星光停车场")
	createTestParkingLot(repo, "lot-3", "tenant-2", "月光停车场")

	resp, err := svc.List(context.Background(), &service.ListParkingLotsRequest{
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
		Page:             1,
		PageSize:         10,
	})

	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if resp.Total != 2 {
		t.Errorf("Total = %v, want 2", resp.Total)
	}
	if len(resp.Items) != 2 {
		t.Errorf("len(Items) = %v, want 2", len(resp.Items))
	}
}

func TestParkingLotService_List_PlatformAdminTenantFilter(t *testing.T) {
	svc, repo := setupTestParkingLotService()
	createTestParkingLot(repo, "lot-1", "tenant-1", "阳光停车场")
	createTestParkingLot(repo, "lot-2", "tenant-2", "月光停车场")

	resp, err := svc.List(context.Background(), &service.ListParkingLotsRequest{
		OperatorRole: "platform_admin",
		TenantID:     "tenant-2",
		Page:         1,
		PageSize:     10,
	})

	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if resp.Total != 1 {
		t.Fatalf("Total = %v, want 1", resp.Total)
	}
	if len(resp.Items) != 1 || resp.Items[0].ID != "lot-2" {
		t.Fatalf("Items = %+v, want only lot-2", resp.Items)
	}
}

func TestParkingLotService_Update_Success(t *testing.T) {
	svc, repo := setupTestParkingLotService()
	createTestParkingLot(repo, "lot-1", "tenant-1", "阳光停车场")

	lot, err := svc.Update(context.Background(), &service.UpdateParkingLotRequest{
		ID:          "lot-1",
		TenantID:    "tenant-1",
		Name:        "阳光停车场（新）",
		Address:     "新地址",
		TotalSpaces: 150,
		LotType:     domain.LotTypeGround,
		Status:      domain.ParkingLotStatusActive,
	})

	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if lot.Name != "阳光停车场（新）" {
		t.Errorf("Name = %v, want 阳光停车场（新）", lot.Name)
	}
	if lot.TotalSpaces != 150 {
		t.Errorf("TotalSpaces = %v, want 150", lot.TotalSpaces)
	}
}

func TestParkingLotService_Update_TenantIsolation(t *testing.T) {
	svc, repo := setupTestParkingLotService()
	createTestParkingLot(repo, "lot-1", "tenant-1", "阳光停车场")

	_, err := svc.Update(context.Background(), &service.UpdateParkingLotRequest{
		ID:          "lot-1",
		TenantID:    "tenant-2",
		Name:        "被修改的名称",
		Address:     "被修改的地址",
		TotalSpaces: 100,
		LotType:     domain.LotTypeUnderground,
		Status:      domain.ParkingLotStatusActive,
	})

	if err == nil {
		t.Error("Update() should return error for cross-tenant update")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "FORBIDDEN" {
		t.Errorf("error = %v, want FORBIDDEN", err)
	}
}

func TestParkingLotService_Update_DuplicateName(t *testing.T) {
	svc, repo := setupTestParkingLotService()
	createTestParkingLot(repo, "lot-1", "tenant-1", "阳光停车场")
	createTestParkingLot(repo, "lot-2", "tenant-1", "星光停车场")

	_, err := svc.Update(context.Background(), &service.UpdateParkingLotRequest{
		ID:          "lot-1",
		TenantID:    "tenant-1",
		Name:        "星光停车场",
		Address:     "测试地址",
		TotalSpaces: 100,
		LotType:     domain.LotTypeUnderground,
		Status:      domain.ParkingLotStatusActive,
	})

	if err == nil {
		t.Error("Update() should return error for duplicate name")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "PARKING_LOT_NAME_EXISTS" {
		t.Errorf("error = %v, want PARKING_LOT_NAME_EXISTS", err)
	}
}

func TestParkingLotService_Update_SameName_NoError(t *testing.T) {
	svc, repo := setupTestParkingLotService()
	createTestParkingLot(repo, "lot-1", "tenant-1", "阳光停车场")

	lot, err := svc.Update(context.Background(), &service.UpdateParkingLotRequest{
		ID:          "lot-1",
		TenantID:    "tenant-1",
		Name:        "阳光停车场",
		Address:     "新地址",
		TotalSpaces: 200,
		LotType:     domain.LotTypeUnderground,
		Status:      domain.ParkingLotStatusActive,
	})

	if err != nil {
		t.Fatalf("Update() should not error when name unchanged, got: %v", err)
	}
	if lot.TotalSpaces != 200 {
		t.Errorf("TotalSpaces = %v, want 200", lot.TotalSpaces)
	}
}

func TestParkingLotService_Update_StatusChange(t *testing.T) {
	svc, repo := setupTestParkingLotService()
	createTestParkingLot(repo, "lot-1", "tenant-1", "阳光停车场")

	lot, err := svc.Update(context.Background(), &service.UpdateParkingLotRequest{
		ID:          "lot-1",
		TenantID:    "tenant-1",
		Name:        "阳光停车场",
		Address:     "测试地址",
		TotalSpaces: 100,
		LotType:     domain.LotTypeUnderground,
		Status:      domain.ParkingLotStatusInactive,
	})

	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if lot.Status != domain.ParkingLotStatusInactive {
		t.Errorf("Status = %v, want inactive", lot.Status)
	}
}

func TestParkingLotService_Update_TotalSpacesLessThanOccupied(t *testing.T) {
	svc, repo := setupTestParkingLotService()
	lot := createTestParkingLot(repo, "lot-1", "tenant-1", "阳光停车场")
	lot.AvailableSpaces = 20 // 80 occupied

	_, err := svc.Update(context.Background(), &service.UpdateParkingLotRequest{
		ID:          "lot-1",
		TenantID:    "tenant-1",
		Name:        "阳光停车场",
		Address:     "测试地址",
		TotalSpaces: 50, // less than 80 occupied
		LotType:     domain.LotTypeUnderground,
		Status:      domain.ParkingLotStatusActive,
	})

	if err == nil {
		t.Error("Update() should return error when total spaces less than occupied")
	}
}

func TestParkingLotService_Delete_Success(t *testing.T) {
	svc, repo := setupTestParkingLotService()
	createTestParkingLot(repo, "lot-1", "tenant-1", "阳光停车场")

	err := svc.Delete(context.Background(), "lot-1", "tenant-1")

	if err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if _, ok := repo.lots["lot-1"]; ok {
		t.Error("lot should be deleted")
	}
}

func TestParkingLotService_Delete_TenantIsolation(t *testing.T) {
	svc, repo := setupTestParkingLotService()
	createTestParkingLot(repo, "lot-1", "tenant-1", "阳光停车场")

	err := svc.Delete(context.Background(), "lot-1", "tenant-2")

	if err == nil {
		t.Error("Delete() should return error for cross-tenant delete")
	}
	if _, ok := repo.lots["lot-1"]; !ok {
		t.Error("lot should not be deleted")
	}
}

func TestParkingLotService_Delete_HasVehicles(t *testing.T) {
	svc, repo := setupTestParkingLotService()
	lot := createTestParkingLot(repo, "lot-1", "tenant-1", "阳光停车场")
	lot.AvailableSpaces = 90 // 10 vehicles inside

	err := svc.Delete(context.Background(), "lot-1", "tenant-1")

	if err == nil {
		t.Error("Delete() should return error when vehicles are present")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "PARKING_LOT_HAS_VEHICLES" {
		t.Errorf("error = %v, want PARKING_LOT_HAS_VEHICLES", err)
	}
}

func TestParkingLotService_GetStats_Success(t *testing.T) {
	svc, repo := setupTestParkingLotService()
	lot1 := createTestParkingLot(repo, "lot-1", "tenant-1", "阳光停车场")
	lot1.AvailableSpaces = 80
	lot2 := createTestParkingLot(repo, "lot-2", "tenant-1", "星光停车场")
	lot2.TotalSpaces = 200
	lot2.AvailableSpaces = 150

	stats, err := svc.GetStats(context.Background(), "tenant-1")

	if err != nil {
		t.Fatalf("GetStats() error = %v", err)
	}
	if stats.TotalSpaces != 300 {
		t.Errorf("TotalSpaces = %v, want 300", stats.TotalSpaces)
	}
	if stats.AvailableSpaces != 230 {
		t.Errorf("AvailableSpaces = %v, want 230", stats.AvailableSpaces)
	}
	if stats.OccupiedVehicles != 70 {
		t.Errorf("OccupiedVehicles = %v, want 70", stats.OccupiedVehicles)
	}
}
