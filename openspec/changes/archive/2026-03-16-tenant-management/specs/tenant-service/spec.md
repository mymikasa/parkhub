## ADDED Requirements

### Requirement: 租户 CRUD 服务

系统 SHALL 提供完整的租户增删改查服务，包括创建、列表查询、详情查询、更新、冻结和解冻功能。

#### Scenario: 创建租户
- **WHEN** 平台管理员提交有效的租户数据（公司名称、 联系人、 联系电话）
- **THEN** 系统创建新租户记录，状态为 `active`
- **AND** 返回创建成功的响应，包含租户 ID

#### Scenario: 创建租户时公司名称重复
- **WHEN** 平台管理员提交已存在的公司名称
- **THEN** 系统拒绝创建，返回错误 "COMPANY_NAME_EXISTS"

#### Scenario: 查询租户列表
- **WHEN** 平台管理员请求租户列表（可选按状态筛选、关键词搜索、分页）
- **THEN** 系统返回符合条件的租户列表，包含总数和分页数据

#### Scenario: 查询租户详情
- **WHEN** 平台管理员请求指定租户的详情
- **THEN** 系统返回该租户的完整信息

- **AND** 如果租户不存在，返回 404 错误

#### Scenario: 更新租户信息
- **WHEN** 平台管理员提交租户更新数据（公司名称、 联系人、 联系电话）
- **THEN** 系统更新租户信息
- **AND** 返回更新后的租户数据

#### Scenario: 冻结租户
- **WHEN** 平台管理员请求冻结指定租户
- **THEN** 系统将租户状态更改为 `frozen`
- **AND** 返回操作成功的消息

#### Scenario: 解冻租户
- **WHEN** 平台管理员请求解冻指定租户
- **THEN** 系统将租户状态更改为 `active`
- **AND** 返回操作成功的消息

#### Scenario: 冻结不存在的租户
- **WHEN** 平台管理员请求冻结不存在的租户 ID
- **THEN** 系统返回 404 错误 "TENANT_NOT_FOUND"

### Requirement: 租户服务接口定义

系统 SHALL 定义 TenantService 接口，包含以下方法：
- `Create(ctx, req)`: 创建租户
- `List(ctx, filter)`: 查询租户列表
- `GetByID(ctx, id)`: 获取租户详情
- `Update(ctx, id, req)`: 更新租户
- `Freeze(ctx, id)`: 冻结租户
- `Unfreeze(ctx, id)`: 解冻租户

#### Scenario: 接口依赖注入
- **WHEN** 应用启动时
- **THEN** TenantService 通过 Wire 自动注入所需依赖（TenantRepo）

### Requirement: 租户业务规则

系统 SHALL 实现以下业务规则：

#### Scenario: 公司名称唯一性校验
- **WHEN** 创建或更新租户时
- **THEN** 系统检查公司名称是否已被其他租户使用

- **AND** 如果重复，拒绝操作

#### Scenario: 租户状态校验
- **WHEN** 执行冻结操作时
- **THEN** 系统验证租户当前状态是否允许该操作
- **AND** 已冻结的租户不能再次冻结

