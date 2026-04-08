# ParkHub 可观测性基础设施

本目录包含开发环境的完整可观测性栈，对应 Task 0.8。

## 组件

| 服务 | 地址 | 用途 |
|------|------|------|
| OTel Collector | `localhost:4317` (gRPC), `localhost:4318` (HTTP) | 统一信号接入点 |
| VictoriaMetrics | `http://localhost:8428` | 指标存储 |
| Tempo | `http://localhost:3200` | 链路追踪存储 |
| Loki | `http://localhost:3100` | 日志存储 |
| Grafana | `http://localhost:3000` | 可视化（无需登录） |

## 快速启动

```bash
# 在 parkhub-api/ 目录下执行
make obs-up

# 查看服务状态
make obs-ps

# 健康检查
curl http://localhost:8428/-/healthy        # VictoriaMetrics
curl http://localhost:3200/ready            # Tempo
curl http://localhost:3100/ready            # Loki
curl http://localhost:3000/api/health       # Grafana

# 停止
make obs-down
```

## 启动 monolith 并接入可观测性

```bash
# Shell A：启动可观测性栈 + monolith
make run-monolith

# Shell B：执行端到端验收（对应 Task 0.8 §7）
make obs-verify
```

`make obs-verify` 会：

1. 探活 VictoriaMetrics / Tempo / Loki / Grafana
2. 触发 10 次 `/healthz` 请求
3. 等待 25s 让 OTel batch flush
4. 分别从 Tempo / VictoriaMetrics / Loki 反查 trace、metrics、logs

也可以手动验证：

```bash
for i in $(seq 1 10); do curl -s http://localhost:8080/healthz; done
sleep 25 && open http://localhost:3000
```

## Grafana Dashboard

启动后自动加载两个 Dashboard：

- **ParkHub - HTTP RED 概览**：请求速率 / 错误率 / 延迟分位数 / Trace 列表
- **ParkHub - Go Runtime**：goroutine / heap / GC / CPU

## 端口冲突

如果本地已有 Grafana 占用 3000 端口，修改 `docker-compose.observability.yml`：

```yaml
grafana:
  ports:
    - "3001:3000"   # 宿主机改用 3001
```

## 目录结构

```
observability/
├── docker-compose.observability.yml
├── otelcol/config.yaml      # OTel Collector pipeline 配置
├── tempo/tempo.yaml         # Tempo 存储配置
├── loki/loki.yaml           # Loki 存储配置
└── grafana/
    ├── provisioning/        # 数据源 + dashboard 自动注册
    └── dashboards/          # Dashboard JSON
```
