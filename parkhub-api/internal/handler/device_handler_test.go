package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/service"
)

type stubDeviceService struct {
	bindFn   func(ctx context.Context, req *service.BindDeviceRequest) (*domain.Device, error)
	unbindFn func(ctx context.Context, req *service.UnbindDeviceRequest) (*domain.Device, error)
}

func (s *stubDeviceService) Create(ctx context.Context, req *service.CreateDeviceRequest) (*domain.Device, error) {
	return nil, nil
}

func (s *stubDeviceService) GetByID(ctx context.Context, req *service.GetDeviceRequest) (*domain.Device, error) {
	return nil, nil
}

func (s *stubDeviceService) List(ctx context.Context, req *service.ListDevicesRequest) (*service.DeviceListResponse, error) {
	return nil, nil
}

func (s *stubDeviceService) UpdateName(ctx context.Context, req *service.UpdateDeviceNameRequest) (*domain.Device, error) {
	return nil, nil
}

func (s *stubDeviceService) Bind(ctx context.Context, req *service.BindDeviceRequest) (*domain.Device, error) {
	return s.bindFn(ctx, req)
}

func (s *stubDeviceService) Unbind(ctx context.Context, req *service.UnbindDeviceRequest) (*domain.Device, error) {
	return s.unbindFn(ctx, req)
}

func (s *stubDeviceService) GetStats(ctx context.Context, tenantID string) (*service.DeviceStatsResponse, error) {
	return nil, nil
}

// stubDeviceControlService is a stub implementation for the tests
type stubDeviceControlService struct{}

func (s *stubDeviceControlService) Control(ctx context.Context, req *service.ControlDeviceRequest) (*service.ControlDeviceResponse, error) {
	return &service.ControlDeviceResponse{Success: true}, nil
}

func TestDeviceHandler_Bind_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &stubDeviceService{
		bindFn: func(ctx context.Context, req *service.BindDeviceRequest) (*domain.Device, error) {
			if req.OperatorRole != "platform_admin" {
				t.Fatalf("OperatorRole = %v, want platform_admin", req.OperatorRole)
			}
			device := domain.NewDevice(req.ID, req.TargetTenantID)
			device.Bind(req.TargetTenantID, req.ParkingLotID, req.GateID)
			return device, nil
		},
	}
	controlSvc := &stubDeviceControlService{}
	handler := NewDeviceHandler(svc, controlSvc)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("role", "platform_admin")
		c.Set("tenant_id", "")
	})
	router.POST("/devices/:id/bind", handler.Bind)

	body, _ := json.Marshal(map[string]string{
		"tenant_id":      "tenant-1",
		"parking_lot_id": "lot-1",
		"gate_id":        "gate-1",
	})
	req := httptest.NewRequest(http.MethodPost, "/devices/device-1/bind", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("status = %v, want 200", resp.Code)
	}
	if !bytes.Contains(resp.Body.Bytes(), []byte(`"message":"设备绑定成功"`)) {
		t.Fatalf("body = %s", resp.Body.String())
	}
}

func TestDeviceHandler_Unbind_MapsDomainError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &stubDeviceService{
		unbindFn: func(ctx context.Context, req *service.UnbindDeviceRequest) (*domain.Device, error) {
			return nil, &domain.DomainError{Code: "DEVICE_NOT_BOUND", Message: "设备当前未绑定"}
		},
	}
	controlSvc := &stubDeviceControlService{}
	handler := NewDeviceHandler(svc, controlSvc)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("role", "tenant_admin")
		c.Set("tenant_id", "tenant-1")
	})
	router.POST("/devices/:id/unbind", handler.Unbind)

	req := httptest.NewRequest(http.MethodPost, "/devices/device-1/unbind", nil)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusBadRequest {
		t.Fatalf("status = %v, want 400", resp.Code)
	}
	if !bytes.Contains(resp.Body.Bytes(), []byte(`"code":40003`)) {
		t.Fatalf("body = %s", resp.Body.String())
	}
}
