## ADDED Requirements

### Requirement: 计费规则数据模型
系统 SHALL 维护独立的 `billing_rules` 表，包含以下字段：`id`（UUID）、`tenant_id`（UUID, FK）、`parking_lot_id`（UUID, FK, 唯一约束）、`free_minutes`（INT）、`price_per_hour`（DECIMAL(10,2)）、`daily_cap`（DECIMAL(10,2)）、`created_at`、`updated_at`。

#### Scenario: 表结构正确创建
- **WHEN** 执行 migration 005
- **THEN** 系统创建 `billing_rules` 表
- **AND** `parking_lot_id` 具有唯一约束
- **AND** 外键关联 `tenants` 和 `parking_lots` 表（CASCADE DELETE）

### Requirement: 免费时长范围校验
系统 SHALL 限制 `free_minutes` 的值在 0-120 之间（含边界）。

#### Scenario: 合法免费时长
- **WHEN** 设置 free_minutes 为 0、15、60 或 120
- **THEN** 校验通过

#### Scenario: 非法免费时长
- **WHEN** 设置 free_minutes 为 -1 或 121
- **THEN** 校验失败并返回错误

### Requirement: 小时单价范围校验
系统 SHALL 限制 `price_per_hour` 的值在 1.00-50.00 之间（含边界）。

#### Scenario: 合法单价
- **WHEN** 设置 price_per_hour 为 1.00、2.50 或 50.00
- **THEN** 校验通过

#### Scenario: 非法单价
- **WHEN** 设置 price_per_hour 为 0.50 或 50.50
- **THEN** 校验失败并返回错误

### Requirement: 每日封顶范围校验
系统 SHALL 限制 `daily_cap` 的值在 0.00-500.00 之间（含边界），其中 0 表示不封顶。

#### Scenario: 合法封顶值
- **WHEN** 设置 daily_cap 为 0.00（不封顶）、20.00 或 500.00
- **THEN** 校验通过

#### Scenario: 非法封顶值
- **WHEN** 设置 daily_cap 为 -1.00 或 501.00
- **THEN** 校验失败并返回错误

### Requirement: 计费算法
系统 SHALL 按以下逻辑计算停车费用：
1. `parking_duration` = exit_time - entry_time（分钟）
2. `billable_minutes` = max(0, parking_duration - free_minutes)
3. `billable_hours` = ceil(billable_minutes / 60)
4. `raw_fee` = billable_hours × price_per_hour
5. `days` = ceil(parking_duration / 1440)
6. `final_fee` = min(raw_fee, daily_cap × days)；若 daily_cap = 0 则跳过封顶

#### Scenario: 免费停车
- **WHEN** 停车时长 10 分钟，免费时长 15 分钟
- **THEN** billable_minutes = 0，final_fee = 0.00

#### Scenario: 精确小时边界
- **WHEN** 停车时长 75 分钟，免费时长 15 分钟，单价 2.00
- **THEN** billable_minutes = 60，billable_hours = 1，final_fee = 2.00

#### Scenario: 不足一小时向上取整
- **WHEN** 停车时长 76 分钟，免费时长 15 分钟，单价 2.00
- **THEN** billable_minutes = 61，billable_hours = 2，final_fee = 4.00

#### Scenario: 每日封顶生效
- **WHEN** 停车时长 600 分钟，免费时长 15 分钟，单价 5.00，daily_cap = 20.00
- **THEN** raw_fee = 50.00，days = 1，final_fee = 20.00

#### Scenario: 多日跨天封顶
- **WHEN** 停车时长 2000 分钟，免费时长 15 分钟，单价 5.00，daily_cap = 20.00
- **THEN** days = 2，final_fee = min(raw_fee, 40.00)

#### Scenario: 不封顶
- **WHEN** 停车时长 600 分钟，免费时长 15 分钟，单价 5.00，daily_cap = 0.00
- **THEN** final_fee = 50.00（不做封顶限制）

#### Scenario: 零分钟停车
- **WHEN** 停车时长 0 分钟
- **THEN** final_fee = 0.00

#### Scenario: 超长停留
- **WHEN** 停车时长 10080 分钟（7天），免费时长 15 分钟，单价 3.00，daily_cap = 30.00
- **THEN** days = 7，final_fee = min(raw_fee, 210.00)
