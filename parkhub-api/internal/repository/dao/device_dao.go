package dao

import (
	"time"

	"github.com/parkhub/api/internal/domain"
)

// DeviceDAO is the GORM database model for the devices table.
type DeviceDAO struct {
	ID              string     `gorm:"column:id;primaryKey"`
	TenantID        string     `gorm:"column:tenant_id"`
	Name            string     `gorm:"column:name"`
	Status          string     `gorm:"column:status"`
	FirmwareVersion string     `gorm:"column:firmware_version"`
	LastHeartbeat   *time.Time `gorm:"column:last_heartbeat"`
	ParkingLotID    *string    `gorm:"column:parking_lot_id"`
	GateID          *string    `gorm:"column:gate_id"`
	CreatedAt       time.Time  `gorm:"column:created_at"`
	UpdatedAt       time.Time  `gorm:"column:updated_at"`
	DeletedAt       *time.Time `gorm:"column:deleted_at"`
}

func (DeviceDAO) TableName() string { return "devices" }

// ToDeviceDAO converts a domain.Device to a DeviceDAO.
func ToDeviceDAO(d *domain.Device) *DeviceDAO {
	return &DeviceDAO{
		ID:              d.ID,
		TenantID:        d.TenantID,
		Name:            d.Name,
		Status:          string(d.Status),
		FirmwareVersion: d.FirmwareVersion,
		LastHeartbeat:   d.LastHeartbeat,
		ParkingLotID:    d.ParkingLotID,
		GateID:          d.GateID,
		CreatedAt:       d.CreatedAt,
		UpdatedAt:       d.UpdatedAt,
	}
}

// ToDomain converts a DeviceDAO to a domain.Device.
func (d *DeviceDAO) ToDomain() *domain.Device {
	return &domain.Device{
		ID:              d.ID,
		TenantID:        d.TenantID,
		Name:            d.Name,
		Status:          domain.DeviceStatus(d.Status),
		FirmwareVersion: d.FirmwareVersion,
		LastHeartbeat:   d.LastHeartbeat,
		ParkingLotID:    d.ParkingLotID,
		GateID:          d.GateID,
		CreatedAt:       d.CreatedAt,
		UpdatedAt:       d.UpdatedAt,
	}
}

// DeviceListDAO 设备列表项（带关联名称）
type DeviceListDAO struct {
	DeviceDAO
	ParkingLotName *string `gorm:"column:parking_lot_name"`
	GateName       *string `gorm:"column:gate_name"`
}

// ToDeviceListItem converts to domain DeviceListItem.
func (d *DeviceListDAO) ToDeviceListItem() *domain.DeviceListItem {
	device := d.ToDomain()
	return &domain.DeviceListItem{
		Device:         *device,
		ParkingLotName: d.ParkingLotName,
		GateName:       d.GateName,
	}
}
