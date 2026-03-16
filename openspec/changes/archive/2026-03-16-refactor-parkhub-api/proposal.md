## Why

parkhub-api 的核心业务逻辑和数据层已就位，但缺少运行所必需的基础设施：没有程序入口（`cmd/server/main.go`）、没有依赖注入组装（Wire）、没有配置管理、Handler 错误处理依赖字符串匹配导致脆弱。重构的目标是在**零功能变更**的前提下，让代码可以真正编译并启动，同时提升可维护性。

## What Changes

- **新增** `cmd/server/main.go`：程序入口，负责加载配置、初始化依赖并启动 HTTP 服务
- **新增** `internal/config/config.go`：统一环境变量解析（DB、JWT、端口等），替代散落的硬编码值
- **新增** `internal/wire/wire.go` + `wire_gen.go`：使用 Google Wire 实现编译时依赖注入，按 `wire-guide.md` 文档落地
- **新增** `internal/pkg/db/db.go`：数据库连接池初始化（PostgreSQL/pgx），含迁移执行逻辑
- **修复** `internal/handler/auth_handler.go`：错误处理从字符串匹配改为 `domain.ErrCode` 类型断言，消除脆弱判断
- **新增** `internal/pkg/logger/logger.go`：结构化日志（slog），替换裸 `fmt.Println`

## Capabilities

### New Capabilities

- `server-bootstrap`：程序启动引导 — 配置加载、Wire 组装、DB 初始化、迁移、Seed、HTTP 监听全流程
- `error-handling`：基于 `domain.ErrCode` 的结构化错误映射，Handler 统一返回标准 JSON 错误响应

### Modified Capabilities

无需求级别的行为变更，仅实现层重构。

## Impact

- **go.mod**：新增 `github.com/google/wire`、`github.com/jackc/pgx/v5`（或 `database/sql` + pgx driver）
- **现有 API 接口**：完全向后兼容，所有端点路径/响应结构不变
- **测试**：`auth_service_test.go` 和 `jwt_test.go` 继续通过，无需修改
- **部署**：`deployment.md` 中的环境变量列表不变，新增 `DB_MAX_OPEN_CONNS`、`DB_MAX_IDLE_CONNS` 可选项
