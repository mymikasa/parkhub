## ADDED Requirements

### Requirement: 管理员可绑定设备到租户、车场和出入口
系统 SHALL 允许管理员在设备管理页中通过一次提交，将设备绑定到目标租户、车场和出入口。

#### Scenario: 平台管理员成功绑定 pending 设备
- **WHEN** `platform_admin` 为状态为 `pending` 的设备选择租户、车场和出入口并提交绑定
- **THEN** 系统调用 `POST /api/v1/devices/:id/bind`
- **AND** 设备的 `tenant_id`、`parking_lot_id` 和 `gate_id` 被更新为目标值
- **AND** 设备状态变为 `active`

#### Scenario: 租户管理员成功重新分配 active 设备
- **WHEN** `tenant_admin` 为本租户下状态为 `active` 的设备重新选择新的车场或出入口并提交绑定
- **THEN** 系统更新该设备的归属位置
- **AND** 旧出入口容量被释放
- **AND** 设备状态保持为 `active`

### Requirement: 绑定操作 MUST 执行权限、归属和容量校验
系统 SHALL 在设备绑定时校验操作者权限、目标归属关系和出入口容量限制，不满足条件时拒绝绑定。

#### Scenario: operator 无权绑定设备
- **WHEN** `operator` 调用 `POST /api/v1/devices/:id/bind`
- **THEN** 系统返回 403 Forbidden
- **AND** 不修改设备绑定关系

#### Scenario: 目标出入口已满
- **WHEN** 目标出入口已绑定 3 台设备且管理员继续绑定第 4 台设备
- **THEN** 系统返回业务错误
- **AND** 提示该出入口已达到最大设备数

#### Scenario: 车场和出入口归属不一致
- **WHEN** 管理员提交的出入口不属于所选车场
- **THEN** 系统返回 400 Bad Request 或等价业务错误
- **AND** 不修改设备绑定关系

### Requirement: 仅允许可分配状态的设备进入绑定流程
系统 SHALL 仅允许状态为 `pending` 或 `active` 的设备执行绑定操作。

#### Scenario: offline 设备绑定被拒绝
- **WHEN** 管理员尝试绑定状态为 `offline` 的设备
- **THEN** 系统返回业务错误
- **AND** 提示当前设备状态不允许绑定

#### Scenario: disabled 设备绑定被拒绝
- **WHEN** 管理员尝试绑定状态为 `disabled` 的设备
- **THEN** 系统返回业务错误
- **AND** 提示当前设备状态不允许绑定

### Requirement: 管理员可解绑设备并恢复为待分配状态
系统 SHALL 允许管理员解除设备与车场、出入口的关联，并把设备恢复到平台待分配池。

#### Scenario: 成功解绑已绑定设备
- **WHEN** 管理员调用 `POST /api/v1/devices/:id/unbind`
- **THEN** 设备的 `parking_lot_id` 和 `gate_id` 被清空
- **AND** 设备的 `tenant_id` 恢复为 `tenant-platform`
- **AND** 设备状态变为 `pending`

#### Scenario: 未绑定设备重复解绑
- **WHEN** 管理员对未绑定设备执行解绑
- **THEN** 系统返回业务错误或幂等成功结果
- **AND** 响应语义 MUST 明确表示设备当前未绑定

### Requirement: 设备管理页 MUST 提供绑定弹窗和解绑入口
系统 SHALL 在设备管理页提供绑定弹窗和解绑操作，使管理员可直接完成设备分配与回收。

#### Scenario: 平台管理员打开绑定弹窗
- **WHEN** `platform_admin` 点击设备卡片上的“绑定”操作
- **THEN** 弹窗展示租户、车场、出入口三级选择
- **AND** 车场选项依据所选租户加载
- **AND** 出入口选项依据所选车场加载

#### Scenario: 租户管理员打开绑定弹窗
- **WHEN** `tenant_admin` 点击设备卡片上的“绑定”操作
- **THEN** 弹窗隐藏租户选择或将其锁定为当前租户
- **AND** 管理员可直接选择本租户下的车场和出入口

#### Scenario: 解绑操作成功后刷新列表
- **WHEN** 管理员在设备管理页执行解绑并成功
- **THEN** 设备列表和统计卡片被刷新
- **AND** 设备显示为待分配状态
