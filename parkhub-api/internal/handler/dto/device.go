package dto

import "github.com/parkhub/api/internal/service"

// CreateDeviceRequest 手动创建设备请求
type CreateDeviceRequest struct {
	ID   string `json:"id" binding:"required,min=1,max=100"`
	Name string `json:"name" binding:"omitempty,max=50"`
}

// UpdateDeviceNameRequest 更新设备名称请求
type UpdateDeviceNameRequest struct {
	Name string `json:"name" binding:"required,min=1,max=50"`
}

// DeviceDetail 设备详情
type DeviceDetail struct {
	ID              string  `json:"id"`
	TenantID        string  `json:"tenant_id"`
	Name            string  `json:"name"`
	Status          string  `json:"status"`
	FirmwareVersion string  `json:"firmware_version"`
	LastHeartbeat   *string `json:"last_heartbeat,omitempty"`
	ParkingLotID    *string `json:"parking_lot_id,omitempty"`
	GateID          *string `json:"gate_id,omitempty"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       string  `json:"updated_at"`
}

// DeviceListItem 设备列表项
type DeviceListItem struct {
	ID              string  `json:"id"`
	TenantID        string  `json:"tenant_id"`
	Name            string  `json:"name"`
	Status          string  `json:"status"`
	FirmwareVersion string  `json:"firmware_version"`
	LastHeartbeat   *string `json:"last_heartbeat,omitempty"`
	ParkingLotID    *string `json:"parking_lot_id,omitempty"`
	ParkingLotName  *string `json:"parking_lot_name,omitempty"`
	GateID          *string `json:"gate_id,omitempty"`
	GateName        *string `json:"gate_name,omitempty"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       string  `json:"updated_at"`
}

// DeviceListData 设备列表数据
type DeviceListData struct {
	Items    []*DeviceListItem `json:"items"`
	Total    int64             `json:"total"`
	Page     int               `json:"page"`
	PageSize int               `json:"page_size"`
}

// DeviceStatsData 设备统计数据
type DeviceStatsData struct {
	Total    int64 `json:"total"`
	Active   int64 `json:"active"`
	Offline  int64 `json:"offline"`
	Pending  int64 `json:"pending"`
	Disabled int64 `json:"disabled"`
}

// ToDeviceListItemDTO converts service layer item to DTO.
func ToDeviceListItemDTO(item *service.DeviceListItem) *DeviceListItem {
	return &DeviceListItem{
		ID:              item.ID,
		TenantID:        item.TenantID,
		Name:            item.Name,
		Status:          string(item.Status),
		FirmwareVersion: item.FirmwareVersion,
		LastHeartbeat:   item.LastHeartbeat,
		ParkingLotID:    item.ParkingLotID,
		ParkingLotName:  item.ParkingLotName,
		GateID:          item.GateID,
		GateName:        item.GateName,
		CreatedAt:       item.CreatedAt,
		UpdatedAt:       item.UpdatedAt,
	}
}
