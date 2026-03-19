package dto

// UpdateBillingRuleRequest 更新计费规则请求
type UpdateBillingRuleRequest struct {
	FreeMinutes  int     `json:"free_minutes" binding:"min=0,max=120"`
	PricePerHour float64 `json:"price_per_hour" binding:"required,min=1,max=50"`
	DailyCap     float64 `json:"daily_cap" binding:"min=0,max=500"`
}

// CalculateFeeRequest 费用模拟计算请求
type CalculateFeeRequest struct {
	ParkingLotID string `json:"parking_lot_id" binding:"required"`
	EntryTime    string `json:"entry_time" binding:"required"`
	ExitTime     string `json:"exit_time" binding:"required"`
}

// BillingRule 计费规则响应
type BillingRule struct {
	ID           string  `json:"id"`
	TenantID     string  `json:"tenant_id"`
	ParkingLotID string  `json:"parking_lot_id"`
	FreeMinutes  int     `json:"free_minutes"`
	PricePerHour float64 `json:"price_per_hour"`
	DailyCap     float64 `json:"daily_cap"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

// CalculateFeeResponse 费用计算结果响应
type CalculateFeeResponse struct {
	ParkingDuration int     `json:"parking_duration"`
	FreeMinutes     int     `json:"free_minutes"`
	BillableMinutes int     `json:"billable_minutes"`
	BillableHours   int     `json:"billable_hours"`
	PricePerHour    float64 `json:"price_per_hour"`
	DailyCap        float64 `json:"daily_cap"`
	Days            int     `json:"days"`
	RawFee          float64 `json:"raw_fee"`
	FinalFee        float64 `json:"final_fee"`
}
