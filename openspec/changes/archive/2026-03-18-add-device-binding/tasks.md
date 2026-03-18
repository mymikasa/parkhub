## 1. 后端绑定与解绑 API

- [x] 1.1 扩展 `parkhub-api` 设备领域模型、服务接口和 DTO，定义 bind/unbind 请求、响应和业务错误码
- [x] 1.2 为 `DeviceRepo`、`ParkingLotRepo`、`GateRepo` 补充绑定所需的查询与容量统计能力，并在 service 层实现租户归属、状态和 3 台设备上限校验
- [x] 1.3 在 `DeviceHandler` 与路由中新增 `POST /api/v1/devices/:id/bind` 和 `POST /api/v1/devices/:id/unbind`，限制仅 admin 可操作
- [x] 1.4 实现解绑逻辑，确保清空 `parking_lot_id`、`gate_id`，并将设备恢复到 `tenant-platform` + `pending`

## 2. 绑定选项与前端设备页交互

- [x] 2.1 扩展车场列表查询能力，支持平台管理员按 `tenant_id` 获取绑定目标车场列表
- [x] 2.2 扩展 `parkhub-web/lib/device` 的 types、api 和 hooks，增加 bind/unbind 调用及缓存失效逻辑
- [x] 2.3 在设备管理页增加绑定弹窗，支持平台管理员选择租户、车场、出入口，支持租户管理员直接选择本租户目标位置
- [x] 2.4 在设备管理页增加解绑按钮、提交态和错误提示，并在成功后刷新设备列表与统计卡片

## 3. 出入口能力对齐

- [x] 3.1 调整 `parkhub-api` 出入口相关读路径，改为基于 `devices.gate_id` 聚合设备绑定摘要，而不是依赖 `gates.device_id`
- [x] 3.2 调整出入口创建/编辑流程，移除或停用 gate 侧直接绑定设备的入口
- [x] 3.3 更新出入口删除逻辑，确保删除 gate 时自动解绑该 gate 下的所有设备

## 4. 测试与验证

- [x] 4.1 为设备 service/handler 增加单元测试，覆盖成功绑定、active 改绑、容量超限、状态非法、跨租户和解绑场景
- [x] 4.2 为前端设备 API/hooks 与绑定弹窗增加测试，覆盖角色差异、联动选择、解绑刷新和错误提示
- [x] 4.3 运行受影响模块的测试与构建检查，确认 bind/unbind 流程和出入口读路径没有回归
