# Auth Login - Tasks

## 1. 后端基础设施

- [x] 1.1 创建数据库迁移脚本（tenants, users, refresh_tokens 表）
- [x] 1.2 实现 domain/user.go 用户实体定义
- [x] 1.3 实现 domain/tenant.go 租户实体定义
- [x] 1.4 实现 domain/errors.go 业务错误定义
- [x] 1.5 实现 internal/pkg/crypto/password.go 密码哈希工具（bcrypt）
- [x] 1.6 实现 internal/pkg/jwt/jwt.go Token 生成/解析工具

## 2. Repository 层

- [x] 2.1 定义 repository/interface.go 数据访问接口（UserRepo, TenantRepo, RefreshTokenRepo）
- [x] 2.2 实现 repository/impl/user_repo.go 用户数据访问
- [x] 2.3 实现 repository/impl/tenant_repo.go 租户数据访问
- [x] 2.4 实现 repository/impl/refresh_token_repo.go 刷新令牌数据访问

## 3. Service 层

- [x] 3.1 定义 service/interface.go 业务服务接口（AuthService）
- [x] 3.2 实现 service/impl/auth_service.go:Login() 账号密码登录
- [x] 3.3 实现 service/impl/auth_service.go:SendSmsCode() 发送验证码（MVP mock）
- [x] 3.4 实现 service/impl/auth_service.go:SmsLogin() 验证码登录
- [x] 3.5 实现 service/impl/auth_service.go:RefreshToken() 刷新令牌
- [x] 3.6 实现 service/impl/auth_service.go:Logout() 登出
- [x] 3.7 实现 service/impl/auth_service.go:GetCurrentUser() 获取当前用户

## 4. Handler 层

- [x] 4.1 实现 handler/auth_handler.go HTTP 处理器
- [x] 4.2 定义 handler/dto 请求/响应数据结构
- [x] 4.3 注册路由 POST /api/v1/auth/login
- [x] 4.4 注册路由 POST /api/v1/auth/sms/send
- [x] 4.5 注册路由 POST /api/v1/auth/sms/login
- [x] 4.6 注册路由 POST /api/v1/auth/refresh
- [x] 4.7 注册路由 POST /api/v1/auth/logout
- [x] 4.8 注册路由 GET /api/v1/auth/me

## 5. Middleware 层

- [x] 5.1 实现 middleware/auth.go JWT 校验中间件
- [x] 5.2 实现 middleware/tenant.go 租户上下文注入中间件
- [x] 5.3 实现 middleware/rbac.go 角色权限守卫中间件
- [x] 5.4 配置路由级别的权限要求

## 6. 后端单元测试

- [x] 6.1 测试密码哈希/校验功能
- [x] 6.2 测试 JWT Token 生成/解析
- [x] 6.3 测试账号密码登录（成功/失败场景）
- [x] 6.4 测试验证码登录（成功/失败场景）
- [x] 6.5 测试 Token 刷新
- [x] 6.6 测试租户数据隔离

## 7. 前端项目初始化

- [x] 7.1 创建 React + TypeScript + Vite 项目
- [x] 7.2 配置 Tailwind CSS
- [x] 7.3 初始化 shadcn/ui
- [x] 7.4 配置路由（react-router-dom）
- [x] 7.5 配置 Axios 实例（lib/api.ts）

## 8. 前端登录页实现

- [x] 8.1 创建 features/auth/LoginForm.tsx 账号密码表单组件
- [x] 8.2 创建 features/auth/SmsLoginForm.tsx 验证码登录表单组件
- [x] 8.3 创建 features/auth/LoginTabs.tsx Tab 切换容器
- [x] 8.4 实现 lib/auth.ts 登录相关 API 调用
- [x] 8.5 实现 stores/useAuthStore.ts 认证状态管理（Zustand）
- [x] 8.6 实现 hooks/useAuth.ts 认证 hook

## 9. 前端路由守卫

- [x] 9.1 创建 ProtectedRoute 组件
- [x] 9.2 实现未登录跳转逻辑
- [x] 9.3 实现 Token 自动刷新拦截器
- [x] 9.4 实现 401 错误自动登出

## 10. 集成测试

- [ ] 10.1 端到端测试：账号密码登录流程
- [ ] 10.2 端到端测试：验证码登录流程
- [ ] 10.3 端到端测试：Token 刷新流程
- [ ] 10.4 端到端测试：权限控制验证
- [ ] 10.5 端到端测试：租户数据隔离验证

## 11. 文档与收尾

- [x] 11.1 更新 API 文档（OpenAPI）
- [x] 11.2 编写部署配置说明
- [x] 11.3 创建初始管理员账号种子数据
