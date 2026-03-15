package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/parkhub/api/internal/handler/dto"
	"github.com/parkhub/api/internal/service"
)

// AuthHandler 认证处理器
type AuthHandler struct {
	authService service.AuthService
}

// NewAuthHandler 创建认证处理器
func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Login 账号密码登录
// @Summary 账号密码登录
// @Description 使用用户名/邮箱和密码进行登录
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body dto.LoginRequest true "登录请求"
// @Success 200 {object} dto.LoginResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Router /api/v1/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "请求参数错误: " + err.Error(),
		})
		return
	}

	resp, err := h.authService.Login(c.Request.Context(), &service.LoginRequest{
		Account:  req.Account,
		Password: req.Password,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, h.toLoginResponse(resp))
}

// SendSmsCode 发送短信验证码
// @Summary 发送短信验证码
// @Description 发送短信验证码（MVP阶段固定为123456）
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body dto.SendSmsCodeRequest true "发送验证码请求"
// @Success 200 {object} dto.MessageResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 429 {object} dto.ErrorResponse
// @Router /api/v1/auth/sms/send [post]
func (h *AuthHandler) SendSmsCode(c *gin.Context) {
	var req dto.SendSmsCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "请求参数错误: " + err.Error(),
		})
		return
	}

	err := h.authService.SendSmsCode(c.Request.Context(), &service.SendSmsCodeRequest{
		Phone:   req.Phone,
		Purpose: req.Purpose,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{
		Message: "验证码已发送",
	})
}

// SmsLogin 短信验证码登录
// @Summary 短信验证码登录
// @Description 使用手机号和验证码进行登录
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body dto.SmsLoginRequest true "验证码登录请求"
// @Success 200 {object} dto.LoginResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Router /api/v1/auth/sms/login [post]
func (h *AuthHandler) SmsLogin(c *gin.Context) {
	var req dto.SmsLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "请求参数错误: " + err.Error(),
		})
		return
	}

	resp, err := h.authService.SmsLogin(c.Request.Context(), &service.SmsLoginRequest{
		Phone: req.Phone,
		Code:  req.Code,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, h.toLoginResponse(resp))
}

// RefreshToken 刷新令牌
// @Summary 刷新令牌
// @Description 使用 Refresh Token 获取新的 Access Token
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body dto.RefreshTokenRequest true "刷新令牌请求"
// @Success 200 {object} dto.LoginResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Router /api/v1/auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req dto.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "请求参数错误: " + err.Error(),
		})
		return
	}

	resp, err := h.authService.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, h.toLoginResponse(resp))
}

// Logout 登出
// @Summary 登出
// @Description 登出当前用户，吊销 Refresh Token
// @Tags 认证
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} dto.MessageResponse
// @Failure 401 {object} dto.ErrorResponse
// @Router /api/v1/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Code:    "UNAUTHORIZED",
			Message: "未授权",
		})
		return
	}

	// 从请求体获取 refresh_token（可选）
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	c.ShouldBindJSON(&req)

	err := h.authService.Logout(c.Request.Context(), userID.(string), req.RefreshToken)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{
		Message: "登出成功",
	})
}

// GetCurrentUser 获取当前用户信息
// @Summary 获取当前用户
// @Description 获取当前登录用户的详细信息
// @Tags 认证
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} dto.CurrentUserResponse
// @Failure 401 {object} dto.ErrorResponse
// @Router /api/v1/auth/me [get]
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Code:    "UNAUTHORIZED",
			Message: "未授权",
		})
		return
	}

	user, err := h.authService.GetCurrentUser(c.Request.Context(), userID.(string))
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.CurrentUserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		Phone:     user.Phone,
		RealName:  user.RealName,
		Role:      string(user.Role),
		TenantID:  user.TenantID,
		Status:    string(user.Status),
		CreatedAt: user.CreatedAt.Format("2006-01-02 15:04:05"),
	})
}

// toLoginResponse 转换为响应格式
func (h *AuthHandler) toLoginResponse(resp *service.LoginResponse) *dto.LoginResponse {
	var user *dto.UserInfo
	if resp.User != nil {
		user = &dto.UserInfo{
			ID:       resp.User.ID,
			Username: resp.User.Username,
			Email:    resp.User.Email,
			Phone:    resp.User.Phone,
			RealName: resp.User.RealName,
			Role:     resp.User.Role,
			TenantID: resp.User.TenantID,
		}
	}
	return &dto.LoginResponse{
		AccessToken:  resp.AccessToken,
		RefreshToken: resp.RefreshToken,
		ExpiresIn:    resp.ExpiresIn,
		User:         user,
	}
}

// handleError 统一错误处理
func (h *AuthHandler) handleError(c *gin.Context, err error) {
	// 根据错误类型返回不同的状态码和错误信息
	errMsg := err.Error()

	switch {
	case contains(errMsg, "账号或密码错误", "invalid credentials"):
		c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Code:    "INVALID_CREDENTIALS",
			Message: "账号或密码错误",
		})
	case contains(errMsg, "账号已被冻结", "account frozen"):
		c.JSON(http.StatusForbidden, dto.ErrorResponse{
			Code:    "ACCOUNT_FROZEN",
			Message: "账号已被冻结，请联系管理员",
		})
	case contains(errMsg, "租户已被冻结", "tenant frozen"):
		c.JSON(http.StatusForbidden, dto.ErrorResponse{
			Code:    "TENANT_FROZEN",
			Message: "租户已被冻结，请联系平台管理员",
		})
	case contains(errMsg, "验证码", "sms code"):
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    "INVALID_SMS_CODE",
			Message: "验证码错误或已过期",
		})
	case contains(errMsg, "发送频率", "too frequent"):
		c.JSON(http.StatusTooManyRequests, dto.ErrorResponse{
			Code:    "SMS_TOO_FREQUENT",
			Message: "验证码发送过于频繁，请稍后再试",
		})
	case contains(errMsg, "手机号未注册", "phone not registered"):
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    "PHONE_NOT_REGISTERED",
			Message: "该手机号未注册",
		})
	case contains(errMsg, "token", "Token", "过期"):
		c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Code:    "TOKEN_EXPIRED",
			Message: "登录已过期，请重新登录",
		})
	default:
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: "服务器内部错误",
		})
	}
}

// contains 检查字符串是否包含任意一个子串
func contains(s string, substrs ...string) bool {
	for _, substr := range substrs {
		if len(s) >= len(substr) {
			for i := 0; i <= len(s)-len(substr); i++ {
				if s[i:i+len(substr)] == substr {
					return true
				}
			}
		}
	}
	return false
}
