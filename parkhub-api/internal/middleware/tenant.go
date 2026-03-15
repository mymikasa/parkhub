package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/parkhub/api/internal/handler/dto"
)

// TenantMiddleware 租户上下文注入中间件
// 确保非平台管理员请求必须携带租户 ID
func TenantMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role := GetRole(c)

		// 平台管理员不需要租户 ID
		if role == "platform_admin" {
			c.Next()
			return
		}

		// 其他角色必须关联租户
		tenantID := GetTenantID(c)
		if tenantID == "" {
			c.JSON(http.StatusForbidden, dto.ErrorResponse{
				Code:    "NO_TENANT",
				Message: "用户未关联租户",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireTenant 要求租户上下文的中间件
// 用于确保租户相关操作有租户信息
func RequireTenant() gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantID := GetTenantID(c)
		if tenantID == "" {
			c.JSON(http.StatusForbidden, dto.ErrorResponse{
				Code:    "TENANT_REQUIRED",
				Message: "此操作需要租户上下文",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// PlatformAdminOnly 仅允许平台管理员访问
func PlatformAdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role := GetRole(c)
		if role != "platform_admin" {
			c.JSON(http.StatusForbidden, dto.ErrorResponse{
				Code:    "FORBIDDEN",
				Message: "仅平台管理员可访问",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
