## ADDED Requirements

### Requirement: 租户 HTTP Handler

系统 SHALL 提供租户相关的 HTTP API 处理器，处理所有租户管理相关的 HTTP 请求。

#### Scenario: 处理创建租户请求
- **WHEN** 收到 POST /api/v1/tenants 请求，包含有效的租户数据
- **THEN** 调用 TenantService.Create 方法
- **AND** 返回 HTTP 201 状态码和创建的租户数据

#### Scenario: 处理创建租户请求参数错误
- **WHEN** 收到 POST /api/v1/tenants 请求，缺少必填字段
- **THEN** 返回 HTTP 400 状态码和错误信息

#### Scenario: 处理查询租户列表请求
- **WHEN** 收到 GET /api/v1/tenants 请求（可选带 page, page_size, status 参数）
- **THEN** 调用 TenantService.List 方法
- **AND** 返回 HTTP 200 状态码和租户列表数据

#### Scenario: 处理查询租户详情请求
- **WHEN** 收到 GET /api/v1/tenants/:id 请求
- **THEN** 调用 TenantService.GetByID 方法
- **AND** 返回 HTTP 200 状态码和租户详情数据

#### Scenario: 处理更新租户请求
- **WHEN** 收到 PUT /api/v1/tenants/:id 请求，包含有效的更新数据
- **THEN** 调用 TenantService.Update 方法
- **AND** 返回 HTTP 200 状态码和更新后的租户数据

#### Scenario: 处理冻结租户请求
- **WHEN** 收到 POST /api/v1/tenants/:id/freeze 请求
- **THEN** 调用 TenantService.Freeze 方法
- **AND** 返回 HTTP 200 状态码和成功消息

#### Scenario: 处理解冻租户请求
- **WHEN** 收到 POST /api/v1/tenants/:id/unfreeze 请求
- **THEN** 调用 TenantService.Unfreeze 方法
- **AND** 返回 HTTP 200 状态码和成功消息

### Requirement: 租户 Handler DTO 定义

系统 SHALL 定义租户相关的 DTO 结构，用于请求参数绑定和响应序列化。

#### Scenario: 创建租户请求 DTO
- **WHEN** 接收到创建租户请求时
- **THEN** 使用 CreateTenantRequest DTO 进行参数绑定和校验
- **AND** DTO 包含 company_name, contact_name, contact_phone 必填字段

#### Scenario: 租户列表响应 DTO
- **WHEN** 查询租户列表成功时
- **THEN** 返回 TenantListResponse DTO
- **AND** DTO 包含 items 数组、total 总数、page 当前页、page_size 每页数量

#### Scenario: 租户详情响应 DTO
- **WHEN** 查询租户详情成功时
- **THEN** 返回 Tenant DTO
- **AND** DTO 包含 id, company_name, contact_name, contact_phone, status, created_at, updated_at 字段

### Requirement: 租户 Handler 错误处理

系统 SHALL 将领域层错误映射为对应的 HTTP 状态码和错误响应。

#### Scenario: 领域错误映射
- **WHEN** Service 层返回领域错误（如 ErrTenantNotFound）
- **THEN** Handler 将错误映射为对应的 HTTP 状态码（如 404）
- **AND** 返回标准错误响应格式 { code, message }

### Requirement: 租户 Handler Wire 注入

系统 SHALL 通过 Wire 提供 TenantHandler 的依赖注入配置。

#### Scenario: Handler 依赖注入
- **WHEN** 应用启动时
- **THEN** TenantHandler 通过 Wire 自动注入所需依赖（TenantService）
