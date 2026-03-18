package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/handler/dto"
	"github.com/parkhub/api/internal/pkg/validator"
	"github.com/parkhub/api/internal/service"
)

var ParkingLotHandlerSet = wire.NewSet(NewParkingLotHandler)

type ParkingLotHandler struct {
	parkingLotService service.ParkingLotService
}

func NewParkingLotHandler(parkingLotService service.ParkingLotService) *ParkingLotHandler {
	return &ParkingLotHandler{parkingLotService: parkingLotService}
}

// List 获取停车场列表
func (h *ParkingLotHandler) List(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	role := c.GetString("role")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	statusStr := c.Query("status")
	keyword := c.Query("search")
	filterTenantID := c.Query("tenant_id")

	var status *domain.ParkingLotStatus
	if statusStr != "" {
		s := domain.ParkingLotStatus(statusStr)
		status = &s
	}

	req := &service.ListParkingLotsRequest{
		OperatorRole:     role,
		OperatorTenantID: tenantID,
		TenantID:         filterTenantID,
		Status:           status,
		Keyword:          keyword,
		Page:             page,
		PageSize:         pageSize,
	}

	resp, err := h.parkingLotService.List(c.Request.Context(), req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "success",
		Data: dto.ParkingLotListData{
			Items:    resp.Items,
			Total:    resp.Total,
			Page:     resp.Page,
			PageSize: resp.PageSize,
		},
	})
}

// Get 获取停车场详情
func (h *ParkingLotHandler) Get(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.GetString("tenant_id")

	lot, err := h.parkingLotService.GetByID(c.Request.Context(), id, tenantID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "success",
		Data:    h.toParkingLotDTO(lot),
	})
}

// Create 创建停车场
func (h *ParkingLotHandler) Create(c *gin.Context) {
	tenantID := c.GetString("tenant_id")

	var req dto.CreateParkingLotRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Response{Code: 400, Message: validator.FormatValidationError(err)})
		return
	}

	svcReq := &service.CreateParkingLotRequest{
		TenantID:    tenantID,
		Name:        req.Name,
		Address:     req.Address,
		TotalSpaces: req.TotalSpaces,
		LotType:     domain.LotType(req.LotType),
	}

	lot, err := h.parkingLotService.Create(c.Request.Context(), svcReq)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, dto.Response{
		Code:    0,
		Message: "车场创建成功",
		Data:    h.toParkingLotDTO(lot),
	})
}

// Update 更新停车场
func (h *ParkingLotHandler) Update(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.GetString("tenant_id")

	var req dto.UpdateParkingLotRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Response{Code: 400, Message: validator.FormatValidationError(err)})
		return
	}

	svcReq := &service.UpdateParkingLotRequest{
		ID:          id,
		TenantID:    tenantID,
		Name:        req.Name,
		Address:     req.Address,
		TotalSpaces: req.TotalSpaces,
		LotType:     domain.LotType(req.LotType),
		Status:      domain.ParkingLotStatus(req.Status),
	}

	lot, err := h.parkingLotService.Update(c.Request.Context(), svcReq)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "修改已保存",
		Data:    h.toParkingLotDTO(lot),
	})
}

// Delete 删除停车场
func (h *ParkingLotHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.GetString("tenant_id")

	if err := h.parkingLotService.Delete(c.Request.Context(), id, tenantID); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{Code: 0, Message: "删除成功"})
}

// GetStats 获取统计数据
func (h *ParkingLotHandler) GetStats(c *gin.Context) {
	tenantID := c.GetString("tenant_id")

	stats, err := h.parkingLotService.GetStats(c.Request.Context(), tenantID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "success",
		Data: dto.ParkingLotStatsData{
			TotalSpaces:      stats.TotalSpaces,
			AvailableSpaces:  stats.AvailableSpaces,
			OccupiedVehicles: stats.OccupiedVehicles,
			TotalGates:       stats.TotalGates,
		},
	})
}

func (h *ParkingLotHandler) toParkingLotDTO(lot *domain.ParkingLot) dto.ParkingLot {
	return dto.ParkingLot{
		ID:              lot.ID,
		Name:            lot.Name,
		Address:         lot.Address,
		TotalSpaces:     lot.TotalSpaces,
		AvailableSpaces: lot.AvailableSpaces,
		LotType:         string(lot.LotType),
		Status:          string(lot.Status),
		CreatedAt:       lot.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:       lot.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func (h *ParkingLotHandler) handleError(c *gin.Context, err error) {
	if de, ok := err.(*domain.DomainError); ok {
		switch de.Code {
		case "PARKING_LOT_NOT_FOUND":
			c.JSON(http.StatusNotFound, dto.Response{Code: 40401, Message: de.Message})
		case "PARKING_LOT_NAME_EXISTS":
			c.JSON(http.StatusConflict, dto.Response{Code: 40901, Message: de.Message})
		case "FORBIDDEN":
			c.JSON(http.StatusForbidden, dto.Response{Code: 40301, Message: de.Message})
		case "INVALID_TOTAL_SPACES":
			c.JSON(http.StatusBadRequest, dto.Response{Code: 40002, Message: de.Message})
		case "PARKING_LOT_HAS_VEHICLES":
			c.JSON(http.StatusForbidden, dto.Response{Code: 40302, Message: de.Message})
		default:
			c.JSON(http.StatusInternalServerError, dto.Response{Code: 500, Message: de.Message})
		}
		return
	}
	c.JSON(http.StatusInternalServerError, dto.Response{Code: 500, Message: "服务器内部错误"})
}
