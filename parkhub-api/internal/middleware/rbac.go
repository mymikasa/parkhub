package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/parkhub/api/internal/handler/dto"
)

// RoleConfig 角色配置
type RoleConfig struct {
	Name        string
	Level       int    // 权限级别，数字越大权限越高
	Description string
}

// 预定义角色
var Roles = map[string]RoleConfig{
	"platform_admin": {
		Name:        "平台管理员",
		Level:       100,
		Description: "全平台访问权限",
	},
	"tenant_admin": {
		Name:        "租户管理员",
		Level:       50,
		Description: "本租户全权限",
	},
	"operator": {
		Name:        "操作员",
		Level:       10,
		Description: "本租户读写权限",
	},
}

// RequireRoles 要求用户具有指定角色之一
func RequireRoles(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole := GetRole(c)
		if userRole == "" {
			c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
				Code:    "UNAUTHORIZED",
				Message: "未授权",
			})
			c.Abort()
			return
		}

		// 检查用户角色是否在允许的角色列表中
		for _, role := range allowedRoles {
			if userRole == role {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, dto.ErrorResponse{
			Code:    "FORBIDDEN",
			Message: "权限不足",
		})
		c.Abort()
	}
}

// RequireMinLevel 要求用户角色级别不低于指定值
func RequireMinLevel(minLevel int) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole := GetRole(c)
		if userRole == "" {
			c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
				Code:    "UNAUTHORIZED",
				Message: "未授权",
			})
			c.Abort()
			return
		}

		roleConfig, exists := Roles[userRole]
		if !exists {
			c.JSON(http.StatusForbidden, dto.ErrorResponse{
				Code:    "INVALID_ROLE",
				Message: "无效的角色",
			})
			c.Abort()
			return
		}

		if roleConfig.Level < minLevel {
			c.JSON(http.StatusForbidden, dto.ErrorResponse{
				Code:    "FORBIDDEN",
				Message: "权限不足",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// IsTenantAdmin 检查是否为租户管理员或更高级别
func IsTenantAdmin() gin.HandlerFunc {
	return RequireMinLevel(50)
}

// IsOperator 检查是否为操作员或更高级别
func IsOperator() gin.HandlerFunc {
	return RequireMinLevel(10)
}

// CanManageTenant 检查是否可以管理租户
// 平台管理员可以管理所有租户，租户管理员只能管理自己的租户
func CanManageTenant() gin.HandlerFunc {
	return func(c *gin.Context) {
		role := GetRole(c)
		userTenantID := GetTenantID(c)
		targetTenantID := c.Param("tenant_id")

		// 平台管理员可以管理所有租户
		if role == "platform_admin" {
			c.Next()
			return
		}

		// 租户管理员只能管理自己的租户
		if role == "tenant_admin" {
			if userTenantID == "" {
				c.JSON(http.StatusForbidden, dto.ErrorResponse{
					Code:    "NO_TENANT",
					Message: "用户未关联租户",
				})
				c.Abort()
				return
			}

			if targetTenantID != "" && targetTenantID != userTenantID {
				c.JSON(http.StatusForbidden, dto.ErrorResponse{
					Code:    "TENANT_MISMATCH",
					Message: "无权操作其他租户",
				})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

// CanAccessResource 检查是否可以访问资源
// 用于确保用户只能访问自己租户的资源
func CanAccessResource() gin.HandlerFunc {
	return func(c *gin.Context) {
		role := GetRole(c)
		userTenantID := GetTenantID(c)
		resourceTenantID := c.Param("tenant_id")

		// 平台管理员可以访问所有资源
		if role == "platform_admin" {
			c.Next()
			return
		}

		// 其他角色只能访问自己租户的资源
		if resourceTenantID != "" && resourceTenantID != userTenantID {
			c.JSON(http.StatusForbidden, dto.ErrorResponse{
				Code:    "ACCESS_DENIED",
				Message: "无权访问此资源",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
