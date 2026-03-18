package impl

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/service"
)

// Mock GateRepo

type mockGateRepo struct {
	gates map[string]*domain.Gate
}

func newMockGateRepo() *mockGateRepo {
	return &mockGateRepo{gates: make(map[string]*domain.Gate)}
}

func (m *mockGateRepo) Create(ctx context.Context, gate *domain.Gate) error {
	m.gates[gate.ID] = gate
	return nil
}

func (m *mockGateRepo) Update(ctx context.Context, gate *domain.Gate) error {
	if _, ok := m.gates[gate.ID]; !ok {
		return domain.ErrGateNotFound
	}
	m.gates[gate.ID] = gate
	return nil
}

func (m *mockGateRepo) FindByID(ctx context.Context, id string) (*domain.Gate, error) {
	if gate, ok := m.gates[id]; ok {
		return gate, nil
	}
	return nil, domain.ErrGateNotFound
}

func (m *mockGateRepo) FindByParkingLotID(ctx context.Context, parkingLotID string) ([]*domain.GateWithDevice, error) {
	var results []*domain.GateWithDevice
	for _, gate := range m.gates {
		if gate.ParkingLotID == parkingLotID {
			results = append(results, &domain.GateWithDevice{Gate: *gate})
		}
	}
	return results, nil
}

func (m *mockGateRepo) ExistsByName(ctx context.Context, parkingLotID, name string) (bool, error) {
	for _, gate := range m.gates {
		if gate.ParkingLotID == parkingLotID && gate.Name == name {
			return true, nil
		}
	}
	return false, nil
}

func (m *mockGateRepo) Delete(ctx context.Context, id string) error {
	delete(m.gates, id)
	return nil
}

func (m *mockGateRepo) CountByParkingLotID(ctx context.Context, parkingLotID string) (entryCount, exitCount int64, err error) {
	for _, gate := range m.gates {
		if gate.ParkingLotID == parkingLotID {
			if gate.Type == domain.GateTypeEntry {
				entryCount++
			} else {
				exitCount++
			}
		}
	}
	return
}

func (m *mockGateRepo) CountByParkingLotIDAndType(ctx context.Context, parkingLotID string, gateType domain.GateType) (int64, error) {
	var count int64
	for _, gate := range m.gates {
		if gate.ParkingLotID == parkingLotID && gate.Type == gateType {
			count++
		}
	}
	return count, nil
}

// Test helpers

func setupTestGateService() (service.GateService, *mockGateRepo, *mockParkingLotRepo) {
	gateRepo := newMockGateRepo()
	lotRepo := newMockParkingLotRepo()
	svc := NewGateService(gateRepo, lotRepo)
	return svc, gateRepo, lotRepo
}

func createTestGate(repo *mockGateRepo, id, parkingLotID, name string, gateType domain.GateType) *domain.Gate {
	gate := &domain.Gate{
		ID:           id,
		ParkingLotID: parkingLotID,
		Name:         name,
		Type:         gateType,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	repo.gates[id] = gate
	return gate
}

// Tests

func TestGateService_Create_Success(t *testing.T) {
	svc, _, _ := setupTestGateService()

	gate, err := svc.Create(context.Background(), &service.CreateGateRequest{
		ParkingLotID: "lot-1",
		Name:         "东入口",
		Type:         domain.GateTypeEntry,
	})

	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if gate.Name != "东入口" {
		t.Errorf("Name = %v, want 东入口", gate.Name)
	}
	if gate.Type != domain.GateTypeEntry {
		t.Errorf("Type = %v, want entry", gate.Type)
	}
	if gate.ParkingLotID != "lot-1" {
		t.Errorf("ParkingLotID = %v, want lot-1", gate.ParkingLotID)
	}
}

func TestGateService_Create_WithDevice(t *testing.T) {
	svc, _, _ := setupTestGateService()
	deviceID := "device-1"

	gate, err := svc.Create(context.Background(), &service.CreateGateRequest{
		ParkingLotID: "lot-1",
		Name:         "东入口",
		Type:         domain.GateTypeEntry,
		DeviceID:     &deviceID,
	})

	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if gate.DeviceID == nil || *gate.DeviceID != "device-1" {
		t.Errorf("DeviceID = %v, want device-1", gate.DeviceID)
	}
}

func TestGateService_Create_DuplicateName(t *testing.T) {
	svc, gateRepo, _ := setupTestGateService()
	createTestGate(gateRepo, "gate-1", "lot-1", "东入口", domain.GateTypeEntry)

	_, err := svc.Create(context.Background(), &service.CreateGateRequest{
		ParkingLotID: "lot-1",
		Name:         "东入口",
		Type:         domain.GateTypeExit,
	})

	if err == nil {
		t.Error("Create() should return error for duplicate name")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "GATE_NAME_EXISTS" {
		t.Errorf("error = %v, want GATE_NAME_EXISTS", err)
	}
}

func TestGateService_Create_SameNameDifferentLot(t *testing.T) {
	svc, gateRepo, _ := setupTestGateService()
	createTestGate(gateRepo, "gate-1", "lot-1", "东入口", domain.GateTypeEntry)

	gate, err := svc.Create(context.Background(), &service.CreateGateRequest{
		ParkingLotID: "lot-2",
		Name:         "东入口",
		Type:         domain.GateTypeEntry,
	})

	if err != nil {
		t.Fatalf("Create() error = %v, same name in different lot should be allowed", err)
	}
	if gate.ParkingLotID != "lot-2" {
		t.Errorf("ParkingLotID = %v, want lot-2", gate.ParkingLotID)
	}
}

func TestGateService_GetByID_Success(t *testing.T) {
	svc, gateRepo, _ := setupTestGateService()
	createTestGate(gateRepo, "gate-1", "lot-1", "东入口", domain.GateTypeEntry)

	gate, err := svc.GetByID(context.Background(), "gate-1")

	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if gate.Name != "东入口" {
		t.Errorf("Name = %v, want 东入口", gate.Name)
	}
}

func TestGateService_GetByID_NotFound(t *testing.T) {
	svc, _, _ := setupTestGateService()

	_, err := svc.GetByID(context.Background(), "nonexistent")

	if err == nil {
		t.Error("GetByID() should return error for nonexistent gate")
	}
}

func TestGateService_ListByParkingLotID_Success(t *testing.T) {
	svc, gateRepo, _ := setupTestGateService()
	createTestGate(gateRepo, "gate-1", "lot-1", "东入口", domain.GateTypeEntry)
	createTestGate(gateRepo, "gate-2", "lot-1", "西出口", domain.GateTypeExit)
	createTestGate(gateRepo, "gate-3", "lot-2", "南入口", domain.GateTypeEntry)

	gates, err := svc.ListByParkingLotID(context.Background(), "lot-1")

	if err != nil {
		t.Fatalf("ListByParkingLotID() error = %v", err)
	}
	if len(gates) != 2 {
		t.Errorf("len(gates) = %v, want 2", len(gates))
	}
}

func TestGateService_Update_Success(t *testing.T) {
	svc, gateRepo, _ := setupTestGateService()
	createTestGate(gateRepo, "gate-1", "lot-1", "东入口", domain.GateTypeEntry)

	gate, err := svc.Update(context.Background(), &service.UpdateGateRequest{
		ID:   "gate-1",
		Name: "东入口（改）",
	})

	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if gate.Name != "东入口（改）" {
		t.Errorf("Name = %v, want 东入口（改）", gate.Name)
	}
}

func TestGateService_Update_DuplicateName(t *testing.T) {
	svc, gateRepo, _ := setupTestGateService()
	createTestGate(gateRepo, "gate-1", "lot-1", "东入口", domain.GateTypeEntry)
	createTestGate(gateRepo, "gate-2", "lot-1", "西出口", domain.GateTypeExit)

	_, err := svc.Update(context.Background(), &service.UpdateGateRequest{
		ID:   "gate-1",
		Name: "西出口",
	})

	if err == nil {
		t.Error("Update() should return error for duplicate name")
	}
}

func TestGateService_Update_SameName_NoError(t *testing.T) {
	svc, gateRepo, _ := setupTestGateService()
	createTestGate(gateRepo, "gate-1", "lot-1", "东入口", domain.GateTypeEntry)

	gate, err := svc.Update(context.Background(), &service.UpdateGateRequest{
		ID:   "gate-1",
		Name: "东入口",
	})

	if err != nil {
		t.Fatalf("Update() should not error when name unchanged, got: %v", err)
	}
	if gate.Name != "东入口" {
		t.Errorf("Name = %v, want 东入口", gate.Name)
	}
}

func TestGateService_Delete_Success(t *testing.T) {
	svc, gateRepo, _ := setupTestGateService()
	createTestGate(gateRepo, "gate-1", "lot-1", "东入口", domain.GateTypeEntry)
	createTestGate(gateRepo, "gate-2", "lot-1", "南入口", domain.GateTypeEntry)
	createTestGate(gateRepo, "gate-3", "lot-1", "西出口", domain.GateTypeExit)

	err := svc.Delete(context.Background(), "gate-1")

	if err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if _, ok := gateRepo.gates["gate-1"]; ok {
		t.Error("gate should be deleted")
	}
}

func TestGateService_Delete_LastEntryGate(t *testing.T) {
	svc, gateRepo, _ := setupTestGateService()
	createTestGate(gateRepo, "gate-1", "lot-1", "东入口", domain.GateTypeEntry)
	createTestGate(gateRepo, "gate-2", "lot-1", "西出口", domain.GateTypeExit)

	err := svc.Delete(context.Background(), "gate-1")

	if err == nil {
		t.Error("Delete() should return error when deleting last entry gate")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "LAST_ENTRY_GATE" {
		t.Errorf("error = %v, want LAST_ENTRY_GATE", err)
	}
}

func TestGateService_Delete_LastExitGate(t *testing.T) {
	svc, gateRepo, _ := setupTestGateService()
	createTestGate(gateRepo, "gate-1", "lot-1", "东入口", domain.GateTypeEntry)
	createTestGate(gateRepo, "gate-2", "lot-1", "西出口", domain.GateTypeExit)

	err := svc.Delete(context.Background(), "gate-2")

	if err == nil {
		t.Error("Delete() should return error when deleting last exit gate")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "LAST_EXIT_GATE" {
		t.Errorf("error = %v, want LAST_EXIT_GATE", err)
	}
}

func TestGateService_Delete_NotFound(t *testing.T) {
	svc, _, _ := setupTestGateService()

	err := svc.Delete(context.Background(), "nonexistent")

	if err == nil {
		t.Error("Delete() should return error for nonexistent gate")
	}
}
