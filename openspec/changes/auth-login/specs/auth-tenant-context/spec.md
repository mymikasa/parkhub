# auth-tenant-context

多租户上下文注入与数据隔离。

## ADDED Requirements

### Requirement: 租户上下文注入

系统 SHALL 在认证成功后自动注入租户上下文到请求中。

#### Scenario: 普通用户注入租户上下文
- **WHEN** tenant_admin 或 operator 角色用户登录
- **THEN** 系统将该用户的 tenant_id 注入到请求上下文
- **AND** 后续请求自动携带该 tenant_id

#### Scenario: 平台管理员无租户上下文
- **WHEN** platform_admin 角色用户登录
- **THEN** 系统不注入 tenant_id
- **AND** 该用户可跨租户访问数据

### Requirement: 自动租户数据隔离

系统 SHALL 自动为数据查询添加租户过滤条件。

#### Scenario: 查询本租户数据
- **WHEN** tenant_admin 用户 GET `/api/v1/parking-lots`
- **THEN** 系统自动添加 WHERE tenant_id = 'user_tenant_id'
- **AND** 只返回该租户的车场数据

#### Scenario: 创建数据自动填充租户
- **WHEN** tenant_admin 用户 POST `/api/v1/parking-lots`
- **THEN** 系统自动将 tenant_id 设置为当前用户的租户 ID
- **AND** 禁止手动指定其他 tenant_id

#### Scenario: 平台管理员查询全部数据
- **WHEN** platform_admin 用户 GET `/api/v1/parking-lots`
- **THEN** 系统不添加租户过滤
- **AND** 返回所有租户的车场数据

#### Scenario: 平台管理员按租户筛选
- **WHEN** platform_admin 用户 GET `/api/v1/parking-lots?tenant_id=xxx`
- **THEN** 系统返回指定租户的车场数据

### Requirement: 跨租户访问拦截

系统 SHALL 阻止用户访问其他租户的数据。

#### Scenario: 直接访问其他租户资源
- **WHEN** tenant_admin 用户 GET `/api/v1/parking-lots/other-tenant-lot-id`
- **THEN** 系统检测到 tenant_id 不匹配
- **AND** 返回 404 错误 "资源不存在"

#### Scenario: 修改其他租户数据
- **WHEN** tenant_admin 用户尝试修改其他租户的记录
- **THEN** 系统返回 404 错误（不暴露资源属于其他租户）

### Requirement: 租户状态检查

系统 SHALL 检查租户状态，冻结租户禁止访问。

#### Scenario: 租户已冻结
- **WHEN** 属于已冻结租户的用户尝试登录
- **THEN** 系统返回错误 "租户已暂停服务，请联系平台管理员"

#### Scenario: 租户冻结后 Token 失效
- **WHEN** 租户被冻结时，该租户用户的 Token
- **THEN** 下次请求时系统检测到租户状态异常
- **AND** 返回 403 错误要求重新登录

### Requirement: 租户上下文传递

系统 SHALL 在整个请求链路中保持租户上下文。

#### Scenario: Context 传递
- **WHEN** 请求进入 Service 层
- **THEN** Service 可通过 ctx 获取 tenant_id

#### Scenario: Repository 层使用
- **WHEN** Repository 执行数据库查询
- **THEN** 自动从 ctx 读取 tenant_id 并添加过滤条件

### Requirement: 租户隔离日志

系统 SHALL 在日志中记录租户上下文，便于问题排查。

#### Scenario: 请求日志包含租户
- **WHEN** 记录请求日志
- **THEN** 日志包含 tenant_id 字段
- **AND** 平台管理员的日志 tenant_id 为 "platform"
