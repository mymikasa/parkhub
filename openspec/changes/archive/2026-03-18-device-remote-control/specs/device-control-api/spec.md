## ADDED Requirements

### Requirement: Device control API endpoint
系统 SHALL 提供 `POST /api/v1/devices/:id/control` 端点用于远程控制设备。

#### Scenario: Send open_gate command successfully
- **WHEN** admin 或 operator 用户发送 `{"command": "open_gate"}` 到在线设备
- **THEN** 系统 SHALL 返回 200 状态码和成功消息

#### Scenario: Reject control for offline device
- **WHEN** 用户尝试控制离线设备（status=offline 或 last_heartbeat 超过 5 分钟）
- **THEN** 系统 SHALL 返回 400 错误，消息为 "设备离线请检查心跳"

#### Scenario: Reject control for unauthorized user
- **WHEN** 未认证用户或无权限用户尝试访问控制端点
- **THEN** 系统 SHALL 返回 401 或 403 错误

### Requirement: MQTT command publishing
系统 SHALL 通过 MQTT 发布控制指令到 `device/{device_id}/command` topic。

#### Scenario: Publish command to MQTT
- **WHEN** 控制请求通过验证且设备在线
- **THEN** 系统 SHALL 发布 JSON 消息到 MQTT topic，格式为 `{"command": "open_gate", "operator_id": "xxx", "operator_name": "xxx", "timestamp": 1712345678}`

#### Scenario: MQTT publish failure handling
- **WHEN** MQTT 发布失败
- **THEN** 系统 SHALL 记录错误日志但不影响 API 响应（fire-and-forget）

### Requirement: Permission control
系统 SHALL 仅允许 admin 和 operator 角色执行设备控制操作。

#### Scenario: Admin can control device
- **WHEN** platform_admin 或 tenant_admin 用户发送控制指令
- **THEN** 系统 SHALL 允许操作

#### Scenario: Operator can control device
- **WHEN** operator 用户发送控制指令
- **THEN** 系统 SHALL 允许操作

#### Scenario: Other roles cannot control device
- **WHEN** 其他角色用户尝试控制设备
- **THEN** 系统 SHALL 返回 403 Forbidden

### Requirement: Tenant isolation
系统 SHALL 确保租户隔离，用户只能控制本租户设备。

#### Scenario: Tenant admin controls own device
- **WHEN** tenant_admin 控制本租户设备
- **THEN** 系统 SHALL 允许操作

#### Scenario: Tenant admin cannot control other tenant device
- **WHEN** tenant_admin 尝试控制其他租户设备
- **THEN** 系统 SHALL 返回 403 Forbidden

#### Scenario: Platform admin can control any device
- **WHEN** platform_admin 控制任意租户设备
- **THEN** 系统 SHALL 允许操作
