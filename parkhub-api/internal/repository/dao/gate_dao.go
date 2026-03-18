package dao

import (
	"time"

	"github.com/parkhub/api/internal/domain"
)

// GateDAO is the GORM database model for the gates table.
type GateDAO struct {
	ID           string     `gorm:"column:id;primaryKey"`
	ParkingLotID string     `gorm:"column:parking_lot_id"`
	Name         string     `gorm:"column:name"`
	Type         string     `gorm:"column:type"`
	DeviceID     *string    `gorm:"column:device_id"`
	CreatedAt    time.Time  `gorm:"column:created_at"`
	UpdatedAt    time.Time  `gorm:"column:updated_at"`
}

func (GateDAO) TableName() string { return "gates" }

// ToGateDAO converts a domain.Gate to a GateDAO.
func ToGateDAO(g *domain.Gate) *GateDAO {
	return &GateDAO{
		ID:           g.ID,
		ParkingLotID: g.ParkingLotID,
		Name:         g.Name,
		Type:         string(g.Type),
		DeviceID:     g.DeviceID,
		CreatedAt:    g.CreatedAt,
		UpdatedAt:    g.UpdatedAt,
	}
}

// ToDomain converts a GateDAO to a domain.Gate.
func (d *GateDAO) ToDomain() *domain.Gate {
	return &domain.Gate{
		ID:           d.ID,
		ParkingLotID: d.ParkingLotID,
		Name:         d.Name,
		Type:         domain.GateType(d.Type),
		DeviceID:     d.DeviceID,
		CreatedAt:    d.CreatedAt,
		UpdatedAt:    d.UpdatedAt,
	}
}

// GateWithDeviceDAO 出入口带设备信息
type GateWithDeviceDAO struct {
	GateDAO
	DeviceID           *string    `gorm:"column:device_id"`
	DeviceSerialNumber *string    `gorm:"column:device_serial_number"`
	DeviceStatus       *string    `gorm:"column:device_status"`
	DeviceLastHeartbeat *time.Time `gorm:"column:device_last_heartbeat"`
}

// ToDomainWithDevice converts to domain with device info.
func (d *GateWithDeviceDAO) ToDomainWithDevice() *domain.GateWithDevice {
	gate := d.ToDomain()
	var device *domain.GateDeviceInfo
	if d.DeviceID != nil {
		info := domain.GateDeviceInfo{
			ID:            *d.DeviceID,
			LastHeartbeat: d.DeviceLastHeartbeat,
		}
		if d.DeviceSerialNumber != nil {
			info.SerialNumber = *d.DeviceSerialNumber
		}
		if d.DeviceStatus != nil {
			info.Status = *d.DeviceStatus
		}
		device = &info
	}
	return &domain.GateWithDevice{
		Gate:  *gate,
		Device: device,
	}
}
