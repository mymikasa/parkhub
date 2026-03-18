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

var DeviceHandlerSet = wire.NewSet(NewDeviceHandler)

type DeviceHandler struct {
	deviceService        service.DeviceService
	deviceControlService service.DeviceControlService
}

func NewDeviceHandler(deviceService service.DeviceService, deviceControlService service.DeviceControlService) *DeviceHandler {
	return &DeviceHandler{
		deviceService:        deviceService,
		deviceControlService: deviceControlService,
	}
}

// Create 手动创建设备
func (h *DeviceHandler) Create(c *gin.Context) {
	tenantID := c.GetString("tenant_id")

	var req dto.CreateDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Response{Code: 400, Message: validator.FormatValidationError(err)})
		return
	}

	device, err := h.deviceService.Create(c.Request.Context(), &service.CreateDeviceRequest{
		ID:       req.ID,
		TenantID: tenantID,
		Name:     req.Name,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, dto.Response{
		Code:    0,
		Message: "创建成功",
		Data:    h.toDeviceDetailDTO(device),
	})
}

// List 获取设备列表
func (h *DeviceHandler) List(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	statusStr := c.Query("status")
	keyword := c.Query("keyword")
	parkingLotID := c.Query("parking_lot_id")
	gateID := c.Query("gate_id")

	var status *domain.DeviceStatus
	if statusStr != "" {
		s := domain.DeviceStatus(statusStr)
		status = &s
	}

	req := &service.ListDevicesRequest{
		TenantID:     tenantID,
		ParkingLotID: parkingLotID,
		GateID:       gateID,
		Status:       status,
		Keyword:      keyword,
		Page:         page,
		PageSize:     pageSize,
	}

	resp, err := h.deviceService.List(c.Request.Context(), req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	items := make([]*dto.DeviceListItem, len(resp.Items))
	for i, item := range resp.Items {
		items[i] = dto.ToDeviceListItemDTO(item)
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "success",
		Data: dto.DeviceListData{
			Items:    items,
			Total:    resp.Total,
			Page:     resp.Page,
			PageSize: resp.PageSize,
		},
	})
}

// Get 获取设备详情
func (h *DeviceHandler) Get(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.GetString("tenant_id")

	device, err := h.deviceService.GetByID(c.Request.Context(), &service.GetDeviceRequest{
		ID:       id,
		TenantID: tenantID,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "success",
		Data:    h.toDeviceDetailDTO(device),
	})
}

// UpdateName 更新设备名称
func (h *DeviceHandler) UpdateName(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.GetString("tenant_id")

	var req dto.UpdateDeviceNameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Response{Code: 400, Message: validator.FormatValidationError(err)})
		return
	}

	device, err := h.deviceService.UpdateName(c.Request.Context(), &service.UpdateDeviceNameRequest{
		ID:       id,
		TenantID: tenantID,
		Name:     req.Name,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "设备名称已更新",
		Data:    h.toDeviceDetailDTO(device),
	})
}

func (h *DeviceHandler) Bind(c *gin.Context) {
	id := c.Param("id")
	role := c.GetString("role")
	tenantID := c.GetString("tenant_id")

	var req dto.BindDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Response{Code: 400, Message: validator.FormatValidationError(err)})
		return
	}

	device, err := h.deviceService.Bind(c.Request.Context(), &service.BindDeviceRequest{
		ID:               id,
		OperatorRole:     role,
		OperatorTenantID: tenantID,
		TargetTenantID:   req.TenantID,
		ParkingLotID:     req.ParkingLotID,
		GateID:           req.GateID,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "设备绑定成功",
		Data:    h.toDeviceDetailDTO(device),
	})
}

func (h *DeviceHandler) Unbind(c *gin.Context) {
	id := c.Param("id")
	role := c.GetString("role")
	tenantID := c.GetString("tenant_id")

	device, err := h.deviceService.Unbind(c.Request.Context(), &service.UnbindDeviceRequest{
		ID:               id,
		OperatorRole:     role,
		OperatorTenantID: tenantID,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "设备解绑成功",
		Data:    h.toDeviceDetailDTO(device),
	})
}

// GetStats 获取设备统计
func (h *DeviceHandler) GetStats(c *gin.Context) {
	tenantID := c.GetString("tenant_id")

	stats, err := h.deviceService.GetStats(c.Request.Context(), tenantID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "success",
		Data: dto.DeviceStatsData{
			Total:    stats.Total,
			Active:   stats.Active,
			Offline:  stats.Offline,
			Pending:  stats.Pending,
			Disabled: stats.Disabled,
		},
	})
}

func (h *DeviceHandler) Control(c *gin.Context) {
	deviceID := c.Param("id")
	tenantID := c.GetString("tenant_id")
	userID := c.GetString("user_id")
	realName := c.GetString("real_name")

	var req dto.ControlDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Response{Code: 400, Message: validator.FormatValidationError(err)})
		return
	}

	_, err := h.deviceControlService.Control(c.Request.Context(), &service.ControlDeviceRequest{
		DeviceID:     deviceID,
		TenantID:     tenantID,
		Command:      req.Command,
		OperatorID:   userID,
		OperatorName: realName,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "控制指令已发送",
	})
}

func (h *DeviceHandler) toDeviceDetailDTO(device *domain.Device) dto.DeviceDetail {
	var lastHeartbeat *string
	if device.LastHeartbeat != nil {
		formatted := device.LastHeartbeat.Format("2006-01-02T15:04:05Z")
		lastHeartbeat = &formatted
	}

	return dto.DeviceDetail{
		ID:              device.ID,
		TenantID:        device.TenantID,
		Name:            device.Name,
		Status:          string(device.Status),
		FirmwareVersion: device.FirmwareVersion,
		LastHeartbeat:   lastHeartbeat,
		ParkingLotID:    device.ParkingLotID,
		GateID:          device.GateID,
		CreatedAt:       device.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:       device.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func (h *DeviceHandler) handleError(c *gin.Context, err error) {
	if de, ok := err.(*domain.DomainError); ok {
		switch de.Code {
		case "DEVICE_NOT_FOUND":
			c.JSON(http.StatusNotFound, dto.Response{Code: 40401, Message: de.Message})
		case "DEVICE_ID_DUPLICATE":
			c.JSON(http.StatusConflict, dto.Response{Code: 40901, Message: de.Message})
		case "FORBIDDEN":
			c.JSON(http.StatusForbidden, dto.Response{Code: 40301, Message: de.Message})
		case "DEVICE_INVALID_STATUS", "DEVICE_GATE_CAPACITY_EXCEEDED", "DEVICE_NOT_BOUND":
			c.JSON(http.StatusBadRequest, dto.Response{Code: 40003, Message: de.Message})
		case "TENANT_NOT_FOUND", "PARKING_LOT_NOT_FOUND", "GATE_NOT_FOUND":
			c.JSON(http.StatusNotFound, dto.Response{Code: 40402, Message: de.Message})
		case domain.CodeDeviceOffline:
			c.JSON(http.StatusBadRequest, dto.Response{Code: 40001, Message: de.Message})
		case domain.CodeInvalidCommand:
			c.JSON(http.StatusBadRequest, dto.Response{Code: 40002, Message: de.Message})
		default:
			c.JSON(http.StatusInternalServerError, dto.Response{Code: 500, Message: de.Message})
		}
		return
	}
	c.JSON(http.StatusInternalServerError, dto.Response{Code: 500, Message: "服务器内部错误"})
}
