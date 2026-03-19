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
	bindFn         func(ctx context.Context, req *service.BindDeviceRequest) (*domain.Device, error)
	unbindFn       func(ctx context.Context, req *service.UnbindDeviceRequest) (*domain.Device, error)
	disableFn      func(ctx context.Context, req *service.ChangeDeviceStatusRequest) (*domain.Device, error)
	enableFn       func(ctx context.Context, req *service.ChangeDeviceStatusRequest) (*domain.Device, error)
	deleteFn       func(ctx context.Context, req *service.DeleteDeviceRequest) error
	batchDisableFn func(ctx context.Context, req *service.BatchChangeDeviceStatusRequest) error
	batchEnableFn  func(ctx context.Context, req *service.BatchChangeDeviceStatusRequest) error
	batchDeleteFn  func(ctx context.Context, req *service.BatchDeleteDeviceRequest) error
	batchBindFn    func(ctx context.Context, req *service.BatchBindDeviceRequest) error
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

func (s *stubDeviceService) Disable(ctx context.Context, req *service.ChangeDeviceStatusRequest) (*domain.Device, error) {
	if s.disableFn == nil {
		return nil, nil
	}
	return s.disableFn(ctx, req)
}

func (s *stubDeviceService) Enable(ctx context.Context, req *service.ChangeDeviceStatusRequest) (*domain.Device, error) {
	if s.enableFn == nil {
		return nil, nil
	}
	return s.enableFn(ctx, req)
}

func (s *stubDeviceService) Delete(ctx context.Context, req *service.DeleteDeviceRequest) error {
	if s.deleteFn == nil {
		return nil
	}
	return s.deleteFn(ctx, req)
}

func (s *stubDeviceService) BatchDisable(ctx context.Context, req *service.BatchChangeDeviceStatusRequest) error {
	if s.batchDisableFn == nil {
		return nil
	}
	return s.batchDisableFn(ctx, req)
}

func (s *stubDeviceService) BatchEnable(ctx context.Context, req *service.BatchChangeDeviceStatusRequest) error {
	if s.batchEnableFn == nil {
		return nil
	}
	return s.batchEnableFn(ctx, req)
}

func (s *stubDeviceService) BatchDelete(ctx context.Context, req *service.BatchDeleteDeviceRequest) error {
	if s.batchDeleteFn == nil {
		return nil
	}
	return s.batchDeleteFn(ctx, req)
}

func (s *stubDeviceService) BatchBind(ctx context.Context, req *service.BatchBindDeviceRequest) error {
	if s.batchBindFn == nil {
		return nil
	}
	return s.batchBindFn(ctx, req)
}

// stubDeviceControlService is a stub implementation for the tests
type stubDeviceControlService struct {
	listLogsFn func(ctx context.Context, req *service.ListDeviceControlLogsRequest) (*service.ListDeviceControlLogsResponse, error)
}

func (s *stubDeviceControlService) Control(ctx context.Context, req *service.ControlDeviceRequest) (*service.ControlDeviceResponse, error) {
	return &service.ControlDeviceResponse{Success: true}, nil
}

func (s *stubDeviceControlService) ListLogs(ctx context.Context, req *service.ListDeviceControlLogsRequest) (*service.ListDeviceControlLogsResponse, error) {
	if s.listLogsFn == nil {
		return &service.ListDeviceControlLogsResponse{}, nil
	}
	return s.listLogsFn(ctx, req)
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

func TestDeviceHandler_Delete_MapsDomainError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &stubDeviceService{
		deleteFn: func(ctx context.Context, req *service.DeleteDeviceRequest) error {
			return &domain.DomainError{Code: "DEVICE_MUST_UNBIND", Message: "设备已绑定，请先解绑后删除"}
		},
	}
	controlSvc := &stubDeviceControlService{}
	handler := NewDeviceHandler(svc, controlSvc)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("tenant_id", "tenant-1")
	})
	router.DELETE("/devices/:id", handler.Delete)

	req := httptest.NewRequest(http.MethodDelete, "/devices/device-1", nil)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusBadRequest {
		t.Fatalf("status = %v, want 400", resp.Code)
	}
	if !bytes.Contains(resp.Body.Bytes(), []byte(`"code":40003`)) {
		t.Fatalf("body = %s", resp.Body.String())
	}
}

func TestDeviceHandler_BatchDisable_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &stubDeviceService{
		batchDisableFn: func(ctx context.Context, req *service.BatchChangeDeviceStatusRequest) error {
			if req.OperatorRole != "tenant_admin" {
				t.Fatalf("OperatorRole = %v, want tenant_admin", req.OperatorRole)
			}
			if req.OperatorTenantID != "tenant-1" {
				t.Fatalf("OperatorTenantID = %v, want tenant-1", req.OperatorTenantID)
			}
			if len(req.IDs) != 2 || req.IDs[0] != "device-1" || req.IDs[1] != "device-2" {
				t.Fatalf("IDs = %v", req.IDs)
			}
			return nil
		},
	}
	controlSvc := &stubDeviceControlService{}
	handler := NewDeviceHandler(svc, controlSvc)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("role", "tenant_admin")
		c.Set("tenant_id", "tenant-1")
	})
	router.POST("/devices/batch-disable", handler.BatchDisable)

	body, _ := json.Marshal(map[string][]string{
		"ids": []string{"device-1", "device-2"},
	})
	req := httptest.NewRequest(http.MethodPost, "/devices/batch-disable", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("status = %v, want 200", resp.Code)
	}
	if !bytes.Contains(resp.Body.Bytes(), []byte(`"message":"设备已批量禁用"`)) {
		t.Fatalf("body = %s", resp.Body.String())
	}
}

func TestDeviceHandler_BatchDelete_MapsDomainError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &stubDeviceService{
		batchDeleteFn: func(ctx context.Context, req *service.BatchDeleteDeviceRequest) error {
			return &domain.DomainError{Code: "FORBIDDEN", Message: "tenant_admin仅可批量操作同一车场设备"}
		},
	}
	controlSvc := &stubDeviceControlService{}
	handler := NewDeviceHandler(svc, controlSvc)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("role", "tenant_admin")
		c.Set("tenant_id", "tenant-1")
	})
	router.POST("/devices/batch-delete", handler.BatchDelete)

	body, _ := json.Marshal(map[string][]string{
		"ids": []string{"device-1", "device-2"},
	})
	req := httptest.NewRequest(http.MethodPost, "/devices/batch-delete", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusForbidden {
		t.Fatalf("status = %v, want 403", resp.Code)
	}
	if !bytes.Contains(resp.Body.Bytes(), []byte(`"code":40301`)) {
		t.Fatalf("body = %s", resp.Body.String())
	}
}

func TestDeviceHandler_ListControlLogs_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &stubDeviceService{}
	controlSvc := &stubDeviceControlService{
		listLogsFn: func(ctx context.Context, req *service.ListDeviceControlLogsRequest) (*service.ListDeviceControlLogsResponse, error) {
			if req.DeviceID != "device-1" {
				t.Fatalf("DeviceID = %v, want device-1", req.DeviceID)
			}
			if req.Page != 2 || req.PageSize != 20 {
				t.Fatalf("page/pageSize = %d/%d, want 2/20", req.Page, req.PageSize)
			}
			return &service.ListDeviceControlLogsResponse{
				Items: []*service.DeviceControlLogItem{
					{
						ID:           "log-1",
						OperatorID:   "user-1",
						OperatorName: "张三",
						Command:      "open_gate",
						CreatedAt:    "2026-03-19T10:00:00Z",
					},
				},
				Total:    21,
				Page:     2,
				PageSize: 20,
			}, nil
		},
	}
	handler := NewDeviceHandler(svc, controlSvc)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("tenant_id", "tenant-1")
	})
	router.GET("/devices/:id/control-logs", handler.ListControlLogs)

	req := httptest.NewRequest(http.MethodGet, "/devices/device-1/control-logs?page=2&page_size=20", nil)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("status = %v, want 200", resp.Code)
	}
	if !bytes.Contains(resp.Body.Bytes(), []byte(`"total":21`)) {
		t.Fatalf("body = %s", resp.Body.String())
	}
	if !bytes.Contains(resp.Body.Bytes(), []byte(`"operator_name":"张三"`)) {
		t.Fatalf("body = %s", resp.Body.String())
	}
}
