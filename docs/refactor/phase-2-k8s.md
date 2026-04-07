# 阶段 2：物理拆分 + K8s 部署

> **目标周期**：约 3 周（2026-06-23 ~ 2026-07-14）
> **核心目标**：把单进程拆成多进程，部署到 K8s，引入 Kafka
> **结束标志**：K8s 上多服务跑通端到端测试 + 完整链路追踪可见
> **前置条件**：阶段 1 全部验收通过 + K8s 集群就绪 + Kafka 集群就绪
> **降级方案**：如果本阶段遇到难以克服的问题，可以停在 Modular Monolith（阶段 1 成果）

## 一、阶段定位

阶段 2 是重构的最后一步，也是最"刺激"的一步。它的作用是：

1. **从单进程变成多进程**（gRPC in-process → K8s Service DNS）
2. **从内存事件总线变成 Kafka**（in-process bus → Kafka producer/consumer）
3. **从 Docker Compose 变成 K8s 部署**
4. **从 REST 前端变成 Connect-RPC 前端**

⚠️ **核心纪律**：阶段 2 每一步都必须能回退。任何一步出问题，都能退回到 `cmd/monolith` 单进程模式。

## 二、前置条件 Checklist

阶段 2 启动前必须完成：

- [ ] 阶段 1 全部验收通过
- [ ] 数据库 schema 重设计完成（分区表、JSON 列等，用单独 PR）
- [ ] **K8s 集群就绪**（SRE 硬性交付）
  - 能部署 Deployment + Service + ConfigMap + Secret
  - Ingress / APISIX 网关就绪
  - HPA（水平自动扩容）配置就绪
- [ ] **Kafka KRaft 集群就绪**（SRE 硬性交付）
  - 至少 3 broker 节点
  - Topic 自动创建策略已配置
  - 监控已接入 Grafana
- [ ] 可观测性三件套在 K8s 上就绪：
  - VictoriaMetrics + vmagent
  - Tempo
  - Loki
- [ ] 团队完成 Kafka + K8s 部署分享会

⚠️ **如果 K8s 或 Kafka 未就绪**：阶段 2 不能启动。宁可多等一周，也不要带着未就绪的基础设施硬上。

## 三、任务清单

### Task 2.1：拆分 cmd 入口（1 天）

从 `cmd/monolith/main.go` 拆出 6 个独立入口：

- [ ] `cmd/core/main.go`
- [ ] `cmd/iot/main.go`
- [ ] `cmd/event/main.go`
- [ ] `cmd/billing/main.go`
- [ ] `cmd/payment/main.go`
- [ ] `cmd/bff/main.go`

**每个入口的职责**：
- 加载本 domain 的配置
- 初始化本 domain 的数据库连接（只连自己的 database）
- 初始化本 domain 的 gRPC server
- 初始化本 domain 的 Kafka consumer（如有）
- 初始化 OpenTelemetry
- 优雅关闭

**关键变化**：原来 in-process 的 gRPC 调用需要切换为远程调用。通过**环境变量**控制：

```go
// internal/pkg/grpcx/client.go
func NewClient[T any](serviceName string) (T, error) {
    if os.Getenv("APP_MODE") == "monolith" {
        return inprocess.GetClient[T](serviceName)  // 单进程模式
    }
    addr := fmt.Sprintf("%s:9090", serviceName)     // K8s Service DNS
    conn := grpc.Dial(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
    return NewServiceClient(conn), nil
}
```

**验收**：`cmd/core` 独立启动后，健康检查通过

---

### Task 2.2：实现 Kafka Producer/Consumer 替代（3 天）

这是阶段 2 最核心的变更。用 Kafka 替代 in-process 事件总线。

#### 2.2.1 Kafka 客户端封装（1 天）

- [ ] 在 `internal/pkg/kafkax/` 创建封装：
  - `producer.go`：通用 Kafka producer（同步发送 + 重试）
  - `consumer.go`：通用 Kafka consumer（消费者组 + 重平衡）
  - `config.go`：配置结构体（brokers、topic prefix、group ID）
- [ ] Protobuf 序列化：复用 proto 定义作为 Kafka message schema
- [ ] Trace context 传播：在 Kafka header 中注入 `traceparent`
- [ ] 单元测试（使用 mock 或 testcontainers-kafka）

**验收**：`go test ./internal/pkg/kafkax/...` 全绿

#### 2.2.2 各 domain 事件迁移（2 天）

按 domain 逐个迁移：

**iot → Kafka Producer**：
- [ ] `device.heartbeat` → Kafka topic
- [ ] `device.event` → Kafka topic

**event → Kafka Consumer + Producer**：
- [ ] 消费 `device.event` → 创建出入场记录
- [ ] 生产 `transit.entered` / `transit.exited` / `exit.detected`

**billing → Kafka Consumer + Producer**：
- [ ] 消费 `exit.detected` → 计算费用
- [ ] 生产 `billing.calculated`

**payment → Kafka Consumer + Producer**：
- [ ] 消费 `billing.calculated` → 创建支付订单
- [ ] 生产 `payment.completed`

**每个迁移步骤**：
1. 在该 domain 的 `cmd/<domain>/main.go` 中初始化 Kafka consumer/producer
2. 将 in-process handler 替换为 Kafka handler
3. 本地跑通端到端测试
4. 提 PR

⚠️ **迁移期间保留 in-process 实现**：通过开关切换，确保随时能回退。

**验收**：完整事件流通过 Kafka 跑通

---

### Task 2.3：创建各 domain 的 Dockerfile（1 天）

- [ ] `deploy/docker/Dockerfile.core`
- [ ] `deploy/docker/Dockerfile.iot`
- [ ] `deploy/docker/Dockerfile.event`
- [ ] `deploy/docker/Dockerfile.billing`
- [ ] `deploy/docker/Dockerfile.payment`
- [ ] `deploy/docker/Dockerfile.bff`

**统一模板**（多阶段构建）：

```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /server ./cmd/<domain>

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=builder /server /server
EXPOSE 9090 8080
ENTRYPOINT ["/server"]
```

- 每个 domain 只 COPY 自己需要的代码（优化构建缓存）
- 暴露端口：9090（gRPC）+ 8080（健康检查 / Connect-RPC）

**验收**：每个 Dockerfile 都能 `docker build` 成功

---

### Task 2.4：创建 K8s 部署清单（2 天）

为每个 domain 创建 K8s 资源：

```
deploy/k8s/
├── base/
│   ├── namespace.yaml
│   ├── configmap.yaml          # 共享配置
│   └── secret.yaml             # 数据库密码、JWT secret 等
├── core/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
├── iot/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
├── event/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
├── billing/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
├── payment/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
├── bff/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
└── ingress.yaml                # APISIX Ingress 路由规则
```

**关键配置**：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| replicas | 2（core/billing/payment/bff）/ 3（iot/event） | 最低副本数 |
| HPA | CPU > 70% 自动扩 | 最大副本数按 domain 定 |
| Liveness probe | `/healthz` | 10s 间隔 |
| Readiness probe | `/readyz` | 5s 间隔 |
| Resources | requests: 256Mi/0.25CPU, limits: 512Mi/0.5CPU | 按 domain 调整 |
| Anti-affinity | 尽量分布到不同节点 | 确保高可用 |

**验收**：`kubectl apply -f deploy/k8s/` 所有 Pod Running

---

### Task 2.5：配置 APISIX 网关路由（1 天）

- [ ] 配置路由规则：
  - `/api/v1/*` → BFF service
  - `/bff/*` → BFF service（Connect-RPC）
  - `/healthz` → 各 service 直接暴露
- [ ] 配置 JWT 校验插件（BFF 层前的鉴权）
- [ ] 配置限流插件（按租户 ID 限流）
- [ ] 配置 CORS（前端域名白名单）

**验收**：外部请求通过 APISIX 正确路由到 BFF

---

### Task 2.6：前端切换到 Connect-RPC（2 天）

前端配合将 REST 调用切换为 Connect-RPC：

- [ ] `parkhub-web` 安装 Connect-RPC TS 客户端
- [ ] `buf generate` 生成 TS 类型
- [ ] 逐个页面切换：
  - 租户管理页面 → `core.v1.TenantService`
  - 停车场管理页面 → `bff.v1.ParkingLotService`
  - 设备管理页面 → `bff.v1.MonitorService`
  - 实时监控页面 → `bff.v1.MonitorService`
  - 出入场记录页面 → `bff.v1.MonitorService`
  - 计费规则页面 → `bff.v1.*`
- [ ] 移除旧的 `lib/api.ts` REST client

**验收**：前端所有页面通过 Connect-RPC 正常工作

---

### Task 2.7：端到端集成测试（K8s 环境）（2 天）

在 K8s 环境中跑完整的端到端测试：

- [ ] 自动化测试脚本（调用 APISIX → BFF → 微服务链路）
- [ ] 覆盖阶段 1 的所有 P0 测试场景
- [ ] 新增 K8s 特有测试：
  - 滚动更新不丢请求
  - 单个 Pod kill 后自动恢复
  - HPA 自动扩容
  - Kafka consumer rebalance 不丢消息
- [ ] 性能基线测试：
  - P95 延迟
  - 吞吐量
  - 资源占用

**验收**：所有测试通过，性能基线记录归档

---

### Task 2.8：链路追踪验证（1 天）

- [ ] 验证完整调用链可追踪：
  ```
  前端 → APISIX → BFF → core/iot/event/billing/payment
                              ↓
                           Kafka → 另一个 domain
  ```
- [ ] 验证 Kafka 消息的 trace context 传播
- [ ] 在 Grafana Tempo 中搜索 trace，确认：
  - 每个 gRPC span 可见
  - 每个 Kafka produce/consume span 可见
  - 总链路时间 ≤ 预期

**验收**：在 Grafana 中可以看到完整的跨服务调用链

---

### Task 2.9：切换日准备（1 天）

切换日的前一天准备：

- [ ] 编写切换 Runbook（详细步骤清单）
- [ ] 编写回滚 Runbook（详细步骤清单）
- [ ] 在 staging 环境演练一次完整切换
- [ ] 在 staging 环境演练一次完整回滚
- [ ] 确认 DNS 切换方案
- [ ] 确认通知计划（切换前 30min 通知相关方）
- [ ] 确认老单体保留 30 天的回滚窗口

---

### Task 2.10：切换日（Cutover Day）

**切换流程**：

```
09:00  通知相关方：切换即将开始
09:05  停止老单体接收新请求（返回 503）
09:10  等待老单体处理完进行中的请求
09:15  确认 MySQL 数据一致性（5 个 database 数据完整）
09:20  K8s 部署所有微服务
09:30  验证所有 service 健康检查通过
09:35  验证 Kafka 生产/消费正常
09:40  DNS 切换：指向 APISIX
09:45  端到端冒烟测试
09:50  确认 Grafana 指标正常
09:55  通知相关方：切换完成
10:00  进入 30 分钟观察期
10:30  切换完成
```

**回滚方案**（如果切换后 30 分钟内出现 P0 问题）：

```
R+0min   决定回滚
R+2min   DNS 切回老单体
R+5min   老单体恢复服务
R+10min  确认老单体正常
R+15min  通知相关方：已回滚
```

⚠️ **回滚期间新产生的数据**：
- Kafka 中的消息不丢（Kafka 保留期 7 天）
- MySQL 新写入的数据需要手动同步回老 database（如果有的话）
- 因为是测试数据阶段，这个风险可以接受

---

### Task 2.11：观察期 + 清理（30 天）

切换后的 30 天观察期：

**第 1 周**：
- [ ] 每天检查 Grafana dashboard
- [ ] 每天检查 Kafka consumer lag
- [ ] 每天检查错误率
- [ ] 记录所有问题到 issue tracker

**第 2-4 周**：
- [ ] 每周检查一次
- [ ] 调优：HPA 阈值、资源 limits、Kafka 分区数
- [ ] 补充缺失的监控告警

**观察期结束后**：
- [ ] 老单体代码归档到 `archive/` 目录（不删除，只归档）
- [ ] 老单体 Docker 镜像保留 90 天后删除
- [ ] 老单体的 DNS 记录删除
- [ ] 更新所有文档指向新架构
- [ ] 宣布重构正式完成

## 四、阶段 2 验收标准（汇总）

- [ ] 5 个微服务 + 1 个 BFF 全部在 K8s 上独立运行
- [ ] gRPC 调用通过 K8s Service DNS
- [ ] Kafka 事件流跑通完整链路
- [ ] 前端通过 Connect-RPC 调用 BFF
- [ ] APISIX 网关路由正确
- [ ] 端到端关键路径 P95 延迟 ≤ 单体基线 + 30%
- [ ] 完整链路追踪可见
- [ ] HPA 自动扩容验证通过
- [ ] Pod kill 自动恢复验证通过
- [ ] 滚动更新不丢请求
- [ ] 回滚预案演练通过
- [ ] CI/CD 流水线独立（每个 domain 可以独立部署）
- [ ] 架构组签字

## 五、降级方案

如果阶段 2 遇到以下情况之一，可以安全退回到阶段 1 的 Modular Monolith：

| 情况 | 处理 |
|------|------|
| Kafka 消息丢失严重 | 关闭 Kafka，切回 in-process bus |
| K8s 网络延迟不可接受 | 切回 monolith 单进程 |
| 某个 domain 物理拆分后不稳定 | 该 domain 退回 monolith，其他保持独立 |
| 团队运维能力不足 | 全部退回 monolith，稳定后再推进 |

**关键**：因为 `APP_MODE` 环境变量控制 in-process vs remote，退回只需要改一个环境变量。

## 六、关键风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| K8s / Kafka 未就绪 | 阶段 2 阻塞 | SRE 独立流水线，阶段 1 末期硬性验收 |
| gRPC 调用延迟过高 | 性能退化 | 先在 staging 压测，调优连接池 / 超时 |
| Kafka 消息丢失 | 业务不一致 | 确认 ack=all，消费者幂等处理 |
| DNS 切换窗口丢请求 | 短暂不可用 | 选择低峰期切换，提前通知 |
| 前端 Connect-RPC 迁移不完整 | 前端不可用 | 分批迁移，旧 REST 兼容层保留 |
| 回滚时数据不一致 | 回滚后异常 | 观察期不删老单体，30 天内可切回 |

## 七、后续演进方向（阶段 2 完成后）

重构完成后，以下方向可以独立推进（不在本次重构范围内）：

- [ ] **ADR-0003**：分布式事务（Saga / Outbox Pattern）
- [ ] **ADR-0004**：租户 Bridge/Silo 模式实现
- [ ] **ADR-0005**：Kafka Schema Registry + 演进策略
- [ ] **ADR-0006**：MySQL 水平拆分预案
- [ ] 服务网格（Istio / Linkerd）评估
- [ ] 灰度发布（APISIX canary 路由）
- [ ] 混沌工程（Chaos Mesh）验证
