# Task 0.4: 租户上下文与中间件

> **日期**: 2026-04-07
> **状态**: 已实现
> **实现备注**: 使用原生 `google.golang.org/grpc` 替代 `connectrpc.com/connect`
> **所属阶段**: 阶段 0 — 架构骨架搭建
> **预估工期**: 1 天
> **前置任务**: Task 0.1（目录骨架）、Task 0.3（proto 骨架，依赖 `common/v1/tenant_context.proto`）
> **后续任务**: Task 0.5（自定义 Linter）、Task 0.6（租户隔离 POC）

## 1. 目标

将当前单体架构中 **分散在 Gin middleware + Service 层的租户隔离逻辑**，下沉为 gRPC 微服务架构下的 **三层防御基础设施**：

```
当前（单体）                          目标（微服务）
─────────────                        ────────────
gin.Context → string 取值             context.Context → TenantInfo 强类型
middleware/tenant.go 校验              gRPC interceptor 自动注入
service 层手动 WHERE                  BaseRepo.WithTenant() ORM 中间件
无静态检查                            自定义 Linter（Task 0.5）
```

核心原则：**让开发者不可能忘记租户过滤**。

## 2. 现有代码分析

### 2.1 当前租户信息传递链路

```
HTTP Request
  → AuthMiddleware (解析 JWT)
    → c.Set("tenant_id", claims.TenantID)
    → c.Set("role", claims.Role)
  → TenantMiddleware (校验非平台管理员必须有 tenant_id)
  → RBACMiddleware (角色权限校验)
  → Handler
    → GetTenantID(c) / GetRole(c) 取值
  → Service
    → 手动 WHERE tenant_id = ? 拼接
```

**问题**：
- `tenant_id` 是 `string` 类型，无编译时保护
- Service 层**依赖开发者自觉**在每次查询加 `WHERE tenant_id = ?`
- 没有静态检查机制，绕过租户过滤的代码无法被 CI 发现

### 2.2 涉及的现有文件

| 文件 | 作用 | 重构后变化 |
|------|------|-----------|
| `internal/middleware/auth.go` | JWT 解析、context 注入 | 保留，仍用于 BFF 的 HTTP 入口 |
| `internal/middleware/tenant.go` | 租户校验 | 保留，但 gRPC 链路由 interceptor 接管 |
| `internal/middleware/rbac.go` | RBAC 权限 | 保留，gRPC 链路通过 interceptor 实现 |
| `internal/pkg/db/db.go` | 数据库连接 | 扩展，新增 `BaseRepo` |

## 3. 交付件清单

### 3.1 新增文件

```
internal/pkg/tenant/
├── context.go           # TenantInfo 结构 + context 操作
└── context_test.go      # 单元测试

internal/pkg/db/
├── db.go                # （已有）数据库连接
├── base_repo.go         # BaseRepo + WithTenant()
└── base_repo_test.go    # 单元测试

internal/pkg/grpcx/
├── tenant_interceptor.go    # gRPC Unary Interceptor
└── tenant_interceptor_test.go
```

### 3.2 不修改的文件

- `internal/middleware/*.go` — 保持现有单体链路不变
- `internal/service/*.go` — 不搬迁业务代码

## 4. 详细设计

### 4.1 `internal/pkg/tenant/context.go` — 租户上下文

#### 4.1.1 数据结构

```go
package tenant

import "context"

type ctxKey struct{}

// TenantInfo 存储在 context 中的租户信息。
// 所有 gRPC 请求经 tenant interceptor 注入，Repository 层通过 FromContext 读取。
type TenantInfo struct {
    // TenantID 租户唯一标识（UUID 格式）。
    // 平台管理员此字段为空（通过 IsPlatformAdmin 区分）。
    TenantID string

    // UserRole 用户角色，对应 proto common.v1.UserRole 枚举值。
    // 取值：platform_admin / tenant_admin / operator
    UserRole string

    // IsPlatformAdmin 是否为平台管理员。
    // 平台管理员不受 tenant_id 过滤，可访问所有租户数据。
    IsPlatformAdmin bool

    // UserID 当前请求的用户 ID，用于审计日志。
    UserID string
}
```

#### 4.1.2 Context 操作函数

```go
// FromContext 从 context 中提取 TenantInfo。
// 返回 (TenantInfo, true) 表示存在；(零值, false) 表示不存在。
// 这是 Repository 层的首选读取方式。
func FromContext(ctx context.Context) (TenantInfo, bool) {
    info, ok := ctx.Value(ctxKey{}).(TenantInfo)
    return info, ok
}

// WithContext 将 TenantInfo 注入 context。
// 由 gRPC interceptor 调用，业务代码不应直接调用。
func WithContext(ctx context.Context, info TenantInfo) context.Context {
    return context.WithValue(ctx, ctxKey{}, info)
}

// MustFromContext 从 context 提取 TenantInfo，不存在则 panic。
// 用于 Repository 层的防御性编程：缺失租户上下文说明调用链配置错误，
// 应该在开发阶段暴露而非静默放行。
func MustFromContext(ctx context.Context) TenantInfo {
    info, ok := FromContext(ctx)
    if !ok {
        panic("tenant: context missing — all db queries require tenant info")
    }
    return info
}
```

#### 4.1.3 设计决策

| 决策 | 理由 |
|------|------|
| 使用 unexported `ctxKey{}` 防止外部包伪造 | 类型安全的 context key |
| `MustFromContext` panic 而非 error | 租户缺失是编程错误而非业务异常，应在开发期暴露 |
| `TenantInfo` 是值类型（非指针） | 避免外部修改注入后的值 |
| `IsPlatformAdmin` 独立字段而非检查 `UserRole == "platform_admin"` | 避免字符串魔法值散落各处 |

### 4.2 `internal/pkg/db/base_repo.go` — 数据库租户过滤

#### 4.2.1 BaseRepo 结构

```go
package db

import (
    "context"
    "fmt"

    "gorm.io/gorm"
    "github.com/parkhub/api/internal/pkg/tenant"
)

// BaseRepo 所有 Repository 的基类。
// 提供 WithTenant() 方法强制注入租户过滤条件。
//
// 使用方式：
//
//   type ParkingLotRepo struct {
//       *BaseRepo
//   }
//
//   func (r *ParkingLotRepo) List(ctx context.Context) ([]ParkingLot, error) {
//       var lots []ParkingLot
//       err := r.WithTenant(ctx).Find(&lots).Error
//       return lots, err
//   }
type BaseRepo struct {
    db *gorm.DB
}

// NewBaseRepo 创建 BaseRepo 实例。
// 每个 domain 的 Repository 通过嵌入 *BaseRepo 获得租户过滤能力。
func NewBaseRepo(db *gorm.DB) *BaseRepo {
    return &BaseRepo{db: db}
}

// DB 返回不带租户过滤的原始 *gorm.DB。
// 仅用于平台级表（如 tenants 表自身）或迁移脚本。
// ⚠️ 业务查询禁止使用此方法，必须走 WithTenant()。
func (r *BaseRepo) DB() *gorm.DB {
    return r.db
}
```

#### 4.2.2 WithTenant — 核心过滤方法

```go
// WithTenant 返回注入了租户过滤条件的 *gorm.DB 会话。
//
// 行为：
//   - 平台管理员（IsPlatformAdmin=true）  → 不过滤，返回全部数据
//   - 普通用户（TenantID 非空）           → 追加 WHERE tenant_id = ?
//   - 缺失 TenantInfo                    → panic（编程错误）
//   - 普通用户 TenantID 为空              → panic（数据不一致）
func (r *BaseRepo) WithTenant(ctx context.Context) *gorm.DB {
    info, ok := tenant.FromContext(ctx)
    if !ok {
        panic("db: tenant context missing — refusing unscoped query")
    }

    // 平台管理员：不过滤
    if info.IsPlatformAdmin {
        return r.db.WithContext(ctx)
    }

    // 普通用户：必须有 tenant_id
    if info.TenantID == "" {
        panic(fmt.Sprintf(
            "db: tenant_id empty for role=%s user=%s — refusing unscoped query",
            info.UserRole, info.UserID,
        ))
    }

    return r.db.WithContext(ctx).Where("tenant_id = ?", info.TenantID)
}
```

#### 4.2.3 平台管理员跨租户访问

```go
// WithTenantExplicit 允许平台管理员显式指定目标租户。
// 仅在平台管理接口（如租户详情查询）中使用。
//
// 行为：
//   - 平台管理员 + targetTenantID 非空 → WHERE tenant_id = targetTenantID
//   - 平台管理员 + targetTenantID 为空 → 不过滤（查全部）
//   - 非平台管理员                      → 忽略 targetTenantID，使用自身 tenant_id
//   - 缺失 TenantInfo                  → panic
func (r *BaseRepo) WithTenantExplicit(ctx context.Context, targetTenantID string) *gorm.DB {
    info, ok := tenant.FromContext(ctx)
    if !ok {
        panic("db: tenant context missing — refusing unscoped query")
    }

    if info.IsPlatformAdmin {
        if targetTenantID != "" {
            return r.db.WithContext(ctx).Where("tenant_id = ?", targetTenantID)
        }
        return r.db.WithContext(ctx)
    }

    // 非平台管理员：忽略 targetTenantID，强制使用自身 tenant_id
    if info.TenantID == "" {
        panic(fmt.Sprintf(
            "db: tenant_id empty for role=%s — refusing unscoped query",
            info.UserRole,
        ))
    }
    return r.db.WithContext(ctx).Where("tenant_id = ?", info.TenantID)
}
```

#### 4.2.4 Repository 嵌入约定

所有 domain 的 Repository 必须**嵌入 `*BaseRepo`**：

```go
// internal/domains/core/repository/parking_lot_repo.go
type ParkingLotRepo struct {
    *db.BaseRepo
}

func NewParkingLotRepo(base *db.BaseRepo) *ParkingLotRepo {
    return &ParkingLotRepo{BaseRepo: base}
}

// ✅ 正确：通过 WithTenant 过滤
func (r *ParkingLotRepo) List(ctx context.Context) ([]ParkingLot, error) {
    var lots []ParkingLot
    err := r.WithTenant(ctx).Find(&lots).Error
    return lots, err
}

// ❌ 禁止：绕过 WithTenant 直接查询（Task 0.5 的 Linter 会检测）
func (r *ParkingLotRepo) List(ctx context.Context) ([]ParkingLot, error) {
    var lots []ParkingLot
    err := r.db.Find(&lots).Error  // Linter 报错！
    return lots, err
}
```

### 4.3 `internal/pkg/grpcx/tenant_interceptor.go` — gRPC 拦截器

#### 4.3.1 Interceptor 实现

使用原生 `google.golang.org/grpc` 的 `grpc.UnaryServerInterceptor` 签名。

```go
package grpcx

import (
    "context"

    "google.golang.org/grpc"
    "google.golang.org/grpc/metadata"
    "github.com/parkhub/api/internal/pkg/tenant"
)

const (
    HeaderTenantID = "x-tenant-id"
    HeaderUserRole = "x-user-role"
    HeaderUserID   = "x-user-id"
)

// TenantInterceptor 是 grpc.UnaryServerInterceptor，从 metadata 提取租户信息注入 context。
//
// 工作流程：
//   1. 从 gRPC metadata 读取 x-tenant-id / x-user-role / x-user-id
//   2. 构造 TenantInfo 并注入 context
//   3. 平台管理员识别 → IsPlatformAdmin = true
//   4. 调用下游 Handler
//
// 此 interceptor 只注入，不做拒绝（RBAC interceptor 的职责）。
func TenantInterceptor(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
    md, ok := metadata.FromIncomingContext(ctx)
    if !ok {
        md = metadata.New(nil)
    }

    role := firstValue(md, HeaderUserRole)

    tenantInfo := tenant.TenantInfo{
        TenantID:        firstValue(md, HeaderTenantID),
        UserRole:        role,
        UserID:          firstValue(md, HeaderUserID),
        IsPlatformAdmin: role == "platform_admin",
    }

    ctx = tenant.WithContext(ctx, tenantInfo)
    return handler(ctx, req)
}

func firstValue(md metadata.MD, key string) string {
    vals := md.Get(key)
    if len(vals) == 0 {
        return ""
    }
    return vals[0]
}
```

> **技术选型说明**：Phase 0-1 使用原生 gRPC 满足内部服务通信需求。Connect-RPC 的优势在于前端直连（JSON over HTTP），将在 BFF 层接入前端时引入。

#### 4.3.2 Metadata 来源

```
外部请求:
  Browser → APISIX Gateway → BFF (解析 JWT) → 内部 gRPC 调用
                                              ↓
                                        注入 x-tenant-id / x-user-role / x-user-id
                                              ↓
                                        gRPC Interceptor → TenantInfo → context

In-process 调用（阶段 0-1 monolith 模式）:
  cmd/monolith → service A 调用 service B
                ↓
          代码构造 context（直接调用 tenant.WithContext）
                ↓
          不经过网络栈，不经过 interceptor
```

#### 4.3.3 Interceptor 链顺序

```go
// cmd/monolith 中注册 interceptor 的顺序：
s := grpc.NewServer(
    grpc.ChainUnaryInterceptor(
        grpcx.TenantInterceptor(),   // 1. 租户上下文注入（最先执行）
        grpcx.AuthInterceptor(),     // 2. 鉴权校验（后续任务）
        grpcx.RBACInterceptor(),     // 3. RBAC 权限校验（后续任务）
        grpcx.OTelInterceptor(),     // 4. 可观测性（Task 0.8）
    ),
)
```

## 5. 测试计划

### 5.1 `internal/pkg/tenant/context_test.go`

| 测试用例 | 输入 | 预期 |
|----------|------|------|
| `TestWithContext_Success` | 注入完整 TenantInfo，读取验证 | 字段值一致 |
| `TestFromContext_Missing` | 空 context | 返回 `(零值, false)` |
| `TestMustFromContext_Success` | 有 TenantInfo 的 context | 正常返回 |
| `TestMustFromContext_Panic` | 空 context | panic，消息包含 "tenant: context missing" |
| `TestWithContext_Immutable` | 注入后修改原始 TenantInfo | context 中的值不变（值类型保护） |

### 5.2 `internal/pkg/db/base_repo_test.go`

使用 `gorm.io/driver/sqlite` 内存数据库 + `FakeModel{ID, TenantID, Name}` 进行测试。

| 测试用例 | 场景 | 预期 |
|----------|------|------|
| `TestWithTenant_NormalUser` | TenantInfo{TenantID: "A", IsPlatformAdmin: false} | SQL 包含 `WHERE tenant_id = 'A'` |
| `TestWithTenant_PlatformAdmin` | TenantInfo{IsPlatformAdmin: true} | SQL 不含 tenant_id 过滤 |
| `TestWithTenant_MissingContext` | 空 context | panic "tenant context missing" |
| `TestWithTenant_EmptyTenantID` | TenantInfo{TenantID: "", IsPlatformAdmin: false} | panic "tenant_id empty" |
| `TestWithTenantExplicit_AdminTargetA` | 平台管理员 + targetTenantID="B" | SQL `WHERE tenant_id = 'B'` |
| `TestWithTenantExplicit_AdminNoTarget` | 平台管理员 + targetTenantID="" | SQL 不含过滤 |
| `TestWithTenantExplicit_NormalIgnored` | 普通用户 + targetTenantID="B"（自身为 A） | SQL `WHERE tenant_id = 'A'`（忽略 target） |
| `TestWithTenant_DataIsolation` | 插入 A/B 两租户数据，A 查询 | 只返回 A 的数据，不包含 B |

### 5.3 `internal/pkg/grpcx/tenant_interceptor_test.go`

使用 `metadata.NewIncomingContext()` 构造带 gRPC metadata 的 context。

| 测试用例 | Metadata | 预期 TenantInfo |
|----------|----------|----------------|
| `TestTenantInterceptor_NormalUser` | x-tenant-id=T1, x-user-role=tenant_admin, x-user-id=U1 | {TenantID:"T1", UserRole:"tenant_admin", IsPlatformAdmin:false, UserID:"U1"} |
| `TestTenantInterceptor_PlatformAdmin` | x-user-role=platform_admin, x-user-id=U2 | {TenantID:"", IsPlatformAdmin:true, UserRole:"platform_admin"} |
| `TestTenantInterceptor_Operator` | x-tenant-id=T2, x-user-role=operator, x-user-id=U3 | {TenantID:"T2", UserRole:"operator", IsPlatformAdmin:false} |
| `TestTenantInterceptor_NoMetadata` | 空 metadata | {TenantID:"", IsPlatformAdmin:false} — 不拒绝，由下游 RBAC 拒绝 |

## 6. 与现有代码的兼容策略

```
阶段 0 期间，两套体系共存：

  单体链路（不动）：
    HTTP → Gin AuthMiddleware → Gin TenantMiddleware → Service → Repository
    ↑ 现有代码，不修改

  新 gRPC 链路（新建）：
    gRPC → TenantInterceptor → Service → BaseRepo.WithTenant()
    ↑ 新代码，在 internal/pkg/ 下

两套体系共享同一套数据库，互不影响。
```

## 7. 依赖关系

### 7.1 上游依赖

| 依赖 | 来源 | 状态 |
|------|------|------|
| Go module `google.golang.org/grpc` v1.80.0 | 新增依赖 | ✅ 已在 go.mod |
| `internal/pkg/db/db.go` | 现有代码 | ✅ 已存在 |
| `common/v1/tenant_context.proto` | Task 0.3 proto 骨架 | 规范对齐参考（Go 代码不直接依赖 proto 生成） |

### 7.2 下游影响

| 依赖方 | 任务 | 使用方式 |
|--------|------|---------|
| 自定义 Linter | Task 0.5 | 检测 `r.db` 直接调用，要求走 `r.WithTenant()` |
| 租户隔离 POC | Task 0.6 | 基于 BaseRepo 编写隔离测试 |
| 各 domain Repository | 阶段 1 | 嵌入 `*BaseRepo`，使用 `WithTenant()` |
| `cmd/monolith` | Task 0.7 | 注册 TenantInterceptor |

## 8. 验收标准

### 8.1 功能验收

- [ ] `go test ./internal/pkg/tenant/...` — 全绿
- [ ] `go test ./internal/pkg/db/...` — 全绿（含 base_repo_test.go）
- [ ] `go test ./internal/pkg/grpcx/...` — 全绿

### 8.2 覆盖率要求

| 包 | 最低覆盖率 |
|----|-----------|
| `internal/pkg/tenant` | 90% |
| `internal/pkg/db`（base_repo.go 部分） | 85% |
| `internal/pkg/grpcx`（tenant_interceptor.go 部分） | 85% |

### 8.3 代码规范

- [ ] 所有 panic 场景在测试中通过 `recover()` 验证
- [ ] 无 `TODO` / `FIXME` 残留
- [ ] 通过 `go vet ./internal/pkg/...`

## 9. 风险与注意事项

| 风险 | 影响 | 应对 |
|------|------|------|
| `WithTenant` panic 在生产环境导致请求崩溃 | 严重 | panic 只发生在开发阶段的编程错误；生产由 interceptor 保证 context 不为空 |
| GORM 的 `Where` 条件被后续调用覆盖 | 数据泄露 | 使用 `Session(&gorm.Session{NewDB: true})` 创建隔离会话（视 POC 结果决定） |
| SQLite 测试与 MySQL 行为差异 | 测试不可靠 | 复杂场景（如 JSON 查询）使用 Testcontainers MySQL（Task 0.6 处理） |
| In-process 调用跳过 interceptor | 租户信息丢失 | 阶段 0-1 由调用方显式构造 context；阶段 2 拆分进程后全部走 interceptor |
