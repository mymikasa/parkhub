## MODIFIED Requirements

### Requirement: 租户管理员可新建停车场
系统 SHALL 允许租户管理员创建新的停车场，必填字段包括车场名称、车场地址、总车位数。创建停车场时 SHALL 自动生成默认计费规则。

#### Scenario: 成功创建停车场
- **WHEN** 租户管理员填写完整信息并提交
- **THEN** 系统创建停车场记录
- **AND** 返回 201 状态码
- **AND** 新停车场出现在列表中

#### Scenario: 自动创建默认计费规则
- **WHEN** 停车场创建成功
- **THEN** 系统自动创建关联的计费规则记录
- **AND** 默认值为 free_minutes=15、price_per_hour=2.00、daily_cap=20.00

#### Scenario: 名称重复被拒绝
- **WHEN** 租户管理员输入已存在的车场名称（同租户）
- **THEN** 系统返回 409 Conflict
- **AND** 提示"该车场名称已存在"

#### Scenario: 必填字段校验
- **WHEN** 租户管理员提交时缺少必填字段
- **THEN** 系统返回 400 Bad Request
- **AND** 提示具体缺失字段
