## ADDED Requirements

### Requirement: Control log persistence
系统 SHALL 将每次控制操作记录到 `device_control_logs` 表。

#### Scenario: Log successful control operation
- **WHEN** 控制指令成功发送
- **THEN** 系统 SHALL 在 `device_control_logs` 表中插入记录，包含 tenant_id, device_id, operator_id, operator_name, command, created_at

#### Scenario: Log contains operator information
- **WHEN** 记录控制日志
- **THEN** 日志 SHALL 包含操作人 ID 和名称（从 JWT token 获取）

### Requirement: Log data structure
系统 SHALL 使用以下表结构存储控制日志：

```sql
CREATE TABLE device_control_logs (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(36) NOT NULL,
    operator_id VARCHAR(36) NOT NULL,
    operator_name VARCHAR(50),
    command VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_device_id (device_id),
    INDEX idx_created_at (created_at)
);
```

#### Scenario: Insert log with all required fields
- **WHEN** 控制操作执行
- **THEN** 系统 SHALL 生成 UUID 作为主键，并填充所有必需字段

### Requirement: Log retention
系统 SHALL 永久保留控制日志。

#### Scenario: Logs are never deleted
- **WHEN** 查询历史控制日志
- **THEN** 系统 SHALL 返回所有历史记录（无自动删除）

### Requirement: Log query support
系统 SHALL 支持按设备和时间范围查询控制日志。

#### Scenario: Query logs by device
- **WHEN** 查询指定设备的控制日志
- **THEN** 系统 SHALL 返回该设备的所有控制记录，按时间倒序排列

#### Scenario: Query logs with pagination
- **WHEN** 查询控制日志
- **THEN** 系统 SHALL 支持分页查询
