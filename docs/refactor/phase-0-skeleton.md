# 阶段 0：架构骨架搭建

> **目标周期**：约 2 周（2026-04-21 ~ 2026-05-05）
> **核心目标**：搭好目标架构的"空壳"，验证关键技术决策，**不搬业务代码**
> **结束标志**：空壳能启动 + proto 通过 lint + 租户隔离 POC 全绿

## 一、阶段定位

阶段 0 是整个重构的"地基"。它的作用不是产出业务价值，而是：

1. **验证目标架构在工程上可行**（gRPC、Connect-RPC、buf、ORM 中间件）
2. **暴露关键技术风险**（特别是 MySQL 无 RLS 的租户隔离）
3. **建立后续阶段的基础设施**（CI、可观测性、目录结构）

⚠️ **绝对禁止**：在阶段 0 搬迁任何业务逻辑。哪怕只是"顺手把 user 模块也搬了"，都不允许。

## 二、前置条件 Checklist

阶段 0 启动前必须完成：

- [ ] [ADR-0001](../adr/0001-migrate-to-microservices.md) 已被架构组评审通过
- [ ] [target-architecture.md](./target-architecture.md) 已被团队 review
- [ ] [do-not-list.md](./do-not-list.md) 已被团队签字确认
- [ ] 业务方已签字确认功能冻结（书面）
- [ ] 创建长期分支 `refactor/microservices`
- [ ] SRE 已开始 K8s 集群搭建（可并行）
- [ ] 团队完成 Connect-RPC + buf 工具链分享会

## 三、任务清单

### Task 0.1：创建分支与基础脚手架（0.5 天）

- [ ] 从 `main` 创建 `refactor/microservices` 长期分支
- [ ] 添加分支保护规则（禁止直推、强制 PR、强制 CI）
- [ ] 在 `parkhub-api/` 下创建空目录骨架：
  ```
  api/proto/
  cmd/
  internal/domains/
  internal/bff/
  internal/gen/  # 加入 .gitignore
  deploy/
  ```
- [ ] 更新根 `.gitignore` 添加 `internal/gen/`

**验收**：分支创建成功、目录结构存在、保护规则生效

---

### Task 0.2：搭建 buf 工具链（0.5 天）

- [ ] 安装 buf CLI
- [ ] 创建 `buf.yaml` 配置文件（lint 规则 STANDARD）
- [ ] 创建 `buf.gen.yaml` 配置文件（go + connect-go 插件）
- [ ] 在 `Makefile` 中添加：
  - `make proto-lint` → `buf lint`
  - `make proto-breaking` → `buf breaking --against ...`
  - `make proto-gen` → `buf generate`
- [ ] 在 CI 流水线中添加 `proto-lint` 步骤

**验收**：`make proto-lint` 在空 proto 目录下能正常运行（不报错也不警告）

---

### Task 0.3：定义所有 domain 的 proto 接口骨架（3 天）

⚠️ **范围**：只定义 RPC 方法签名 + Request/Response 消息结构，**不实现任何业务逻辑**。

按 domain 分别提交 PR：

- [ ] PR-0.3.1：`api/proto/common/v1/*.proto`（共享类型：Pagination、Money、TenantContext）
- [ ] PR-0.3.2：`api/proto/core/v1/*.proto`（Tenant、User、Auth、ParkingLot）
- [ ] PR-0.3.3：`api/proto/iot/v1/*.proto`（Device、Heartbeat、Command）
- [ ] PR-0.3.4：`api/proto/event/v1/*.proto`（Transit、Monitor、Anomaly）
- [ ] PR-0.3.5：`api/proto/billing/v1/*.proto`（Rule、Calculator）
- [ ] PR-0.3.6：`api/proto/payment/v1/*.proto`(Order、Payment、Coupon)
- [ ] PR-0.3.7：`api/proto/bff/v1/*.proto`（Monitor、ParkingLot、ExitFlow 聚合接口）

每个 PR 必须：
- 通过 `buf lint`
- 包含至少 1 个 service + 5 个 RPC 方法
- 字段命名严格遵循规范（详见 [target-architecture.md §4.2](./target-architecture.md#42-命名约定)）

**验收**：所有 proto 通过 lint，`buf generate` 能正确生成 Go 代码

---

### Task 0.4：实现租户上下文与中间件（1 天）

- [ ] 创建 `internal/pkg/tenant/context.go`：
  - `TenantInfo` 结构
  - `FromContext()` / `WithContext()`
  - `MustFromContext()`（缺失时 panic）
- [ ] 创建 `internal/pkg/db/base_repo.go`：
  - `BaseRepo.WithTenant(ctx)` 强制注入 `tenant_id`
  - 平台管理员白名单逻辑
- [ ] 创建 gRPC interceptor `internal/pkg/grpcx/tenant_interceptor.go`：
  - 从 metadata 解析 `x-tenant-id`、`x-user-role`
  - 注入 `TenantInfo` 到 context
  - 平台管理员角色识别
- [ ] 编写单元测试覆盖：
  - 缺失租户 panic
  - 普通用户被注入过滤
  - 平台管理员不被过滤
  - 平台管理员显式跨租户访问

**验收**：所有单元测试通过，`go test ./internal/pkg/tenant/... ./internal/pkg/db/...` 全绿

---

### Task 0.5：实现自定义 Linter（租户绕过检测）（1.5 天）

- [ ] 选型：基于 `golang.org/x/tools/go/analysis` 实现
- [ ] 检测规则：
  - 禁止在 `internal/domains/*/repository/` 包外访问 `*gorm.DB` 类型
  - 禁止在 Repository 内部直接调用 `r.db.Where()`，必须经过 `r.WithTenant()`
  - 检测 `db.Raw()` / `db.Exec()` 调用，要求注释 `//nolint:tenant-bypass`
- [ ] 集成到 `Makefile`：`make lint-tenant`
- [ ] 集成到 CI：阻止违规 PR 合并
- [ ] 在 `internal/pkg/db/base_repo_test.go` 旁边写一个**故意违规**的文件验证 linter 工作

**验收**：linter 能检测出故意写的违规代码，CI 上违规 PR 被阻止

---

### Task 0.6：租户隔离 POC（1 天）🚨 **最关键任务**

这是阶段 0 的核心验证任务。

- [ ] 创建 POC 目录 `internal/pkg/db/poc_test/`
- [ ] 准备 2 个测试租户的数据（A、B）
- [ ] 用 `BaseRepo` 实现一个 `ParkingLotRepo` 示例
- [ ] 编写测试用例覆盖：
  - **场景 1**：A 租户用户调用 `ListParkingLots()`，只能看到 A 的数据
  - **场景 2**：B 租户用户调用 `ListParkingLots()`，只能看到 B 的数据
  - **场景 3**：A 租户用户尝试 `GetParkingLot(B 的 ID)`，返回 not found
  - **场景 4**：平台管理员调用 `ListParkingLots()`，看到 A+B 的数据
  - **场景 5**：缺失租户 context 时，调用 panic
  - **场景 6**：复杂查询（JOIN、子查询、聚合）也能正确隔离
  - **场景 7**：分页查询不会泄露其他租户数据
- [ ] **运行 5 次确保稳定**
- [ ] 输出 POC 报告 `docs/refactor/phase-0-tenant-poc-report.md`

**验收**：所有 7 个场景测试通过，POC 报告归档

⚠️ **如果 POC 失败**：暂停阶段 0，召集架构组重新讨论租户隔离方案。

---

### Task 0.7：搭建 cmd/monolith 单进程入口（1 天）

- [ ] 创建 `cmd/monolith/main.go`
- [ ] 实现：
  - 加载配置
  - 初始化数据库连接（**5 个 database 连接池**：core、iot、event、billing、payment）
  - 初始化 OpenTelemetry
  - 初始化 in-process gRPC server（先不注册任何 service）
  - 注册健康检查 endpoint `/healthz`
  - 优雅关闭
- [ ] 创建 5 个空 database 的初始化迁移：
  - `migrations/core/000_init.up.sql` → `CREATE DATABASE IF NOT EXISTS parkhub_core;`
  - 同上为 iot/event/billing/payment
- [ ] 验证 `make run-monolith` 可启动并响应健康检查

**验收**：`curl http://localhost:8080/healthz` 返回 200

---

### Task 0.8：搭建可观测性基础设施（2 天）

由 SRE 主导，后端开发协作。详细规范见 [phase-0-task-0.8-observability-spec.md](./phase-0-task-0.8-observability-spec.md)。

- [x] 部署 OpenTelemetry Collector（开发环境用 Docker Compose）
- [x] 部署 VictoriaMetrics（开发环境用 Docker Compose）
- [x] 部署 Tempo（链路追踪）
- [x] 部署 Loki（日志）
- [x] 部署 Grafana 并配置三个数据源
- [x] 在 `internal/pkg/otelx/` 实现 OTel SDK 初始化封装
- [x] 在 `cmd/monolith` 中接入 OTel
- [x] 创建 Grafana 基础 Dashboard 模板：
  - RED 指标（Request Rate / Errors / Duration）
  - Go runtime 指标
- [x] 验证：`cmd/monolith` 启动后能在 Grafana 看到指标和 trace（`make obs-verify`）

**验收**：Grafana 看到至少 1 个 trace（健康检查请求） + 基础 RED 指标

---

### Task 0.9：定义 in-process gRPC 注册机制（0.5 天）

为阶段 1 准备好"in-process 调用"的基础设施：

- [ ] 在 `internal/pkg/grpcx/` 创建 `inprocess_registry.go`
- [ ] 实现：
  - `Registry.Register(name, register)` 注册 gRPC service 到 in-process registry
  - `GetClient[T any](registry, name, factory)` 返回 in-process gRPC client
  - in-process 模式跳过真实网络，通过 bufconn 走完整 gRPC 栈
- [ ] 文档化使用方式

**验收**：阶段 1 搬迁时，`core` 的 service 调用 `iot` 的 service 通过这个机制完成

---

### Task 0.10：CI 流水线配置（1 天）

- [x] 在 `.github/workflows/refactor.yml` 创建重构分支专用流水线
- [x] 触发：push 到 `refactor/**` 分支或 PR 到 `refactor/microservices`
- [x] 步骤：
  1. `make proto-lint`
  2. `make proto-breaking`（与 base branch 比较）
  3. `go vet ./...`
  4. `make lint-tenant`
  5. `go test ./...`
  6. `make build-monolith`
- [x] 提供分支保护配置脚本 `parkhub-api/scripts/configure-refactor-branch-protection.sh`
  - required status checks：`Refactor Pipeline`
  - required approving reviews：2

**验收**：故意推一个会失败的 PR，CI 正确拦截

---

### Task 0.11：编写阶段 0 验收文档（0.5 天）

- [ ] 创建 `docs/refactor/phase-0-acceptance.md`
- [ ] 记录：
  - 完成的任务清单
  - POC 报告链接
  - 已知问题列表
  - 阶段 1 启动 checklist

**验收**：架构组评审通过，正式宣布阶段 0 完成

## 四、阶段 0 验收标准（汇总）

阶段 0 完成的硬性标志：

- [ ] 目标目录结构（`internal/domains/*` 等）搭建完成
- [ ] 所有 domain 的 proto 契约定义完成并通过 `buf lint`
- [ ] `cmd/monolith` 可以启动并通过冒烟测试
- [ ] OpenTelemetry、VictoriaMetrics、Grafana 基础设施就绪
- [ ] **租户隔离 POC 通过**：
  - ORM 中间件能拦截 100% 的 Repository 查询
  - 自定义 linter 能检测出绕过中间件的 SQL 调用
  - 跨租户隔离单元测试模板就位
  - 平台管理员白名单机制验证通过
- [ ] CI 流水线全绿
- [ ] 阶段 0 验收文档归档
- [ ] 架构组签字

## 五、关键风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 自定义 linter 难写 | 工期延长 | 参考 [go-critic](https://github.com/go-critic/go-critic) 实现，或简化为 grep + 正则 |
| 租户 POC 失败 | **阻塞重构** | **立即暂停**，召集架构组重新讨论租户隔离方案，可能需要引入 ProxySQL |
| K8s 进度滞后 | 不影响阶段 0 | 阶段 0 不需要 K8s，可以并行 |
| 团队对 buf 工作流不熟悉 | 工期延长 | 第一个 PR 由架构组成员示范 |

## 六、阶段 0 不做什么（重申）

- ❌ 不搬迁任何业务代码
- ❌ 不实现任何 gRPC service 的业务方法（只定义接口）
- ❌ 不接入 Kafka（阶段 2 才接入）
- ❌ 不部署到 K8s（阶段 2 才部署）
- ❌ 不修改任何现有的 `internal/handler` 或 `internal/service` 代码
- ❌ 不删除 `main` 分支上的任何代码

## 七、与下一阶段的衔接

阶段 0 完成后，立即启动 **阶段 1：业务逻辑搬迁**：

- 第一个搬迁的 domain 是 `core`（被所有人依赖）
- 搬迁分支命名：`refactor/phase-1/core`
- 详见 [phase-1-migration.md](./phase-1-migration.md)
