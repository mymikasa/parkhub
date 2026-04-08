#!/usr/bin/env bash
#
# Task 0.8 §7 端到端验收脚本
#
# 前置条件：
#   1. `make obs-up` 已启动可观测性栈
#   2. `make run-monolith` 已在另一个 shell 启动 monolith（监听 :8080）
#
# 校验：
#   1. 基础设施健康（Tempo / Loki / VictoriaMetrics / Grafana）
#   2. 触发 /healthz 流量
#   3. 等待 batch flush 后，分别从 Tempo/VM/Loki 查询信号是否落库

set -euo pipefail

# ── 配置 ───────────────────────────────────────────────────────────────────
SERVICE_NAME="${SERVICE_NAME:-parkhub-monolith}"
MONOLITH_URL="${MONOLITH_URL:-http://localhost:8080}"
TEMPO_URL="${TEMPO_URL:-http://localhost:3200}"
LOKI_URL="${LOKI_URL:-http://localhost:3100}"
VM_URL="${VM_URL:-http://localhost:8428}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
PROBE_COUNT="${PROBE_COUNT:-10}"
FLUSH_WAIT="${FLUSH_WAIT:-25}"

red()    { printf '\033[31m%s\033[0m\n' "$*"; }
green()  { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
step()   { printf '\n\033[36m▸ %s\033[0m\n' "$*"; }

fail() { red "FAIL: $*"; exit 1; }

require() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required tool: $1"
}

require curl
require jq

# ── 1. 基础设施健康检查 ────────────────────────────────────────────────────
step "1/4 检查基础设施健康"

HEALTH_RETRIES="${HEALTH_RETRIES:-15}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-2}"

check_health() {
  local name=$1 url=$2 expect=$3
  local body=""
  local i
  for i in $(seq 1 "$HEALTH_RETRIES"); do
    if body=$(curl -fsS --max-time 5 "$url" 2>/dev/null); then
      if [[ -z "$expect" ]] || grep -q "$expect" <<<"$body"; then
        green "  ✓ $name"
        return 0
      fi
    fi
    sleep "$HEALTH_INTERVAL"
  done
  fail "$name 健康检查超时 ($url, 重试 ${HEALTH_RETRIES}×${HEALTH_INTERVAL}s)；最后响应：${body:-<空>}"
}

check_health "VictoriaMetrics" "$VM_URL/-/healthy"   "VictoriaMetrics is Healthy"
check_health "Tempo"           "$TEMPO_URL/ready"    "ready"
check_health "Loki"            "$LOKI_URL/ready"     ""
check_health "Grafana"         "$GRAFANA_URL/api/health" "ok"

# ── 2. 触发流量 ────────────────────────────────────────────────────────────
step "2/4 触发 $PROBE_COUNT 次 /healthz 探测"

if ! curl -fsS --max-time 3 "$MONOLITH_URL/healthz" >/dev/null 2>&1; then
  fail "monolith 不可达 ($MONOLITH_URL)；先在另一个 shell 运行 'make run-monolith'"
fi

for _ in $(seq 1 "$PROBE_COUNT"); do
  curl -fsS "$MONOLITH_URL/healthz" >/dev/null
done
green "  ✓ 已发送 $PROBE_COUNT 次请求"

# ── 3. 等待 batch flush ────────────────────────────────────────────────────
step "3/4 等待 ${FLUSH_WAIT}s 让 OTel batch processor flush"
sleep "$FLUSH_WAIT"

# ── 4. 信号查询 ────────────────────────────────────────────────────────────
step "4/4 查询三类信号"

# Traces：Tempo TraceQL
trace_count=$(curl -fsS --max-time 5 \
  --get "$TEMPO_URL/api/search" \
  --data-urlencode "q={resource.service.name=\"$SERVICE_NAME\"}" \
  --data-urlencode "limit=20" \
  | jq '.traces | length' 2>/dev/null || echo 0)

if [[ "$trace_count" -gt 0 ]]; then
  green "  ✓ Tempo: 命中 $trace_count 条 trace"
else
  yellow "  ⚠ Tempo: 未查到 trace（可能仍在 batch 中，可加大 FLUSH_WAIT）"
fi

# Metrics：VictoriaMetrics
# 注意：prometheusremotewrite exporter 将 OTel resource attribute service.name
# 转换为 Prometheus 约定的 `job` label。
metric_count=$(curl -fsS --max-time 5 \
  --get "$VM_URL/api/v1/query" \
  --data-urlencode "query=http_server_request_duration_seconds_count{job=\"$SERVICE_NAME\"}" \
  | jq '.data.result | length' 2>/dev/null || echo 0)

if [[ "$metric_count" -gt 0 ]]; then
  green "  ✓ VictoriaMetrics: HTTP RED 指标存在 ($metric_count series)"
else
  yellow "  ⚠ VictoriaMetrics: 未查到 http_server_request_duration_seconds_count"
fi

# Runtime metrics（contrib/instrumentation/runtime 的新版语义命名）
runtime_count=$(curl -fsS --max-time 5 \
  --get "$VM_URL/api/v1/query" \
  --data-urlencode "query=go_goroutine_count{job=\"$SERVICE_NAME\"}" \
  | jq '.data.result | length' 2>/dev/null || echo 0)

if [[ "$runtime_count" -gt 0 ]]; then
  green "  ✓ VictoriaMetrics: Go runtime 指标存在"
else
  yellow "  ⚠ VictoriaMetrics: 未查到 go_goroutine_count"
fi

# Logs：Loki（loki exporter 同时保留 job 和 service_name label）
end_ns=$(date +%s)000000000
start_ns=$(( $(date +%s) - 600 ))000000000
log_count=$(curl -fsS --max-time 5 \
  --get "$LOKI_URL/loki/api/v1/query_range" \
  --data-urlencode "query={job=\"$SERVICE_NAME\"}" \
  --data-urlencode "start=$start_ns" \
  --data-urlencode "end=$end_ns" \
  --data-urlencode "limit=10" \
  | jq '.data.result | length' 2>/dev/null || echo 0)

if [[ "$log_count" -gt 0 ]]; then
  green "  ✓ Loki: 命中 $log_count 个 log stream"
else
  yellow "  ⚠ Loki: 未查到日志流（可能 slog bridge 未触发任何 INFO 级以上日志）"
fi

# ── 总结 ───────────────────────────────────────────────────────────────────
echo
if [[ "$trace_count" -gt 0 && "$metric_count" -gt 0 ]]; then
  green "Task 0.8 §7 验收通过：trace + metrics 均已落库"
  echo "  打开 Grafana：$GRAFANA_URL/d/parkhub-red-overview"
  exit 0
else
  red "Task 0.8 §7 验收未通过：核心信号缺失"
  echo "排查建议："
  echo "  - docker compose -f deploy/observability/docker-compose.observability.yml logs otelcol"
  echo "  - 确认 OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317 已注入 monolith 进程"
  exit 1
fi
