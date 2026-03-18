package dto

// CreateGateRequest 创建出入口请求
type CreateGateRequest struct {
	Name string `json:"name" binding:"required,min=2,max=20"`
	Type string `json:"type" binding:"required,oneof=entry exit"`
}

// UpdateGateRequest 更新出入口请求
type UpdateGateRequest struct {
	Name string `json:"name" binding:"required,min=2,max=20"`
}

// Gate 出入口信息
type Gate struct {
	ID           string  `json:"id"`
	ParkingLotID string  `json:"parking_lot_id"`
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	DeviceID     *string `json:"device_id"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

// GateWithDevice 带设备信息的出入口
type GateWithDevice struct {
	Gate
	Device             *GateDeviceInfo `json:"device,omitempty"`
	BoundDeviceCount   int             `json:"bound_device_count"`
	OfflineDeviceCount int             `json:"offline_device_count"`
}

// GateDeviceInfo 设备信息
type GateDeviceInfo struct {
	ID            string `json:"id"`
	SerialNumber  string `json:"serial_number"`
	Status        string `json:"status"`
	LastHeartbeat string `json:"last_heartbeat,omitempty"`
}
