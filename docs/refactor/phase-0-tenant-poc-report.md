# 阶段 0 · Task 0.6 — 租户隔离 POC 报告

> **执行日期**：2026-04-08
> **执行人**：refactor/phase-0/task-0.6
> **结论**：✅ **POC 通过**，可继续推进阶段 0 后续任务

## 一、目标

在不依赖 MySQL Row-Level Security 的前提下，验证以 ORM 中间件（`BaseRepo.WithTenant`）为核心的租户隔离方案，能够在所有典型查询场景下做到：

1. 普通租户用户 **只能** 看到自己租户的数据
2. 平台管理员 **可以** 跨租户访问
3. 缺失租户上下文时 **必须立即崩溃**，而不是静默放行
4. JOIN / 子查询 / 聚合 / 分页等复杂查询同样安全

## 二、POC 范围

- 代码位置：`parkhub-api/internal/pkg/db/poc_test/`
  - `parkinglot_repo.go` — 示例 Repository（`ParkingLotRepo`）
  - `parkinglot_repo_test.go` — 7 个场景的测试用例
- 数据库：SQLite in-memory（与生产 MySQL 在 `tenant_id` 过滤这一层语义一致）
- 数据集：
  - 租户 A：3 个停车场（Shanghai），5 个车位（其中 3 个被占用）
  - 租户 B：2 个停车场（Beijing），3 个车位（其中 1 个被占用）

## 三、场景与结果

| # | 场景 | 测试用例 | 结果 |
|---|------|----------|:----:|
| 1 | 租户 A 调用 `List()` 只能看到 A 的数据 | `TestPOC_Scenario1_TenantA_ListOnlyOwnData` | ✅ |
| 2 | 租户 B 调用 `List()` 只能看到 B 的数据 | `TestPOC_Scenario2_TenantB_ListOnlyOwnData` | ✅ |
| 3 | A 用户访问 B 的具体 ID 返回 `ErrRecordNotFound` | `TestPOC_Scenario3_CrossTenantGet_NotFound` | ✅ |
| 4 | 平台管理员调用 `List()` 看到 A+B 全量 | `TestPOC_Scenario4_PlatformAdmin_SeesAll` | ✅ |
| 5 | 缺失租户 context → panic（不是默认放行） | `TestPOC_Scenario5_MissingContext_Panics` | ✅ |
| 6a | JOIN + 聚合（按车位数统计停车场） | `TestPOC_Scenario6a_JoinAndAggregate_TenantScoped` | ✅ |
| 6b | GROUP BY 聚合（按城市统计） | `TestPOC_Scenario6b_GroupByAggregate_TenantScoped` | ✅ |
| 6c | 子查询（含被占用车位的停车场 ID） | `TestPOC_Scenario6c_Subquery_TenantScoped` | ✅ |
| 7 | 分页查询不会泄露其他租户数据 | `TestPOC_Scenario7_Pagination_NoLeak` | ✅ |

> 场景 6 在原任务列表中是一项，POC 中拆为 6a/6b/6c 三个独立用例，分别覆盖 JOIN、GROUP BY、子查询。

### 稳定性验证

```bash
go test ./internal/pkg/db/poc_test/... -count=5
ok  github.com/parkhub/api/internal/pkg/db/poc_test  0.400s
```

连续运行 5 次，全部 9 个 case × 5 = 45 次执行 0 失败。

## 四、关键发现与设计调整

### 发现 1（重要）：JOIN 场景下 `tenant_id` 列名歧义

**现象**：
最初的 `ListWithSpotCounts` 直接使用 `WithTenant(ctx)` 拼 JOIN 查询，SQLite 报：
```
ambiguous column name: tenant_id
```
原因：`WithTenant` 注入的 `WHERE tenant_id = ?` 是**未限定表名**的，而 JOIN 后 `parking_lots` 与 `parking_spots` 都有 `tenant_id` 列，SQL 引擎无法决定该过滤哪一边。MySQL 在同样情况下也会抛 `Column 'tenant_id' in where clause is ambiguous`。

**修复**：在 `BaseRepo` 上新增 `WithTenantTable(ctx, table string)`，拼接成
`WHERE <table>.tenant_id = ?`，专供 JOIN 场景使用。常规 CRUD 仍走原来的
`WithTenant`，零迁移成本。

```go
// 新增 API
func (r *BaseRepo) WithTenantTable(ctx context.Context, table string) *gorm.DB
```

**对后续工作的影响**：
- Task 0.5 的 `tenantcheck` linter 已经强制 Repository 必须经过 `WithTenant*` 系列方法，新方法天然落在白名单内
- 代码评审 checklist 增加一条："JOIN / 多表查询必须使用 `WithTenantTable`，禁止直接 `WithTenant().Joins(...)`"
- 后续业务 Repository 在写多表查询时直接使用新 API 即可

### 发现 2：JOIN 自身的 ON 子句必须显式带 `tenant_id` 等值条件

虽然 `WithTenantTable` 已保证驱动表被过滤，但被 JOIN 的从表（如 `parking_spots`）若仅以 `parking_lot_id` 关联，理论上仍可能因脏数据（同一个 lot_id 出现在多个租户）造成跨租户行被拼上来。POC 中显式写出：
```sql
LEFT JOIN parking_spots
       ON parking_spots.parking_lot_id = parking_lots.id
      AND parking_spots.tenant_id      = parking_lots.tenant_id
```
作为防御性 SQL 模式。

**沉淀为规范**：所有跨表 JOIN，ON 子句必须带 `<from>.tenant_id = <to>.tenant_id`，这条会进入阶段 1 之前的开发规范文档。

### 发现 3：子查询走 `WithTenant` 是安全的

`IDsViaSubquery` 中内层子查询自身也通过 `WithTenant(ctx)` 构造，gorm 会把它作为参数化子查询拼入主语句，过滤条件会自动嵌入子查询本身。POC 验证 A、B 两租户分别只看到各自的 lot ID。

### 发现 4：分页边界不会回退到其他租户数据

`TestPOC_Scenario7` 测试翻到第 3 页（offset=4）后，结果集为空且不会"溢出"到 B 租户的数据。这印证了 `WHERE tenant_id = ?` 是在 SQL 层面完成的，`OFFSET/LIMIT` 是在过滤后的子集上分页。

## 五、对阶段 0 验收标准的回溯

| 阶段 0 验收项 | 当前状态 |
|---------------|:--------:|
| ORM 中间件能拦截 100% 的 Repository 查询 | ✅ |
| 自定义 linter 能检测出绕过中间件的 SQL 调用 | ✅（Task 0.5） |
| 跨租户隔离单元测试模板就位 | ✅（本 POC） |
| 平台管理员白名单机制验证通过 | ✅（场景 4） |

## 六、遗留事项

1. POC 使用 SQLite，未在真实 MySQL 5.7 / 8.0 实例上跑过完整 7 场景。计划在阶段 0 收尾前用 docker compose 起一个 MySQL 实例做一次冒烟回归（不阻塞 Task 0.6 验收）。
2. `WithTenantTable` 接受 `table string` 字符串参数，存在被错误传入用户输入的潜在风险（虽然该 API 仅在 Repository 内部使用）。后续考虑引入常量表名或泛型 Model 推断，由 linter 强制不允许字符串拼接。
3. 复杂事务（同事务跨多表写）尚未在本 POC 覆盖。计划在阶段 1 第一个 domain 搬迁时增补对应的 integration 测试。

## 七、结论

✅ **以 `BaseRepo.WithTenant` / `WithTenantTable` 为核心的租户隔离方案在工程上是可行的**，不需要引入 MySQL RLS、ProxySQL 或其他中间件。POC 已经回答了阶段 0 文档第二章列出的"关键技术风险"中最重要的一项。

> ⚠️ 风险预案保留：若阶段 1 搬迁过程中出现 POC 未覆盖的复杂查询模式（例如递归 CTE、跨 schema 查询），需要立即回到本 POC 增补测试用例，而不是在业务代码里临时绕过。

## 八、复现命令

```bash
cd parkhub-api
go test ./internal/pkg/db/poc_test/... -v          # 单次详细输出
go test ./internal/pkg/db/poc_test/... -count=5    # 稳定性验证
```
