# ADR-0001: 从单体架构重构为微服务架构

- **状态**：Proposed（待评审）
- **日期**：2026-04-07
- **作者**：mikasa
- **决策类型**：架构层级（Architectural）
- **影响范围**：后端、前端、DevOps、产品规划

## 1. 背景（Context）

ParkHub 已完成 MVP 阶段并即将进入业务扩张期。当前系统采用单体架构（`parkhub-api` Go 单进程 + `parkhub-web` Next.js 前端），随着业务推进，出现了两类无法通过单体内部优化解决的问题：

### 1.1 团队协作瓶颈

- 多个功能模块（IoT、计费、支付、监控）在同一代码库迭代，PR 冲突频繁
- 发布节奏被最慢的模块拖累，任意模块的 bug 导致全量回滚
- 新成员加入时需理解整个代码库,上手成本高

### 1.2 性能与扩容压力

- 设备心跳（每台闸机 30s 一次）、出入场事件（高频写入）、实时监控（长连接）三类流量的峰值特征与业务主流程完全不同，单体无法针对性扩容
- 计费引擎为 CPU 密集型，与 I/O 密集的业务主流程混部会互相干扰
- 未来接入大型商业综合体客户后，单实例承载上限可预见

### 1.3 关键前置条件

- **MVP 数据均为测试数据**：本次重构不需要生产数据迁移，允许数据库 schema 重设计
- **产品功能已冻结**：业务承诺重构期间仅修 P0 bug，不接受新功能
- **前端一并重构**：`parkhub-web` 将随后端重构同步调整，API 契约可重新设计
- **SRE 专人就绪**：有专职 SRE 支撑 K8s 运维与可观测性建设
- **技术栈维持**：MySQL、ORM、日志、配置等基础组件维持现状，降低重构风险

## 2. 决策（Decision）

**采用 Modular Monolith → Microservices 的渐进式重构路径**，将系统拆分为 5 个核心微服务 + 1 个 BFF 层，通过 3 个阶段完成重构。

### 2.1 服务划分

| 服务 | 职责 | 拆分理由 |
|------|------|---------|
| `parkhub-core` | 租户/用户/RBAC/停车场/车位 | 强一致基础设施，供其他服务依赖 |
| `parkhub-iot` | 设备网关、心跳、远程控制 | 高频长连接，独立故障域，独立扩容 |
| `parkhub-event` | 出入场事件流、异常匹配、实时监控 | 高频写时序数据，可独立用分区表 |
| `parkhub-billing` | 计费规则、费用计算 | CPU 密集、规则复杂、独立演进 |
| `parkhub-payment` | 支付对接、优惠券核销、对账 | 强一致、高可用、独立 SLA |
| `parkhub-bff` | 前端聚合层、Connect-RPC 网关 | 多端复用（Web/H5/未来移动端） |

### 2.2 关键技术选型

| 领域 | 选型 | 备注 |
|------|------|------|
| 服务间通信 | gRPC + Protobuf | 单进程阶段为 in-process，多进程阶段为 K8s Service |
| 前后端通信 | Connect-RPC | 一份 proto 生成 Go Server + TS Client |
| 消息总线 | **Kafka (KRaft 模式)** | 业务量倍增预期、出入场事件需要回溯/重放/对账能力、SRE 有专人支撑 |
| API 网关 | APISIX | 热更新、etcd 存储 |
| 数据库 | **MySQL 8.0 + 分 Database** | 每个 domain 一个独立 database：`parkhub_core` / `parkhub_iot` / `parkhub_event` / `parkhub_billing` / `parkhub_payment`，物理上先共享实例 |
| 租户隔离 | **Pool 默认 + Bridge 按需 + Silo 私有化**<br/>**ORM 中间件强制 `tenant_id` 注入**<br/>**Linter + 单元测试 + Code Review 三层防御** | MySQL 无原生 RLS，安全防线下沉到代码层。详见 §4.2 风险项 |
| 时序数据 | MySQL 原生分区表（按月 `PARTITION BY RANGE`） | 替代 PG TimescaleDB |
| 规则存储 | MySQL JSON 列 + 虚拟生成列索引 | 替代 PG JSONB |
| 容器编排 | Kubernetes | SRE 并行搭建 |
| 指标采集 | **VictoriaMetrics + vmagent** | PromQL 100% 兼容、存储压缩率约 7-10x、资源占用约为 Prometheus 的 1/3 |
| 链路追踪 | OpenTelemetry + Tempo | |
| 日志聚合 | Loki | |
| 可视化 | Grafana | |
| ORM / 日志 / 配置 | 维持现状 | 降低重构风险 |

### 2.3 重构阶段

```
阶段 0（1-2 周）：架构骨架搭建
  └─ 在新分支搭建目标目录结构、proto 契约、可观测性基础设施
  └─ 所有 domain 以 in-process gRPC 在单进程内运行
  └─ 完成租户隔离 POC 验证

阶段 1（4-6 周）：业务逻辑搬迁
  └─ 按依赖倒序（core → iot → event → billing → payment）
  └─ 每个 domain 完成验收后再开下一个
  └─ 保留业务规则和已修复 bug 逻辑，禁止顺手优化

阶段 2（2-3 周）：物理拆分 + K8s 部署
  └─ 每个 domain 独立打镜像、独立 Deployment
  └─ gRPC 调用切换为 K8s Service DNS
  └─ Kafka 集成、事件流转改造
  └─ 切换当天保留老单体 30 天作为回滚方案
```

## 3. 方案对比（Alternatives Considered）

### 3.1 方案 A：渐进式迁移（Strangler Fig）❌ 已否决

**描述**：在单体旁边启动新服务，通过双写和流量切分逐步迁移。

**否决理由**：

- 当前数据均为测试数据，不需要双写保护
- 双写带来的复杂度（数据一致性、回退方案）不值得
- 适合有生产数据包袱的迁移，不适合当前场景

### 3.2 方案 B：推倒重来（Big Bang Rewrite）❌ 已否决

**描述**：新建空仓库，从零重写所有业务逻辑。

**否决理由**：

- 已验证的业务规则（计费分段、异常匹配、闸机协议）是真实资产，重写会导致重新踩坑
- MVP 阶段已经修复的 bug（如 `1104e6f`）会再犯一次
- Joel Spolsky 指出：[重写是团队犯的最严重战略错误](https://www.joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/)

### 3.3 方案 C：Modular Monolith → Microservices ✅ 已选择

**描述**：在现有仓库内重组目录结构，先以单进程形态运行目标架构，再逐步拆分为物理独立的服务。

**选择理由**：

- 保留已验证的业务代码，风险最低
- 单进程阶段即可验证架构正确性，避免"分布式单体"陷阱
- 阶段 0 完成后随时可以"暂停拆分"，作为 Modular Monolith 继续使用
- 业界成熟实践（Shopify、37signals、Uber 早期）

### 3.4 方案 D：只做模块化单体，不拆微服务 ⚠️ 备选

**描述**：只执行阶段 0，保持单进程部署，不进行物理拆分。

**结论**：作为阶段 2 的降级方案保留。如果阶段 1 完成后发现业务压力没有预期大，或 K8s 运维成本超预期，可以**无损停在 Modular Monolith 形态**。

## 4. 影响（Consequences）

### 4.1 正面影响

- ✅ 团队可以按 domain 并行开发，减少 PR 冲突
- ✅ 高流量模块（IoT、event）可独立扩容
- ✅ 故障隔离：支付服务挂掉不影响闸机抬杆
- ✅ 数据库 schema 重设计窗口（分库、分区表、JSON 规则）
- ✅ 前后端类型安全贯穿全栈（proto → Go → TS）
- ✅ 为未来接入大客户的私有化部署（Silo 模式）预留能力
- ✅ Kafka 提供事件回溯/重放能力，对账与审计场景受益

### 4.2 负面影响

- ❌ 运维复杂度上升：需要 K8s、Kafka、可观测性、服务网格等基础设施
- ❌ 分布式事务复杂度：需要引入 Saga 模式处理跨服务事务
- ❌ 本地开发门槛上升：需要启动多个服务（通过 `cmd/monolith` 缓解）
- ❌ 重构期间业务功能停滞 2-3 个月
- ❌ 切换当天存在事故风险，需要完整回滚预案
- ❌ **MySQL 无原生 RLS**：租户隔离的最后一道防线在应用代码层，一旦 ORM 中间件被绕过（如使用 `db.Raw()`），存在数据串库风险

### 4.3 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:----:|:----:|----------|
| 业务方中途要求加功能 | 高 | 高 | 冻结承诺提前与业务负责人签字画押 |
| 重构中期团队信心低谷 | 高 | 中 | ADR 文档 + 阶段验收里程碑 + 定期 review |
| 切换当天生产事故 | 中 | 高 | 保留老单体 30 天，DNS 层面可回滚 |
| K8s + Kafka 基础设施未就绪 | 中 | 高 | SRE 独立流水线，阶段 1 末期必须就绪 |
| 分布式事务处理失误 | 中 | 中 | 阶段 1 保持 in-process，事务问题推迟到阶段 2 |
| 顺手优化导致引入 bug | 高 | 中 | 严格执行「先搬迁后优化」原则（见 do-not-list） |
| **ORM 中间件被绕过导致租户串库** | 中 | 🔴 严重 | 三层防御：①ORM 强制 `WithTenant()` ②自定义 linter 禁用 `db.Raw` 类调用 ③每个 Repository 必须有跨租户隔离单测 ④阶段 0 完成 POC 验证 |

## 5. 验收标准（Acceptance Criteria）

### 5.1 阶段 0 验收

- [ ] 目标目录结构（`internal/domains/*`）搭建完成
- [ ] 所有 domain 的 proto 契约定义完成并通过 `buf lint`
- [ ] `cmd/monolith` 可以启动并通过冒烟测试
- [ ] OpenTelemetry、VictoriaMetrics、Grafana 基础设施就绪
- [ ] **租户隔离 POC 通过**：
  - ORM 中间件能拦截 100% 的 Repository 查询
  - 自定义 linter 能检测出绕过中间件的 SQL 调用
  - 跨租户隔离单元测试模板就位
  - 平台管理员白名单机制验证通过

### 5.2 阶段 1 验收（每个 domain）

- [ ] 业务逻辑完整搬迁，单元测试覆盖率 ≥ 70%
- [ ] 原有 REST handler 作为 gRPC 的适配层保留
- [ ] 跨 domain 调用全部通过 gRPC 接口（禁止直接 import）
- [ ] 端到端集成测试通过

### 5.3 阶段 2 验收

- [ ] 每个 domain 独立 Docker 镜像与 K8s Deployment
- [ ] gRPC 调用切换为 K8s Service DNS
- [ ] Kafka 集成完成，事件流转可观测
- [ ] 完整链路追踪可观测
- [ ] 灰度切换 + 回滚预案演练通过

## 6. 相关决策

- 后续 ADR-0002 将记录 Connect-RPC 与前端类型生成方案
- 后续 ADR-0003 将记录分布式事务方案（Saga / Outbox Pattern）
- 后续 ADR-0004 将记录租户元数据路由表设计
- 后续 ADR-0005 将记录 Kafka Topic 命名规范、分区策略与消费者组划分
- 后续 ADR-0006 将记录 MySQL 分库分表策略（如未来需要水平拆分）

## 7. 参考资料

- [Modular Monolith: A Primer - Simon Brown](https://simon.brown.com/modular-monolith-primer)
- [Things You Should Never Do, Part I - Joel Spolsky](https://www.joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/)
- [Connect: A better gRPC](https://connectrpc.com/)
- [VictoriaMetrics Documentation](https://docs.victoriametrics.com/)
- [Kafka KRaft Mode](https://developer.confluent.io/learn/kraft/)
- 项目内部文档：
  - [docs/prd-mvp.md](../prd-mvp.md)
  - [parkhub-api/docs/openapi.yaml](../../parkhub-api/docs/openapi.yaml)
  - [.claude/rules/backend.md](../../.claude/rules/backend.md)
