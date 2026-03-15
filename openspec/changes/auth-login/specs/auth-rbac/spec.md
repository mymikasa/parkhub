# auth-rbac

基于角色的访问控制（RBAC）。

## ADDED Requirements

### Requirement: 定义用户角色

系统 SHALL 支持以下预定义角色：

| 角色代码 | 角色名称 | 说明 |
|----------|----------|------|
| platform_admin | 平台管理员 | 全平台访问权限 |
| tenant_admin | 租户管理员 | 本租户全部权限 |
| operator | 操作员 | 本租户读写权限 |

#### Scenario: 角色代码有效
- **WHEN** 创建用户时指定角色为 "tenant_admin"
- **THEN** 系统接受并存储该角色

#### Scenario: 角色代码无效
- **WHEN** 创建用户时指定角色为 "super_user"
- **THEN** 系统返回错误 "无效的角色类型"

### Requirement: 角色权限守卫

系统 SHALL 根据用户角色控制 API 访问权限。

#### Scenario: 平台管理员访问租户管理
- **WHEN** platform_admin 角色用户访问 POST `/api/v1/tenants`
- **THEN** 系统允许访问

#### Scenario: 租户管理员访问车场管理
- **WHEN** tenant_admin 角色用户访问 POST `/api/v1/parking-lots`
- **THEN** 系统允许访问

#### Scenario: 操作员访问车场管理
- **WHEN** operator 角色用户访问 POST `/api/v1/parking-lots`
- **THEN** 系统返回 403 错误 "权限不足"

#### Scenario: 无权限访问
- **WHEN** 用户角色不满足接口要求
- **THEN** 系统返回 403 错误 "您没有权限执行此操作"
- **AND** 错误码为 "PERMISSION_DENIED"

### Requirement: 路由权限配置

系统 SHALL 支持在路由级别配置所需角色。

#### Scenario: 配置单角色路由
- **WHEN** 路由配置为 `roles: ["platform_admin"]`
- **THEN** 仅 platform_admin 角色可访问

#### Scenario: 配置多角色路由
- **WHEN** 路由配置为 `roles: ["tenant_admin", "operator"]`
- **THEN** tenant_admin 或 operator 角色均可访问

#### Scenario: 公开路由
- **WHEN** 路由未配置 roles
- **THEN** 无需认证即可访问

### Requirement: 权限错误处理

系统 SHALL 提供清晰的权限错误信息。

#### Scenario: 未登录访问受保护资源
- **WHEN** 未认证用户访问需要认证的接口
- **THEN** 系统返回 401 错误
- **AND** 响应头包含 `WWW-Authenticate: Bearer`

#### Scenario: Token 有效但权限不足
- **WHEN** 已认证用户访问超出其角色权限的接口
- **THEN** 系统返回 403 错误
- **AND** 响应体包含 `{ "code": "PERMISSION_DENIED", "message": "权限不足" }`

### Requirement: 获取当前用户信息

系统 SHALL 提供接口获取当前登录用户信息。

#### Scenario: 获取当前用户
- **WHEN** 已认证用户 GET `/api/v1/auth/me`
- **THEN** 系统返回 `{ "id": "...", "username": "...", "role": "...", "tenant_id": "...", "real_name": "..." }`
