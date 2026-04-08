## Why

阶段 0 的重构骨架需要一个可运行的单进程入口（monolith），用于在**不拆分任何业务逻辑**的前提下，验证目标架构的关键基础设施——5 个独立数据库连接池、in-process gRPC 注册机制、OpenTelemetry 初始化——能够在同一进程中协同启动并对外提供健康检查。现有的 `cmd/server` 是旧单体架构，不能直接复用。

## What Changes

- **新增** `cmd/monolith/main.go`：目标架构的单进程入口，替代旧 `cmd/server` 进入重构分支
- **新增** `internal/monolith/config/config.go`：扩展配置，支持 5 个数据库 DSN（core、iot、event、billing、payment）及 OTel 采样配置
- **新增** `internal/monolith/bootstrap/databases.go`：初始化 5 个独立的 `*gorm.DB` 连接池（含 Ping 验证）
- **新增** `internal/monolith/bootstrap/grpcserver.go`：初始化 in-process gRPC server（不注册任何 service）
- **新增** `internal/monolith/bootstrap/otel.go`：初始化 OpenTelemetry SDK（TracerProvider + MeterProvider）
- **新增** `internal/monolith/health/handler.go`：`/healthz` HTTP 端点，汇聚 5 个数据库的 Ping 状态
- **新增** 迁移文件（每个数据库各 1 个 init 文件）：
  - `migrations/core/000_init.up.sql`
  - `migrations/iot/000_init.up.sql`
  - `migrations/event/000_init.up.sql`
  - `migrations/billing/000_init.up.sql`
  - `migrations/payment/000_init.up.sql`
- **更新** `Makefile`：`make run-monolith` / `make build-monolith` 指向新入口

## Capabilities

### New Capabilities

- `monolith-entrypoint`：`cmd/monolith` 的完整启动/关闭生命周期，涵盖配置加载、依赖初始化顺序、优雅关闭流程
- `multi-database-pool`：5 个命名数据库连接池的初始化、验证与健康上报
- `inprocess-grpc-server`：可被阶段 1 服务注册复用的 in-process gRPC server 骨架
- `otel-bootstrap`：OpenTelemetry TracerProvider / MeterProvider 的 SDK 初始化封装
- `healthz-endpoint`：`/healthz` HTTP 端点，聚合所有依赖的就绪状态

### Modified Capabilities

- `server-bootstrap`：数据库连接池初始化从单库扩展到 5 库；迁移目录结构从 `migrations/` 拆分为 `migrations/<domain>/`

## Impact

- **新文件**：`cmd/monolith/`、`internal/monolith/`（不影响现有 `cmd/server` 的任何代码）
- **迁移目录**：需要在 `migrations/` 下新增 5 个子目录（现有目录结构不改动）
- **Makefile**：新增 `run-monolith`、`build-monolith` 目标（已存在但指向旧 `cmd/server`，需要修正指向）
- **依赖新增**：`go.opentelemetry.io/otel` SDK 系列包（若尚未引入）
- **不影响**：现有 `cmd/server`、`internal/handler`、`internal/service`、`internal/repository`
