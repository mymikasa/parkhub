package dto

// Response 通用响应
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// CreateParkingLotRequest 创建停车场请求
type CreateParkingLotRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=50"`
	Address     string `json:"address" binding:"required,min=5,max=100"`
	TotalSpaces int    `json:"total_spaces" binding:"required,min=1,max=99999"`
	LotType     string `json:"lot_type"`
}

// UpdateParkingLotRequest 更新停车场请求
type UpdateParkingLotRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=50"`
	Address     string `json:"address" binding:"required,min=5,max=100"`
	TotalSpaces int    `json:"total_spaces" binding:"required,min=1,max=99999"`
	LotType     string `json:"lot_type"`
	Status      string `json:"status"`
}

// ParkingLot 停车场信息
type ParkingLot struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Address         string `json:"address"`
	TotalSpaces     int    `json:"total_spaces"`
	AvailableSpaces int    `json:"available_spaces"`
	LotType         string `json:"lot_type"`
	Status          string `json:"status"`
	CreatedAt       string `json:"created_at"`
	UpdatedAt       string `json:"updated_at"`
}

// ParkingLotListData 停车场列表数据
type ParkingLotListData struct {
	Items    interface{} `json:"items"`
	Total    int64       `json:"total"`
	Page     int         `json:"page"`
	PageSize int         `json:"page_size"`
}

// ParkingLotStatsData 停车场统计数据
type ParkingLotStatsData struct {
	TotalSpaces      int64 `json:"total_spaces"`
	AvailableSpaces  int64 `json:"available_spaces"`
	OccupiedVehicles int64 `json:"occupied_vehicles"`
	TotalGates       int64 `json:"total_gates"`
}
