## Context

当前的 `cmd/server` 是旧单体架构的入口，连接单个 MySQL 数据库，通过 Wire 组装依赖，面向 HTTP/Gin 提供业务 API。

微服务重构目标架构需要一个**过渡单进程入口**（monolith），它在同一进程内运行所有 domain 服务，但使用目标架构的基础设施：5 个独立数据库（每个 domain 一个）、in-process gRPC 调用替代直接函数调用、OpenTelemetry 可观测性。`cmd/monolith` 不取代 `cmd/server`——两者在重构阶段并存，`cmd/server` 继续服务生产流量，`cmd/monolith` 在重构分支上验证架构。

## Goals / Non-Goals

**Goals:**
- `cmd/monolith` 能以 `make run-monolith` 启动并在 `/healthz` 返回 HTTP 200
- 5 个数据库连接池在启动时全部 Ping 验证，任一失败则启动中止
- in-process gRPC server 骨架就位，可供阶段 1 Domain Service 注册
- OpenTelemetry SDK 初始化（TracerProvider + MeterProvider），支持 OTLP/stdout 两种 exporter
- 优雅关闭：收到 SIGINT/SIGTERM 后，按序停止 HTTP server → gRPC server → 数据库连接池，超时 15s
- 每个数据库有对应的 `000_init.up.sql` 迁移文件（仅 CREATE DATABASE，无表结构）

**Non-Goals:**
- 不注册任何 gRPC service 实现（那是阶段 1 的工作）
- 不迁移现有业务代码到 `cmd/monolith`
- 不实现业务 HTTP API（`/healthz` 之外）
- 不配置 K8s / Docker Compose（Task 0.8 负责可观测性基础设施部署）
- 不替换现有 `cmd/server` 的生产流量

## Decisions

### 决策 1：新建 `cmd/monolith`，不修改 `cmd/server`

**选择**：新目录 `cmd/monolith/main.go`，与 `cmd/server` 并存。

**理由**：重构分支不能破坏旧入口。阶段 2 部署时才会以 `cmd/monolith` 替换 `cmd/server`，届时删除旧目录。

**备选**：在 `cmd/server` 内用 build tag 区分——拒绝，复杂度远高于并行目录。

---

### 决策 2：5 数据库 DSN 独立配置，而非共享一个连接池

**选择**：`MonolithConfig` 定义 `CoreDSN`、`IoTDSN`、`EventDSN`、`BillingDSN`、`PaymentDSN` 五个独立字段，对应五个 `*gorm.DB` 实例。

**理由**：目标架构每个 domain 拥有独立 schema，未来拆分时只需移走对应连接，其他 domain 无感知。共享连接池会在拆分时引入不必要的数据混合风险。

**备选**：单连接池 + 多 schema 前缀——拒绝，与目标架构相悖，且对 ORM 中间件的租户隔离逻辑产生干扰。

---

### 决策 3：in-process gRPC server 使用 bufconn

**选择**：gRPC server 绑定到 `net.Listener`（`bufconn.Listen` for tests，实际进程内用真实 port 但仅 loopback），对外不暴露 gRPC port（阶段 1 才决定是否暴露）。

**理由**：`bufconn` 让 in-process 调用完全走内存，延迟为零且不占端口。阶段 0 不需要外部客户端调用 gRPC，所以不对外绑定。

**备选**：直接函数调用（不用 gRPC）——拒绝，会绕过 interceptor（租户注入、OTel trace propagation），后续拆分时行为不一致。

---

### 决策 4：OTel Exporter 按环境切换

**选择**：`OTEL_EXPORTER_OTLP_ENDPOINT` 不为空时使用 OTLP exporter，否则 fallback 到 stdout（`stdouttrace`）。

**理由**：阶段 0 本地开发不依赖 Collector，设置 stdout fallback 确保没有 Collector 时也能启动；CI 中同样适用。

**备选**：强制要求 OTLP Collector——拒绝，会阻塞本地开发环境启动。

---

### 决策 5：`/healthz` 同步 Ping 所有 5 个数据库

**选择**：每次 `/healthz` 请求并发 Ping 5 个数据库，全部成功返回 `{"status":"ok"}`，任一失败返回 `{"status":"degraded","errors":[...]}` 和 HTTP 503。

**理由**：健康检查需要反映实时状态（非启动时的快照），K8s readiness probe 会周期调用。

**备选**：只在启动时 Ping，之后永远 200——拒绝，无法用于 readiness probe。

---

### 决策 6：迁移文件仅 CREATE DATABASE，不建表

**选择**：`migrations/<domain>/000_init.up.sql` 内容仅为 `CREATE DATABASE IF NOT EXISTS parkhub_<domain>;`，不建任何业务表。

**理由**：Task 0.7 目标是验证"能启动"，表结构在各 domain 阶段 1 搬迁时才定义。提前建表会与业务 PR 产生合并冲突。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| OTel SDK 版本与现有依赖冲突 | 先运行 `go get go.opentelemetry.io/otel@latest`，若冲突则 pin 到 `v1.x` 稳定版 |
| 5 个数据库启动时全都不可用（CI 环境） | `make run-monolith` 在 CI 中可配置 `SKIP_DB_PING=true` 跳过 Ping，`/healthz` 正常验收在集成测试环境执行 |
| in-process gRPC bufconn 与阶段 1 实现不兼容 | 阶段 0 只搭骨架，接口由 Task 0.9 的 `inprocess_registry.go` 定义；保持接口清晰即可 |
| 5 个 DB 连接池增加内存占用 | 各池设置 `MaxOpenConns=5, MaxIdleConns=2`（开发环境默认），生产环境按 domain 负载调整 |

## Open Questions

1. OTel 的 `ServiceName` 是否统一用 `parkhub-monolith` 还是按 domain 各自命名？（Task 0.8 接入时确认）
2. gRPC server 是否需要在阶段 0 对外暴露 port（例如方便 grpcurl 调试）？当前设计为不对外，如需改动请在 Task 0.9 issue 中讨论。
