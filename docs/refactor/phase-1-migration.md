# 阶段 1：业务逻辑搬迁

> **目标周期**：约 6 周（2026-05-05 ~ 2026-06-16）
> **核心目标**：按依赖倒序，把每个 domain 的业务逻辑从老代码搬到新架构
> **结束标志**：所有 domain 在 `cmd/monolith` 单进程内通过端到端测试
> **前置条件**：阶段 0 全部验收通过

## 一、阶段定位

阶段 1 是重构的"主体工程"。它的作用是：

1. **把验证过的业务逻辑搬到新架构**（不是重写，是搬迁）
2. **让新架构在单进程内完整跑起来**
3. **为阶段 2 的物理拆分做好准备**

⚠️ 核心纪律：**先搬迁，后优化，分两次 PR**。

## 二、通用搬迁模板（每个 domain 通用）

每个 domain 搬迁遵循相同的步骤模板。下面先给出通用模板，再按 domain 给出具体差异。

### 2.1 每个 domain 的标准步骤

```
Step 1：创建 domain 目录骨架
Step 2：搬迁 Domain 层（实体、枚举、值对象）
Step 3：搬迁 Repository 层（接入 WithTenant 中间件）
Step 4：搬迁 Service 层（业务逻辑）
Step 5：实现 gRPC Server（适配 proto 接口）
Step 6：保留 REST Handler（作为 gRPC 的 HTTP 适配层）
Step 7：注册到 cmd/monolith
Step 8：编写单元测试 + 租户隔离测试
Step 9：端到端冒烟测试
Step 10：Code Review + 合并
```

### 2.2 搬迁纪律（重申）

| ✅ 做 | ❌ 不做 |
|-------|--------|
| 保留业务规则原样搬 | 顺手改函数名/变量名 |
| 保留已修复 bug 的逻辑 | 顺手拆分大函数 |
| 用 gRPC 接口替代直接调用 | 顺手改错误处理风格 |
| 每个 step 单独 PR | 把整个 domain 一次 PR 搬完 |
| 用 WithTenant() 替代手动 WHERE | 直接复制老代码里的 WHERE |

### 2.3 每个 domain 的分支命名

```
refactor/phase-1/core
refactor/phase-1/iot
refactor/phase-1/event
refactor/phase-1/billing
refactor/phase-1/payment
refactor/phase-1/bff
```

所有分支从 `refactor/microservices` 拉出，PR 也合并回 `refactor/microservices`。

---

## 三、Domain 1：core（约 1.5 周）

**为什么第一个搬**：所有其他 domain 都依赖 core（鉴权、租户、停车场上下文）。core 不搬完，后面的都动不了。

**老代码位置 → 新位置映射**：

| 老位置 | 新位置 |
|--------|--------|
| `internal/domain/tenant.go` | `internal/domains/core/domain/tenant.go` |
| `internal/domain/user.go` | `internal/domains/core/domain/user.go` |
| `internal/domain/role.go` | `internal/domains/core/domain/role.go` |
| `internal/domain/parking_lot.go` | `internal/domains/core/domain/parking_lot.go` |
| `internal/domain/parking_space.go` | `internal/domains/core/domain/parking_space.go` |
| `internal/service/tenant_service.go` | `internal/domains/core/service/tenant_service.go` |
| `internal/service/user_service.go` | `internal/domains/core/service/user_service.go` |
| `internal/service/parking_lot_service.go` | `internal/domains/core/service/parking_lot_service.go` |
| `internal/repository/tenant_repository.go` | `internal/domains/core/repository/tenant_repository.go` |
| `internal/repository/user_repository.go` | `internal/domains/core/repository/user_repository.go` |
| `internal/repository/parking_lot_repository.go` | `internal/domains/core/repository/parking_lot_repository.go` |
| `internal/handler/tenant_handler.go` | `internal/domains/core/grpc/tenant_handler.go` |

### Task 1.core.1：目录骨架（0.5 天）

- [ ] 创建 `internal/domains/core/` 下所有子目录：`domain/`、`service/`、`repository/`、`grpc/`
- [ ] 创建 Wire ProviderSet 占位文件

**验收**：目录存在，编译不报错

### Task 1.core.2：搬迁 Domain 层（0.5 天）

- [ ] 搬迁实体：Tenant、User、Role、Permission、ParkingLot、ParkingSpace
- [ ] 搬迁枚举：UserRole、TenantStatus、ParkingLotStatus 等
- [ ] 搬迁值对象（如有）
- [ ] ⚠️ **不修改任何字段名或方法签名**
- [ ] 只修改 import 路径以适配新目录

**验收**：`go build ./internal/domains/core/domain/...` 通过

### Task 1.core.3：搬迁 Repository 层（1 天）

- [ ] 所有 Repository 继承 `BaseRepo`
- [ ] 所有查询方法改为通过 `WithTenant(ctx)` 获取 `*gorm.DB`
- [ ] **逐个检查**原代码中的 `WHERE tenant_id = ?` 是否被 `WithTenant` 正确替代
- [ ] 编写租户隔离测试：
  - 租户 A 创建的用户，租户 B 无法读取
  - 平台管理员可以读取所有
  - 跨租户更新返回 not found

**验收**：`go test ./internal/domains/core/repository/...` 全绿，包括隔离测试

### Task 1.core.4：搬迁 Service 层（1.5 天）

- [ ] 搬迁业务逻辑：TenantService、UserService、ParkingLotService
- [ ] 搬迁密码加密、JWT 签发等工具逻辑
- [ ] ⚠️ **不改业务规则**（如密码复杂度策略、JWT TTL 等）
- [ ] 跨域调用占位：如 Service 需要调用 IoT，暂用接口 + TODO 注释
- [ ] 编写单元测试（至少覆盖核心路径）

**验收**：`go test ./internal/domains/core/service/...` 全绿

### Task 1.core.5：实现 gRPC Server（1 天）

- [ ] 实现 `core.v1.TenantService` gRPC server
- [ ] 实现 `core.v1.UserService` gRPC server
- [ ] 实现 `core.v1.AuthService` gRPC server
- [ ] 实现 `core.v1.ParkingLotService` gRPC server
- [ ] gRPC Server 调用 Service 层，Service 层调用 Repository 层
- [ ] DTO 转换：proto message ↔ domain entity

**验收**：gRPC server 注册到 monolith，通过 gRPC reflection 可以看到已注册的服务

### Task 1.core.6：保留 REST Handler（0.5 天）

- [ ] 将旧的 REST handler 改造为 gRPC client 的包装
- [ ] REST endpoint → 调用 gRPC service → 返回 JSON
- [ ] ⚠️ **不改变 REST API 的 URL 和请求/响应格式**（前端暂时不动）

**验收**：通过 curl 调用 REST API，行为与搬迁前一致

### Task 1.core.7：注册到 monolith + 冒烟测试（0.5 天）

- [ ] Wire ProviderSet 注册
- [ ] `cmd/monolith` 启动时注册 core 的 gRPC server
- [ ] 冒烟测试脚本：
  - 创建租户 → 获取租户 → 更新租户
  - 创建用户 → 登录 → 获取 JWT
  - 创建停车场 → 获取停车场列表

**验收**：冒烟测试脚本全通过

### Task 1.core.8：Code Review + 合并（1 天）

- [ ] 提交 PR 到 `refactor/microservices`
- [ ] 2 个 reviewer（其中 1 个架构组成员）
- [ ] 修改 review 意见
- [ ] 合并

**验收**：PR 合并，CI 全绿

---

## 四、Domain 2：iot（约 1 周）

**依赖**：core（已搬完）

**老代码位置 → 新位置映射**：

| 老位置 | 新位置 |
|--------|--------|
| `internal/domain/device.go` | `internal/domains/iot/domain/device.go` |
| `internal/service/device_service.go` | `internal/domains/iot/service/device_service.go` |
| `internal/repository/device_repository.go` | `internal/domains/iot/repository/device_repository.go` |
| `internal/handler/device_handler.go` | `internal/domains/iot/grpc/device_handler.go` |

### Task 1.iot.1 ~ 1.iot.8

遵循通用模板，额外关注：

- **心跳相关**：心跳接收逻辑搬入 `internal/domains/iot/service/heartbeat_service.go`
  - 在线状态判定（< 60s 在线）逻辑原样保留
  - Redis 操作（在线状态缓存）原样保留
- **远程命令**：抬杆/落杆/重启逻辑搬入 `internal/domains/iot/service/command_service.go`
- **跨域调用**：
  - 需要查询停车场信息 → 通过 in-process gRPC 调用 `core.v1.ParkingLotService`
  - 心跳事件发布 → 先用 in-process 事件总线（阶段 2 换 Kafka）
- **租户隔离**：设备数据必须按 `tenant_id` 隔离

**验收标准**：设备 CRUD + 心跳上报 + 在线状态查询 + 远程命令下发 全部跑通

---

## 五、Domain 3：event（约 1 周）

**依赖**：core、iot

### Task 1.event.1 ~ 1.event.8

遵循通用模板，额外关注：

- **出入场记录**：搬入 `internal/domains/event/service/transit_service.go`
  - 入场/出场匹配逻辑原样保留
  - 「有入无出」「有出无入」异常检测逻辑原样保留
- **实时监控**：搬入 `internal/domains/event/service/monitor_service.go`
- **跨域调用**：
  - 需要查设备信息 → gRPC 调 `iot.v1.DeviceService`
  - 需要查停车场信息 → gRPC 调 `core.v1.ParkingLotService`
- **事件发布**：
  - `vehicle.entered` / `vehicle.exited` / `exit.detected` 通过 in-process 事件总线
  - ⚠️ **保留异常匹配的所有边界条件**（这是业务最复杂的部分）

**验收标准**：
- 入场 → 出场 → 自动匹配 → 触发计费事件
- 异常检测：有入无出、有出无入 能正确识别
- 按租户隔离：租户 A 看不到租户 B 的出入场记录

---

## 六、Domain 4：billing（约 1 周）

**依赖**：core、event

### Task 1.billing.1 ~ 1.billing.8

遵循通用模板，额外关注：

- **计费规则**：搬入 `internal/domains/billing/service/rule_service.go`
  - JSON 存储的规则体原样保留
  - 多段计费、阶梯费率、免费时长逻辑原样保留
  - ⚠️ **这是业务规则最密集的模块，任何改动都可能导致计费错误**
- **费用计算**：搬入 `internal/domains/billing/service/calculator_service.go`
  - ⚠️ **必须保留所有边界条件**（如跨天计费、封顶、免费时段）
- **跨域调用**：
  - 需要查出入场记录 → gRPC 调 `event.v1.TransitService`
  - 需要查停车场信息 → gRPC 调 `core.v1.ParkingLotService`
- **事件消费**：
  - 消费 `exit.detected` 事件 → 计算费用 → 发布 `billing.calculated`

**验收标准**：
- 给定出入场时间 + 计费规则 → 计算结果与老代码一致
- 计费规则 CRUD 正常
- 租户隔离：租户 A 的规则不会影响租户 B 的计费

---

## 七、Domain 5：payment（约 0.5 周）

**依赖**：core、billing

### Task 1.payment.1 ~ 1.payment.8

遵循通用模板，额外关注：

- **支付订单**：搬入 `internal/domains/payment/service/order_service.go`
  - 状态机逻辑原样保留
- **支付对接**：搬入 `internal/domains/payment/service/payment_service.go`
  - 微信/支付宝回调处理原样保留
- **优惠券**：搬入 `internal/domains/payment/service/coupon_service.go`
  - 核销、防重复逻辑原样保留
- **跨域调用**：
  - 需要查账单 → gRPC 调 `billing.v1.CalculatorService`
  - 支付完成后 → 发布 `payment.completed` 事件
- **安全**：支付相关的日志不能包含完整卡号/密钥

**验收标准**：
- 支付订单创建 → 支付回调 → 订单状态更新
- 优惠券核销
- 租户隔离

---

## 八、Domain 6：bff（约 0.5 周）

**依赖**：所有其他 domain

### Task 1.bff.1：BFF 聚合实现

BFF 是最后做的，因为需要等所有 domain 的 gRPC 接口就绪。

- [ ] 创建 `internal/bff/` 目录结构
- [ ] 实现聚合接口：
  - `MonitorService.GetDashboard` → 聚合 iot + event + core
  - `ParkingLotService.GetDetail` → 聚合 core + iot + event
  - `ExitFlowService.GetExitOrder` → 聚合 event + billing
- [ ] 实现 Connect-RPC server（对外）
- [ ] 内部通过 gRPC client 调用各 domain
- [ ] 错误转换：gRPC error → Connect-RPC error → 前端友好错误
- [ ] 短期缓存（Redis，10-60s TTL）

**验收标准**：
- 前端调用 BFF 接口能拿到聚合数据
- BFF 错误信息前端友好
- 链路追踪能贯穿 BFF → gRPC → 完整调用链

---

## 九、跨域事件总线（in-process）

阶段 1 期间，跨域事件通过 in-process 内存总线传递（不经过 Kafka）：

### 实现要求

- [ ] 在 `internal/pkg/bus/` 创建 `inprocess_bus.go`
- [ ] 接口定义：
  ```go
  type EventBus interface {
      Publish(ctx context.Context, topic string, message proto.Message) error
      Subscribe(topic string, handler Handler) error
  }
  ```
- [ ] 发布和消费都携带 trace context
- [ ] 消费失败时 log error 但不 panic（确保不影响主流程）
- [ ] ⚠️ 这是临时实现，阶段 2 会被 Kafka 替代

### 事件流验证

搬迁完成后，验证完整事件流：

```
设备上报 → iot 发布 device.event
         → event 消费，创建出入场记录
         → event 发布 exit.detected
         → billing 消费，计算费用
         → billing 发布 billing.calculated
         → payment 消费，创建支付订单
```

**验收**：完整流程在 `cmd/monolith` 单进程内跑通

---

## 十、端到端集成测试（贯穿全阶段）

### 测试范围

每个 domain 搬完都要跑的端到端测试：

| 测试场景 | 涉及 domain | 优先级 |
|----------|------------|--------|
| 租户 + 用户 + 登录 | core | P0 |
| 停车场 + 设备管理 | core + iot | P0 |
| 入场 → 出场 → 计费 → 支付 | core + iot + event + billing + payment | P0 |
| 异常匹配（有入无出） | event | P0 |
| 优惠券核销 | billing + payment | P1 |
| 实时监控 | iot + event | P1 |
| BFF 聚合查询 | bff + all | P1 |
| 租户隔离（跨租户不可见） | all | P0 |

### 测试基础设施

- [ ] 使用 Docker Compose 启动 MySQL + Redis
- [ ] 测试数据在 `testdata/` 中维护
- [ ] CI 中自动运行端到端测试

---

## 十一、阶段 1 验收标准（汇总）

- [ ] 5 个 domain + BFF 全部搬完
- [ ] 所有 domain 在 `cmd/monolith` 单进程内运行
- [ ] 单元测试覆盖率 ≥ 70%
- [ ] 每个 Repository 都有租户隔离测试用例
- [ ] 端到端集成测试全绿（至少 P0 场景）
- [ ] REST API 行为与搬迁前一致
- [ ] in-process 事件总线跑通完整流程
- [ ] 可观测性：每个 gRPC 调用都有 trace
- [ ] 所有 PR 经过 2 人 review
- [ ] CI 全绿
- [ ] 架构组签字

---

## 十二、关键风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 业务规则搬迁遗漏 | 计费/匹配错误 | 搬迁前记录所有业务规则清单，搬迁后逐项验证 |
| 跨域调用设计不当 | 循环依赖 | gRPC 单向调用，事件总线解耦写路径 |
| REST 兼容层不完整 | 前端调用失败 | 逐个 endpoint 对比测试 |
| in-process 事件总线不稳定 | 事件丢失 | 搬完即测，不依赖"以后会好的" |
| 测试数据准备不足 | 漏测边界情况 | 从老代码的测试中提取数据 |
| 团队疲劳 | 第 4-5 周低谷 | 每个 domain 完成后简短庆祝，保持节奏感 |
| 搬迁顺序依赖卡住 | core 没搬完，后面全卡 | core 最优先，可加人 |
