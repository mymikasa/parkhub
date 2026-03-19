## 1. 数据库迁移

- [x] 1.1 创建 `migrations/005_billing_rules_tables.up.sql`：建表 `billing_rules`，含 id(UUID)、tenant_id(FK)、parking_lot_id(FK, UNIQUE)、free_minutes(INT DEFAULT 15)、price_per_hour(DECIMAL(10,2) DEFAULT 2.00)、daily_cap(DECIMAL(10,2) DEFAULT 20.00)、created_at、updated_at
- [x] 1.2 创建 `migrations/005_billing_rules_tables.down.sql`：DROP TABLE billing_rules

## 2. 后端 Domain 层

- [x] 2.1 创建 `internal/domain/billing_rule.go`：BillingRule 实体结构体、字段校验方法（free_minutes 0-120、price_per_hour 1-50、daily_cap 0-500）、错误码常量
- [x] 2.2 创建 `internal/domain/billing_rule_test.go`：校验规则边界测试

## 3. 后端 Repository 层

- [x] 3.1 在 `internal/repository/interface.go` 添加 BillingRuleRepo 接口：FindByParkingLotID、FindByID、Create、Update
- [x] 3.2 创建 `internal/repository/dao/billing_rule_dao.go`：GORM 实现 BillingRuleRepo 接口
- [x] 3.3 创建 `internal/repository/dao/billing_rule_dao_test.go`：CRUD 操作和唯一约束测试

## 4. 后端 Service 层

- [x] 4.1 在 `internal/service/interface.go` 添加 BillingRuleService 接口：GetByParkingLotID、Update、Calculate
- [x] 4.2 创建 `internal/service/impl/billing_rule_service.go`：实现业务逻辑，含计费算法纯函数、审计日志记录
- [x] 4.3 创建 `internal/service/impl/billing_rule_service_test.go`：计费算法测试（免费停车、小时边界、向上取整、每日封顶、多日跨天、不封顶、零分钟、超长停留）

## 5. 后端 Handler 层

- [x] 5.1 在 `internal/handler/dto/` 添加计费规则 DTO：GetBillingRuleResponse、UpdateBillingRuleRequest、CalculateRequest、CalculateResponse
- [x] 5.2 创建 `internal/handler/billing_rule_handler.go`：实现 GET/PUT/POST 端点，含租户隔离校验
- [x] 5.3 创建 `internal/handler/billing_rule_handler_test.go`：HTTP 状态码、租户隔离、输入校验测试

## 6. 后端集成

- [x] 6.1 更新 `internal/wire/providers.go`：添加 BillingRule 的 ProviderSet
- [x] 6.2 更新 `internal/wire/wire.go` 和运行 wire gen：注册 BillingRule 依赖
- [x] 6.3 更新 `internal/router/router.go`：注册 billing-rules 路由组（GET、PUT、POST /calculate）
- [x] 6.4 修改 `internal/service/impl/parking_lot_service.go`：在创建停车场时联动创建默认计费规则

## 7. API 文档

- [x] 7.1 更新 `parkhub-api/docs/openapi.yaml`：添加 billing-rules 相关端点和 schema 定义

## 8. 前端类型与 API 层

- [x] 8.1 创建 `parkhub-web/lib/billing-rules/types.ts`：BillingRule 接口、请求/响应类型
- [x] 8.2 创建 `parkhub-web/lib/billing-rules/api.ts`：getBillingRule、updateBillingRule、calculateFee API 函数
- [x] 8.3 创建 `parkhub-web/lib/billing-rules/hooks.ts`：React Query hooks（useBillingRule、useUpdateBillingRule、useCalculateFee）

## 9. 前端组件

- [x] 9.1 创建可复用的滑块+输入框双向绑定组件（SliderInput）
- [x] 9.2 实现计费规则页面 `app/(dashboard)/billing-rules/page.tsx`：停车场列表（左侧）+ 规则摘要卡片 + 编辑表单（右侧）+ 保存/重置按钮
- [x] 9.3 实现费用计算器弹窗组件：停车场选择、时间输入、计费明细展示
- [x] 9.4 处理空状态（无停车场）和 daily_cap=0 显示为"不封顶"
- [x] 9.5 平台管理员租户选择下拉框集成
