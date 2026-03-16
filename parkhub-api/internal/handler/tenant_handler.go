package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/handler/dto"
	"github.com/parkhub/api/internal/service"
)

var TenantHandlerSet = wire.NewSet(NewTenantHandler)

type TenantHandler struct {
	tenantService service.TenantService
}

func NewTenantHandler(tenantService service.TenantService) *TenantHandler {
	return &TenantHandler{
		tenantService: tenantService,
	}
}

// List 获取租户列表
func (h *TenantHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	statusStr := c.Query("status")
	keyword := c.Query("keyword")

	var status *domain.TenantStatus
	if statusStr != "" {
		s := domain.TenantStatus(statusStr)
		status = &s
	}

	filter := service.TenantFilter{
		Status:   status,
		Keyword:  keyword,
		Page:     page,
		PageSize: pageSize,
	}

	resp, err := h.tenantService.List(c.Request.Context(), filter)
	if err != nil {
		h.handleError(c, err)
		return
	}

	items := make([]dto.Tenant, len(resp.Items))
	for i, t := range resp.Items {
		items[i] = h.toTenantDTO(t)
	}

	c.JSON(http.StatusOK, dto.TenantListResponse{
		Items:    items,
		Total:    resp.Total,
		Page:     resp.Page,
		PageSize: resp.PageSize,
	})
}

// Get 获取租户详情
func (h *TenantHandler) Get(c *gin.Context) {
	id := c.Param("id")

	tenant, err := h.tenantService.GetByID(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, h.toTenantDTO(tenant))
}

// Create 创建租户
func (h *TenantHandler) Create(c *gin.Context) {
	var req dto.CreateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "请求参数错误: " + err.Error(),
		})
		return
	}

	tenant, err := h.tenantService.Create(c.Request.Context(), &service.CreateTenantRequest{
		CompanyName:  req.CompanyName,
		ContactName:  req.ContactName,
		ContactPhone: req.ContactPhone,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, h.toTenantDTO(tenant))
}

// Update 更新租户
func (h *TenantHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "请求参数错误: " + err.Error(),
		})
		return
	}

	tenant, err := h.tenantService.Update(c.Request.Context(), id, &service.UpdateTenantRequest{
		CompanyName:  req.CompanyName,
		ContactName:  req.ContactName,
		ContactPhone: req.ContactPhone,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, h.toTenantDTO(tenant))
}

// Freeze 冻结租户
func (h *TenantHandler) Freeze(c *gin.Context) {
	id := c.Param("id")

	if err := h.tenantService.Freeze(c.Request.Context(), id); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{
		Message: "租户已冻结",
	})
}

// Unfreeze 解冻租户
func (h *TenantHandler) Unfreeze(c *gin.Context) {
	id := c.Param("id")

	if err := h.tenantService.Unfreeze(c.Request.Context(), id); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{
		Message: "租户已解冻",
	})
}

func (h *TenantHandler) toTenantDTO(t *domain.Tenant) dto.Tenant {
	return dto.Tenant{
		ID:           t.ID,
		CompanyName:  t.CompanyName,
		ContactName:  t.ContactName,
		ContactPhone: t.ContactPhone,
		Status:       string(t.Status),
		CreatedAt:    t.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:    t.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}

func (h *TenantHandler) handleError(c *gin.Context, err error) {
	if err == nil {
		return
	}

	if err == domain.ErrTenantNotFound {
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Code:    "TENANT_NOT_FOUND",
			Message: "租户不存在",
		})
		return
	}

	status := http.StatusInternalServerError
	code := "INTERNAL_ERROR"
	message := "服务器内部错误"

	c.JSON(status, dto.ErrorResponse{
		Code:    code,
		Message: message,
	})
}
