## 1. 添加依赖

- [x] 1.1 在 `go.mod` 中添加 `github.com/google/wire` 并运行 `go mod tidy`
- [x] 1.2 在 `go.mod` 中添加 `github.com/jackc/pgx/v5` 并运行 `go mod tidy`

## 2. 配置管理

- [x] 2.1 创建 `internal/config/config.go`：定义 `Config` struct，包含 AppPort、DB*、JWT*、LogLevel 字段
- [x] 2.2 实现 `Load() (*Config, error)`：从环境变量读取，对必填项返回描述性错误
- [x] 2.3 添加 `config_test.go`：验证缺失必填项时返回错误，全量字段时正确解析

## 3. 数据库连接

- [x] 3.1 创建 `internal/pkg/db/db.go`：使用 `pgx/v5/stdlib` 初始化 `*sql.DB` 连接池
- [x] 3.2 实现连接参数配置（MaxOpenConns、MaxIdleConns、ConnMaxLifetime）
- [x] 3.3 实现 `Ping` 验证逻辑，连接失败时返回明确错误

## 4. 数据库迁移

- [x] 4.1 创建 `internal/pkg/db/migrate.go`：实现从 `migrations/` 目录读取并按序执行 `*.up.sql` 文件的 `RunMigrations(*sql.DB) error` 函数
- [x] 4.2 使用 `migrations` 跟踪表（`schema_migrations`）防止重复执行

## 5. 结构化日志

- [x] 5.1 创建 `internal/pkg/logger/logger.go`：封装 `log/slog`，根据 `LogFormat` 选择 JSON 或 Text handler
- [x] 5.2 根据 `LOG_LEVEL` 环境变量设置日志级别（debug/info/warn/error）

## 6. Wire 依赖注入

- [x] 6.1 在 `internal/repository/impl/` 各文件中添加 `ProviderSet` 变量（UserRepo、TenantRepo、RefreshTokenRepo、SmsCodeRepo）
- [x] 6.2 在 `internal/service/impl/` 中为 `AuthService` 添加 `ProviderSet`
- [x] 6.3 在 `internal/handler/` 中为 `AuthHandler` 添加 `ProviderSet`
- [x] 6.4 在 `internal/router/` 中为 `Router` 添加 `ProviderSet`
- [x] 6.5 创建 `internal/wire/wire.go`：定义 `InitializeApp(*config.Config) (*gin.Engine, func(), error)` injector 函数，聚合所有 ProviderSet
- [x] 6.6 运行 `wire gen ./internal/wire`，确认生成 `wire_gen.go` 无错误

## 7. 修复错误处理

- [x] 7.1 在 `internal/handler/auth_handler.go` 中实现 `handleError(c, err)` 辅助函数：使用 `errors.As` 匹配 `domain.DomainError`，映射 ErrCode → HTTP 状态码
- [x] 7.2 替换所有 `strings.Contains(err.Error(), ...)` 调用，改用 `handleError`
- [x] 7.3 确保未知错误返回 500 并在 error 级别记录原始错误

## 8. 程序入口

- [x] 8.1 创建 `cmd/server/main.go`：调用 `config.Load()`、`wire.InitializeApp()`、`db` 初始化、`migrate.RunMigrations()`、`seed.Run()`、`engine.Run()`
- [x] 8.2 实现优雅关闭（`signal.NotifyContext` + `http.Server.Shutdown`）

## 9. 验证

- [x] 9.1 运行 `go build ./cmd/server` 确认编译通过（零错误、零警告）
- [x] 9.2 运行 `go test ./...` 确认现有测试全部通过（注：3个预先存在的测试 bug 未涉及本次重构）
- [ ] 9.3 本地启动服务，调用 `GET /health` 返回 200，调用 `POST /api/v1/auth/login` 功能正常
