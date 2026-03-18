package dao

import (
	"time"

	"github.com/parkhub/api/internal/domain"
)

// ParkingLotDAO is the GORM database model for the parking_lots table.
type ParkingLotDAO struct {
	ID              string    `gorm:"column:id;primaryKey"`
	TenantID        string    `gorm:"column:tenant_id"`
	Name            string    `gorm:"column:name"`
	Address         string    `gorm:"column:address"`
	TotalSpaces     int       `gorm:"column:total_spaces"`
	AvailableSpaces int       `gorm:"column:available_spaces"`
	LotType         string    `gorm:"column:lot_type"`
	Status          string    `gorm:"column:status"`
	CreatedAt       time.Time `gorm:"column:created_at"`
	UpdatedAt       time.Time `gorm:"column:updated_at"`
}

func (ParkingLotDAO) TableName() string { return "parking_lots" }

// ToParkingLotDAO converts a domain.ParkingLot to a ParkingLotDAO.
func ToParkingLotDAO(p *domain.ParkingLot) *ParkingLotDAO {
	return &ParkingLotDAO{
		ID:              p.ID,
		TenantID:        p.TenantID,
		Name:            p.Name,
		Address:         p.Address,
		TotalSpaces:     p.TotalSpaces,
		AvailableSpaces: p.AvailableSpaces,
		LotType:         string(p.LotType),
		Status:          string(p.Status),
		CreatedAt:       p.CreatedAt,
		UpdatedAt:       p.UpdatedAt,
	}
}

// ToDomain converts a ParkingLotDAO to a domain.ParkingLot.
func (d *ParkingLotDAO) ToDomain() *domain.ParkingLot {
	return &domain.ParkingLot{
		ID:              d.ID,
		TenantID:        d.TenantID,
		Name:            d.Name,
		Address:         d.Address,
		TotalSpaces:     d.TotalSpaces,
		AvailableSpaces: d.AvailableSpaces,
		LotType:         domain.LotType(d.LotType),
		Status:          domain.ParkingLotStatus(d.Status),
		CreatedAt:       d.CreatedAt,
		UpdatedAt:       d.UpdatedAt,
	}
}

// ParkingLotListDAO 停车场列表项（带出入口统计）
type ParkingLotListDAO struct {
	ParkingLotDAO
	EntryCount int `gorm:"column:entry_count"`
	ExitCount  int `gorm:"column:exit_count"`
}

// ToDomainWithStats converts to domain with entry/exit counts.
func (d *ParkingLotListDAO) ToDomainWithStats() *ParkingLotWithStats {
	lot := d.ToDomain()
	return &ParkingLotWithStats{
		ParkingLot:  lot,
		EntryCount:  d.EntryCount,
		ExitCount:   d.ExitCount,
		UsageRate:   lot.UsageRate(),
	}
}

// ParkingLotWithStats 停车场带统计信息
type ParkingLotWithStats struct {
	*domain.ParkingLot
	EntryCount int
	ExitCount  int
	UsageRate  float64
}
