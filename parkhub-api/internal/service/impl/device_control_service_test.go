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

// Mock DeviceRepo for control service tests

type mockDeviceRepoForControl struct {
	devices map[string]*domain.Device
}

func newMockDeviceRepoForControl() *mockDeviceRepoForControl {
	return &mockDeviceRepoForControl{devices: make(map[string]*domain.Device)}
}

func (m *mockDeviceRepoForControl) Create(ctx context.Context, device *domain.Device) error {
	m.devices[device.ID] = device
	return nil
}

func (m *mockDeviceRepoForControl) ExistsByID(ctx context.Context, id string) (bool, error) {
	_, ok := m.devices[id]
	return ok, nil
}

func (m *mockDeviceRepoForControl) FindByID(ctx context.Context, id string) (*domain.Device, error) {
	if device, ok := m.devices[id]; ok {
		return device, nil
	}
	return nil, domain.ErrDeviceNotFound
}

func (m *mockDeviceRepoForControl) FindByIDGlobal(ctx context.Context, id string) (*domain.Device, error) {
	return m.FindByID(ctx, id)
}

func (m *mockDeviceRepoForControl) FindAll(ctx context.Context, tenantID string, filter repository.DeviceFilter) ([]*domain.DeviceListItem, int64, error) {
	return nil, 0, nil
}

func (m *mockDeviceRepoForControl) Update(ctx context.Context, device *domain.Device) error {
	m.devices[device.ID] = device
	return nil
}

func (m *mockDeviceRepoForControl) UpdateHeartbeat(ctx context.Context, device *domain.Device) error {
	m.devices[device.ID] = device
	return nil
}

func (m *mockDeviceRepoForControl) FindTimedOutDevices(ctx context.Context, threshold time.Time) ([]*domain.Device, error) {
	return nil, nil
}

func (m *mockDeviceRepoForControl) BatchUpdateStatus(ctx context.Context, ids []string, status domain.DeviceStatus) error {
	return nil
}

func (m *mockDeviceRepoForControl) CountByStatus(ctx context.Context, tenantID string) (*repository.DeviceStats, error) {
	return nil, nil
}

func (m *mockDeviceRepoForControl) CountByGateID(ctx context.Context, gateID string) (int64, error) {
	return 0, nil
}

func (m *mockDeviceRepoForControl) FindByGateID(ctx context.Context, gateID string) ([]*domain.Device, error) {
	return nil, nil
}

func (m *mockDeviceRepoForControl) UnbindByGateID(ctx context.Context, gateID string) error {
	return nil
}

// Mock DeviceControlLogRepo

type mockDeviceControlLogRepo struct {
	logs      []*domain.DeviceControlLog
	createErr error
}

func newMockDeviceControlLogRepo() *mockDeviceControlLogRepo {
	return &mockDeviceControlLogRepo{logs: make([]*domain.DeviceControlLog, 0)}
}

func (m *mockDeviceControlLogRepo) Create(ctx context.Context, log *domain.DeviceControlLog) error {
	if m.createErr != nil {
		return m.createErr
	}
	m.logs = append(m.logs, log)
	return nil
}

func (m *mockDeviceControlLogRepo) FindByDeviceID(ctx context.Context, deviceID string, page, pageSize int) ([]*domain.DeviceControlLog, int64, error) {
	return nil, 0, nil
}

// Test helpers

func setupTestDeviceControlService() (service.DeviceControlService, *mockDeviceRepoForControl, *mockDeviceControlLogRepo) {
	deviceRepo := newMockDeviceRepoForControl()
	logRepo := newMockDeviceControlLogRepo()
	svc := NewDeviceControlService(deviceRepo, logRepo).(*deviceControlServiceImpl)
	return svc, deviceRepo, logRepo
}

func createOnlineDevice(repo *mockDeviceRepoForControl, id, tenantID string) *domain.Device {
	now := time.Now()
	device := &domain.Device{
		ID:            id,
		TenantID:      tenantID,
		Name:          "Test Device",
		Status:        domain.DeviceStatusActive,
		LastHeartbeat: &now,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	repo.devices[id] = device
	return device
}

func createOfflineDevice(repo *mockDeviceRepoForControl, id, tenantID string) *domain.Device {
	oldTime := time.Now().Add(-10 * time.Minute)
	device := &domain.Device{
		ID:            id,
		TenantID:      tenantID,
		Name:          "Offline Device",
		Status:        domain.DeviceStatusActive,
		LastHeartbeat: &oldTime,
		CreatedAt:     oldTime,
		UpdatedAt:     oldTime,
	}
	repo.devices[id] = device
	return device
}

// Tests

func TestDeviceControlService_Control_Success(t *testing.T) {
	svc, deviceRepo, logRepo := setupTestDeviceControlService()
	createOnlineDevice(deviceRepo, "device-1", "tenant-1")

	resp, err := svc.Control(context.Background(), &service.ControlDeviceRequest{
		DeviceID:     "device-1",
		TenantID:     "tenant-1",
		Command:      "open_gate",
		OperatorID:   "user-1",
		OperatorName: "Test User",
	})

	if err != nil {
		t.Fatalf("Control() error = %v", err)
	}
	if !resp.Success {
		t.Error("Control() should return success")
	}
	if len(logRepo.logs) != 1 {
		t.Errorf("Expected 1 log entry, got %d", len(logRepo.logs))
	}
	if logRepo.logs[0].Command != "open_gate" {
		t.Errorf("Log command = %v, want open_gate", logRepo.logs[0].Command)
	}
}

func TestDeviceControlService_Control_DeviceNotFound(t *testing.T) {
	svc, _, _ := setupTestDeviceControlService()

	_, err := svc.Control(context.Background(), &service.ControlDeviceRequest{
		DeviceID:     "nonexistent",
		TenantID:     "tenant-1",
		Command:      "open_gate",
		OperatorID:   "user-1",
		OperatorName: "Test User",
	})

	if err == nil {
		t.Fatal("Control() should return error for nonexistent device")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "DEVICE_NOT_FOUND" {
		t.Errorf("error = %v, want DEVICE_NOT_FOUND", err)
	}
}

func TestDeviceControlService_Control_WrongTenant(t *testing.T) {
	svc, deviceRepo, _ := setupTestDeviceControlService()
	createOnlineDevice(deviceRepo, "device-1", "tenant-1")

	_, err := svc.Control(context.Background(), &service.ControlDeviceRequest{
		DeviceID:     "device-1",
		TenantID:     "tenant-2",
		Command:      "open_gate",
		OperatorID:   "user-1",
		OperatorName: "Test User",
	})

	if err == nil {
		t.Fatal("Control() should return error for wrong tenant")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "FORBIDDEN" {
		t.Errorf("error = %v, want FORBIDDEN", err)
	}
}

func TestDeviceControlService_Control_PlatformAdminNoTenant(t *testing.T) {
	svc, deviceRepo, _ := setupTestDeviceControlService()
	createOnlineDevice(deviceRepo, "device-1", "tenant-1")

	resp, err := svc.Control(context.Background(), &service.ControlDeviceRequest{
		DeviceID:     "device-1",
		TenantID:     "", // Platform admin
		Command:      "open_gate",
		OperatorID:   "user-1",
		OperatorName: "Platform Admin",
	})

	if err != nil {
		t.Fatalf("Control() error = %v, platform admin should be able to control any device", err)
	}
	if !resp.Success {
		t.Error("Control() should return success for platform admin")
	}
}

func TestDeviceControlService_Control_OfflineDevice(t *testing.T) {
	svc, deviceRepo, logRepo := setupTestDeviceControlService()
	createOfflineDevice(deviceRepo, "device-1", "tenant-1")

	_, err := svc.Control(context.Background(), &service.ControlDeviceRequest{
		DeviceID:     "device-1",
		TenantID:     "tenant-1",
		Command:      "open_gate",
		OperatorID:   "user-1",
		OperatorName: "Test User",
	})

	if err == nil {
		t.Fatal("Control() should return error for offline device")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != domain.CodeDeviceOffline {
		t.Errorf("error = %v, want %s", err, domain.CodeDeviceOffline)
	}
	if len(logRepo.logs) != 1 {
		t.Fatalf("Expected 1 log entry for offline control attempt, got %d", len(logRepo.logs))
	}
	if logRepo.logs[0].Command != "open_gate" {
		t.Errorf("Log command = %v, want open_gate", logRepo.logs[0].Command)
	}
}

func TestDeviceControlService_Control_DisabledDevice(t *testing.T) {
	svc, deviceRepo, _ := setupTestDeviceControlService()
	now := time.Now()
	device := &domain.Device{
		ID:            "device-1",
		TenantID:      "tenant-1",
		Status:        domain.DeviceStatusDisabled,
		LastHeartbeat: &now,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	deviceRepo.devices["device-1"] = device

	_, err := svc.Control(context.Background(), &service.ControlDeviceRequest{
		DeviceID:     "device-1",
		TenantID:     "tenant-1",
		Command:      "open_gate",
		OperatorID:   "user-1",
		OperatorName: "Test User",
	})

	if err == nil {
		t.Fatal("Control() should return error for disabled device")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != domain.CodeDeviceOffline {
		t.Errorf("error = %v, want %s", err, domain.CodeDeviceOffline)
	}
}

func TestDeviceControlService_Control_InvalidCommand(t *testing.T) {
	svc, deviceRepo, logRepo := setupTestDeviceControlService()
	createOnlineDevice(deviceRepo, "device-1", "tenant-1")

	_, err := svc.Control(context.Background(), &service.ControlDeviceRequest{
		DeviceID:     "device-1",
		TenantID:     "tenant-1",
		Command:      "invalid_command",
		OperatorID:   "user-1",
		OperatorName: "Test User",
	})

	if err == nil {
		t.Fatal("Control() should return error for invalid command")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != domain.CodeInvalidCommand {
		t.Errorf("error = %v, want %s", err, domain.CodeInvalidCommand)
	}
	if len(logRepo.logs) != 0 {
		t.Fatalf("Expected 0 log entry for invalid command, got %d", len(logRepo.logs))
	}
}

func TestDeviceControlService_Control_LogCreateFailed(t *testing.T) {
	svc, deviceRepo, logRepo := setupTestDeviceControlService()
	createOnlineDevice(deviceRepo, "device-1", "tenant-1")
	logRepo.createErr = errors.New("insert failed")

	_, err := svc.Control(context.Background(), &service.ControlDeviceRequest{
		DeviceID:     "device-1",
		TenantID:     "tenant-1",
		Command:      "open_gate",
		OperatorID:   "user-1",
		OperatorName: "Test User",
	})

	if err == nil {
		t.Fatal("Control() should return error when log creation fails")
	}
	var domainErr *domain.DomainError
	if !errors.As(err, &domainErr) || domainErr.Code != "INTERNAL_ERROR" {
		t.Errorf("error = %v, want INTERNAL_ERROR", err)
	}
	if len(logRepo.logs) != 0 {
		t.Fatalf("Expected 0 persisted logs when create fails, got %d", len(logRepo.logs))
	}
}

func TestDeviceControlService_Control_LogPersistence(t *testing.T) {
	svc, deviceRepo, logRepo := setupTestDeviceControlService()
	createOnlineDevice(deviceRepo, "device-1", "tenant-1")

	_, err := svc.Control(context.Background(), &service.ControlDeviceRequest{
		DeviceID:     "device-1",
		TenantID:     "tenant-1",
		Command:      "open_gate",
		OperatorID:   "user-1",
		OperatorName: "Test User",
	})

	if err != nil {
		t.Fatalf("Control() error = %v", err)
	}

	if len(logRepo.logs) != 1 {
		t.Fatalf("Expected 1 log, got %d", len(logRepo.logs))
	}

	log := logRepo.logs[0]
	if log.DeviceID != "device-1" {
		t.Errorf("Log DeviceID = %v, want device-1", log.DeviceID)
	}
	if log.TenantID != "tenant-1" {
		t.Errorf("Log TenantID = %v, want tenant-1", log.TenantID)
	}
	if log.OperatorID != "user-1" {
		t.Errorf("Log OperatorID = %v, want user-1", log.OperatorID)
	}
	if log.OperatorName != "Test User" {
		t.Errorf("Log OperatorName = %v, want Test User", log.OperatorName)
	}
	if log.Command != "open_gate" {
		t.Errorf("Log Command = %v, want open_gate", log.Command)
	}
}

func TestDeviceControlService_isDeviceOnline(t *testing.T) {
	svc := &deviceControlServiceImpl{
		offlineTimeout: time.Duration(domain.DefaultHeartbeatTimeoutSeconds) * time.Second,
	}

	tests := []struct {
		name     string
		device   *domain.Device
		expected bool
	}{
		{
			name: "active with recent heartbeat",
			device: &domain.Device{
				Status:        domain.DeviceStatusActive,
				LastHeartbeat: ptrTime(time.Now()),
			},
			expected: true,
		},
		{
			name: "active with old heartbeat",
			device: &domain.Device{
				Status:        domain.DeviceStatusActive,
				LastHeartbeat: ptrTime(time.Now().Add(-10 * time.Minute)),
			},
			expected: false,
		},
		{
			name: "active with no heartbeat",
			device: &domain.Device{
				Status:        domain.DeviceStatusActive,
				LastHeartbeat: nil,
			},
			expected: false,
		},
		{
			name: "offline status",
			device: &domain.Device{
				Status:        domain.DeviceStatusOffline,
				LastHeartbeat: ptrTime(time.Now()),
			},
			expected: false,
		},
		{
			name: "pending status",
			device: &domain.Device{
				Status:        domain.DeviceStatusPending,
				LastHeartbeat: ptrTime(time.Now()),
			},
			expected: false,
		},
		{
			name: "disabled status",
			device: &domain.Device{
				Status:        domain.DeviceStatusDisabled,
				LastHeartbeat: ptrTime(time.Now()),
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := svc.isDeviceOnline(tt.device)
			if result != tt.expected {
				t.Errorf("isDeviceOnline() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func ptrTime(t time.Time) *time.Time {
	return &t
}
