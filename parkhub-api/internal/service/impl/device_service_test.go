package impl

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/service"
)

type mockDeviceRepo struct {
	devices map[string]*domain.Device
}

type mockAuditLogServiceForDevice struct {
	logs []*domain.AuditLog
}

func newMockAuditLogServiceForDevice() *mockAuditLogServiceForDevice {
	return &mockAuditLogServiceForDevice{logs: make([]*domain.AuditLog, 0)}
}

func (m *mockAuditLogServiceForDevice) Log(ctx context.Context, log *domain.AuditLog) error {
	m.logs = append(m.logs, log)
	return nil
}

func (m *mockAuditLogServiceForDevice) List(ctx context.Context, req *service.ListAuditLogsRequest) (*service.AuditLogListResponse, error) {
	return &service.AuditLogListResponse{}, nil
}

func newMockDeviceRepo() *mockDeviceRepo {
	return &mockDeviceRepo{devices: make(map[string]*domain.Device)}
}

func (m *mockDeviceRepo) Create(ctx context.Context, device *domain.Device) error {
	m.devices[device.ID] = device
	return nil
}

func (m *mockDeviceRepo) ExistsByID(ctx context.Context, id string) (bool, error) {
	_, ok := m.devices[id]
	return ok, nil
}

func (m *mockDeviceRepo) FindByID(ctx context.Context, id string) (*domain.Device, error) {
	device, ok := m.devices[id]
	if !ok {
		return nil, domain.ErrDeviceNotFound
	}
	return device, nil
}

func (m *mockDeviceRepo) FindByIDGlobal(ctx context.Context, id string) (*domain.Device, error) {
	device, ok := m.devices[id]
	if !ok {
		return nil, nil
	}
	return device, nil
}

func (m *mockDeviceRepo) FindAll(ctx context.Context, tenantID string, filter repository.DeviceFilter) ([]*domain.DeviceListItem, int64, error) {
	var items []*domain.DeviceListItem
	for _, device := range m.devices {
		if tenantID != "" && device.TenantID != tenantID {
			continue
		}
		items = append(items, &domain.DeviceListItem{Device: *device})
	}
	return items, int64(len(items)), nil
}

func (m *mockDeviceRepo) CountByGateID(ctx context.Context, gateID string) (int64, error) {
	var count int64
	for _, device := range m.devices {
		if device.GateID != nil && *device.GateID == gateID {
			count++
		}
	}
	return count, nil
}

func (m *mockDeviceRepo) FindByGateID(ctx context.Context, gateID string) ([]*domain.Device, error) {
	var items []*domain.Device
	for _, device := range m.devices {
		if device.GateID != nil && *device.GateID == gateID {
			items = append(items, device)
		}
	}
	return items, nil
}

func (m *mockDeviceRepo) Update(ctx context.Context, device *domain.Device) error {
	if _, ok := m.devices[device.ID]; !ok {
		return domain.ErrDeviceNotFound
	}
	m.devices[device.ID] = device
	return nil
}

func (m *mockDeviceRepo) Delete(ctx context.Context, id string) error {
	if _, ok := m.devices[id]; !ok {
		return domain.ErrDeviceNotFound
	}
	delete(m.devices, id)
	return nil
}

func (m *mockDeviceRepo) UpdateHeartbeat(ctx context.Context, device *domain.Device) error {
	return m.Update(ctx, device)
}

func (m *mockDeviceRepo) UnbindByGateID(ctx context.Context, gateID string) error {
	for _, device := range m.devices {
		if device.GateID != nil && *device.GateID == gateID {
			device.Unbind()
		}
	}
	return nil
}

func (m *mockDeviceRepo) FindTimedOutDevices(ctx context.Context, threshold time.Time) ([]*domain.Device, error) {
	return nil, nil
}

func (m *mockDeviceRepo) BatchUpdateStatus(ctx context.Context, ids []string, status domain.DeviceStatus) error {
	for _, id := range ids {
		if device, ok := m.devices[id]; ok {
			device.Status = status
		}
	}
	return nil
}

func (m *mockDeviceRepo) CountByStatus(ctx context.Context, tenantID string) (*repository.DeviceStats, error) {
	stats := &repository.DeviceStats{}
	for _, device := range m.devices {
		if tenantID != "" && device.TenantID != tenantID {
			continue
		}
		stats.Total++
		switch device.Status {
		case domain.DeviceStatusActive:
			stats.Active++
		case domain.DeviceStatusOffline:
			stats.Offline++
		case domain.DeviceStatusPending:
			stats.Pending++
		case domain.DeviceStatusDisabled:
			stats.Disabled++
		}
	}
	return stats, nil
}

func setupTestDeviceService() (service.DeviceService, *mockDeviceRepo, *mockTenantRepo, *mockParkingLotRepo, *mockGateRepo) {
	svc, deviceRepo, tenantRepo, parkingLotRepo, gateRepo, _ := setupTestDeviceServiceWithAudit()
	return svc, deviceRepo, tenantRepo, parkingLotRepo, gateRepo
}

func setupTestDeviceServiceWithAudit() (service.DeviceService, *mockDeviceRepo, *mockTenantRepo, *mockParkingLotRepo, *mockGateRepo, *mockAuditLogServiceForDevice) {
	deviceRepo := newMockDeviceRepo()
	tenantRepo := &mockTenantRepo{tenants: make(map[string]*domain.Tenant)}
	parkingLotRepo := newMockParkingLotRepo()
	gateRepo := newMockGateRepo()
	auditLogSvc := newMockAuditLogServiceForDevice()
	svc := NewDeviceService(deviceRepo, tenantRepo, parkingLotRepo, gateRepo, auditLogSvc)
	return svc, deviceRepo, tenantRepo, parkingLotRepo, gateRepo, auditLogSvc
}

func createTestDevice(repo *mockDeviceRepo, id, tenantID string, status domain.DeviceStatus) *domain.Device {
	device := domain.NewDevice(id, tenantID)
	device.Status = status
	repo.devices[id] = device
	return device
}

func TestDeviceService_BindPendingSuccess(t *testing.T) {
	svc, deviceRepo, tenantRepo, parkingLotRepo, gateRepo := setupTestDeviceService()
	createTestDevice(deviceRepo, "device-1", domain.PlatformTenantID, domain.DeviceStatusPending)
	tenantRepo.tenants["tenant-1"] = domain.NewTenant("tenant-1", "测试租户", "联系人", "13800138000")
	createTestParkingLot(parkingLotRepo, "lot-1", "tenant-1", "车场A")
	createTestGate(gateRepo, "gate-1", "lot-1", "东入口", domain.GateTypeEntry)

	device, err := svc.Bind(context.Background(), &service.BindDeviceRequest{
		ID:             "device-1",
		OperatorRole:   "platform_admin",
		TargetTenantID: "tenant-1",
		ParkingLotID:   "lot-1",
		GateID:         "gate-1",
	})

	if err != nil {
		t.Fatalf("Bind() error = %v", err)
	}
	if device.TenantID != "tenant-1" {
		t.Fatalf("TenantID = %v, want tenant-1", device.TenantID)
	}
	if device.Status != domain.DeviceStatusActive {
		t.Fatalf("Status = %v, want active", device.Status)
	}
	if device.GateID == nil || *device.GateID != "gate-1" {
		t.Fatalf("GateID = %v, want gate-1", device.GateID)
	}
}

func TestDeviceService_BindActiveReassignSuccess(t *testing.T) {
	svc, deviceRepo, tenantRepo, parkingLotRepo, gateRepo := setupTestDeviceService()
	device := createTestDevice(deviceRepo, "device-1", "tenant-1", domain.DeviceStatusActive)
	lotA := "lot-1"
	gateA := "gate-1"
	device.ParkingLotID = &lotA
	device.GateID = &gateA

	tenantRepo.tenants["tenant-1"] = domain.NewTenant("tenant-1", "测试租户", "联系人", "13800138000")
	createTestParkingLot(parkingLotRepo, "lot-1", "tenant-1", "车场A")
	createTestParkingLot(parkingLotRepo, "lot-2", "tenant-1", "车场B")
	createTestGate(gateRepo, "gate-1", "lot-1", "东入口", domain.GateTypeEntry)
	createTestGate(gateRepo, "gate-2", "lot-2", "西入口", domain.GateTypeEntry)

	updated, err := svc.Bind(context.Background(), &service.BindDeviceRequest{
		ID:               "device-1",
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
		TargetTenantID:   "tenant-1",
		ParkingLotID:     "lot-2",
		GateID:           "gate-2",
	})

	if err != nil {
		t.Fatalf("Bind() error = %v", err)
	}
	if updated.ParkingLotID == nil || *updated.ParkingLotID != "lot-2" {
		t.Fatalf("ParkingLotID = %v, want lot-2", updated.ParkingLotID)
	}
	if updated.GateID == nil || *updated.GateID != "gate-2" {
		t.Fatalf("GateID = %v, want gate-2", updated.GateID)
	}
}

func TestDeviceService_BindCapacityExceeded(t *testing.T) {
	svc, deviceRepo, tenantRepo, parkingLotRepo, gateRepo := setupTestDeviceService()
	createTestDevice(deviceRepo, "device-1", domain.PlatformTenantID, domain.DeviceStatusPending)
	for i := 2; i <= 4; i++ {
		device := createTestDevice(deviceRepo, "device-"+string(rune('0'+i)), "tenant-1", domain.DeviceStatusActive)
		gateID := "gate-1"
		lotID := "lot-1"
		device.GateID = &gateID
		device.ParkingLotID = &lotID
	}
	tenantRepo.tenants["tenant-1"] = domain.NewTenant("tenant-1", "测试租户", "联系人", "13800138000")
	createTestParkingLot(parkingLotRepo, "lot-1", "tenant-1", "车场A")
	createTestGate(gateRepo, "gate-1", "lot-1", "东入口", domain.GateTypeEntry)

	_, err := svc.Bind(context.Background(), &service.BindDeviceRequest{
		ID:             "device-1",
		OperatorRole:   "platform_admin",
		TargetTenantID: "tenant-1",
		ParkingLotID:   "lot-1",
		GateID:         "gate-1",
	})

	if err == nil {
		t.Fatal("Bind() error = nil, want capacity exceeded")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "DEVICE_GATE_CAPACITY_EXCEEDED" {
		t.Fatalf("error = %v, want DEVICE_GATE_CAPACITY_EXCEEDED", err)
	}
}

func TestDeviceService_BindRejectsInvalidStatus(t *testing.T) {
	svc, deviceRepo, tenantRepo, parkingLotRepo, gateRepo := setupTestDeviceService()
	createTestDevice(deviceRepo, "device-1", domain.PlatformTenantID, domain.DeviceStatusOffline)
	tenantRepo.tenants["tenant-1"] = domain.NewTenant("tenant-1", "测试租户", "联系人", "13800138000")
	createTestParkingLot(parkingLotRepo, "lot-1", "tenant-1", "车场A")
	createTestGate(gateRepo, "gate-1", "lot-1", "东入口", domain.GateTypeEntry)

	_, err := svc.Bind(context.Background(), &service.BindDeviceRequest{
		ID:             "device-1",
		OperatorRole:   "platform_admin",
		TargetTenantID: "tenant-1",
		ParkingLotID:   "lot-1",
		GateID:         "gate-1",
	})

	if err == nil {
		t.Fatal("Bind() error = nil, want invalid status")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "DEVICE_INVALID_STATUS" {
		t.Fatalf("error = %v, want DEVICE_INVALID_STATUS", err)
	}
}

func TestDeviceService_BindRejectsCrossTenantDeviceForTenantAdmin(t *testing.T) {
	svc, deviceRepo, tenantRepo, parkingLotRepo, gateRepo := setupTestDeviceService()
	createTestDevice(deviceRepo, "device-1", "tenant-2", domain.DeviceStatusActive)
	tenantRepo.tenants["tenant-1"] = domain.NewTenant("tenant-1", "租户1", "联系人", "13800138000")
	createTestParkingLot(parkingLotRepo, "lot-1", "tenant-1", "车场A")
	createTestGate(gateRepo, "gate-1", "lot-1", "东入口", domain.GateTypeEntry)

	_, err := svc.Bind(context.Background(), &service.BindDeviceRequest{
		ID:               "device-1",
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
		TargetTenantID:   "tenant-1",
		ParkingLotID:     "lot-1",
		GateID:           "gate-1",
	})

	if err == nil {
		t.Fatal("Bind() error = nil, want forbidden")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "FORBIDDEN" {
		t.Fatalf("error = %v, want FORBIDDEN", err)
	}
}

func TestDeviceService_UnbindSuccess(t *testing.T) {
	svc, deviceRepo, _, _, _ := setupTestDeviceService()
	device := createTestDevice(deviceRepo, "device-1", "tenant-1", domain.DeviceStatusActive)
	lotID := "lot-1"
	gateID := "gate-1"
	device.ParkingLotID = &lotID
	device.GateID = &gateID

	updated, err := svc.Unbind(context.Background(), &service.UnbindDeviceRequest{
		ID:               "device-1",
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
	})

	if err != nil {
		t.Fatalf("Unbind() error = %v", err)
	}
	if updated.TenantID != domain.PlatformTenantID {
		t.Fatalf("TenantID = %v, want %v", updated.TenantID, domain.PlatformTenantID)
	}
	if updated.Status != domain.DeviceStatusPending {
		t.Fatalf("Status = %v, want pending", updated.Status)
	}
	if updated.ParkingLotID != nil || updated.GateID != nil {
		t.Fatalf("binding = %v/%v, want nil", updated.ParkingLotID, updated.GateID)
	}
}

func TestDeviceService_Bind_WritesAuditLog(t *testing.T) {
	svc, deviceRepo, tenantRepo, parkingLotRepo, gateRepo, auditLogSvc := setupTestDeviceServiceWithAudit()
	createTestDevice(deviceRepo, "device-1", domain.PlatformTenantID, domain.DeviceStatusPending)
	tenantRepo.tenants["tenant-1"] = domain.NewTenant("tenant-1", "测试租户", "联系人", "13800138000")
	createTestParkingLot(parkingLotRepo, "lot-1", "tenant-1", "车场A")
	createTestGate(gateRepo, "gate-1", "lot-1", "东入口", domain.GateTypeEntry)

	_, err := svc.Bind(context.Background(), &service.BindDeviceRequest{
		ID:             "device-1",
		OperatorID:     "operator-1",
		OperatorIP:     "127.0.0.1",
		OperatorRole:   "platform_admin",
		TargetTenantID: "tenant-1",
		ParkingLotID:   "lot-1",
		GateID:         "gate-1",
	})
	if err != nil {
		t.Fatalf("Bind() error = %v", err)
	}

	if len(auditLogSvc.logs) != 1 {
		t.Fatalf("Expected 1 audit log, got %d", len(auditLogSvc.logs))
	}
	log := auditLogSvc.logs[0]
	if log.Action != domain.AuditActionDeviceBound {
		t.Fatalf("Action = %v, want %v", log.Action, domain.AuditActionDeviceBound)
	}
	if log.TargetType != "device" || log.TargetID != "device-1" {
		t.Fatalf("Target = %s/%s, want device/device-1", log.TargetType, log.TargetID)
	}
	var detail map[string]string
	if err := json.Unmarshal([]byte(log.Detail), &detail); err != nil {
		t.Fatalf("invalid detail json: %v", err)
	}
	if detail["parking_lot_id"] != "lot-1" || detail["gate_id"] != "gate-1" || detail["tenant_id"] != "tenant-1" {
		t.Fatalf("detail = %v", detail)
	}
}

func TestDeviceService_Unbind_WritesAuditLog(t *testing.T) {
	svc, deviceRepo, _, _, _, auditLogSvc := setupTestDeviceServiceWithAudit()
	device := createTestDevice(deviceRepo, "device-1", "tenant-1", domain.DeviceStatusActive)
	lotID := "lot-1"
	gateID := "gate-1"
	device.ParkingLotID = &lotID
	device.GateID = &gateID

	_, err := svc.Unbind(context.Background(), &service.UnbindDeviceRequest{
		ID:               "device-1",
		OperatorID:       "operator-1",
		OperatorIP:       "127.0.0.1",
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
	})
	if err != nil {
		t.Fatalf("Unbind() error = %v", err)
	}

	if len(auditLogSvc.logs) != 1 {
		t.Fatalf("Expected 1 audit log, got %d", len(auditLogSvc.logs))
	}
	log := auditLogSvc.logs[0]
	if log.Action != domain.AuditActionDeviceUnbound {
		t.Fatalf("Action = %v, want %v", log.Action, domain.AuditActionDeviceUnbound)
	}
	if log.TargetType != "device" || log.TargetID != "device-1" {
		t.Fatalf("Target = %s/%s, want device/device-1", log.TargetType, log.TargetID)
	}
	var detail map[string]string
	if err := json.Unmarshal([]byte(log.Detail), &detail); err != nil {
		t.Fatalf("invalid detail json: %v", err)
	}
	if detail["parking_lot_id"] != "lot-1" || detail["gate_id"] != "gate-1" || detail["tenant_id"] != "tenant-1" {
		t.Fatalf("detail = %v", detail)
	}
}

func TestDeviceService_Disable_Success(t *testing.T) {
	svc, deviceRepo, _, _, _ := setupTestDeviceService()
	createTestDevice(deviceRepo, "device-1", "tenant-1", domain.DeviceStatusActive)

	device, err := svc.Disable(context.Background(), &service.ChangeDeviceStatusRequest{
		ID:       "device-1",
		TenantID: "tenant-1",
	})
	if err != nil {
		t.Fatalf("Disable() error = %v", err)
	}
	if device.Status != domain.DeviceStatusDisabled {
		t.Fatalf("Status = %v, want disabled", device.Status)
	}
}

func TestDeviceService_Enable_FromDisabled_HeartbeatFreshToActive(t *testing.T) {
	svc, deviceRepo, _, _, _ := setupTestDeviceService()
	device := createTestDevice(deviceRepo, "device-1", "tenant-1", domain.DeviceStatusDisabled)
	now := time.Now().Add(-1 * time.Minute)
	device.LastHeartbeat = &now

	updated, err := svc.Enable(context.Background(), &service.ChangeDeviceStatusRequest{
		ID:       "device-1",
		TenantID: "tenant-1",
	})
	if err != nil {
		t.Fatalf("Enable() error = %v", err)
	}
	if updated.Status != domain.DeviceStatusActive {
		t.Fatalf("Status = %v, want active", updated.Status)
	}
}

func TestDeviceService_Enable_FromDisabled_HeartbeatExpiredToOffline(t *testing.T) {
	svc, deviceRepo, _, _, _ := setupTestDeviceService()
	device := createTestDevice(deviceRepo, "device-1", "tenant-1", domain.DeviceStatusDisabled)
	stale := time.Now().Add(-10 * time.Minute)
	device.LastHeartbeat = &stale

	updated, err := svc.Enable(context.Background(), &service.ChangeDeviceStatusRequest{
		ID:       "device-1",
		TenantID: "tenant-1",
	})
	if err != nil {
		t.Fatalf("Enable() error = %v", err)
	}
	if updated.Status != domain.DeviceStatusOffline {
		t.Fatalf("Status = %v, want offline", updated.Status)
	}
}

func TestDeviceService_Delete_RequiresUnbind(t *testing.T) {
	svc, deviceRepo, _, _, _ := setupTestDeviceService()
	device := createTestDevice(deviceRepo, "device-1", "tenant-1", domain.DeviceStatusActive)
	lotID := "lot-1"
	gateID := "gate-1"
	device.ParkingLotID = &lotID
	device.GateID = &gateID

	err := svc.Delete(context.Background(), &service.DeleteDeviceRequest{
		ID:       "device-1",
		TenantID: "tenant-1",
	})
	if err == nil {
		t.Fatal("Delete() error = nil, want DEVICE_MUST_UNBIND")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "DEVICE_MUST_UNBIND" {
		t.Fatalf("error = %v, want DEVICE_MUST_UNBIND", err)
	}
}

func TestDeviceService_Delete_Success(t *testing.T) {
	svc, deviceRepo, _, _, _ := setupTestDeviceService()
	createTestDevice(deviceRepo, "device-1", domain.PlatformTenantID, domain.DeviceStatusPending)

	err := svc.Delete(context.Background(), &service.DeleteDeviceRequest{
		ID:       "device-1",
		TenantID: "",
	})
	if err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if _, ok := deviceRepo.devices["device-1"]; ok {
		t.Fatal("device still exists after Delete()")
	}
}

func TestDeviceService_BatchDisable_TenantAdminSameLot_Success(t *testing.T) {
	svc, deviceRepo, _, _, _ := setupTestDeviceService()
	device1 := createTestDevice(deviceRepo, "device-1", "tenant-1", domain.DeviceStatusActive)
	device2 := createTestDevice(deviceRepo, "device-2", "tenant-1", domain.DeviceStatusOffline)
	lotID := "lot-1"
	device1.ParkingLotID = &lotID
	device2.ParkingLotID = &lotID

	err := svc.BatchDisable(context.Background(), &service.BatchChangeDeviceStatusRequest{
		IDs:              []string{"device-1", "device-2"},
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
	})
	if err != nil {
		t.Fatalf("BatchDisable() error = %v", err)
	}
	if deviceRepo.devices["device-1"].Status != domain.DeviceStatusDisabled {
		t.Fatalf("device-1 status = %v, want disabled", deviceRepo.devices["device-1"].Status)
	}
	if deviceRepo.devices["device-2"].Status != domain.DeviceStatusDisabled {
		t.Fatalf("device-2 status = %v, want disabled", deviceRepo.devices["device-2"].Status)
	}
}

func TestDeviceService_BatchDisable_TenantAdminCrossParkingLotForbidden(t *testing.T) {
	svc, deviceRepo, _, _, _ := setupTestDeviceService()
	device1 := createTestDevice(deviceRepo, "device-1", "tenant-1", domain.DeviceStatusActive)
	device2 := createTestDevice(deviceRepo, "device-2", "tenant-1", domain.DeviceStatusOffline)
	lotA := "lot-a"
	lotB := "lot-b"
	device1.ParkingLotID = &lotA
	device2.ParkingLotID = &lotB

	err := svc.BatchDisable(context.Background(), &service.BatchChangeDeviceStatusRequest{
		IDs:              []string{"device-1", "device-2"},
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
	})
	if err == nil {
		t.Fatal("BatchDisable() error = nil, want forbidden")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "FORBIDDEN" {
		t.Fatalf("error = %v, want FORBIDDEN", err)
	}
}

func TestDeviceService_BatchDisable_PlatformAdminCanCrossParkingLots(t *testing.T) {
	svc, deviceRepo, _, _, _ := setupTestDeviceService()
	device1 := createTestDevice(deviceRepo, "device-1", "tenant-1", domain.DeviceStatusActive)
	device2 := createTestDevice(deviceRepo, "device-2", "tenant-2", domain.DeviceStatusOffline)
	lotA := "lot-a"
	lotB := "lot-b"
	device1.ParkingLotID = &lotA
	device2.ParkingLotID = &lotB

	err := svc.BatchDisable(context.Background(), &service.BatchChangeDeviceStatusRequest{
		IDs:          []string{"device-1", "device-2"},
		OperatorRole: "platform_admin",
	})
	if err != nil {
		t.Fatalf("BatchDisable() error = %v", err)
	}
	if deviceRepo.devices["device-1"].Status != domain.DeviceStatusDisabled {
		t.Fatalf("device-1 status = %v, want disabled", deviceRepo.devices["device-1"].Status)
	}
	if deviceRepo.devices["device-2"].Status != domain.DeviceStatusDisabled {
		t.Fatalf("device-2 status = %v, want disabled", deviceRepo.devices["device-2"].Status)
	}
}

func TestDeviceService_BatchEnable_Success(t *testing.T) {
	svc, deviceRepo, _, _, _ := setupTestDeviceService()
	device1 := createTestDevice(deviceRepo, "device-1", "tenant-1", domain.DeviceStatusDisabled)
	device2 := createTestDevice(deviceRepo, "device-2", "tenant-1", domain.DeviceStatusDisabled)
	lotID := "lot-1"
	device1.ParkingLotID = &lotID
	device2.ParkingLotID = &lotID
	fresh := time.Now().Add(-1 * time.Minute)
	stale := time.Now().Add(-10 * time.Minute)
	device1.LastHeartbeat = &fresh
	device2.LastHeartbeat = &stale

	err := svc.BatchEnable(context.Background(), &service.BatchChangeDeviceStatusRequest{
		IDs:              []string{"device-1", "device-2"},
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
	})
	if err != nil {
		t.Fatalf("BatchEnable() error = %v", err)
	}
	if deviceRepo.devices["device-1"].Status != domain.DeviceStatusActive {
		t.Fatalf("device-1 status = %v, want active", deviceRepo.devices["device-1"].Status)
	}
	if deviceRepo.devices["device-2"].Status != domain.DeviceStatusOffline {
		t.Fatalf("device-2 status = %v, want offline", deviceRepo.devices["device-2"].Status)
	}
}

func TestDeviceService_BatchDelete_RequiresUnbind(t *testing.T) {
	svc, deviceRepo, _, _, _ := setupTestDeviceService()
	device := createTestDevice(deviceRepo, "device-1", "tenant-1", domain.DeviceStatusActive)
	lotID := "lot-1"
	gateID := "gate-1"
	device.ParkingLotID = &lotID
	device.GateID = &gateID

	err := svc.BatchDelete(context.Background(), &service.BatchDeleteDeviceRequest{
		IDs:              []string{"device-1"},
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
	})
	if err == nil {
		t.Fatal("BatchDelete() error = nil, want DEVICE_MUST_UNBIND")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "DEVICE_MUST_UNBIND" {
		t.Fatalf("error = %v, want DEVICE_MUST_UNBIND", err)
	}
}

func TestDeviceService_BatchBind_TenantAdminCrossParkingLotForbidden(t *testing.T) {
	svc, deviceRepo, _, _, _ := setupTestDeviceService()
	device1 := createTestDevice(deviceRepo, "device-1", domain.PlatformTenantID, domain.DeviceStatusPending)
	device2 := createTestDevice(deviceRepo, "device-2", domain.PlatformTenantID, domain.DeviceStatusActive)
	lotA := "lot-a"
	lotB := "lot-b"
	device1.ParkingLotID = &lotA
	device2.ParkingLotID = &lotB

	err := svc.BatchBind(context.Background(), &service.BatchBindDeviceRequest{
		IDs:              []string{"device-1", "device-2"},
		OperatorRole:     "tenant_admin",
		OperatorTenantID: "tenant-1",
		TargetTenantID:   "tenant-1",
		ParkingLotID:     "lot-x",
		GateID:           "gate-x",
	})
	if err == nil {
		t.Fatal("BatchBind() error = nil, want FORBIDDEN")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "FORBIDDEN" {
		t.Fatalf("error = %v, want FORBIDDEN", err)
	}
}
