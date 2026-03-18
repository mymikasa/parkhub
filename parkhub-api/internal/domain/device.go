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
	ErrDeviceNotFound = errors.New("设备不存在")
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

// UpdateHeartbeat 更新心跳信息
func (d *Device) UpdateHeartbeat(firmwareVersion string, now time.Time) {
	d.FirmwareVersion = firmwareVersion
	d.LastHeartbeat = &now
	d.UpdatedAt = now
}

// MarkOnline 恢复在线（仅已分配设备变为 active）
func (d *Device) MarkOnline(now time.Time) {
	if d.Status == DeviceStatusOffline {
		d.Status = DeviceStatusActive
		d.UpdatedAt = now
	}
}

// MarkOffline 标记离线
func (d *Device) MarkOffline(now time.Time) {
	if d.Status == DeviceStatusActive || d.Status == DeviceStatusPending {
		d.Status = DeviceStatusOffline
		d.UpdatedAt = now
	}
}

// HeartbeatMessage 心跳消息（从 MQTT payload 解析）
type HeartbeatMessage struct {
	FirmwareVersion string `json:"firmware_version"`
}

// PlatformTenantID 平台租户ID（未分配设备归属此租户）
const PlatformTenantID = "tenant-platform"

// DefaultHeartbeatTimeoutSeconds 默认心跳超时（秒）
const DefaultHeartbeatTimeoutSeconds = 300

// DeviceListItem 设备列表项（带关联信息）
type DeviceListItem struct {
	Device
	ParkingLotName *string
	GateName       *string
}
