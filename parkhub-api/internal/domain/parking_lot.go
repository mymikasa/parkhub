package domain

import (
	"errors"
	"time"
)

// ParkingLot 停车场实体
type ParkingLot struct {
	ID              string
	TenantID        string
	Name            string
	Address         string
	TotalSpaces     int
	AvailableSpaces int
	LotType         LotType
	Status          ParkingLotStatus
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// LotType 车场类型
type LotType string

const (
	LotTypeUnderground LotType = "underground" // 地下停车场
	LotTypeGround      LotType = "ground"      // 地面停车场
	LotTypeStereo      LotType = "stereo"      // 立体车库
)

// ParkingLotStatus 停车场运营状态
type ParkingLotStatus string

const (
	ParkingLotStatusActive   ParkingLotStatus = "active"   // 运营中
	ParkingLotStatusInactive ParkingLotStatus = "inactive" // 暂停运营
)

// 停车场相关错误
var (
	ErrParkingLotNotFound       = errors.New("停车场不存在")
	ErrParkingLotNameDuplicate  = errors.New("该车场名称已存在")
	ErrParkingLotHasVehicles    = errors.New("该车场存在在场车辆，无法操作")
	ErrInvalidTotalSpaces       = errors.New("车位数必须大于0")
	ErrTotalSpacesLessThanOccupied = errors.New("车位数不能少于当前在场车辆数")
	ErrParkingLotHasUnresolvedRecords = errors.New("该车场存在未处理的异常记录，无法删除")
)

// NewParkingLot 创建新停车场
func NewParkingLot(
	id string,
	tenantID string,
	name string,
	address string,
	totalSpaces int,
	lotType LotType,
) (*ParkingLot, error) {
	if totalSpaces <= 0 {
		return nil, ErrInvalidTotalSpaces
	}

	return &ParkingLot{
		ID:              id,
		TenantID:        tenantID,
		Name:            name,
		Address:         address,
		TotalSpaces:     totalSpaces,
		AvailableSpaces: totalSpaces, // 新建时剩余车位等于总车位
		LotType:         lotType,
		Status:          ParkingLotStatusActive,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}, nil
}

// Update 更新停车场信息
func (p *ParkingLot) Update(name, address string, totalSpaces int, lotType LotType) error {
	if totalSpaces <= 0 {
		return ErrInvalidTotalSpaces
	}

	occupied := p.TotalSpaces - p.AvailableSpaces
	if totalSpaces < occupied {
		return ErrTotalSpacesLessThanOccupied
	}

	p.Name = name
	p.Address = address
	p.TotalSpaces = totalSpaces
	p.AvailableSpaces = totalSpaces - occupied
	p.LotType = lotType
	p.UpdatedAt = time.Now()
	return nil
}

// Activate 激活停车场
func (p *ParkingLot) Activate() {
	p.Status = ParkingLotStatusActive
	p.UpdatedAt = time.Now()
}

// Deactivate 暂停停车场运营
func (p *ParkingLot) Deactivate() {
	p.Status = ParkingLotStatusInactive
	p.UpdatedAt = time.Now()
}

// IsActive 是否处于运营状态
func (p *ParkingLot) IsActive() bool {
	return p.Status == ParkingLotStatusActive
}

// UsageRate 计算使用率
func (p *ParkingLot) UsageRate() float64 {
	if p.TotalSpaces == 0 {
		return 0
	}
	occupied := p.TotalSpaces - p.AvailableSpaces
	return float64(occupied) / float64(p.TotalSpaces) * 100
}

// OccupiedVehicles 获取在场车辆数
func (p *ParkingLot) OccupiedVehicles() int {
	return p.TotalSpaces - p.AvailableSpaces
}

// ValidateLotType 校验车场类型
func ValidateLotType(lotType LotType) bool {
	switch lotType {
	case LotTypeUnderground, LotTypeGround, LotTypeStereo:
		return true
	default:
		return false
	}
}
