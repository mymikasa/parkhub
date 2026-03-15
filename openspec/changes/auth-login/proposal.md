# Auth Login - Proposal

## Why

ParkHub MVP 需要一个完整的用户认证系统，支持多种角色（平台管理员、租户管理员、操作员）的登录鉴权。这是系统安全访问的第一道防线，也是多租户数据隔离的基础。

当前状态：
- 前端已有登录页 HTML 设计稿（`pages/login.html`）
- PRD 已定义 4 种用户角色及权限矩阵
- 后端尚未实现任何认证逻辑

## What Changes

### 新增功能

1. **账号密码登录**
   - 用户名/邮箱 + 密码登录
   - 密码显示/隐藏切换
   - 记住登录状态（持久化 Token）

2. **手机号验证码登录**
   - 手机号格式校验
   - 短信验证码发送（60s 倒计时）
   - 验证码校验登录

3. **JWT Token 认证**
   - Access Token（短期有效，2小时）
   - Refresh Token（长期有效，7天）
   - Token 自动续期机制

4. **多角色权限控制**
   - 平台管理员（platform_admin）
   - 租户管理员（tenant_admin）
   - 操作员（operator）
   - 基于 RBAC 的接口权限守卫

5. **租户上下文注入**
   - 登录后自动注入租户 ID 到请求上下文
   - 多租户数据隔离中间件

### 前端改造

- 将 HTML 设计稿转换为 React + TypeScript 组件
- 集成 React Query 进行状态管理
- 实现路由守卫（未登录跳转）

## Capabilities

### New Capabilities

- `auth-password-login`: 账号密码登录功能，支持用户名/邮箱登录
- `auth-sms-login`: 手机号验证码登录功能
- `auth-jwt-token`: JWT Token 生成、校验、刷新机制
- `auth-rbac`: 基于角色的访问控制（RBAC）
- `auth-tenant-context`: 多租户上下文注入与数据隔离

### Modified Capabilities

无（这是全新功能）

## Impact

### 后端影响

| 模块 | 影响 |
|------|------|
| `internal/domain/` | 新增 `user.go`, `tenant.go` 实体 |
| `internal/service/` | 新增 `AuthService` 接口及实现 |
| `internal/repository/` | 新增 `UserRepo`, `TenantRepo` |
| `internal/handler/` | 新增 `AuthHandler` |
| `internal/middleware/` | 新增 `AuthMiddleware`, `TenantMiddleware` |
| `internal/pkg/` | 新增 `jwt/`, `crypto/` 工具包 |
| `migrations/` | 新增用户表、租户表迁移脚本 |

### 前端影响

| 模块 | 影响 |
|------|------|
| `src/features/auth/` | 新增登录页组件 |
| `src/stores/` | 新增 `useAuthStore` |
| `src/lib/` | 新增 API 客户端配置 |
| `src/hooks/` | 新增 `useAuth` hook |

### 依赖

- 后端：`github.com/golang-jwt/jwt/v5`
- 后端：`golang.org/x/crypto`（密码哈希）
- 前端：无需新增（使用已有 React Query + Zustand）
