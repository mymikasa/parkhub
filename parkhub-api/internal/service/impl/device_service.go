package impl

import (
	"context"
	"time"

	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/service"
)

var DeviceServiceSet = wire.NewSet(NewDeviceService)

type deviceServiceImpl struct {
	deviceRepo repository.DeviceRepo
}

func NewDeviceService(deviceRepo repository.DeviceRepo) service.DeviceService {
	return &deviceServiceImpl{
		deviceRepo: deviceRepo,
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

func (s *deviceServiceImpl) GetStats(ctx context.Context, tenantID string) (*service.DeviceStatsResponse, error) {
	stats, err := s.deviceRepo.CountByStatus(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	return &service.DeviceStatsResponse{
		Total:    stats.Total,
		Active:   stats.Active,
		Offline:  stats.Offline,
		Pending:  stats.Pending,
		Disabled: stats.Disabled,
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
