package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/handler/dto"
	"github.com/parkhub/api/internal/pkg/validator"
	"github.com/parkhub/api/internal/service"
)

var GateHandlerSet = wire.NewSet(NewGateHandler)

type GateHandler struct {
	gateService       service.GateService
	parkingLotService service.ParkingLotService
}

func NewGateHandler(gateService service.GateService, parkingLotService service.ParkingLotService) *GateHandler {
	return &GateHandler{gateService: gateService, parkingLotService: parkingLotService}
}

// List 获取出入口列表
func (h *GateHandler) List(c *gin.Context) {
	parkingLotID := c.Param("id")
	tenantID := c.GetString("tenant_id")

	// 验证停车场归属
	_, err := h.parkingLotService.GetByID(c.Request.Context(), parkingLotID, tenantID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	gates, err := h.gateService.ListByParkingLotID(c.Request.Context(), parkingLotID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	items := make([]dto.GateWithDevice, len(gates))
	for i, g := range gates {
		items[i] = h.toGateWithDeviceDTO(g)
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "success",
		Data:    items,
	})
}

// Create 创建出入口
func (h *GateHandler) Create(c *gin.Context) {
	parkingLotID := c.Param("id")
	tenantID := c.GetString("tenant_id")

	// 验证停车场归属
	_, err := h.parkingLotService.GetByID(c.Request.Context(), parkingLotID, tenantID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	var req dto.CreateGateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Response{Code: 400, Message: validator.FormatValidationError(err)})
		return
	}

	svcReq := &service.CreateGateRequest{
		ParkingLotID: parkingLotID,
		Name:         req.Name,
		Type:         domain.GateType(req.Type),
	}

	gate, err := h.gateService.Create(c.Request.Context(), svcReq)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, dto.Response{
		Code:    0,
		Message: "出入口添加成功",
		Data:    h.toGateDTO(gate),
	})
}

// Update 更新出入口
func (h *GateHandler) Update(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.GetString("tenant_id")

	// 先获取出入口以验证租户归属
	existingGate, err := h.gateService.GetByID(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	// 验证停车场归属
	_, err = h.parkingLotService.GetByID(c.Request.Context(), existingGate.ParkingLotID, tenantID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	var req dto.UpdateGateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Response{Code: 400, Message: validator.FormatValidationError(err)})
		return
	}

	svcReq := &service.UpdateGateRequest{
		ID:   id,
		Name: req.Name,
	}

	gate, err := h.gateService.Update(c.Request.Context(), svcReq)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "修改已保存",
		Data:    h.toGateDTO(gate),
	})
}

// Delete 删除出入口
func (h *GateHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.GetString("tenant_id")

	// 先获取出入口以验证租户归属
	existingGate, err := h.gateService.GetByID(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	// 验证停车场归属
	_, err = h.parkingLotService.GetByID(c.Request.Context(), existingGate.ParkingLotID, tenantID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	if err := h.gateService.Delete(c.Request.Context(), id); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{Code: 0, Message: "删除成功"})
}

func (h *GateHandler) toGateDTO(gate *domain.Gate) dto.Gate {
	return dto.Gate{
		ID:           gate.ID,
		ParkingLotID: gate.ParkingLotID,
		Name:         gate.Name,
		Type:         string(gate.Type),
		DeviceID:     gate.DeviceID,
		CreatedAt:    gate.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:    gate.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func (h *GateHandler) toGateWithDeviceDTO(gate *domain.GateWithDevice) dto.GateWithDevice {
	result := dto.GateWithDevice{
		Gate: dto.Gate{
			ID:           gate.ID,
			ParkingLotID: gate.ParkingLotID,
			Name:         gate.Name,
			Type:         string(gate.Type),
			DeviceID:     gate.DeviceID,
			CreatedAt:    gate.CreatedAt.Format("2006-01-02T15:04:05Z"),
			UpdatedAt:    gate.UpdatedAt.Format("2006-01-02T15:04:05Z"),
		},
		BoundDeviceCount:   gate.BoundDeviceCount,
		OfflineDeviceCount: gate.OfflineDeviceCount,
	}
	if gate.Device != nil {
		result.Device = &dto.GateDeviceInfo{
			ID:            gate.Device.ID,
			SerialNumber:  gate.Device.SerialNumber,
			Status:        gate.Device.Status,
			LastHeartbeat: formatTime(gate.Device.LastHeartbeat),
		}
	}
	return result
}

func (h *GateHandler) handleError(c *gin.Context, err error) {
	if de, ok := err.(*domain.DomainError); ok {
		switch de.Code {
		case "GATE_NOT_FOUND":
			c.JSON(http.StatusNotFound, dto.Response{Code: 40402, Message: de.Message})
		case "GATE_NAME_EXISTS":
			c.JSON(http.StatusConflict, dto.Response{Code: 40902, Message: de.Message})
		case "LAST_ENTRY_GATE", "LAST_EXIT_GATE":
			c.JSON(http.StatusForbidden, dto.Response{Code: 40303, Message: de.Message})
		case "FORBIDDEN":
			c.JSON(http.StatusForbidden, dto.Response{Code: 40301, Message: de.Message})
		default:
			c.JSON(http.StatusInternalServerError, dto.Response{Code: 500, Message: de.Message})
		}
		return
	}
	c.JSON(http.StatusInternalServerError, dto.Response{Code: 500, Message: "服务器内部错误"})
}

func formatTime(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02T15:04:05Z")
}
