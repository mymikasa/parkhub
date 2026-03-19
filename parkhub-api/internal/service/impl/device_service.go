package impl

import (
	"context"
	"encoding/json"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/service"
)

var DeviceServiceSet = wire.NewSet(NewDeviceService)

type deviceServiceImpl struct {
	deviceRepo     repository.DeviceRepo
	tenantRepo     repository.TenantRepo
	parkingLotRepo repository.ParkingLotRepo
	gateRepo       repository.GateRepo
	auditLogSvc    service.AuditLogService
}

func NewDeviceService(
	deviceRepo repository.DeviceRepo,
	tenantRepo repository.TenantRepo,
	parkingLotRepo repository.ParkingLotRepo,
	gateRepo repository.GateRepo,
	auditLogSvc service.AuditLogService,
) service.DeviceService {
	return &deviceServiceImpl{
		deviceRepo:     deviceRepo,
		tenantRepo:     tenantRepo,
		parkingLotRepo: parkingLotRepo,
		gateRepo:       gateRepo,
		auditLogSvc:    auditLogSvc,
	}
}

func (s *deviceServiceImpl) Create(ctx context.Context, req *service.CreateDeviceRequest) (*domain.Device, error) {
	// 检查序列号是否已存在
	exists, err := s.deviceRepo.ExistsByID(ctx, req.ID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, &domain.DomainError{Code: "DEVICE_ID_DUPLICATE", Message: "该设备序列号已存在"}
	}

	// 创建设备实体
	device := domain.NewDevice(req.ID, req.TenantID)
	if req.Name != "" {
		device.Name = req.Name
	}

	if err := s.deviceRepo.Create(ctx, device); err != nil {
		return nil, err
	}

	return device, nil
}

func (s *deviceServiceImpl) GetByID(ctx context.Context, req *service.GetDeviceRequest) (*domain.Device, error) {
	device, err := s.deviceRepo.FindByID(ctx, req.ID)
	if err != nil {
		if err == domain.ErrDeviceNotFound {
			return nil, &domain.DomainError{Code: "DEVICE_NOT_FOUND", Message: err.Error()}
		}
		return nil, err
	}

	// 多租户隔离校验
	if req.TenantID != "" && device.TenantID != req.TenantID {
		return nil, &domain.DomainError{
			Code:    "FORBIDDEN",
			Message: "无权访问该设备",
		}
	}

	return device, nil
}

func (s *deviceServiceImpl) List(ctx context.Context, req *service.ListDevicesRequest) (*service.DeviceListResponse, error) {
	filter := repository.DeviceFilter{
		ParkingLotID: req.ParkingLotID,
		GateID:       req.GateID,
		Status:       req.Status,
		Keyword:      req.Keyword,
		Page:         req.Page,
		PageSize:     req.PageSize,
	}

	items, total, err := s.deviceRepo.FindAll(ctx, req.TenantID, filter)
	if err != nil {
		return nil, err
	}

	listItems := make([]*service.DeviceListItem, len(items))
	for i, item := range items {
		listItems[i] = toDeviceListItem(item)
	}

	return &service.DeviceListResponse{
		Items:    listItems,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, nil
}

func (s *deviceServiceImpl) UpdateName(ctx context.Context, req *service.UpdateDeviceNameRequest) (*domain.Device, error) {
	device, err := s.deviceRepo.FindByID(ctx, req.ID)
	if err != nil {
		if err == domain.ErrDeviceNotFound {
			return nil, &domain.DomainError{Code: "DEVICE_NOT_FOUND", Message: err.Error()}
		}
		return nil, err
	}

	// 多租户隔离校验
	if req.TenantID != "" && device.TenantID != req.TenantID {
		return nil, &domain.DomainError{
			Code:    "FORBIDDEN",
			Message: "无权操作该设备",
		}
	}

	device.UpdateName(req.Name)

	if err := s.deviceRepo.Update(ctx, device); err != nil {
		return nil, err
	}

	return device, nil
}

func (s *deviceServiceImpl) Bind(ctx context.Context, req *service.BindDeviceRequest) (*domain.Device, error) {
	device, err := s.deviceRepo.FindByID(ctx, req.ID)
	if err != nil {
		if err == domain.ErrDeviceNotFound {
			return nil, &domain.DomainError{Code: "DEVICE_NOT_FOUND", Message: err.Error()}
		}
		return nil, err
	}

	if !device.CanBind() {
		return nil, &domain.DomainError{Code: "DEVICE_INVALID_STATUS", Message: "当前设备状态不允许绑定"}
	}

	targetTenantID := req.TargetTenantID
	if req.OperatorRole == "tenant_admin" {
		targetTenantID = req.OperatorTenantID
	}

	if req.OperatorRole != "platform_admin" && req.OperatorRole != "tenant_admin" {
		return nil, &domain.DomainError{Code: "FORBIDDEN", Message: "无权操作该设备"}
	}

	tenant, err := s.tenantRepo.FindByID(ctx, targetTenantID)
	if err != nil {
		if err == domain.ErrTenantNotFound {
			return nil, &domain.DomainError{Code: "TENANT_NOT_FOUND", Message: err.Error()}
		}
		return nil, err
	}
	if tenant == nil {
		return nil, &domain.DomainError{Code: "TENANT_NOT_FOUND", Message: domain.ErrTenantNotFound.Error()}
	}

	lot, err := s.parkingLotRepo.FindByID(ctx, req.ParkingLotID)
	if err != nil {
		if err == domain.ErrParkingLotNotFound {
			return nil, &domain.DomainError{Code: "PARKING_LOT_NOT_FOUND", Message: err.Error()}
		}
		return nil, err
	}
	if lot.TenantID != targetTenantID {
		return nil, &domain.DomainError{Code: "FORBIDDEN", Message: "无权绑定到该停车场"}
	}

	gate, err := s.gateRepo.FindByID(ctx, req.GateID)
	if err != nil {
		if err == domain.ErrGateNotFound {
			return nil, &domain.DomainError{Code: "GATE_NOT_FOUND", Message: err.Error()}
		}
		return nil, err
	}
	if gate.ParkingLotID != req.ParkingLotID {
		return nil, &domain.DomainError{Code: "FORBIDDEN", Message: "目标出入口不属于该停车场"}
	}

	count, err := s.deviceRepo.CountByGateID(ctx, req.GateID)
	if err != nil {
		return nil, err
	}
	if device.GateID == nil || *device.GateID != req.GateID {
		if count >= 3 {
			return nil, &domain.DomainError{Code: "DEVICE_GATE_CAPACITY_EXCEEDED", Message: "该出入口最多绑定3个设备"}
		}
	}

	if req.OperatorRole == "tenant_admin" && device.TenantID != domain.PlatformTenantID && device.TenantID != req.OperatorTenantID {
		return nil, &domain.DomainError{Code: "FORBIDDEN", Message: "无权操作该设备"}
	}

	device.Bind(targetTenantID, req.ParkingLotID, req.GateID)
	if err := s.deviceRepo.Update(ctx, device); err != nil {
		return nil, err
	}

	detail, _ := json.Marshal(map[string]string{
		"parking_lot_id": req.ParkingLotID,
		"gate_id":        req.GateID,
		"tenant_id":      targetTenantID,
	})
	targetTenantIDCopy := targetTenantID
	_ = s.auditLogSvc.Log(ctx, &domain.AuditLog{
		ID:         uuid.NewString(),
		UserID:     req.OperatorID,
		TenantID:   &targetTenantIDCopy,
		Action:     domain.AuditActionDeviceBound,
		TargetType: "device",
		TargetID:   device.ID,
		Detail:     string(detail),
		IP:         req.OperatorIP,
		CreatedAt:  time.Now(),
	})

	return device, nil
}

func (s *deviceServiceImpl) Unbind(ctx context.Context, req *service.UnbindDeviceRequest) (*domain.Device, error) {
	device, err := s.deviceRepo.FindByID(ctx, req.ID)
	if err != nil {
		if err == domain.ErrDeviceNotFound {
			return nil, &domain.DomainError{Code: "DEVICE_NOT_FOUND", Message: err.Error()}
		}
		return nil, err
	}

	if req.OperatorRole != "platform_admin" && req.OperatorRole != "tenant_admin" {
		return nil, &domain.DomainError{Code: "FORBIDDEN", Message: "无权操作该设备"}
	}
	if req.OperatorRole == "tenant_admin" && device.TenantID != req.OperatorTenantID {
		return nil, &domain.DomainError{Code: "FORBIDDEN", Message: "无权操作该设备"}
	}
	if device.GateID == nil && device.ParkingLotID == nil {
		return nil, &domain.DomainError{Code: "DEVICE_NOT_BOUND", Message: domain.ErrDeviceNotBound.Error()}
	}

	beforeTenantID := device.TenantID
	var beforeParkingLotID string
	if device.ParkingLotID != nil {
		beforeParkingLotID = *device.ParkingLotID
	}
	var beforeGateID string
	if device.GateID != nil {
		beforeGateID = *device.GateID
	}

	device.Unbind()
	if err := s.deviceRepo.Update(ctx, device); err != nil {
		return nil, err
	}

	detail, _ := json.Marshal(map[string]string{
		"parking_lot_id": beforeParkingLotID,
		"gate_id":        beforeGateID,
		"tenant_id":      beforeTenantID,
	})
	beforeTenantIDCopy := beforeTenantID
	_ = s.auditLogSvc.Log(ctx, &domain.AuditLog{
		ID:         uuid.NewString(),
		UserID:     req.OperatorID,
		TenantID:   &beforeTenantIDCopy,
		Action:     domain.AuditActionDeviceUnbound,
		TargetType: "device",
		TargetID:   device.ID,
		Detail:     string(detail),
		IP:         req.OperatorIP,
		CreatedAt:  time.Now(),
	})

	return device, nil
}

func (s *deviceServiceImpl) Disable(ctx context.Context, req *service.ChangeDeviceStatusRequest) (*domain.Device, error) {
	device, err := s.deviceRepo.FindByID(ctx, req.ID)
	if err != nil {
		if err == domain.ErrDeviceNotFound {
			return nil, &domain.DomainError{Code: "DEVICE_NOT_FOUND", Message: err.Error()}
		}
		return nil, err
	}
	if req.TenantID != "" && device.TenantID != req.TenantID {
		return nil, &domain.DomainError{Code: "FORBIDDEN", Message: "无权操作该设备"}
	}

	device.Status = domain.DeviceStatusDisabled
	device.UpdatedAt = time.Now()
	if err := s.deviceRepo.Update(ctx, device); err != nil {
		return nil, err
	}

	return device, nil
}

func (s *deviceServiceImpl) Enable(ctx context.Context, req *service.ChangeDeviceStatusRequest) (*domain.Device, error) {
	device, err := s.deviceRepo.FindByID(ctx, req.ID)
	if err != nil {
		if err == domain.ErrDeviceNotFound {
			return nil, &domain.DomainError{Code: "DEVICE_NOT_FOUND", Message: err.Error()}
		}
		return nil, err
	}
	if req.TenantID != "" && device.TenantID != req.TenantID {
		return nil, &domain.DomainError{Code: "FORBIDDEN", Message: "无权操作该设备"}
	}
	if device.Status != domain.DeviceStatusDisabled {
		return nil, &domain.DomainError{Code: "DEVICE_INVALID_STATUS", Message: "仅禁用状态设备可启用"}
	}

	if device.LastHeartbeat != nil && time.Since(*device.LastHeartbeat) < time.Duration(domain.DefaultHeartbeatTimeoutSeconds)*time.Second {
		device.Status = domain.DeviceStatusActive
	} else {
		device.Status = domain.DeviceStatusOffline
	}
	device.UpdatedAt = time.Now()
	if err := s.deviceRepo.Update(ctx, device); err != nil {
		return nil, err
	}

	return device, nil
}

func (s *deviceServiceImpl) Delete(ctx context.Context, req *service.DeleteDeviceRequest) error {
	device, err := s.deviceRepo.FindByID(ctx, req.ID)
	if err != nil {
		if err == domain.ErrDeviceNotFound {
			return &domain.DomainError{Code: "DEVICE_NOT_FOUND", Message: err.Error()}
		}
		return err
	}
	if req.TenantID != "" && device.TenantID != req.TenantID {
		return &domain.DomainError{Code: "FORBIDDEN", Message: "无权操作该设备"}
	}
	if device.ParkingLotID != nil || device.GateID != nil {
		return &domain.DomainError{Code: "DEVICE_MUST_UNBIND", Message: domain.ErrDeviceMustUnbind.Error()}
	}

	if err := s.deviceRepo.Delete(ctx, req.ID); err != nil {
		if err == domain.ErrDeviceNotFound {
			return &domain.DomainError{Code: "DEVICE_NOT_FOUND", Message: err.Error()}
		}
		return err
	}
	return nil
}

func (s *deviceServiceImpl) GetStats(ctx context.Context, tenantID string) (*service.DeviceStatsResponse, error) {
	stats, err := s.deviceRepo.CountByStatus(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	byParkingLot := make([]*service.DeviceParkingLotStatsItem, 0, len(stats.ByParkingLot))
	for _, item := range stats.ByParkingLot {
		byParkingLot = append(byParkingLot, &service.DeviceParkingLotStatsItem{
			ParkingLotID:   item.ParkingLotID,
			ParkingLotName: item.ParkingLotName,
			Total:          item.Total,
			Online:         item.Online,
			Offline:        item.Offline,
			Pending:        item.Pending,
			Disabled:       item.Disabled,
		})
	}

	sort.Slice(byParkingLot, func(i, j int) bool {
		if byParkingLot[i].ParkingLotName == byParkingLot[j].ParkingLotName {
			return byParkingLot[i].ParkingLotID < byParkingLot[j].ParkingLotID
		}
		return byParkingLot[i].ParkingLotName < byParkingLot[j].ParkingLotName
	})

	return &service.DeviceStatsResponse{
		Total:        stats.Total,
		Online:       stats.Online,
		Offline:      stats.Offline,
		Pending:      stats.Pending,
		Disabled:     stats.Disabled,
		ByParkingLot: byParkingLot,
	}, nil
}

func toDeviceListItem(item *domain.DeviceListItem) *service.DeviceListItem {
	var lastHeartbeat *string
	if item.LastHeartbeat != nil {
		formatted := item.LastHeartbeat.Format(time.RFC3339)
		lastHeartbeat = &formatted
	}

	return &service.DeviceListItem{
		ID:              item.ID,
		TenantID:        item.TenantID,
		Name:            item.Name,
		Status:          item.Status,
		FirmwareVersion: item.FirmwareVersion,
		LastHeartbeat:   lastHeartbeat,
		ParkingLotID:    item.ParkingLotID,
		ParkingLotName:  item.ParkingLotName,
		GateID:          item.GateID,
		GateName:        item.GateName,
		CreatedAt:       item.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       item.UpdatedAt.Format(time.RFC3339),
	}
}
