package impl

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/repository/dao"
	"github.com/parkhub/api/internal/service"
)

var ParkingLotServiceSet = wire.NewSet(NewParkingLotService)

type parkingLotServiceImpl struct {
	parkingLotRepo repository.ParkingLotRepo
}

func NewParkingLotService(parkingLotRepo repository.ParkingLotRepo) service.ParkingLotService {
	return &parkingLotServiceImpl{
		parkingLotRepo: parkingLotRepo,
	}
}

func (s *parkingLotServiceImpl) Create(ctx context.Context, req *service.CreateParkingLotRequest) (*domain.ParkingLot, error) {
	// 检查名称是否重复
	exists, err := s.parkingLotRepo.ExistsByName(ctx, req.TenantID, req.Name)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, &domain.DomainError{
			Code:    "PARKING_LOT_NAME_EXISTS",
			Message: "该车场名称已存在",
		}
	}

	lot, err := domain.NewParkingLot(
		uuid.New().String(),
		req.TenantID,
		req.Name,
		req.Address,
		req.TotalSpaces,
		req.LotType,
	)
	if err != nil {
		return nil, err
	}

	if err := s.parkingLotRepo.Create(ctx, lot); err != nil {
		return nil, err
	}

	return lot, nil
}

func (s *parkingLotServiceImpl) GetByID(ctx context.Context, id string, tenantID string) (*domain.ParkingLot, error) {
	lot, err := s.parkingLotRepo.FindByID(ctx, id)
	if err != nil {
		if err == domain.ErrParkingLotNotFound {
			return nil, &domain.DomainError{Code: "PARKING_LOT_NOT_FOUND", Message: err.Error()}
		}
		return nil, err
	}

	// 多租户隔离校验（平台管理员tenantID为空，可查看所有）
	if tenantID != "" && lot.TenantID != tenantID {
		return nil, &domain.DomainError{
			Code:    "FORBIDDEN",
			Message: "无权访问该停车场",
		}
	}

	return lot, nil
}

func (s *parkingLotServiceImpl) List(ctx context.Context, req *service.ListParkingLotsRequest) (*service.ParkingLotListResponse, error) {
	filter := repository.ParkingLotFilter{
		Status:   req.Status,
		Keyword:  req.Keyword,
		Page:     req.Page,
		PageSize: req.PageSize,
	}

	tenantID := req.OperatorTenantID
	if req.OperatorRole == "platform_admin" {
		tenantID = req.TenantID
	}

	items, total, err := s.parkingLotRepo.FindByTenantID(ctx, tenantID, filter)
	if err != nil {
		return nil, err
	}

	listItems := make([]*service.ParkingLotListItem, len(items))
	for i, item := range items {
		listItems[i] = toParkingLotListItem(item)
	}

	return &service.ParkingLotListResponse{
		Items:    listItems,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, nil
}

func (s *parkingLotServiceImpl) Update(ctx context.Context, req *service.UpdateParkingLotRequest) (*domain.ParkingLot, error) {
	lot, err := s.parkingLotRepo.FindByID(ctx, req.ID)
	if err != nil {
		if err == domain.ErrParkingLotNotFound {
			return nil, &domain.DomainError{Code: "PARKING_LOT_NOT_FOUND", Message: err.Error()}
		}
		return nil, err
	}

	// 多租户隔离校验
	if lot.TenantID != req.TenantID {
		return nil, &domain.DomainError{
			Code:    "FORBIDDEN",
			Message: "无权操作该停车场",
		}
	}

	// 检查名称是否与其他车场重复
	if lot.Name != req.Name {
		exists, err := s.parkingLotRepo.ExistsByName(ctx, req.TenantID, req.Name)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, &domain.DomainError{
				Code:    "PARKING_LOT_NAME_EXISTS",
				Message: "该车场名称已存在",
			}
		}
	}

	// 更新信息
	if err := lot.Update(req.Name, req.Address, req.TotalSpaces, req.LotType); err != nil {
		return nil, err
	}

	// 更新状态
	if req.Status != lot.Status {
		if req.Status == domain.ParkingLotStatusActive {
			lot.Activate()
		} else {
			lot.Deactivate()
		}
	}

	if err := s.parkingLotRepo.Update(ctx, lot); err != nil {
		return nil, err
	}

	return lot, nil
}

func (s *parkingLotServiceImpl) Delete(ctx context.Context, id string, tenantID string) error {
	lot, err := s.parkingLotRepo.FindByID(ctx, id)
	if err != nil {
		if err == domain.ErrParkingLotNotFound {
			return &domain.DomainError{Code: "PARKING_LOT_NOT_FOUND", Message: err.Error()}
		}
		return err
	}

	// 多租户隔离校验
	if lot.TenantID != tenantID {
		return &domain.DomainError{
			Code:    "FORBIDDEN",
			Message: "无权操作该停车场",
		}
	}

	// 检查是否有在场车辆
	if lot.OccupiedVehicles() > 0 {
		return &domain.DomainError{
			Code:    "PARKING_LOT_HAS_VEHICLES",
			Message: "该车场存在在场车辆，无法删除",
		}
	}

	return s.parkingLotRepo.Delete(ctx, id)
}

func (s *parkingLotServiceImpl) GetStats(ctx context.Context, tenantID string) (*service.ParkingLotStatsResponse, error) {
	stats, err := s.parkingLotRepo.GetStats(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	return &service.ParkingLotStatsResponse{
		TotalSpaces:      stats.TotalSpaces,
		AvailableSpaces:  stats.AvailableSpaces,
		OccupiedVehicles: stats.OccupiedVehicles,
		TotalGates:       stats.TotalGates,
	}, nil
}

func toParkingLotListItem(item *dao.ParkingLotWithStats) *service.ParkingLotListItem {
	return &service.ParkingLotListItem{
		ID:              item.ID,
		Name:            item.Name,
		Address:         item.Address,
		TotalSpaces:     item.TotalSpaces,
		AvailableSpaces: item.AvailableSpaces,
		LotType:         item.LotType,
		Status:          item.Status,
		EntryCount:      item.EntryCount,
		ExitCount:       item.ExitCount,
		UsageRate:       item.UsageRate,
		CreatedAt:       item.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       item.UpdatedAt.Format(time.RFC3339),
	}
}
