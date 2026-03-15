package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/parkhub/api/internal/handler/dto"
	"github.com/parkhub/api/internal/pkg/jwt"
)

// AuthMiddleware JWT 认证中间件
func AuthMiddleware(jwtManager *jwt.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从 Header 获取 Token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
				Code:    "TOKEN_MISSING",
				Message: "未提供认证信息",
			})
			c.Abort()
			return
		}

		// 解析 Bearer Token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
				Code:    "TOKEN_INVALID",
				Message: "无效的 Token 格式",
			})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// 验证 Token
		claims, err := jwtManager.ValidateAccessToken(tokenString)
		if err != nil {
			switch err {
			case jwt.ErrTokenExpired:
				c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
					Code:    "TOKEN_EXPIRED",
					Message: "Token 已过期",
				})
			case jwt.ErrTokenMalformed:
				c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
					Code:    "TOKEN_MALFORMED",
					Message: "Token 格式错误",
				})
			default:
				c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
					Code:    "TOKEN_INVALID",
					Message: "无效的 Token",
				})
			}
			c.Abort()
			return
		}

		// 将用户信息注入到上下文
		c.Set("user_id", claims.UserID)
		c.Set("role", claims.Role)
		if claims.TenantID != nil {
			c.Set("tenant_id", *claims.TenantID)
		}
		c.Set("claims", claims)

		c.Next()
	}
}

// GetUserID 从上下文获取用户 ID
func GetUserID(c *gin.Context) string {
	if userID, exists := c.Get("user_id"); exists {
		return userID.(string)
	}
	return ""
}

// GetRole 从上下文获取用户角色
func GetRole(c *gin.Context) string {
	if role, exists := c.Get("role"); exists {
		return role.(string)
	}
	return ""
}

// GetTenantID 从上下文获取租户 ID
func GetTenantID(c *gin.Context) string {
	if tenantID, exists := c.Get("tenant_id"); exists {
		return tenantID.(string)
	}
	return ""
}

// GetClaims 从上下文获取 JWT Claims
func GetClaims(c *gin.Context) *jwt.Claims {
	if claims, exists := c.Get("claims"); exists {
		return claims.(*jwt.Claims)
	}
	return nil
}
