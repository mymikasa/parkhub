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
	"gorm.io/gorm"
)

var TransitRecordServiceSet = wire.NewSet(NewTransitRecordService)

type transitRecordServiceImpl struct {
	db                *gorm.DB
	transitRecordRepo repository.TransitRecordRepo
	parkingLotRepo    repository.ParkingLotRepo
	gateRepo          repository.GateRepo
	billingRuleRepo   repository.BillingRuleRepo
}

func NewTransitRecordService(
	db *gorm.DB,
	transitRecordRepo repository.TransitRecordRepo,
	parkingLotRepo repository.ParkingLotRepo,
	gateRepo repository.GateRepo,
	billingRuleRepo repository.BillingRuleRepo,
) service.TransitRecordService {
	return &transitRecordServiceImpl{
		db:                db,
		transitRecordRepo: transitRecordRepo,
		parkingLotRepo:    parkingLotRepo,
		gateRepo:          gateRepo,
		billingRuleRepo:   billingRuleRepo,
	}
}

func (s *transitRecordServiceImpl) CreateEntry(ctx context.Context, req *service.CreateEntryRequest) (*domain.TransitRecord, error) {
	// 验证 gate 存在且属于指定车场
	gate, err := s.gateRepo.FindByID(ctx, req.GateID)
	if err != nil {
		if err == domain.ErrGateNotFound {
			return nil, &domain.DomainError{Code: domain.CodeGateTypeMismatch, Message: "出入口不存在"}
		}
		return nil, err
	}
	if gate.ParkingLotID != req.ParkingLotID {
		return nil, &domain.DomainError{Code: domain.CodeGateTypeMismatch, Message: "出入口不属于该车场"}
	}
	if !gate.IsEntry() {
		return nil, &domain.DomainError{Code: domain.CodeGateTypeMismatch, Message: "该通道不是入口"}
	}

	record := domain.NewEntryRecord(
		uuid.New().String(),
		req.TenantID,
		req.ParkingLotID,
		req.GateID,
		req.PlateNumber,
		req.ImageURL,
	)

	// 事务：创建记录 + 余位减 1
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(dao.ToTransitRecordDAO(record)).Error; err != nil {
			return err
		}

		// 原子更新余位，available_spaces > 0 保证不会为负
		result := tx.Exec(
			"UPDATE parking_lots SET available_spaces = available_spaces - 1, updated_at = ? WHERE id = ? AND available_spaces > 0",
			time.Now(), req.ParkingLotID,
		)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return domain.ErrParkingLotFull
		}
		return nil
	})
	if err != nil {
		if err == domain.ErrParkingLotFull {
			return nil, &domain.DomainError{Code: domain.CodeParkingLotFull, Message: err.Error()}
		}
		return nil, err
	}

	return record, nil
}

func (s *transitRecordServiceImpl) CreateExit(ctx context.Context, req *service.CreateExitRequest) (*domain.TransitRecord, error) {
	// 验证 gate 存在且属于指定车场
	gate, err := s.gateRepo.FindByID(ctx, req.GateID)
	if err != nil {
		if err == domain.ErrGateNotFound {
			return nil, &domain.DomainError{Code: domain.CodeGateTypeMismatch, Message: "出入口不存在"}
		}
		return nil, err
	}
	if gate.ParkingLotID != req.ParkingLotID {
		return nil, &domain.DomainError{Code: domain.CodeGateTypeMismatch, Message: "出入口不属于该车场"}
	}
	if !gate.IsExit() {
		return nil, &domain.DomainError{Code: domain.CodeGateTypeMismatch, Message: "该通道不是出口"}
	}

	var entryRecordID *string
	var fee *float64
	var parkingDuration *int

	// 尝试匹配入场记录（车牌识别成功时）
	if req.PlateNumber != nil && *req.PlateNumber != "" {
		entryRecord, err := s.transitRecordRepo.FindLatestUnmatchedEntry(ctx, req.ParkingLotID, *req.PlateNumber)
		if err != nil {
			return nil, err
		}

		if entryRecord != nil {
			entryRecordID = &entryRecord.ID

			// 计算费用
			rule, err := s.billingRuleRepo.FindByParkingLotID(ctx, req.ParkingLotID)
			if err != nil && err != domain.ErrBillingRuleNotFound {
				return nil, err
			}

			now := time.Now()
			if rule != nil {
				result, err := rule.Calculate(entryRecord.CreatedAt, now)
				if err == nil {
					fee = &result.FinalFee
					parkingDuration = &result.ParkingDuration
				}
			}
		}
	}

	record := domain.NewExitRecord(
		uuid.New().String(),
		req.TenantID,
		req.ParkingLotID,
		req.GateID,
		req.PlateNumber,
		req.ImageURL,
		entryRecordID,
		fee,
		parkingDuration,
	)

	// 事务：创建记录 + 余位加 1
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(dao.ToTransitRecordDAO(record)).Error; err != nil {
			return err
		}

		result := tx.Exec(
			"UPDATE parking_lots SET available_spaces = LEAST(available_spaces + 1, total_spaces), updated_at = ? WHERE id = ?",
			time.Now(), req.ParkingLotID,
		)
		return result.Error
	})
	if err != nil {
		return nil, err
	}

	return record, nil
}

func (s *transitRecordServiceImpl) GetByID(ctx context.Context, id, tenantID string) (*domain.TransitRecordListItem, error) {
	item, err := s.transitRecordRepo.FindByID(ctx, id)
	if err != nil {
		if err == domain.ErrTransitRecordNotFound {
			return nil, &domain.DomainError{Code: domain.CodeTransitRecordNotFound, Message: err.Error()}
		}
		return nil, err
	}

	// 多租户隔离
	if tenantID != "" && item.TenantID != tenantID {
		return nil, &domain.DomainError{Code: "FORBIDDEN", Message: "无权访问该通行记录"}
	}

	return item, nil
}

func (s *transitRecordServiceImpl) List(ctx context.Context, req *service.ListTransitRecordsRequest) (*service.TransitRecordListResponse, error) {
	filter := repository.TransitRecordFilter{
		TenantID:     req.TenantID,
		ParkingLotID: req.ParkingLotID,
		PlateNumber:  req.PlateNumber,
		Type:         req.Type,
		Status:       req.Status,
		Page:         req.Page,
		PageSize:     req.PageSize,
	}

	if req.StartDate != nil {
		t, err := time.Parse(time.RFC3339, *req.StartDate)
		if err != nil {
			return nil, &domain.DomainError{Code: domain.CodeInvalidTimeRange, Message: "开始时间格式无效"}
		}
		filter.StartDate = &t
	}
	if req.EndDate != nil {
		t, err := time.Parse(time.RFC3339, *req.EndDate)
		if err != nil {
			return nil, &domain.DomainError{Code: domain.CodeInvalidTimeRange, Message: "结束时间格式无效"}
		}
		filter.EndDate = &t
	}

	items, total, err := s.transitRecordRepo.FindAll(ctx, filter)
	if err != nil {
		return nil, err
	}

	return &service.TransitRecordListResponse{
		Items:    items,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, nil
}

func (s *transitRecordServiceImpl) GetLatest(ctx context.Context, tenantID string, limit int) ([]*domain.TransitRecordListItem, error) {
	return s.transitRecordRepo.FindLatest(ctx, tenantID, limit)
}

func (s *transitRecordServiceImpl) GetStats(ctx context.Context, tenantID string) (*service.TransitStatsResponse, error) {
	stats, err := s.transitRecordRepo.CountTodayStats(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	return &service.TransitStatsResponse{
		EntryCount:   stats.EntryCount,
		ExitCount:    stats.ExitCount,
		OnSiteCount:  stats.OnSiteCount,
		TodayRevenue: stats.TodayRevenue,
	}, nil
}

func (s *transitRecordServiceImpl) GetOverstay(ctx context.Context, tenantID string) ([]*domain.TransitRecordListItem, error) {
	threshold := time.Now().Add(-time.Duration(domain.OverstayThresholdHours) * time.Hour)
	return s.transitRecordRepo.FindOverstay(ctx, tenantID, threshold)
}

func (s *transitRecordServiceImpl) Resolve(ctx context.Context, req *service.ResolveTransitRecordRequest) (*domain.TransitRecordListItem, error) {
	item, err := s.transitRecordRepo.FindByID(ctx, req.ID)
	if err != nil {
		if err == domain.ErrTransitRecordNotFound {
			return nil, &domain.DomainError{Code: domain.CodeTransitRecordNotFound, Message: err.Error()}
		}
		return nil, err
	}

	// 多租户隔离
	if req.TenantID != "" && item.TenantID != req.TenantID {
		return nil, &domain.DomainError{Code: "FORBIDDEN", Message: "无权处理该通行记录"}
	}

	record := &item.TransitRecord
	if err := record.Resolve(req.ResolvedBy, req.PlateNumber, req.Remark); err != nil {
		if err == domain.ErrRecordAlreadyResolved {
			return nil, &domain.DomainError{Code: domain.CodeRecordAlreadyResolved, Message: err.Error()}
		}
		return nil, err
	}

	// 如果是出场记录且补录了车牌，重新尝试入场匹配和计费
	if record.Type == domain.TransitTypeExit && req.PlateNumber != nil && *req.PlateNumber != "" && record.EntryRecordID == nil {
		entryRecord, err := s.transitRecordRepo.FindLatestUnmatchedEntry(ctx, record.ParkingLotID, *req.PlateNumber)
		if err != nil {
			return nil, err
		}

		if entryRecord != nil {
			record.EntryRecordID = &entryRecord.ID
			record.Status = domain.TransitStatusPaid

			rule, err := s.billingRuleRepo.FindByParkingLotID(ctx, record.ParkingLotID)
			if err != nil && err != domain.ErrBillingRuleNotFound {
				return nil, err
			}

			if rule != nil {
				result, err := rule.Calculate(entryRecord.CreatedAt, record.CreatedAt)
				if err == nil {
					record.Fee = &result.FinalFee
					record.ParkingDuration = &result.ParkingDuration
				}
			}
		}
	}

	if err := s.transitRecordRepo.Update(ctx, record); err != nil {
		return nil, err
	}

	// 重新查询带关联信息的完整数据
	return s.transitRecordRepo.FindByID(ctx, req.ID)
}

func (s *transitRecordServiceImpl) ScanOverstay(ctx context.Context) error {
	threshold := time.Now().Add(-time.Duration(domain.OverstayThresholdHours) * time.Hour)
	records, err := s.transitRecordRepo.FindUnmatchedEntriesBefore(ctx, threshold)
	if err != nil {
		return err
	}

	for _, record := range records {
		record.MarkOverstay()
		if err := s.transitRecordRepo.Update(ctx, record); err != nil {
			return err
		}
	}

	return nil
}

func (s *transitRecordServiceImpl) CountExceptions(ctx context.Context, tenantID string) (int64, error) {
	return s.transitRecordRepo.CountExceptions(ctx, tenantID)
}
