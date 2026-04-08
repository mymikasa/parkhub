# 阶段 0 验收文档

> **阶段**：Phase 0 - 架构骨架搭建
> **验收日期**：2026-04-08
> **当前状态**：待架构组评审 / 签字
> **对应分支**：`refactor/microservices`

## 一、验收结论

阶段 0 的工程目标已经落地：

- 目标目录骨架已建立
- proto 契约已定义并通过 `buf lint`
- `cmd/monolith` 单进程入口已就绪
- 租户隔离中间件、linter、POC 已完成
- 可观测性基础设施已接入
- refactor 专用 CI 已配置
- in-process gRPC 注册机制已就绪

当前剩余外部动作仅为：

- 架构组评审本验收文档
- 架构组签字确认阶段 0 结束
- 正式宣布进入阶段 1

## 二、任务完成清单

| Task | 状态 | 说明 |
|------|:----:|------|
| 0.1 创建分支与基础脚手架 | ✅ | `refactor/microservices` 分支、目录骨架、`.gitignore` 已就位 |
| 0.2 搭建 buf 工具链 | ✅ | `buf.yaml`、`buf.gen.yaml`、`make proto-lint/proto-breaking/proto-gen` 已就位 |
| 0.3 定义 proto 接口骨架 | ✅ | `common/core/iot/event/billing/payment/bff` proto 已落地并可生成 Go 代码 |
| 0.4 租户上下文与中间件 | ✅ | `tenant/context.go`、`db/base_repo.go`、`grpcx/tenant_interceptor.go` 及测试已完成 |
| 0.5 自定义 Linter | ✅ | `tenantcheck` analyzer、`make lint-tenant`、故意违规样例校验已完成 |
| 0.6 租户隔离 POC | ✅ | 7 类场景覆盖完成，稳定性验证通过，报告已归档 |
| 0.7 `cmd/monolith` 单进程入口 | ✅ | 配置、5 个 DB 连接池、OTel、健康检查、优雅关闭已完成 |
| 0.8 可观测性基础设施 | ✅ | OTel Collector、VictoriaMetrics、Tempo、Loki、Grafana、Dashboard 已完成 |
| 0.9 in-process gRPC 注册机制 | ✅ | `grpcx.Registry.Register`、`GetClient`、bufconn in-process 调用和测试已完成 |
| 0.10 CI 流水线配置 | ✅ | `.github/workflows/refactor.yml` 与分支保护脚本已完成 |
| 0.11 阶段 0 验收文档 | ✅ | 本文档 |

## 三、关键产物

### 3.1 核心代码与配置

- `parkhub-api/buf.yaml`
- `parkhub-api/buf.gen.yaml`
- `parkhub-api/cmd/monolith/main.go`
- `parkhub-api/internal/pkg/tenant/context.go`
- `parkhub-api/internal/pkg/db/base_repo.go`
- `parkhub-api/internal/pkg/grpcx/tenant_interceptor.go`
- `parkhub-api/internal/pkg/grpcx/inprocess_registry.go`
- `.github/workflows/refactor.yml`

### 3.2 POC 与配套文档

- 租户隔离 POC 报告：[phase-0-tenant-poc-report.md](./phase-0-tenant-poc-report.md)
- 阶段 0 任务骨架：[phase-0-skeleton.md](./phase-0-skeleton.md)
- 阶段 1 搬迁计划：[phase-1-migration.md](./phase-1-migration.md)

## 四、阶段 0 验收项回顾

| 验收项 | 状态 | 备注 |
|--------|:----:|------|
| 目标目录结构搭建完成 | ✅ | `internal/domains/*`、`internal/bff`、`api/proto`、`cmd`、`deploy` 已建立 |
| 所有 proto 契约完成并通过 lint | ✅ | `make proto-lint` 通过 |
| `cmd/monolith` 可启动并通过冒烟测试 | ✅ | 已确认 |
| OpenTelemetry / VictoriaMetrics / Grafana 基础设施就绪 | ✅ | 已确认 |
| 租户隔离 POC 通过 | ✅ | 详见 POC 报告 |
| CI 流水线全绿 | ✅ | 已确认 |
| 阶段 0 验收文档归档 | ✅ | 本文档 |