## Context

ParkHub 前端使用 Next.js 15 App Router，需要接入后端 JWT 认证系统。后端 API 基地址通过 `NEXT_PUBLIC_API_BASE_URL` 配置，认证接口返回 `access_token`（2小时有效）和 `refresh_token`（7天有效）。

当前前端没有任何认证机制，需要实现完整的认证流程。

## Goals / Non-Goals

**Goals:**
- 实现账号密码登录和短信验证码登录
- JWT Token 自动刷新机制
- 基于角色的路由保护
- 登录状态持久化（支持"记住我"）
- 全局用户状态访问

**Non-Goals:**
- 第三方登录（微信、支付宝等）
- 多因素认证（MFA）
- 密码找回流程（后续迭代）
- 用户注册流程

## Decisions

### 1. Token 存储方式
**选择**: localStorage + 内存缓存
**理由**: 
- localStorage 持久化，支持"记住我"功能
- 内存缓存避免频繁读取 localStorage
- XSS 风险可控（HttpOnly Cookie 需要后端配合，当前 API 返回 JSON）

**备选**: Cookie（需要后端改造）、Session Storage（不支持持久化）

### 2. 状态管理方案
**选择**: React Context + Custom Hooks
**理由**:
- 认证状态相对简单，不需要复杂状态管理
- 与 Next.js App Router 兼容性好
- 避免引入额外依赖（如 Zustand）

**备选**: Zustand（增加依赖）、Redux（过度设计）

### 3. Token 刷新策略
**选择**: 请求拦截器 + 提前刷新
**理由**:
- 在 access_token 过期前 5 分钟自动刷新
- 401 响应时尝试刷新后重试
- 避免用户感知到 Token 过期

### 4. 路由保护实现
**选择**: Next.js Middleware
**理由**:
- 在服务端执行，安全性更高
- 支持页面级重定向
- 与 App Router 原生集成

### 5. API 请求封装
**选择**: 原生 fetch + 封装工具函数
**理由**:
- 无额外依赖
- Next.js 推荐方案
- 便于添加拦截器逻辑

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| localStorage XSS 攻击 | Token 有效期短，敏感操作需后端二次验证 |
| Token 刷新竞态条件 | 使用刷新锁，避免并发刷新请求 |
| 中间件无法访问客户端状态 | 通过 Cookie 同步 Token 状态 |
| 网络请求失败导致登录态丢失 | 提供手动重新登录入口，错误提示清晰 |
