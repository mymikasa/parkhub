## Why

停车场运营方需要为每个停车场配置计费规则（免费时长、小时单价、每日封顶），以便系统在车辆出场时自动计算停车费用。目前系统已完成停车场管理、设备管理等模块，但计费规则功能完全未实现——后端无数据模型和 API，前端仅有占位页面。没有计费规则，整个临停收费闭环无法打通。

## What Changes

- 新增 `billing_rules` 数据库表（独立于 parking_lots，支持未来一对多扩展）
- 新增后端计费规则模块：Domain 实体、Repository、Service、Handler，遵循现有清洁架构
- 新增 3 个 API 端点：查询计费规则 (`GET`)、更新计费规则 (`PUT`)、费用模拟计算 (`POST`)
- 修改停车场创建流程：创建停车场时自动生成默认计费规则（免费15分钟、¥2/小时、¥20/天封顶）
- 实现前端计费规则配置页面：停车场选择列表 + 规则摘要卡片 + 滑块/输入框编辑表单
- 实现费用计算器弹窗：调用后端 API 模拟计费并展示明细
- 平台管理员支持租户切换，操作员无权访问
- 规则变更记录审计日志

## Capabilities

### New Capabilities
- `billing-rule-domain`: 计费规则领域模型、校验规则与计费算法
- `billing-rule-api`: 计费规则 REST API 端点（查询、更新、费用计算）
- `billing-rule-frontend`: 计费规则配置页面（停车场列表、规则编辑、费用计算器）

### Modified Capabilities
- `parking-lot-crud`: 创建停车场时联动创建默认计费规则

## Impact

- **数据库**: 新增 `billing_rules` 表（migration 005）
- **后端**: 新增 domain/service/repository/handler 模块，修改 ParkingLot Service，更新 Wire 依赖注入和路由
- **前端**: 新增 `lib/billing-rules/` 模块，重写 `billing-rules/page.tsx`，新增滑块组件
- **API**: 新增 3 个端点，更新 OpenAPI 规范
- **权限**: `platform_admin` 和 `tenant_admin` 可读写，`operator` 无权限（已在 middleware 中配置）
