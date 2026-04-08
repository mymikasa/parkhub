## 1. 依赖与配置

- [x] 1.1 在 `go.mod` 中添加 OTel SDK 依赖：`go.opentelemetry.io/otel`、`go.opentelemetry.io/otel/trace`、`go.opentelemetry.io/otel/sdk`、`go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc`、`go.opentelemetry.io/otel/exporters/stdout/stdouttrace`、`go.opentelemetry.io/contrib/instrumentation/runtime`
- [x] 1.2 在 `go.mod` 中添加 `google.golang.org/grpc/interop/grpc_testing` / `bufconn` 依赖（如尚未引入）
- [x] 1.3 创建 `internal/monolith/config/config.go`：定义 `MonolithConfig` struct，字段包括 `AppPort`、`LogLevel`、`AppEnv`、`JWTSecret`、各 domain 的 DSN（`CoreDSN`、`IoTDSN`、`EventDSN`、`BillingDSN`、`PaymentDSN`）、各 domain 的连接池上限、`OTELEndpoint`；实现 `Load() (*MonolithConfig, error)`，Missing required vars 一次性汇报所有缺失字段

## 2. 数据库连接池

- [x] 2.1 创建 `internal/monolith/bootstrap/databases.go`：实现 `InitDatabases(cfg *MonolithConfig) (map[string]*gorm.DB, func(), error)`，初始化 5 个命名 `*gorm.DB` 实例，每个池设置 `MaxOpenConns`、`MaxIdleConns`、`ConnMaxLifetime`
- [x] 2.2 在 `InitDatabases` 中并发 Ping 全部 5 个数据库，任一 Ping 失败立即返回带 domain 名的 error，cleanup func 关闭已成功打开的连接池
- [x] 2.3 创建 5 个迁移文件：
  - `migrations/core/000_init.up.sql` → `CREATE DATABASE IF NOT EXISTS parkhub_core CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  - `migrations/iot/000_init.up.sql`
  - `migrations/event/000_init.up.sql`
  - `migrations/billing/000_init.up.sql`
  - `migrations/payment/000_init.up.sql`
- [x] 2.4 在 `InitDatabases` 中，每个数据库 Ping 前先以 root 连接执行对应 `000_init.up.sql`（使用 `db.Exec()`，内容直接编译进二进制）

## 3. OpenTelemetry 初始化

- [x] 3.1 创建 `internal/monolith/bootstrap/otel.go`：实现 `InitOTel(ctx context.Context, cfg *MonolithConfig) (func(context.Context) error, error)`，返回 shutdown 函数
- [x] 3.2 在 `InitOTel` 中，根据 `cfg.OTELEndpoint` 是否为空选择 OTLP gRPC exporter 或 stdout exporter
- [x] 3.3 配置 `TracerProvider`，`ServiceName=parkhub-monolith`，`ServiceVersion=0.0.1`，注册为全局 provider
- [x] 3.4 配置 `MeterProvider`，注册为全局 provider，启动 `runtime` instrumentation（采样间隔 10s）
- [x] 3.5 安装 W3C TraceContext propagator：`otel.SetTextMapPropagator(propagation.TraceContext{})`

## 4. In-process gRPC Server

- [x] 4.1 创建 `internal/monolith/bootstrap/grpcserver.go`：实现 `InitGRPCServer() (*grpc.Server, *bufconn.Listener)`，安装 tenant interceptor + OTel server interceptor
- [x] 4.2 在 `grpcserver.go` 中将 `*bufconn.Listener` 封装进 `internal/pkg/grpcx/` 供阶段 1 的 in-process registry 使用（创建 `inprocess_registry.go` 占位文件，暴露 `GetBufconnDialer()` 函数）
- [x] 4.3 在单独 goroutine 中调用 `grpcServer.Serve(bufconn)` 启动 gRPC server

## 5. /healthz 端点

- [x] 5.1 创建 `internal/monolith/health/handler.go`：实现 `Handler` struct，持有 `map[string]*gorm.DB`
- [x] 5.2 在 `Handler.ServeHTTP` 中并发 Ping 5 个数据库，3 秒超时；组装 JSON 响应：`{"status":"ok"|"degraded","databases":{...}}`；健康返回 200，降级返回 503；始终设置 `Content-Type: application/json`
- [x] 5.3 在路由注册时跳过 OTel HTTP middleware，确保 `/healthz` 不产生 trace spans（直接使用 `net/http.ServeMux` 注册该路由，bypass OTel handler wrapper）

## 6. main.go 组装与 Makefile

- [x] 6.1 创建 `cmd/monolith/main.go`：按照 design.md 规定的顺序调用各 bootstrap 函数，启动 HTTP server，监听 `SIGINT`/`SIGTERM`，执行 15 秒超时的有序关闭（HTTP → gRPC → DB → OTel）
- [x] 6.2 实现优雅关闭：收到 OS signal 后用 `context.WithTimeout(15s)` 驱动关闭序列；超时后 log `"shutdown deadline exceeded"` 并 `os.Exit(1)`
- [x] 6.3 更新 `Makefile`：`build-monolith` 目标指向 `./cmd/monolith`；`run-monolith` 目标依赖 `build-monolith` 后执行 `./bin/monolith`

## 7. 验收测试

- [x] 7.1 本地启动验证：配置 5 个本地 MySQL 数据库的 DSN，运行 `make run-monolith`，确认进程启动后输出 `"monolith started"` 日志
- [x] 7.2 健康检查验证：`curl http://localhost:8080/healthz` 返回 HTTP 200 和 `{"status":"ok",...}` JSON
- [x] 7.3 优雅关闭验证：向进程发送 `SIGTERM`，确认日志输出关闭序列并进程以 0 退出
- [x] 7.4 OTel stdout 验证：不设置 `OTEL_EXPORTER_OTLP_ENDPOINT`，访问 `/healthz` 后确认 stdout 输出 span JSON（route 不含 `/healthz` span）
- [x] 7.5 缺失 DSN 验证：取消任一 DSN 环境变量，确认启动失败并日志明确指出哪个 DSN 缺失
