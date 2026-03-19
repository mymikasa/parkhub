package dto

import "github.com/parkhub/api/internal/domain"

// CreateTransitRecordRequest 创建通行记录请求
type CreateTransitRecordRequest struct {
	ParkingLotID string  `json:"parking_lot_id" binding:"required"`
	GateID       string  `json:"gate_id" binding:"required"`
	Type         string  `json:"type" binding:"required,oneof=entry exit"`
	PlateNumber  *string `json:"plate_number"`
	ImageURL     *string `json:"image_url"`
}

// ResolveTransitRecordRequest 处理异常记录请求
type ResolveTransitRecordRequest struct {
	PlateNumber *string `json:"plate_number"`
	Remark      *string `json:"remark"`
}

// TransitRecordResponse 通行记录响应
type TransitRecordResponse struct {
	ID              string   `json:"id"`
	TenantID        string   `json:"tenant_id"`
	ParkingLotID    string   `json:"parking_lot_id"`
	ParkingLotName  string   `json:"parking_lot_name"`
	GateID          string   `json:"gate_id"`
	GateName        string   `json:"gate_name"`
	PlateNumber     *string  `json:"plate_number"`
	Type            string   `json:"type"`
	Status          string   `json:"status"`
	ImageURL        *string  `json:"image_url"`
	Fee             *float64 `json:"fee"`
	EntryRecordID   *string  `json:"entry_record_id"`
	ParkingDuration *int     `json:"parking_duration"`
	Remark          *string  `json:"remark"`
	ResolvedAt      *string  `json:"resolved_at"`
	ResolvedBy      *string  `json:"resolved_by"`
	CreatedAt       string   `json:"created_at"`
	UpdatedAt       string   `json:"updated_at"`
}

// TransitStatsResponse 今日统计响应
type TransitStatsResponse struct {
	EntryCount   int64   `json:"entry_count"`
	ExitCount    int64   `json:"exit_count"`
	OnSiteCount  int64   `json:"on_site_count"`
	TodayRevenue float64 `json:"today_revenue"`
}

// ToTransitRecordResponse 将领域对象转为响应 DTO
func ToTransitRecordResponse(item *domain.TransitRecordListItem) *TransitRecordResponse {
	resp := &TransitRecordResponse{
		ID:              item.ID,
		TenantID:        item.TenantID,
		ParkingLotID:    item.ParkingLotID,
		ParkingLotName:  item.ParkingLotName,
		GateID:          item.GateID,
		GateName:        item.GateName,
		PlateNumber:     item.PlateNumber,
		Type:            string(item.Type),
		Status:          string(item.Status),
		ImageURL:        item.ImageURL,
		Fee:             item.Fee,
		EntryRecordID:   item.EntryRecordID,
		ParkingDuration: item.ParkingDuration,
		Remark:          item.Remark,
		ResolvedBy:      item.ResolvedBy,
		CreatedAt:       item.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:       item.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
	if item.ResolvedAt != nil {
		s := item.ResolvedAt.Format("2006-01-02T15:04:05Z")
		resp.ResolvedAt = &s
	}
	return resp
}

// ToTransitRecordResponseList 批量转换
func ToTransitRecordResponseList(items []*domain.TransitRecordListItem) []*TransitRecordResponse {
	result := make([]*TransitRecordResponse, len(items))
	for i, item := range items {
		result[i] = ToTransitRecordResponse(item)
	}
	return result
}
