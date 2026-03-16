package router

import (
	"github.com/gin-gonic/gin"
	"github.com/google/wire"
	"github.com/parkhub/api/internal/handler"
	"github.com/parkhub/api/internal/middleware"
	"github.com/parkhub/api/internal/pkg/jwt"
)

// RouterSet is the Wire provider set for Router.
var RouterSet = wire.NewSet(NewRouter)

// Router 路由器
type Router struct {
	engine        *gin.Engine
	jwtManager    *jwt.JWTManager
	authHandler   *handler.AuthHandler
	tenantHandler *handler.TenantHandler
}

// NewRouter 创建路由器
func NewRouter(
	engine *gin.Engine,
	jwtManager *jwt.JWTManager,
	authHandler *handler.AuthHandler,
	tenantHandler *handler.TenantHandler,
) *Router {
	return &Router{
		engine:        engine,
		jwtManager:    jwtManager,
		authHandler:   authHandler,
		tenantHandler: tenantHandler,
	}
}

// GetEngine returns the underlying gin.Engine.
func (r *Router) GetEngine() *gin.Engine {
	return r.engine
}

// Setup 设置所有路由
func (r *Router) Setup() {
	// 全局中间件
	r.engine.Use(middleware.CORSMiddleware())

	// 健康检查
	r.engine.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API v1 路由组
	v1 := r.engine.Group("/api/v1")
	{
		r.setupAuthRoutes(v1)
		r.setupTenantRoutes(v1)
	}
}

// setupAuthRoutes 设置认证相关路由
func (r *Router) setupAuthRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	{
		// 公开路由（无需认证）
		// POST /api/v1/auth/login - 账号密码登录
		auth.POST("/login", r.authHandler.Login)

		// POST /api/v1/auth/sms/send - 发送验证码
		auth.POST("/sms/send", r.authHandler.SendSmsCode)

		// POST /api/v1/auth/sms/login - 验证码登录
		auth.POST("/sms/login", r.authHandler.SmsLogin)

		// POST /api/v1/auth/refresh - 刷新令牌
		auth.POST("/refresh", r.authHandler.RefreshToken)

		// 需要认证的路由
		protected := auth.Group("")
		protected.Use(middleware.AuthMiddleware(r.jwtManager))
		{
			// POST /api/v1/auth/logout - 登出
			protected.POST("/logout", r.authHandler.Logout)

			// GET /api/v1/auth/me - 获取当前用户信息
			protected.GET("/me", r.authHandler.GetCurrentUser)
		}
	}
}

// setupTenantRoutes 设置租户管理路由
func (r *Router) setupTenantRoutes(rg *gin.RouterGroup) {
	tenants := rg.Group("/tenants")
	tenants.Use(middleware.AuthMiddleware(r.jwtManager))
	tenants.Use(middleware.RequireRoles("platform_admin"))
	{
		// GET /api/v1/tenants - 获取租户列表
		tenants.GET("", r.tenantHandler.List)

		// GET /api/v1/tenants/:id - 获取租户详情
		tenants.GET("/:id", r.tenantHandler.Get)

		// POST /api/v1/tenants - 创建租户
		tenants.POST("", r.tenantHandler.Create)

		// PUT /api/v1/tenants/:id - 更新租户
		tenants.PUT("/:id", r.tenantHandler.Update)

		// POST /api/v1/tenants/:id/freeze - 冻结租户
		tenants.POST("/:id/freeze", r.tenantHandler.Freeze)

		// POST /api/v1/tenants/:id/unfreeze - 解冻租户
		tenants.POST("/:id/unfreeze", r.tenantHandler.Unfreeze)
	}
}
