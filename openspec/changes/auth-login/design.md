# Auth Login - Design

## Context

ParkHub 采用前后端分离架构：
- **前端**：React + Next.js +  TypeScript + Tailwind + shadcn/ui
- **后端**：Golang + Gin + GORM + Mysql

登录认证是系统的入口，需要支持：
1. 多种登录方式（账号密码、手机验证码）
2. 多种用户角色（平台管理员、租户管理员、操作员）
3. 多租户数据隔离

**当前状态**：
- 前端已有 HTML 设计稿，需转换为 React 组件
- 后端无任何认证代码
- 数据库无用户表

**约束**：
- 使用 JWT 进行无状态认证
- 密码必须加密存储（bcrypt）
- Token 需要支持刷新机制

## Goals / Non-Goals

**Goals:**

1. 实现账号密码登录，支持用户名或邮箱
2. 实现手机号验证码登录（MVP 阶段可用 mock 验证码）
3. 实现 JWT Token 认证机制（Access + Refresh Token）
4. 实现基于角色的接口权限守卫
5. 实现多租户上下文自动注入

**Non-Goals:**

1. 第三方登录（微信、支付宝）- MVP 不实现
2. 忘记密码/重置密码 - MVP 不实现
3. 用户注册功能 - 用户由管理员创建
4. 多设备登录互踢 - MVP 不实现
5. 登录日志/审计 - 后续版本

## Decisions

### D1: JWT 认证方案

**选择**：双 Token 机制（Access Token + Refresh Token）

**理由**：
- Access Token 短期有效（2h），即使泄露影响有限
- Refresh Token 长期有效（7d），用于无感刷新
- 无需服务端存储 Session，适合分布式部署

**Token 载荷**：

```json
{
  "sub": "user-uuid",
  "tenant_id": "tenant-uuid",
  "role": "tenant_admin",
  "exp": 1710000000,
  "iat": 1710000000
}
```

**存储方案**：
- Access Token：内存（React 状态 + localStorage 持久化）
- Refresh Token：HttpOnly Cookie（防 XSS）

**替代方案**：
- ❌ 单 Token：无法实现无感刷新
- ❌ Session：需要服务端存储，扩展性差

### D2: 密码存储方案

**选择**：bcrypt（cost=12）

**理由**：
- 内置盐值，防止彩虹表攻击
- 计算成本可调，抵御暴力破解
- Go 标准库支持

**替代方案**：
- ❌ MD5/SHA1：已被攻破
- ❌ Argon2：更安全但配置复杂，MVP 阶段 bcrypt 足够

### D3: 权限控制方案

**选择**：简单 RBAC（基于角色的访问控制）

**角色定义**：

| 角色 | Code | 权限级别 |
|------|------|----------|
| 平台管理员 | `platform_admin` | 全平台访问 |
| 租户管理员 | `tenant_admin` | 本租户全权限 |
| 操作员 | `operator` | 本租户读写（无管理权限） |

**实现方式**：
- Gin 中间件校验 JWT + 提取角色
- 路由级别配置所需角色
- 接口级别可选细粒度权限

**替代方案**：
- ❌ ABAC（基于属性）：过于复杂，MVP 不需要
- ❌ Casbin：引入额外依赖，简单 RBAC 够用

### D4: 验证码登录方案

**选择**：MVP 阶段使用固定验证码 `123456`

**理由**：
- 短信服务需要资质和对接，MVP 阶段跳过
- 固定验证码便于开发测试
- 预留接口，后续可快速接入真实短信

**接口设计**：
```
POST /api/v1/auth/sms/send
  Request: { "phone": "13888888888" }
  Response: { "message": "验证码已发送" }  // 实际不发，日志打印

POST /api/v1/auth/sms/login
  Request: { "phone": "13888888888", "code": "123456" }
  Response: { "access_token": "...", "refresh_token": "..." }
```

### D5: 多租户数据隔离

**选择**：共享数据库 + tenant_id 字段 + 中间件自动注入

**实现**：
1. 登录时将 tenant_id 写入 JWT
2. Auth 中间件解析 JWT，将 tenant_id 注入 context
3. Repository 层自动添加 tenant_id 过滤条件
4. 平台管理员角色跳过租户过滤

**替代方案**：
- ❌ 独立数据库：运维复杂度高
- ❌ Schema 隔离：Mysql 支持，但迁移复杂

## Architecture

### 后端模块结构

```
internal/
├── domain/
│   ├── user.go              # 用户实体
│   ├── tenant.go            # 租户实体
│   └── errors.go            # 业务错误
│
├── service/
│   ├── interface.go         # AuthService 接口
│   └── impl/
│       └── auth_service.go  # 认证服务实现
│
├── repository/
│   ├── interface.go         # UserRepo, TenantRepo 接口
│   └── impl/
│       ├── user_repo.go
│       └── tenant_repo.go
│
├── handler/
│   └── auth_handler.go      # HTTP 处理器
│
├── middleware/
│   ├── auth.go              # JWT 校验中间件
│   └── tenant.go            # 租户上下文注入
│
└── pkg/
    ├── jwt/
    │   └── jwt.go           # Token 生成/解析
    └── crypto/
        └── password.go      # 密码哈希/校验
```

### 前端模块结构

```
src/
├── features/auth/
│   ├── LoginForm.tsx        # 账号密码表单
│   ├── SmsLoginForm.tsx     # 短信登录表单
│   ├── LoginTabs.tsx        # Tab 切换
│   └── useLogin.ts          # 登录逻辑 hook
│
├── stores/
│   └── useAuthStore.ts      # 认证状态管理
│
├── lib/
│   ├── api.ts               # Axios 实例
│   └── auth.ts              # 认证 API
│
└── hooks/
    └── useAuth.ts           # 认证 hook
```

### API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/auth/login` | 账号密码登录 | ❌ |
| POST | `/api/v1/auth/sms/send` | 发送验证码 | ❌ |
| POST | `/api/v1/auth/sms/login` | 验证码登录 | ❌ |
| POST | `/api/v1/auth/refresh` | 刷新 Token | ❌ |
| POST | `/api/v1/auth/logout` | 登出 | ✅ |
| GET | `/api/v1/auth/me` | 获取当前用户 | ✅ |

### Database Schema

```sql
-- 租户表
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(100) NOT NULL,
    contact_name VARCHAR(50) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    real_name VARCHAR(50) NOT NULL,
    role VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 刷新令牌表（用于吊销）
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| JWT 无法主动吊销 | 1. Access Token 有效期短（2h）<br>2. Refresh Token 存数据库可吊销 |
| 固定验证码安全风险 | 1. 仅 MVP 阶段使用<br>2. 生产环境必须接入真实短信 |
| bcrypt 性能开销 | cost=12 在现代服务器上可接受（~250ms） |
| Token 存 localStorage 有 XSS 风险 | Refresh Token 存 HttpOnly Cookie |
| 多租户数据泄露 | 1. 中间件强制注入 tenant_id<br>2. 代码 Review 重点检查 |

## Migration Plan

### Phase 1: 后端基础（预计 2 天）

1. 创建数据库迁移脚本
2. 实现 Domain 层（User, Tenant 实体）
3. 实现 Repository 层（UserRepo, TenantRepo）
4. 实现 JWT 工具包
5. 实现密码加密工具包

### Phase 2: 认证接口（预计 2 天）

1. 实现 AuthService
2. 实现 AuthHandler
3. 实现 Auth 中间件
4. 实现 Tenant 中间件
5. 单元测试

### Phase 3: 前端实现（预计 2 天）

1. 转换登录页为 React 组件
2. 实现 useAuthStore
3. 实现登录 API 调用
4. 实现路由守卫
5. 联调测试

## Open Questions

1. ~~是否需要登录日志？~~ → MVP 不需要，后续版本
2. ~~Token 有效期多久？~~ → Access 2h, Refresh 7d
3. ~~验证码格式？~~ → MVP 固定 123456
4. 密码强度规则？→ 待定（建议：8-20位，含字母和数字）
