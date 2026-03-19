## Context

ParkHub 已完成停车场管理、设备管理模块，但缺少计费规则功能。当前前端 `billing-rules/page.tsx` 仅为占位页面，后端无相关数据模型或 API。系统需要计费规则来打通临停收费闭环——车辆出场时根据规则自动计算费用。

现有架构遵循清洁分层：Router → Handler → Service → Repository → Domain，使用 Google Wire 依赖注入，GORM 作 ORM，Gin 作 HTTP 框架。前端基于 Next.js 15 App Router + shadcn/ui + React Query。

已有 HTML 高保真原型 `pages/billing-rules.html` 作为前端设计参考。

## Goals / Non-Goals

**Goals:**
- 实现独立的 `billing_rules` 表，MVP 阶段每个停车场一条规则
- 提供查询、更新、费用模拟计算 3 个 API 端点
- 创建停车场时自动生成默认计费规则
- 前端实现完整的规则配置页面（滑块+输入框双向绑定、费用计算器弹窗）
- 规则变更记录审计日志
- 计费算法可被未来出场缴费流程复用

**Non-Goals:**
- 一个停车场多套规则（工作日/周末、分时段）
- 半小时计费周期
- 入场时规则快照
- 阶梯计费、按次计费、优惠券抵扣
- 支付集成、车主 H5 缴费页面

## Decisions

### 1. 独立表 vs 嵌入 parking_lots

**选择**: 独立 `billing_rules` 表，通过 `parking_lot_id` 外键关联。

**理由**: 虽然 MVP 是一对一关系，但独立表为未来一对多场景（分时段规则、工作日/周末差异化）预留扩展空间。MVP 阶段通过 `parking_lot_id` 唯一约束保证一对一。

**替代方案**: 在 `parking_lots` 表添加 `free_minutes`/`price_per_hour`/`daily_cap` 字段——更简单但无法扩展。

### 2. 计费算法位置

**选择**: 计费算法实现在 Service 层，作为纯函数方法。

**理由**: Service 方法可同时被费用计算器端点和未来的出场 Handler 调用。纯函数便于单元测试，不依赖数据库。

### 3. 默认规则创建方式

**选择**: 在 ParkingLot Service 的 `Create` 方法中注入 BillingRule Repository，创建停车场后立即创建默认规则。

**理由**: 保证原子性——停车场和默认规则在同一事务中创建。避免事件驱动的复杂性。

**替代方案**: 通过事件钩子异步创建——增加复杂度且可能导致不一致。

### 4. daily_cap = 0 表示不封顶

**选择**: 使用 0 作为"不封顶"的语义值，而非 nullable 字段。

**理由**: 简化前端和后端逻辑。DECIMAL 字段不需要处理 null 指针。前端展示时将 0 显示为"不封顶"。

### 5. 规则生效时机

**选择**: 修改立即生效，出场计费使用当前规则，不做入场时快照。

**理由**: MVP 简化实现。对运营方来说，规则变更立即生效是符合预期的行为。

### 6. 前端状态管理

**选择**: React Query 管理服务端状态，react-hook-form + zod 管理表单状态。

**理由**: 与项目现有模式一致（参考 parking-lot 模块）。React Query 自动处理缓存失效和重新获取。

### 7. 审计日志

**选择**: 复用现有 `audit_logs` 表，在 Service 层记录规则更新的变更前后值。

**理由**: 无需新增基础设施，遵循现有审计模式。

## Risks / Trade-offs

- **[停车场创建事务耦合]** → ParkingLot Service 需注入 BillingRule Repository，增加模块耦合。缓解：通过接口解耦，Wire 管理依赖。
- **[规则即时生效的边界情况]** → 车辆停车期间规则变更可能导致费用不符预期。缓解：MVP 接受此行为，后续版本可引入规则快照。
- **[滑块精度]** → price_per_hour 步进 0.5 元可能无法满足所有定价需求。缓解：输入框支持手动输入任意合法值。
- **[DECIMAL 精度]** → 使用 DECIMAL(10,2) 存储金额，避免浮点误差。
