## Context

parkhub-api 已实现完整的 Clean Architecture 分层（domain / service / repository / handler / middleware），但缺少将各层"粘合"在一起的基础设施代码，导致项目无法编译启动：

- 无 `cmd/server/main.go` 入口
- 无 Wire 依赖注入组装文件（`wire-guide.md` 已有完整文档，但未落地）
- 无配置管理包，JWT secret 等值散落在代码或需要手工传参
- 无数据库连接初始化逻辑
- Handler 错误处理使用 `strings.Contains(err.Error(), "...")` 字符串匹配，脆弱且难以维护

## Goals / Non-Goals

**Goals:**
- 让项目可以 `go build ./cmd/server` 并正常启动
- 用 Google Wire 完成编译时 DI，替代手工 `new(...)` 传参
- 统一配置管理（环境变量 → struct），与 `deployment.md` 保持一致
- 修复 Handler 中的字符串错误匹配，改为 `domain.ErrCode` 断言
- 添加结构化日志（标准库 `log/slog`，zero dependency）

**Non-Goals:**
- 不修改任何 API 接口（路径、请求/响应结构、状态码均不变）
- 不重写业务逻辑（service、repository 实现不动）
- 不添加新功能（限流、CORS 等留给后续迭代）
- 不引入第三方日志库（zap/zerolog 等）

## Decisions

### D1: Wire 而非手工 DI

**选择**：Google Wire（编译时代码生成）

**理由**：`wire-guide.md` 已有完整示例，团队已有上下文。Wire 生成的 `wire_gen.go` 可读性好，无反射开销，编译时报错。

**备选**：手工 main.go 串联 → 随层数增长维护成本指数级上升，拒绝。

### D2: 数据库驱动选择 `pgx/v5` via `database/sql`

**选择**：`github.com/jackc/pgx/v5/stdlib` 注册为 `database/sql` 驱动

**理由**：repository 实现已使用 `*sql.DB`，无需改动实现层；pgx 是 PostgreSQL 生产首选驱动。

**备选**：GORM → 引入 ORM 层会破坏现有 repository 实现，拒绝。

### D3: 配置管理使用 `os.Getenv` + 结构体，不引入第三方

**选择**：`internal/config/config.go` 手动读取环境变量并验证必填项

**理由**：依赖数量最小化，配置项已在 `deployment.md` 完整定义，无需 viper/envconfig 的额外复杂度。

### D4: 错误处理改为 `domain.ErrCode` 类型断言

**选择**：Handler 中 `switch err.(type)` 或 `errors.As(err, &domainErr)` 判断错误类型

**理由**：`domain/errors.go` 已定义完整的 ErrCode 体系（INVALID_CREDENTIALS、TOKEN_EXPIRED 等），直接使用即可。字符串匹配在错误消息变更时会静默失败。

### D5: 日志使用标准库 `log/slog`（Go 1.26+）

**选择**：`internal/pkg/logger/logger.go` 封装 slog，输出 JSON 格式

**理由**：go.mod 显示 Go 1.26，slog 已内置，零新依赖，JSON 格式适合生产环境日志采集。

## Risks / Trade-offs

- **Wire 代码生成需要 `//go:build wireinject` 标签**：在 CI 中需要先运行 `wire gen`，否则编译失败 → 缓解：将 `wire_gen.go` 提交进仓库，CI 直接编译即可
- **pgx 版本兼容性**：pgx v5 的 `stdlib` 包 API 与 v4 不同 → 缓解：go.mod 锁定 `pgx/v5`，不混用
- **config 必填项校验**：启动时 panic 比运行时报错更早失败 → 这是期望行为，快速失败优于隐蔽错误
- **slog JSON 在本地开发可读性差**：可通过 `APP_ENV=development` 切换为 TextHandler → 在 config 中预留 `LogFormat` 字段

## Migration Plan

1. 添加 Wire + pgx 依赖（`go get`）
2. 实现 `internal/config` → `internal/pkg/db` → `internal/pkg/logger`
3. 为各层添加 Wire ProviderSet
4. 创建 `internal/wire/wire.go`，运行 `wire gen ./internal/wire`
5. 创建 `cmd/server/main.go`，调用 Wire 初始化函数
6. 修复 `handler/auth_handler.go` 错误处理
7. `go build ./cmd/server` 验证编译通过
8. 运行现有测试确认零回归

**回滚**：所有变更均为新增文件或现有文件的局部修改，git revert 即可完整回滚。
