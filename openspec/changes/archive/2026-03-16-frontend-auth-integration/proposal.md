## Why

前端目前没有实现用户认证功能，用户无法登录系统。需要接入后端 Auth 模块的 API，实现完整的认证流程，包括登录、登出、Token 管理和路由保护，为后续业务功能开发奠定基础。

## What Changes

- 新增 Auth API 服务层，封装所有认证相关接口调用
- 新增认证状态管理，处理 JWT Token 存储和自动刷新
- 新增登录页面，支持账号密码登录和短信验证码登录
- 新增路由守卫，基于用户角色控制页面访问权限
- 新增用户信息 Hook，提供全局用户状态访问

## Capabilities

### New Capabilities

- `auth-service`: 认证 API 服务层，封装登录、登出、Token 刷新、获取当前用户等接口
- `auth-state`: 认证状态管理，处理 Token 存储、自动刷新、登录状态持久化
- `login-page`: 登录页面，支持账号密码登录和短信验证码登录两种方式
- `route-guards`: 路由守卫，基于用户角色（platform_admin/tenant_admin/operator）控制页面访问
- `auth-hooks`: 认证相关 Hooks，提供 useAuth、useUser 等便捷访问

### Modified Capabilities

无

## Impact

- **新增文件**: `lib/auth/api.ts`, `lib/auth/store.ts`, `lib/auth/hooks.ts`, `lib/auth/types.ts`
- **新增页面**: `app/(auth)/login/page.tsx`
- **新增中间件**: `middleware.ts` 处理路由保护
- **API 依赖**: `POST /auth/login`, `POST /auth/sms/send`, `POST /auth/sms/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
