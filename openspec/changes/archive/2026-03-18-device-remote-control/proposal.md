## Why

运营人员需要远程控制设备（如抬杆）以处理特殊情况（如车牌识别失败、系统故障等）。当前系统缺乏远程控制能力，导致现场问题需要人工介入，响应效率低。

## What Changes

- 新增 API: `POST /api/v1/devices/:id/control` 用于发送控制指令
- 集成 MQTT 发布控制指令到 `device/{device_id}/command` topic
- 新增 `device_control_logs` 表记录控制操作日志
- 设备离线时拒绝控制请求，返回错误提示
- 前端设备详情页添加抬杆按钮（仅在线时可用）

## Capabilities

### New Capabilities

- `device-control-api`: 设备远程控制 API，支持发送 open_gate 指令，包含离线检测和权限控制
- `device-control-log`: 控制操作日志记录，记录操作人、指令和时间
- `device-control-frontend`: 前端抬杆按钮组件，根据设备在线状态自动禁用/启用

### Modified Capabilities

无

## Impact

**后端 (parkhub-api)**:
- `internal/handler/device_handler.go`: 新增 Control 方法
- `internal/service/interface.go`: 新增 DeviceControlService 接口
- `internal/service/impl/device_control_service.go`: 新增控制服务实现
- `internal/repository/interface.go`: 新增 DeviceControlLogRepo 接口
- `internal/repository/impl/device_control_log_repo.go`: 新增日志仓储
- `internal/domain/device.go`: 新增 DeviceControlLog 实体
- `internal/router/router.go`: 注册控制路由
- `migrations/`: 新增 device_control_logs 表迁移

**前端 (parkhub-web)**:
- 设备详情页新增抬杆按钮
- 设备列表页操作列新增控制按钮

**依赖**:
- MQTT 客户端（已集成）
- Device Service (Issue #15 已完成)
- 设备在线状态判断 (Issue #16 已完成)
