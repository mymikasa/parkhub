## ADDED Requirements

### Requirement: 租户 API 封装

系统 SHALL 在前端提供租户相关的 API 调用函数，封装所有与租户管理相关的 HTTP 请求。

#### Scenario: 获取租户列表 API
- **WHEN** 调用 getTenants 函数并传入筛选参数
- **THEN** 发送 GET /api/v1/tenants 请求
- **AND** 返回租户列表数据

#### Scenario: 创建租户 API
- **WHEN** 调用 createTenant 函数并传入租户数据
- **THEN** 发送 POST /api/v1/tenants 请求
- **AND** 返回创建的租户数据

#### Scenario: 获取租户详情 API
- **WHEN** 调用 getTenant 函数并传入租户 ID
- **THEN** 发送 GET /api/v1/tenants/:id 请求
- **AND** 返回租户详情数据

#### Scenario: 更新租户 API
- **WHEN** 调用 updateTenant 函数并传入租户 ID 和更新数据
- **THEN** 发送 PUT /api/v1/tenants/:id 请求
- **AND** 返回更新后的租户数据

#### Scenario: 冻结租户 API
- **WHEN** 调用 freezeTenant 函数并传入租户 ID
- **THEN** 发送 POST /api/v1/tenants/:id/freeze 请求
- **AND** 返回操作结果

#### Scenario: 解冻租户 API
- **WHEN** 调用 unfreezeTenant 函数并传入租户 ID
- **THEN** 发送 POST /api/v1/tenants/:id/unfreeze 请求
- **AND** 返回操作结果

### Requirement: 租户 React Query Hooks

系统 SHALL 提供基于 React Query 的租户数据查询 Hooks，简化组件中的数据获取和状态管理。

#### Scenario: useTenants Hook
- **WHEN** 组件调用 useTenants hook 并传入筛选参数
- **THEN** 返回 React Query 的查询结果（data, isLoading, error）
- **AND** 自动处理缓存和刷新

#### Scenario: useTenant Hook
- **WHEN** 组件调用 useTenant hook 并传入租户 ID
- **THEN** 返回单个租户的查询结果
- **AND** 自动处理缓存

#### Scenario: useCreateTenant Hook
- **WHEN** 组件调用 useCreateTenant hook
- **THEN** 返回 React Query 的 mutation 结果（mutate, isPending, error）
- **AND** 成功后自动使租户列表缓存失效

#### Scenario: useUpdateTenant Hook
- **WHEN** 组件调用 useUpdateTenant hook
- **THEN** 返回 React Query 的 mutation 结果
- **AND** 成功后自动更新对应租户的缓存

#### Scenario: useFreezeTenant Hook
- **WHEN** 组件调用 useFreezeTenant hook
- **THEN** 返回 React Query 的 mutation 结果
- **AND** 成功后自动更新租户状态缓存

#### Scenario: useUnfreezeTenant Hook
- **WHEN** 组件调用 useUnfreezeTenant hook
- **THEN** 返回 React Query 的 mutation 结果
- **AND** 成功后自动更新租户状态缓存

### Requirement: 租户类型定义

系统 SHALL 定义租户相关的 TypeScript 类型，确保类型安全。

#### Scenario: Tenant 类型
- **WHEN** 定义 Tenant 类型时
- **THEN** 包含 id, company_name, contact_name, contact_phone, status, created_at, updated_at 字段
- **AND** status 为 'active' | 'frozen' 联合类型

#### Scenario: CreateTenantRequest 类型
- **WHEN** 定义创建租户请求类型时
- **THEN** 包含 company_name, contact_name, contact_phone 必填字段

#### Scenario: TenantListResponse 类型
- **WHEN** 定义租户列表响应类型时
- **THEN** 包含 items 数组、total 总数、page 当前页、page_size 每页数量
