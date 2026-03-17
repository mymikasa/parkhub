package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/handler/dto"
	"github.com/parkhub/api/internal/middleware"
	"github.com/parkhub/api/internal/service"
)

// UserHandlerSet is the Wire provider set for UserHandler.
var UserHandlerSet = wire.NewSet(NewUserHandler)

// UserHandler 用户管理处理器
type UserHandler struct {
	userService    service.UserService
	auditLogService service.AuditLogService
}

// NewUserHandler 创建用户管理处理器
func NewUserHandler(userService service.UserService, auditLogService service.AuditLogService) *UserHandler {
	return &UserHandler{
		userService:    userService,
		auditLogService: auditLogService,
	}
}

// List 获取用户列表
func (h *UserHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	resp, err := h.userService.List(c.Request.Context(), &service.ListUsersRequest{
		OperatorRole:     middleware.GetRole(c),
		OperatorTenantID: middleware.GetTenantID(c),
		TenantID:         c.Query("tenant_id"),
		Role:             c.Query("role"),
		Status:           c.Query("status"),
		Keyword:          c.Query("keyword"),
		Page:             page,
		PageSize:         pageSize,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	items := make([]dto.UserDTO, len(resp.Items))
	for i, u := range resp.Items {
		items[i] = h.toUserDTO(u)
	}

	c.JSON(http.StatusOK, dto.UserListResponse{
		Items:    items,
		Total:    resp.Total,
		Page:     resp.Page,
		PageSize: resp.PageSize,
	})
}

// Get 获取用户详情
func (h *UserHandler) Get(c *gin.Context) {
	user, err := h.userService.GetByID(c.Request.Context(), &service.GetUserRequest{
		OperatorRole:     middleware.GetRole(c),
		OperatorTenantID: middleware.GetTenantID(c),
		UserID:           c.Param("id"),
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, h.toUserDTO(user))
}

// Create 创建用户
func (h *UserHandler) Create(c *gin.Context) {
	var req dto.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "请求参数错误: " + err.Error(),
		})
		return
	}

	user, err := h.userService.Create(c.Request.Context(), &service.CreateUserRequest{
		OperatorID:       middleware.GetUserID(c),
		OperatorRole:     middleware.GetRole(c),
		OperatorTenantID: middleware.GetTenantID(c),
		Username:         req.Username,
		RealName:         req.RealName,
		Role:             req.Role,
		TenantID:         req.TenantID,
		Password:         req.Password,
		Email:            req.Email,
		Phone:            req.Phone,
		IP:               c.ClientIP(),
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, h.toUserDTO(user))
}

// Update 更新用户
func (h *UserHandler) Update(c *gin.Context) {
	var req dto.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "请求参数错误: " + err.Error(),
		})
		return
	}

	user, err := h.userService.Update(c.Request.Context(), &service.UpdateUserRequest{
		OperatorID:       middleware.GetUserID(c),
		OperatorRole:     middleware.GetRole(c),
		OperatorTenantID: middleware.GetTenantID(c),
		UserID:           c.Param("id"),
		RealName:         req.RealName,
		Email:            req.Email,
		Phone:            req.Phone,
		Role:             req.Role,
		IP:               c.ClientIP(),
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, h.toUserDTO(user))
}

// Freeze 冻结用户
func (h *UserHandler) Freeze(c *gin.Context) {
	err := h.userService.Freeze(c.Request.Context(), &service.UserActionRequest{
		OperatorID:       middleware.GetUserID(c),
		OperatorRole:     middleware.GetRole(c),
		OperatorTenantID: middleware.GetTenantID(c),
		UserID:           c.Param("id"),
		IP:               c.ClientIP(),
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "用户已冻结"})
}

// Unfreeze 解冻用户
func (h *UserHandler) Unfreeze(c *gin.Context) {
	err := h.userService.Unfreeze(c.Request.Context(), &service.UserActionRequest{
		OperatorID:       middleware.GetUserID(c),
		OperatorRole:     middleware.GetRole(c),
		OperatorTenantID: middleware.GetTenantID(c),
		UserID:           c.Param("id"),
		IP:               c.ClientIP(),
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "用户已解冻"})
}

// ResetPassword 重置密码
func (h *UserHandler) ResetPassword(c *gin.Context) {
	var req dto.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "请求参数错误: " + err.Error(),
		})
		return
	}

	err := h.userService.ResetPassword(c.Request.Context(), &service.ResetPasswordRequest{
		OperatorID:       middleware.GetUserID(c),
		OperatorRole:     middleware.GetRole(c),
		OperatorTenantID: middleware.GetTenantID(c),
		UserID:           c.Param("id"),
		NewPassword:      req.NewPassword,
		IP:               c.ClientIP(),
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "密码已重置"})
}

// ImportUsers 批量导入用户
func (h *UserHandler) ImportUsers(c *gin.Context) {
	var req dto.ImportUsersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "请求参数错误: " + err.Error(),
		})
		return
	}

	users := make([]service.CreateUserRequest, len(req.Users))
	for i, u := range req.Users {
		users[i] = service.CreateUserRequest{
			Username: u.Username,
			RealName: u.RealName,
			Role:     u.Role,
			TenantID: u.TenantID,
			Password: u.Password,
			Email:    u.Email,
			Phone:    u.Phone,
		}
	}

	result, err := h.userService.ImportUsers(c.Request.Context(), &service.ImportUsersRequest{
		OperatorID:       middleware.GetUserID(c),
		OperatorRole:     middleware.GetRole(c),
		OperatorTenantID: middleware.GetTenantID(c),
		Users:            users,
		IP:               c.ClientIP(),
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	errItems := make([]dto.ImportErrorItem, len(result.Errors))
	for i, e := range result.Errors {
		errItems[i] = dto.ImportErrorItem{Row: e.Row, Message: e.Message}
	}

	c.JSON(http.StatusOK, dto.ImportResultResponse{
		Total:   result.Total,
		Success: result.Success,
		Failed:  result.Failed,
		Errors:  errItems,
	})
}

// UpdateProfile 修改个人资料
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	var req dto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "请求参数错误: " + err.Error(),
		})
		return
	}

	user, err := h.userService.UpdateProfile(c.Request.Context(), middleware.GetUserID(c), &service.UpdateProfileRequest{
		RealName: req.RealName,
		Email:    req.Email,
		Phone:    req.Phone,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, h.toUserDTO(user))
}

// ChangePassword 修改密码
func (h *UserHandler) ChangePassword(c *gin.Context) {
	var req dto.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "请求参数错误: " + err.Error(),
		})
		return
	}

	err := h.userService.ChangePassword(c.Request.Context(), middleware.GetUserID(c), &service.ChangePasswordRequest{
		OldPassword: req.OldPassword,
		NewPassword: req.NewPassword,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "密码修改成功"})
}

// GetMyLoginLogs 获取我的登录日志
func (h *UserHandler) GetMyLoginLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	resp, err := h.userService.GetLoginLogs(c.Request.Context(), middleware.GetUserID(c), page, pageSize)
	if err != nil {
		h.handleError(c, err)
		return
	}

	items := make([]dto.LoginLogDTO, len(resp.Items))
	for i, l := range resp.Items {
		items[i] = dto.LoginLogDTO{
			ID:        l.ID,
			UserID:    l.UserID,
			IP:        l.IP,
			UserAgent: l.UserAgent,
			Status:    string(l.Status),
			Reason:    l.Reason,
			CreatedAt: l.CreatedAt.Format("2006-01-02 15:04:05"),
		}
	}

	c.JSON(http.StatusOK, dto.LoginLogListResponse{
		Items:    items,
		Total:    resp.Total,
		Page:     resp.Page,
		PageSize: resp.PageSize,
	})
}

// GetUserLoginLogs 获取某用户登录日志（管理员）
func (h *UserHandler) GetUserLoginLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	userID := c.Param("id")

	// Verify the operator can view this user
	_, err := h.userService.GetByID(c.Request.Context(), &service.GetUserRequest{
		OperatorRole:     middleware.GetRole(c),
		OperatorTenantID: middleware.GetTenantID(c),
		UserID:           userID,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	resp, err := h.userService.GetLoginLogs(c.Request.Context(), userID, page, pageSize)
	if err != nil {
		h.handleError(c, err)
		return
	}

	items := make([]dto.LoginLogDTO, len(resp.Items))
	for i, l := range resp.Items {
		items[i] = dto.LoginLogDTO{
			ID:        l.ID,
			UserID:    l.UserID,
			IP:        l.IP,
			UserAgent: l.UserAgent,
			Status:    string(l.Status),
			Reason:    l.Reason,
			CreatedAt: l.CreatedAt.Format("2006-01-02 15:04:05"),
		}
	}

	c.JSON(http.StatusOK, dto.LoginLogListResponse{
		Items:    items,
		Total:    resp.Total,
		Page:     resp.Page,
		PageSize: resp.PageSize,
	})
}

// ListAuditLogs 审计日志列表
func (h *UserHandler) ListAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	resp, err := h.auditLogService.List(c.Request.Context(), &service.ListAuditLogsRequest{
		OperatorRole:     middleware.GetRole(c),
		OperatorTenantID: middleware.GetTenantID(c),
		UserID:           c.Query("user_id"),
		Action:           c.Query("action"),
		Page:             page,
		PageSize:         pageSize,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	items := make([]dto.AuditLogDTO, len(resp.Items))
	for i, a := range resp.Items {
		items[i] = dto.AuditLogDTO{
			ID:         a.ID,
			UserID:     a.UserID,
			TenantID:   a.TenantID,
			Action:     string(a.Action),
			TargetType: a.TargetType,
			TargetID:   a.TargetID,
			Detail:     a.Detail,
			IP:         a.IP,
			CreatedAt:  a.CreatedAt.Format("2006-01-02 15:04:05"),
		}
	}

	c.JSON(http.StatusOK, dto.AuditLogListResponse{
		Items:    items,
		Total:    resp.Total,
		Page:     resp.Page,
		PageSize: resp.PageSize,
	})
}

func (h *UserHandler) toUserDTO(u *domain.User) dto.UserDTO {
	d := dto.UserDTO{
		ID:        u.ID,
		TenantID:  u.TenantID,
		Username:  u.Username,
		Email:     u.Email,
		Phone:     u.Phone,
		RealName:  u.RealName,
		Role:      string(u.Role),
		Status:    string(u.Status),
		CreatedAt: u.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: u.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
	if u.LastLoginAt != nil {
		t := u.LastLoginAt.Format("2006-01-02 15:04:05")
		d.LastLoginAt = &t
	}
	return d
}

func (h *UserHandler) handleError(c *gin.Context, err error) {
	if err == nil {
		return
	}

	switch {
	case errors.Is(err, domain.ErrUserNotFound):
		c.JSON(http.StatusNotFound, dto.ErrorResponse{Code: "USER_NOT_FOUND", Message: err.Error()})
	case errors.Is(err, domain.ErrTenantNotFound):
		c.JSON(http.StatusNotFound, dto.ErrorResponse{Code: "TENANT_NOT_FOUND", Message: err.Error()})
	case errors.Is(err, domain.ErrPermissionDenied):
		c.JSON(http.StatusForbidden, dto.ErrorResponse{Code: "PERMISSION_DENIED", Message: err.Error()})
	case errors.Is(err, domain.ErrCannotManageHigherRole):
		c.JSON(http.StatusForbidden, dto.ErrorResponse{Code: "CANNOT_MANAGE_HIGHER_ROLE", Message: err.Error()})
	case errors.Is(err, domain.ErrCannotFreezeYourself):
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Code: "CANNOT_FREEZE_YOURSELF", Message: err.Error()})
	case errors.Is(err, domain.ErrPasswordTooWeak):
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Code: "PASSWORD_TOO_WEAK", Message: err.Error()})
	case errors.Is(err, domain.ErrOldPasswordIncorrect):
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Code: "OLD_PASSWORD_INCORRECT", Message: err.Error()})
	case errors.Is(err, domain.ErrUsernameExists):
		c.JSON(http.StatusConflict, dto.ErrorResponse{Code: "USERNAME_EXISTS", Message: err.Error()})
	case errors.Is(err, domain.ErrEmailExists):
		c.JSON(http.StatusConflict, dto.ErrorResponse{Code: "EMAIL_EXISTS", Message: err.Error()})
	case errors.Is(err, domain.ErrPhoneExists):
		c.JSON(http.StatusConflict, dto.ErrorResponse{Code: "PHONE_EXISTS", Message: err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Code: "INTERNAL_ERROR", Message: "服务器内部错误"})
	}
}
