package impl

import (
	"context"

	"github.com/google/uuid"
	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/service"
)

var GateServiceSet = wire.NewSet(NewGateService)

type gateServiceImpl struct {
	gateRepo       repository.GateRepo
	parkingLotRepo repository.ParkingLotRepo
}

func NewGateService(gateRepo repository.GateRepo, parkingLotRepo repository.ParkingLotRepo) service.GateService {
	return &gateServiceImpl{
		gateRepo:       gateRepo,
		parkingLotRepo: parkingLotRepo,
	}
}

func (s *gateServiceImpl) Create(ctx context.Context, req *service.CreateGateRequest) (*domain.Gate, error) {
	exists, err := s.gateRepo.ExistsByName(ctx, req.ParkingLotID, req.Name)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, &domain.DomainError{Code: "GATE_NAME_EXISTS", Message: "该出入口名称已存在"}
	}

	gate := domain.NewGate(uuid.New().String(), req.ParkingLotID, req.Name, req.Type, req.DeviceID)
	if err := s.gateRepo.Create(ctx, gate); err != nil {
		return nil, err
	}
	return gate, nil
}

func (s *gateServiceImpl) GetByID(ctx context.Context, id string) (*domain.Gate, error) {
	return s.gateRepo.FindByID(ctx, id)
}

func (s *gateServiceImpl) ListByParkingLotID(ctx context.Context, parkingLotID string) ([]*domain.GateWithDevice, error) {
	return s.gateRepo.FindByParkingLotID(ctx, parkingLotID)
}

func (s *gateServiceImpl) Update(ctx context.Context, req *service.UpdateGateRequest) (*domain.Gate, error) {
	gate, err := s.gateRepo.FindByID(ctx, req.ID)
	if err != nil {
		return nil, err
	}

	if gate.Name != req.Name {
		exists, err := s.gateRepo.ExistsByName(ctx, gate.ParkingLotID, req.Name)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, &domain.DomainError{Code: "GATE_NAME_EXISTS", Message: "该出入口名称已存在"}
		}
	}

	gate.Update(req.Name, req.DeviceID)
	if err := s.gateRepo.Update(ctx, gate); err != nil {
		return nil, err
	}
	return gate, nil
}

func (s *gateServiceImpl) Delete(ctx context.Context, id string) error {
	gate, err := s.gateRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	count, err := s.gateRepo.CountByParkingLotIDAndType(ctx, gate.ParkingLotID, gate.Type)
	if err != nil {
		return err
	}
	if count <= 1 {
		if gate.Type == domain.GateTypeEntry {
			return &domain.DomainError{Code: "LAST_ENTRY_GATE", Message: "每个车场至少保留一个入口"}
		}
		return &domain.DomainError{Code: "LAST_EXIT_GATE", Message: "每个车场至少保留一个出口"}
	}

	return s.gateRepo.Delete(ctx, id)
}
