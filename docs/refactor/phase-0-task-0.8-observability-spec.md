# Task 0.8 Spec：搭建可观测性基础设施

## 1. 背景与目标

### 1.1 为什么现在做

Task 0.7 完成了 `cmd/monolith` 的骨架——它能启动并响应 `/healthz`，但此时任何 gRPC 调用、数据库查询、中间件执行，都是"盲飞"状态。阶段 1 搬迁业务逻辑时需要：

- **快速定位回归**：新服务比旧服务慢在哪？
- **租户隔离验证**：某租户的请求是否有跨租户数据库调用？
- **性能基线**：搬迁前后的 p99 延迟对比

### 1.2 阶段 0 的收敛范围

| 信号 | 阶段 0 目标 | 阶段 1+ 补充 |
|------|------------|-------------|
| Traces | `/healthz` 可见；gRPC interceptor 自动 span | 业务方法 span、DB span |
| Metrics | Go runtime + HTTP RED | gRPC RED、DB pool、Kafka lag |
| Logs | slog → OTel Loki bridge | 结构化字段：tenant_id、trace_id 关联 |

---

## 2. 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│  cmd/monolith                                                │
│                                                              │
│  ┌────────────┐  OTLP/gRPC  ┌──────────────────────────┐    │
│  │ otelx.Init │ ──────────► │ OTel Collector            │    │
│  │            │             │   pipeline:               │    │
│  │ - TracerProvider         │     receivers: otlp       │    │
│  │ - MeterProvider          │     processors: batch     │    │
│  │ - LoggerProvider         │     exporters:            │    │
│  └────────────┘             │       prometheusremotewrite│    │
│                             │       otlp/tempo          │    │
│                             │       loki                │    │
│                             └──────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                        │ metrics   │ traces    │ logs
                        ▼           ▼           ▼
               VictoriaMetrics    Tempo        Loki
                        │           │           │
                        └─────────── Grafana ───┘
```

**开发环境**：全部组件通过 `docker-compose.observability.yml` 启动，不依赖 K8s。

---

## 3. 基础设施层：Docker Compose

### 3.1 文件位置

```
parkhub-api/deploy/observability/
├── docker-compose.observability.yml   # 启动命令
├── otelcol/
│   └── config.yaml                    # OTel Collector 配置
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── datasources.yaml       # 自动注册 VM + Tempo + Loki
│   │   └── dashboards/
│   │       └── dashboards.yaml        # 自动加载 dashboard JSON
│   └── dashboards/
│       ├── red-overview.json          # RED 指标看板
│       └── go-runtime.json            # Go runtime 看板
└── README.md                          # 本地启动说明
```

### 3.2 服务清单与端口

| 服务 | 镜像 | 端口（宿主机） | 作用 |
|------|------|--------------|------|
| `otelcol` | `otel/opentelemetry-collector-contrib:0.102.0` | `4317` (gRPC OTLP)<br>`4318` (HTTP OTLP)<br>`8888` (self-metrics) | 统一接入点 |
| `victoriametrics` | `victoriametrics/victoria-metrics:v1.101.0` | `8428` | 时序数据库 |
| `tempo` | `grafana/tempo:2.5.0` | `3200` (HTTP)<br>`4317` (OTLP gRPC，内部) | 链路追踪后端 |
| `loki` | `grafana/loki:3.0.0` | `3100` | 日志后端 |
| `grafana` | `grafana/grafana:11.1.0` | `3000` | 可视化 |

> 端口 `4317` 被 Collector 占用，Tempo 的 OTLP 端口仅用于 Collector→Tempo 内部通信（走 Docker network）。

### 3.3 `docker-compose.observability.yml` 关键配置

```yaml
services:
  otelcol:
    image: otel/opentelemetry-collector-contrib:0.102.0
    command: ["--config=/etc/otelcol/config.yaml"]
    volumes:
      - ./otelcol/config.yaml:/etc/otelcol/config.yaml:ro
    ports:
      - "4317:4317"   # OTLP gRPC（供 monolith SDK 上报）
      - "4318:4318"   # OTLP HTTP（可选）
    depends_on: [victoriametrics, tempo, loki]

  victoriametrics:
    image: victoriametrics/victoria-metrics:v1.101.0
    command:
      - "-storageDataPath=/data"
      - "-retentionPeriod=7d"
    ports: ["8428:8428"]
    volumes: [vm-data:/data]

  tempo:
    image: grafana/tempo:2.5.0
    command: ["-config.file=/etc/tempo/tempo.yaml"]
    ports: ["3200:3200"]

  loki:
    image: grafana/loki:3.0.0
    command: ["-config.file=/etc/loki/loki.yaml"]
    ports: ["3100:3100"]

  grafana:
    image: grafana/grafana:11.1.0
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: "true"
      GF_AUTH_ANONYMOUS_ORG_ROLE: "Admin"
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
    ports: ["3000:3000"]
    depends_on: [victoriametrics, tempo, loki]
```

### 3.4 OTel Collector 配置 (`otelcol/config.yaml`)

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 512
  memory_limiter:
    check_interval: 1s
    limit_mib: 256

exporters:
  prometheusremotewrite:
    endpoint: http://victoriametrics:8428/api/v1/write
    tls:
      insecure: true

  otlp/tempo:
    endpoint: http://tempo:4317
    tls:
      insecure: true

  loki:
    endpoint: http://loki:3100/loki/api/v1/push
    default_labels_enabled:
      exporter: false
      job: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loki]
```

### 3.5 Makefile 命令

```makefile
.PHONY: obs-up obs-down obs-ps

obs-up:
	docker compose -f deploy/observability/docker-compose.observability.yml up -d

obs-down:
	docker compose -f deploy/observability/docker-compose.observability.yml down

obs-ps:
	docker compose -f deploy/observability/docker-compose.observability.yml ps
```

---

## 4. Go SDK 层：`internal/pkg/otelx/`

### 4.1 新增 Go 依赖

需要在 `go.mod` 中添加：

```
go.opentelemetry.io/otel                          v1.28.0
go.opentelemetry.io/otel/sdk                      v1.28.0
go.opentelemetry.io/otel/sdk/metric               v1.28.0
go.opentelemetry.io/otel/sdk/log                  v0.4.0
go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc  v1.28.0
go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc    v1.28.0
go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc        v0.4.0
go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc  v0.53.0
go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp       v0.53.0
go.opentelemetry.io/contrib/bridges/otelslog                        v0.3.0
```

### 4.2 目录结构

```
internal/pkg/otelx/
├── otelx.go          # Init() / Shutdown() 主入口
├── config.go         # Config 结构体（从环境变量读取）
└── otelx_test.go     # 集成测试（使用内存 exporter 验证，不依赖真实 Collector）
```

### 4.3 `config.go`

```go
package otelx

// Config 控制 OTel SDK 行为，由 cmd/monolith 从环境变量注入。
type Config struct {
    // ServiceName 标识服务，出现在所有信号的 service.name resource attribute
    // 默认：parkhub-monolith
    ServiceName string

    // ServiceVersion 对应 git tag，出现在 service.version
    // 默认：dev
    ServiceVersion string

    // OTLPEndpoint 是 OTel Collector 的 gRPC 地址（不带 scheme）
    // 默认：localhost:4317
    OTLPEndpoint string

    // Insecure 是否跳过 TLS（开发环境 true）
    Insecure bool

    // TraceSampleRate 采样率，1.0 = 100%，生产环境建议 0.1
    TraceSampleRate float64
}
```

对应环境变量（新增到现有 config 体系）：

| 环境变量 | 类型 | 默认值 |
|---------|------|-------|
| `OTEL_SERVICE_NAME` | string | `parkhub-monolith` |
| `OTEL_SERVICE_VERSION` | string | `dev` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | string | `localhost:4317` |
| `OTEL_EXPORTER_OTLP_INSECURE` | bool | `true` |
| `OTEL_TRACES_SAMPLER_ARG` | float64 | `1.0` |

### 4.4 `otelx.go` 接口设计

```go
package otelx

import "context"

// Providers 持有初始化完成的三个 Provider，用于 Shutdown。
type Providers struct {
    TracerProvider  *sdktrace.TracerProvider
    MeterProvider   *sdkmetric.MeterProvider
    LoggerProvider  *sdklog.LoggerProvider
}

// Init 初始化 OpenTelemetry SDK，将全局 TracerProvider / MeterProvider
// 设置为 OTLP 导出器，并将 slog 默认 logger bridge 到 OTel LoggerProvider。
//
// 调用方需要在进程退出前调用 Providers.Shutdown(ctx) 确保 flush。
func Init(ctx context.Context, cfg Config) (*Providers, error)

// Shutdown 优雅关闭三个 Provider，flush 所有缓冲数据。
// 应在 cmd/monolith 的优雅关闭序列中调用，超时建议 5s。
func (p *Providers) Shutdown(ctx context.Context) error
```

### 4.5 `Init()` 内部实现要点

```
Init()
 ├── 1. 构建 Resource
 │       service.name, service.version, deployment.environment
 │       host.name (os.Hostname)
 │
 ├── 2. 初始化 Trace Exporter
 │       otlptracegrpc.New(ctx, endpoint, insecure)
 │       sdktrace.NewTracerProvider(
 │           WithBatcher(exporter),
 │           WithResource(resource),
 │           WithSampler(TraceIDRatioBased(cfg.TraceSampleRate)),
 │       )
 │       otel.SetTracerProvider(tp)
 │       otel.SetTextMapPropagator(
 │           propagation.NewCompositeTextMapPropagator(
 │               propagation.TraceContext{},   // W3C Trace Context
 │               propagation.Baggage{},
 │           ),
 │       )
 │
 ├── 3. 初始化 Metric Exporter
 │       otlpmetricgrpc.New(ctx, endpoint, insecure)
 │       sdkmetric.NewMeterProvider(
 │           WithReader(PeriodicReader(exporter, interval=15s)),
 │           WithResource(resource),
 │       )
 │       global.SetMeterProvider(mp)
 │
 └── 4. 初始化 Log Exporter
         otlploggrpc.New(ctx, endpoint, insecure)
         sdklog.NewLoggerProvider(
             WithProcessor(BatchProcessor(exporter)),
             WithResource(resource),
         )
         // Bridge：将 slog default logger 桥接到 OTel
         // 之后所有 slog.Info/Error 自动携带 trace_id / span_id
         slog.SetDefault(
             slog.New(otelslog.NewHandler("parkhub", logProvider)),
         )
```

**关键设计决策：slog bridge 调用顺序**

现有 `internal/pkg/logger/logger.go` 的 `Init()` 若在 `otelx.Init()` 之后调用会覆盖 default logger。因此：

- `logger.Init()` 必须在 `otelx.Init()` **之前**调用（仅作为启动阶段临时日志）
- `otelx.Init()` 完成后接管 slog default logger（OTel bridge）
- 后续重构 `logger.Init()` 接受外部 handler 的工作记录为 TODO，不在本 Task 做

### 4.6 `otelx_test.go` 测试策略

使用 `go.opentelemetry.io/otel/sdk/trace/tracetest` 提供的内存 exporter，**不依赖真实 Collector**：

```go
// 验证 Init() 返回无错误
// 验证 otel.GetTracerProvider() 不再是 noop provider
// 验证 Shutdown() 在 5s 内完成且无错误
// 验证 slog.Default() 已被替换为 OTel bridge handler
```

---

## 5. cmd/monolith 接入层

### 5.1 启动序列修改

```
main()
 ├── 1. 加载配置（现有）
 ├── 2. logger.Init()（临时 slog，仅用于 otelx 初始化前的启动日志）
 ├── 3. otelx.Init(ctx, otelCfg)   ← 新增
 │       成功后 slog default 被替换为 OTel bridge
 │       失败时 fatal log + 退出（可观测性不可降级）
 ├── 4. 初始化数据库连接（现有 / Task 0.7）
 ├── 5. 初始化 gRPC server（现有 / Task 0.7）
 ├── 6. 注册 HTTP handler（含 /healthz）
 │       /healthz 使用 otelhttp.NewHandler() 包裹，产生 trace
 ├── 7. 启动 HTTP server
 └── 优雅关闭序列：
       ├── HTTP server.Shutdown(ctx)
       ├── gRPC server.GracefulStop()
       ├── DB close
       └── otelProviders.Shutdown(shutdownCtx)   ← 必须最后调用，确保 flush
```

### 5.2 `/healthz` trace 自动注入

```go
// 在路由注册时包裹 otelhttp middleware
mux.Handle("/healthz", otelhttp.NewHandler(
    http.HandlerFunc(healthzHandler),
    "/healthz",
))
```

每次健康检查都会产生一条 trace，满足验收标准"Grafana 看到至少 1 个 trace"。

### 5.3 新增 Makefile 命令

```makefile
run-monolith: obs-up
	OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317 \
	OTEL_EXPORTER_OTLP_INSECURE=true \
	go run ./cmd/monolith/...
```

---

## 6. Grafana Dashboard 规范

### 6.1 Dashboard 1：RED Overview (`red-overview.json`)

**目标**：用于 Phase 0 手工验收 `/healthz` 的 HTTP RED 指标，并提供从指标面板跳转到 Trace / 日志的入口。

**变量**

| 变量 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `$service` | Query | `parkhub-monolith` | 从 VictoriaMetrics 的 `service_name` label 动态枚举 |
| `$interval` | Custom | `1m` | 聚合窗口，固定选项：`30s,1m,5m` |

**面板规范**

| Panel 名称 | 类型 | 查询 / 说明 |
|-----------|------|-------------|
| 请求速率 (RPS) | Stat | `sum(rate(http_server_request_duration_seconds_count{service_name=~"$service"}[$__rate_interval]))` |
| 错误率 | Stat | `5xx / 总请求`；阈值：黄 `0.5%`，红 `1%` |
| p50 延迟 | Stat | `histogram_quantile(0.50, sum by(le) (rate(http_server_request_duration_seconds_bucket{service_name=~"$service"}[$__rate_interval])))` |
| p99 延迟 | Stat | 阈值：黄 `200ms`，红 `1s` |
| 请求 Timeline | Time series | `sum by(http_route) (rate(http_server_request_duration_seconds_count{service_name=~"$service"}[$__rate_interval]))` |
| 延迟热力图 | Heatmap | `sum by(le) (rate(http_server_request_duration_seconds_bucket{service_name=~"$service"}[$interval]))` |
| 延迟分位数（p50 / p95 / p99） | Time series | 同一面板展示 p50/p95/p99 趋势 |
| 最近 Trace 列表 | Traces panel | Tempo TraceQL 资源过滤：`service.name = "$service"`，默认最近 20 条 |

**布局建议**

- 第一行：4 个 Stat 卡片，分别展示 RPS / 错误率 / p50 / p99。
- 第二行：左侧请求 Timeline，中间延迟热力图，右侧延迟分位数趋势。
- 第三行：最近 Trace 列表，使用 Tempo `traces` 可视化，支持点击进入 Trace 详情。

**数据约束**

- Metrics 统一以 VictoriaMetrics 为数据源，服务筛选依赖 `service_name` label。
- Trace 面板使用 Tempo 资源属性 `service.name`，不要误写成 `service`。
- RED 面板只面向单服务 monolith，Phase 0 不做多租户维度拆分。

### 6.2 Dashboard 2：Go Runtime (`go-runtime.json`)

**目标**：快速确认 monolith 进程在接入 OTel 后没有明显 runtime 异常，优先覆盖 goroutine、heap、GC、CPU 四类信号。

**变量**

| 变量 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `$service` | Query | `parkhub-monolith` | 从 `process_runtime_go_goroutines` 的 `service_name` label 枚举 |
| `$interval` | Custom | `1m` | 聚合窗口，固定选项：`30s,1m,5m` |

**面板规范**

| Panel 名称 | 类型 | 查询 / 说明 |
|-----------|------|-------------|
| Goroutine 数量 | Stat | `process_runtime_go_goroutines{service_name=~"$service"}` |
| OS Threads | Stat | `process_runtime_go_os_threads{service_name=~"$service"}` |
| Heap 使用 | Stat | `process_runtime_go_mem_heap_alloc_bytes{service_name=~"$service"}` |
| GC 频率 | Stat | `sum(rate(go_gc_duration_seconds_count{service_name=~"$service"}[$interval]))` |
| Heap 使用趋势 | Time series | `heap_alloc / heap_sys / heap_inuse` 三条曲线 |
| Goroutine 趋势 | Time series | `process_runtime_go_goroutines{service_name=~"$service"}` |
| CPU 使用率 | Time series | `rate(process_cpu_seconds_total{service_name=~"$service"}[$interval])` |
| GC 暂停时间 | Time series | `histogram_quantile(0.50|0.99, rate(go_gc_duration_seconds_bucket{service_name=~"$service"}[$__rate_interval]))` |

**布局建议**

- 第一行：4 个 Stat 卡片，分别展示 goroutine / OS threads / heap alloc / GC 频率。
- 第二行：Heap 使用趋势、Goroutine 趋势。
- 第三行：CPU 使用率、GC 暂停时间。

### 6.3 Grafana Provisioning 配置

`grafana/provisioning/datasources/datasources.yaml`：

```yaml
apiVersion: 1
datasources:
  - name: VictoriaMetrics
    type: prometheus
    url: http://victoriametrics:8428
    isDefault: true
    uid: victoriametrics

  - name: Tempo
    type: tempo
    url: http://tempo:3200
    uid: tempo
    jsonData:
      httpMethod: GET
      nodeGraph:
        enabled: true
      search:
        hide: false
      tracesToLogsV2:
        datasourceUid: loki
        spanStartTimeShift: "-1m"
        spanEndTimeShift: "1m"
        tags:
          - key: service.name
            value: service_name
        filterByTraceID: true
        filterBySpanID: false
      serviceMap:
        datasourceUid: victoriametrics
      lokiSearch:
        datasourceUid: loki

  - name: Loki
    type: loki
    url: http://loki:3100
    uid: loki
    jsonData:
      derivedFields:
        - datasourceUid: tempo
          matcherRegex: '"trace_id"\s*:\s*"([a-f0-9]+)"'
          name: TraceID
          url: '${__value.raw}'
          urlDisplayLabel: '在 Tempo 中查看 Trace'
```

**约束说明**

- VictoriaMetrics 为默认数据源，所有指标类 dashboard 不允许硬编码其他 UID。
- Tempo `tracesToLogsV2.tags` 中要把 `service.name` 映射到 Loki / 指标侧使用的 `service_name`。
- Loki 只允许低基数 label；`trace_id` 只能作为 JSON 字段参与 `derivedFields`，不能升成 label。
- Tempo ↔ Loki 双向跳转依赖 slog bridge 自动在日志体中注入 `trace_id`。

---

## 7. 验收标准（细化）

### 7.1 基础设施就绪

```bash
make obs-up && sleep 10
curl -s http://localhost:3000/api/health | jq .database  # "ok"
curl -s http://localhost:8428/-/healthy                  # "VictoriaMetrics is Healthy"
curl -s http://localhost:3200/ready                      # "ready"
curl -s http://localhost:3100/ready                      # "ready"
```

### 7.2 Go SDK 测试通过

```bash
go test ./internal/pkg/otelx/... -v
# 期望：PASS，无 noop provider 警告
```

### 7.3 端到端信号验证

```bash
make run-monolith &
sleep 5
for i in $(seq 1 10); do curl -s http://localhost:8080/healthz; done
sleep 20   # 等待 batch flush

# 验证 Trace：期望 ≥10 条
curl -s "http://localhost:3200/api/search?service.name=parkhub-monolith" | jq '.traces | length'

# 验证 Metrics
curl -s "http://localhost:8428/api/v1/query?query=http_server_request_duration_seconds_count" | jq '.data.result | length'

# 验证 Logs
curl -s 'http://localhost:3100/loki/api/v1/query_range?query=\{service_name="parkhub-monolith"\}' | jq '.data.result | length'
```

### 7.4 Grafana 手动验收 Checklist

- [ ] RED Overview Dashboard 可见 `/healthz` 请求速率曲线（非零）
- [ ] p99 延迟数值可见（非 NaN）
- [ ] 点击某条 Trace → 跳转 Tempo Explorer，能看到完整 span
- [ ] 在 Tempo 中点击 "Logs for this span" → 跳转 Loki 对应日志行

---

## 8. 工作量拆分与协作

| 子任务 | 负责方 | 预估 | 产出 |
|--------|-------|------|------|
| Docker Compose + OTel Collector 配置 | SRE | 0.5 天 | `deploy/observability/` 目录 |
| VictoriaMetrics / Tempo / Loki 配置调通 | SRE | 0.5 天 | 三个数据源在 Grafana 可见 |
| `internal/pkg/otelx/` SDK 封装 | 后端 | 0.5 天 | `otelx.Init()` + 单元测试 |
| `cmd/monolith` 接入 + HTTP middleware | 后端 | 0.5 天 | `/healthz` 产生 trace |
| Grafana Dashboard JSON 编写 | 后端/SRE 协作 | 0.5 天 | 2 个 provisioned dashboard |

> **并行建议**：SRE 搭基础设施时，后端可先写 `otelx/` SDK（用内存 exporter 跑测试），等 `obs-up` 就绪后再做端到端验证。

---

## 9. 已知风险

| 风险 | 影响 | 应对 |
|------|------|------|
| OTel SDK 版本与 gRPC 依赖冲突 | `go mod tidy` 失败 | 固定 `go.opentelemetry.io/otel` 系列为同一 minor 版本；用 `go mod graph` 排查 |
| slog bridge 与现有 `logger.Init()` 冲突 | 日志双写或丢失 | 明确调用顺序（见 §5.1），`logger.Init()` 降级为"预初始化"阶段 |
| Loki label cardinality 过高 | 写入慢 | 只用低基数 label：`service_name`、`level`；`trace_id` 放 log line JSON，不做 label |
| Docker 网络端口冲突（本地已有 Grafana） | `obs-up` 失败 | 在 compose 中将宿主机端口改为 `3001:3000`，加注释说明 |
