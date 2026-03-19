## ADDED Requirements

### Requirement: 查询计费规则
系统 SHALL 提供 `GET /api/v1/billing-rules?parking_lot_id=xxx` 端点，返回指定停车场的计费规则。

#### Scenario: 成功查询
- **WHEN** 已认证的租户管理员请求自己租户下停车场的计费规则
- **THEN** 系统返回 200 和计费规则数据（id、parking_lot_id、free_minutes、price_per_hour、daily_cap）

#### Scenario: 缺少 parking_lot_id 参数
- **WHEN** 请求未提供 parking_lot_id 查询参数
- **THEN** 系统返回 400 Bad Request

#### Scenario: 跨租户访问被拒绝
- **WHEN** 租户管理员请求其他租户停车场的计费规则
- **THEN** 系统返回 403 Forbidden

#### Scenario: 平台管理员可查询任意租户
- **WHEN** 平台管理员请求任意停车场的计费规则
- **THEN** 系统返回 200 和计费规则数据

#### Scenario: 操作员无权访问
- **WHEN** 操作员角色请求计费规则
- **THEN** 系统返回 403 Forbidden

### Requirement: 更新计费规则
系统 SHALL 提供 `PUT /api/v1/billing-rules/:id` 端点，更新指定计费规则的字段。

#### Scenario: 成功更新
- **WHEN** 租户管理员提交合法的 free_minutes、price_per_hour、daily_cap
- **THEN** 系统更新规则并返回 200
- **AND** 变更记录到审计日志（包含变更前后值）

#### Scenario: 字段校验失败
- **WHEN** 提交 free_minutes = 150（超出范围）
- **THEN** 系统返回 400 Bad Request 并说明校验错误

#### Scenario: 跨租户更新被拒绝
- **WHEN** 租户管理员尝试更新其他租户的计费规则
- **THEN** 系统返回 403 Forbidden

#### Scenario: 规则不存在
- **WHEN** 请求更新不存在的规则 ID
- **THEN** 系统返回 404 Not Found

### Requirement: 费用模拟计算
系统 SHALL 提供 `POST /api/v1/billing-rules/calculate` 端点，根据停车场计费规则模拟计算停车费用。

#### Scenario: 成功计算
- **WHEN** 提交 parking_lot_id、entry_time、exit_time
- **THEN** 系统返回计费明细：parking_duration（分钟）、free_minutes、billable_minutes、billable_hours、price_per_hour、daily_cap、days、raw_fee、final_fee

#### Scenario: 出场时间早于入场时间
- **WHEN** exit_time 早于 entry_time
- **THEN** 系统返回 400 Bad Request

#### Scenario: 缺少必填参数
- **WHEN** 缺少 parking_lot_id 或时间参数
- **THEN** 系统返回 400 Bad Request

#### Scenario: 停车场无计费规则
- **WHEN** 指定停车场不存在计费规则
- **THEN** 系统返回 404 Not Found

### Requirement: 审计日志记录
系统 SHALL 在计费规则更新时记录审计日志，包含操作人、变更时间、变更前后值。

#### Scenario: 更新规则时写入审计日志
- **WHEN** 计费规则被成功更新
- **THEN** `audit_logs` 表新增一条记录
- **AND** 记录包含 user_id、action（"update_billing_rule"）、变更前后的 JSON 快照
