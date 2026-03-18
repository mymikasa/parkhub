## Context

当前系统已完成设备管理基础功能（Issue #15, #16），包括 Device Service 和设备在线状态判断。MQTT 客户端已集成，心跳处理机制已实现。

需要在此基础上实现远程控制功能，允许运营人员通过 API 发送控制指令，指令通过 MQTT 下发给设备，同时记录操作日志。

## Goals / Non-Goals

**Goals:**
- 实现 `POST /api/v1/devices/:id/control` API
- 通过 MQTT 发布控制指令到 `device/{device_id}/command`
- 记录控制操作日志到 `device_control_logs` 表
- 设备离线时拒绝控制请求
- 前端抬杆按钮，仅在线时可用

**Non-Goals:**
- 不等待设备响应（fire-and-forget 模式）
- 不实现除 `open_gate` 外的其他控制指令
- 不实现控制结果确认机制
- 不实现 WebSocket 实时推送控制结果

## Decisions

### 1. 控制服务分层设计

**决策**: 新增独立的 `DeviceControlService`，而非扩展现有 `DeviceService`

**理由**:
- 单一职责原则：DeviceService 负责设备 CRUD，DeviceControlService 负责控制逻辑
- 控制逻辑包含 MQTT 发布和日志记录，与设备管理逻辑正交
- 便于独立测试和维护

**替代方案**: 在 DeviceService 中添加 Control 方法
- **缺点**: DeviceService 职责过重，违反 SRP

### 2. 离线检测逻辑

**决策**: 使用现有的 `DeviceService.IsDeviceOnline()` 方法判断设备在线状态

**理由**:
- Issue #16 已实现在线状态判断逻辑（基于 Redis 缓存和心跳时间）
- 复用现有逻辑，保持一致性

### 3. 控制日志设计

**决策**: 每次控制操作同步写入数据库

**理由**:
- 控制操作频率低（相比心跳），同步写入可接受
- 日志需要持久化保存，用于审计和追溯
- 包含操作人信息，需从 JWT 获取后立即记录

**替代方案**: 异步写入（消息队列）
- **缺点**: 增加复杂度，可能丢失日志

### 4. MQTT 消息格式

**决策**: 使用 JSON 格式 `{command, operator_id, operator_name, timestamp}`

**理由**:
- 与 PRD 定义一致
- 包含操作人信息，便于设备端显示和日志关联

### 5. API 权限控制

**决策**: 使用现有 RBAC 中间件，允许 `admin` 和 `operator` 角色访问

**理由**:
- 符合 PRD 权限矩阵
- 复用现有权限体系

## Risks / Trade-offs

**风险 1**: 控制指令丢失（MQTT 网络问题）
- **缓解**: 日志记录保证操作可追溯，后续可通过日志重试

**风险 2**: 设备实际未执行，但后端认为已发送
- **缓解**: 明确 fire-and-forget 模式，用户需观察设备实际状态

**风险 3**: 前端按钮状态与设备实际状态不同步
- **缓解**: 每次操作前重新检查设备状态，设置按钮 loading 状态

## Migration Plan

1. 运行数据库迁移，创建 `device_control_logs` 表
2. 部署后端代码（API + MQTT 发布逻辑）
3. 部署前端代码（抬杆按钮）
4. 无需回滚数据（新表，无数据迁移）
