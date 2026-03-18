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
	engine            *gin.Engine
	jwtManager        *jwt.JWTManager
	authHandler       *handler.AuthHandler
	tenantHandler     *handler.TenantHandler
	userHandler       *handler.UserHandler
	parkingLotHandler *handler.ParkingLotHandler
	gateHandler       *handler.GateHandler
}

// NewRouter 创建路由器
func NewRouter(
	engine *gin.Engine,
	jwtManager *jwt.JWTManager,
	authHandler *handler.AuthHandler,
	tenantHandler *handler.TenantHandler,
	userHandler *handler.UserHandler,
	parkingLotHandler *handler.ParkingLotHandler,
	gateHandler *handler.GateHandler,
) *Router {
	return &Router{
		engine:            engine,
		jwtManager:        jwtManager,
		authHandler:       authHandler,
		tenantHandler:     tenantHandler,
		userHandler:       userHandler,
		parkingLotHandler: parkingLotHandler,
		gateHandler:       gateHandler,
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
		r.setupUserRoutes(v1)
		r.setupParkingLotRoutes(v1)
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

// setupUserRoutes 设置用户管理路由
func (r *Router) setupUserRoutes(rg *gin.RouterGroup) {
	users := rg.Group("/users")
	users.Use(middleware.AuthMiddleware(r.jwtManager))

	// 个人中心路由（任意已认证用户）
	me := users.Group("/me")
	{
		me.PUT("/profile", r.userHandler.UpdateProfile)
		me.PUT("/password", r.userHandler.ChangePassword)
		me.GET("/login-logs", r.userHandler.GetMyLoginLogs)
	}

	// 用户管理路由（需要 platform_admin 或 tenant_admin）
	admin := users.Group("")
	admin.Use(middleware.RequireRoles("platform_admin", "tenant_admin"))
	{
		admin.GET("", r.userHandler.List)
		admin.GET("/:id", r.userHandler.Get)
		admin.POST("", r.userHandler.Create)
		admin.PUT("/:id", r.userHandler.Update)
		admin.POST("/:id/freeze", r.userHandler.Freeze)
		admin.POST("/:id/unfreeze", r.userHandler.Unfreeze)
		admin.POST("/:id/reset-password", r.userHandler.ResetPassword)
		admin.POST("/import", r.userHandler.ImportUsers)
		admin.GET("/:id/login-logs", r.userHandler.GetUserLoginLogs)
	}

	// 审计日志路由
	auditLogs := rg.Group("/audit-logs")
	auditLogs.Use(middleware.AuthMiddleware(r.jwtManager))
	auditLogs.Use(middleware.RequireRoles("platform_admin", "tenant_admin"))
	{
		auditLogs.GET("", r.userHandler.ListAuditLogs)
	}
}

// setupParkingLotRoutes 设置停车场管理路由
func (r *Router) setupParkingLotRoutes(rg *gin.RouterGroup) {
	parkingLots := rg.Group("/parking-lots")
	parkingLots.Use(middleware.AuthMiddleware(r.jwtManager))
	parkingLots.Use(middleware.RequireRoles("platform_admin", "tenant_admin"))
	{
		// GET /api/v1/parking-lots - 获取停车场列表
		parkingLots.GET("", r.parkingLotHandler.List)

		// GET /api/v1/parking-lots/stats - 获取统计数据
		parkingLots.GET("/stats", r.parkingLotHandler.GetStats)

		// GET /api/v1/parking-lots/:id - 获取停车场详情
		parkingLots.GET("/:id", r.parkingLotHandler.Get)

		// POST /api/v1/parking-lots - 创建停车场（仅租户管理员）
		parkingLots.POST("", middleware.RequireRoles("tenant_admin"), r.parkingLotHandler.Create)

		// PUT /api/v1/parking-lots/:id - 更新停车场（仅租户管理员）
		parkingLots.PUT("/:id", middleware.RequireRoles("tenant_admin"), r.parkingLotHandler.Update)

		// DELETE /api/v1/parking-lots/:id - 删除停车场（仅租户管理员）
		parkingLots.DELETE("/:id", middleware.RequireRoles("tenant_admin"), r.parkingLotHandler.Delete)

		// GET /api/v1/parking-lots/:id/gates - 获取出入口列表
		parkingLots.GET("/:id/gates", r.gateHandler.List)

		// POST /api/v1/parking-lots/:id/gates - 添加出入口（仅租户管理员）
		parkingLots.POST("/:id/gates", middleware.RequireRoles("tenant_admin"), r.gateHandler.Create)
	}

	// 出入口独立路由
	gates := rg.Group("/gates")
	gates.Use(middleware.AuthMiddleware(r.jwtManager))
	gates.Use(middleware.RequireRoles("tenant_admin"))
	{
		// PUT /api/v1/gates/:id - 编辑出入口
		gates.PUT("/:id", r.gateHandler.Update)

		// DELETE /api/v1/gates/:id - 删除出入口
		gates.DELETE("/:id", r.gateHandler.Delete)
	}
}
