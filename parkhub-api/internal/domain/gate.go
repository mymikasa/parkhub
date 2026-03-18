package domain

import (
	"errors"
	"time"
)

// Gate 出入口实体
type Gate struct {
	ID            string
	ParkingLotID  string
	Name          string
	Type          GateType
	DeviceID      *string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// GateType 出入口类型
type GateType string

const (
	GateTypeEntry GateType = "entry" // 入口
	GateTypeExit  GateType = "exit"  // 出口
)

// 出入口相关错误
var (
	ErrGateNotFound              = errors.New("出入口不存在")
	ErrGateNameDuplicate         = errors.New("该出入口名称已存在")
	ErrGateHasUnfinishedRecords  = errors.New("该出入口存在未完成的通行记录，无法删除")
	ErrLastEntryGate             = errors.New("每个车场至少保留一个入口")
	ErrLastExitGate              = errors.New("每个车场至少保留一个出口")
	ErrDeviceAlreadyBound        = errors.New("该设备已被其他出入口绑定")
)

// NewGate 创建新出入口
func NewGate(
	id string,
	parkingLotID string,
	name string,
	gateType GateType,
	deviceID *string,
) *Gate {
	return &Gate{
		ID:           id,
		ParkingLotID: parkingLotID,
		Name:         name,
		Type:         gateType,
		DeviceID:     deviceID,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
}

// Update 更新出入口信息
func (g *Gate) Update(name string, deviceID *string) {
	g.Name = name
	g.DeviceID = deviceID
	g.UpdatedAt = time.Now()
}

// BindDevice 绑定设备
func (g *Gate) BindDevice(deviceID string) {
	g.DeviceID = &deviceID
	g.UpdatedAt = time.Now()
}

// UnbindDevice 解绑设备
func (g *Gate) UnbindDevice() {
	g.DeviceID = nil
	g.UpdatedAt = time.Now()
}

// HasDevice 是否已绑定设备
func (g *Gate) HasDevice() bool {
	return g.DeviceID != nil
}

// IsEntry 是否为入口
func (g *Gate) IsEntry() bool {
	return g.Type == GateTypeEntry
}

// IsExit 是否为出口
func (g *Gate) IsExit() bool {
	return g.Type == GateTypeExit
}

// ValidateGateType 校验出入口类型
func ValidateGateType(gateType GateType) bool {
	switch gateType {
	case GateTypeEntry, GateTypeExit:
		return true
	default:
		return false
	}
}

// GateWithDevice 带设备信息的出入口（用于 API 响应）
type GateWithDevice struct {
	Gate
	Device *GateDeviceInfo
}

// GateDeviceInfo 设备信息
type GateDeviceInfo struct {
	ID           string
	SerialNumber string
	Status       string
	LastHeartbeat *time.Time
}
