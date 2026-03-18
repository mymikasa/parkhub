package domain

import (
	"errors"
	"time"
)

// Device 设备实体
type Device struct {
	ID              string     // 设备ID（序列号）
	TenantID        string
	Name            string
	Status          DeviceStatus
	FirmwareVersion string
	LastHeartbeat   *time.Time
	ParkingLotID    *string
	GateID          *string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// DeviceStatus 设备状态
type DeviceStatus string

const (
	DeviceStatusPending  DeviceStatus = "pending"  // 待分配
	DeviceStatusActive   DeviceStatus = "active"   // 已激活
	DeviceStatusOffline  DeviceStatus = "offline"  // 离线
	DeviceStatusDisabled DeviceStatus = "disabled" // 已禁用
)

// 设备相关错误
var (
	ErrDeviceNotFound    = errors.New("设备不存在")
	ErrDeviceIDDuplicate = errors.New("设备序列号已存在")
)

// NewDevice 创建新设备（首次心跳上报时创建）
func NewDevice(id, tenantID string) *Device {
	now := time.Now()
	return &Device{
		ID:        id,
		TenantID:  tenantID,
		Status:    DeviceStatusPending,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// UpdateName 更新设备名称
func (d *Device) UpdateName(name string) {
	d.Name = name
	d.UpdatedAt = time.Now()
}

// IsOnline 是否在线
func (d *Device) IsOnline() bool {
	return d.Status == DeviceStatusActive
}

// ValidateDeviceStatus 校验设备状态
func ValidateDeviceStatus(status DeviceStatus) bool {
	switch status {
	case DeviceStatusPending, DeviceStatusActive, DeviceStatusOffline, DeviceStatusDisabled:
		return true
	default:
		return false
	}
}

// DeviceListItem 设备列表项（带关联信息）
type DeviceListItem struct {
	Device
	ParkingLotName *string
	GateName       *string
}
