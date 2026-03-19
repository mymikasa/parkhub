package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/handler/dto"
	"github.com/parkhub/api/internal/pkg/validator"
	"github.com/parkhub/api/internal/service"
)

var BillingRuleHandlerSet = wire.NewSet(NewBillingRuleHandler)

type BillingRuleHandler struct {
	billingRuleService service.BillingRuleService
}

func NewBillingRuleHandler(billingRuleService service.BillingRuleService) *BillingRuleHandler {
	return &BillingRuleHandler{billingRuleService: billingRuleService}
}

// Get 获取停车场的计费规则
func (h *BillingRuleHandler) Get(c *gin.Context) {
	parkingLotID := c.Query("parking_lot_id")
	if parkingLotID == "" {
		c.JSON(http.StatusBadRequest, dto.Response{Code: 400, Message: "缺少 parking_lot_id 参数"})
		return
	}

	rule, err := h.billingRuleService.GetByParkingLotID(c.Request.Context(), &service.GetBillingRuleRequest{
		OperatorRole:     c.GetString("role"),
		OperatorTenantID: c.GetString("tenant_id"),
		ParkingLotID:     parkingLotID,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "success",
		Data:    h.toBillingRuleDTO(rule),
	})
}

// Update 更新计费规则
func (h *BillingRuleHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateBillingRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Response{Code: 400, Message: validator.FormatValidationError(err)})
		return
	}

	rule, err := h.billingRuleService.Update(c.Request.Context(), &service.UpdateBillingRuleRequest{
		OperatorID:       c.GetString("user_id"),
		OperatorRole:     c.GetString("role"),
		OperatorTenantID: c.GetString("tenant_id"),
		ID:               id,
		FreeMinutes:      req.FreeMinutes,
		PricePerHour:     req.PricePerHour,
		DailyCap:         req.DailyCap,
		IP:               c.ClientIP(),
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "计费规则已更新",
		Data:    h.toBillingRuleDTO(rule),
	})
}

// Calculate 费用模拟计算
func (h *BillingRuleHandler) Calculate(c *gin.Context) {
	var req dto.CalculateFeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Response{Code: 400, Message: validator.FormatValidationError(err)})
		return
	}

	result, err := h.billingRuleService.Calculate(c.Request.Context(), &service.CalculateFeeRequest{
		OperatorRole:     c.GetString("role"),
		OperatorTenantID: c.GetString("tenant_id"),
		ParkingLotID:     req.ParkingLotID,
		EntryTime:        req.EntryTime,
		ExitTime:         req.ExitTime,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "success",
		Data: dto.CalculateFeeResponse{
			ParkingDuration: result.ParkingDuration,
			FreeMinutes:     result.FreeMinutes,
			BillableMinutes: result.BillableMinutes,
			BillableHours:   result.BillableHours,
			PricePerHour:    result.PricePerHour,
			DailyCap:        result.DailyCap,
			Days:            result.Days,
			RawFee:          result.RawFee,
			FinalFee:        result.FinalFee,
		},
	})
}

func (h *BillingRuleHandler) toBillingRuleDTO(rule *domain.BillingRule) dto.BillingRule {
	return dto.BillingRule{
		ID:           rule.ID,
		TenantID:     rule.TenantID,
		ParkingLotID: rule.ParkingLotID,
		FreeMinutes:  rule.FreeMinutes,
		PricePerHour: rule.PricePerHour,
		DailyCap:     rule.DailyCap,
		CreatedAt:    rule.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:    rule.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func (h *BillingRuleHandler) handleError(c *gin.Context, err error) {
	if de, ok := err.(*domain.DomainError); ok {
		switch de.Code {
		case domain.CodeBillingRuleNotFound:
			c.JSON(http.StatusNotFound, dto.Response{Code: 40402, Message: de.Message})
		case "FORBIDDEN":
			c.JSON(http.StatusForbidden, dto.Response{Code: 40303, Message: de.Message})
		case domain.CodeInvalidFreeMinutes, domain.CodeInvalidPricePerHour, domain.CodeInvalidDailyCap, domain.CodeInvalidTimeRange:
			c.JSON(http.StatusBadRequest, dto.Response{Code: 40003, Message: de.Message})
		default:
			c.JSON(http.StatusInternalServerError, dto.Response{Code: 500, Message: de.Message})
		}
		return
	}
	c.JSON(http.StatusInternalServerError, dto.Response{Code: 500, Message: "服务器内部错误"})
}
