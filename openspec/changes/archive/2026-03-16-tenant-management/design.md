## Context

租户管理功能是 ParkHub 平台管理员的核心功能。当前状态：
- **Domain 层**: `internal/domain/tenant.go` 已定义 Tenant 实体和业务方法
- **Repository 层**: `internal/repository/impl/tenant_repo.go` 已实现数据访问
- **API 规范**: `docs/openapi.yaml` 已定义 `/tenants` 相关端点
- **前端页面**: `app/(dashboard)/tenant-management/page.tsx` 存在但为占位符

缺少的部分：
1. Service 层接口和实现
2. Handler 层
3. Wire 依赖注入配置
4. 路由注册
5. 前端完整实现

## Goals / Non-Goals

**Goals:**
- 实现完整的租户 CRUD API（创建、列表、详情、更新、冻结/解冻）
- 遵循现有代码架构模式（Service → Handler → Router）
- 实现前端租户管理页面，包含统计卡片、列表、搜索、新建/编辑弹窗
- 添加 RBAC 权限控制（仅平台管理员可访问）

**Non-Goals:**
- 租户删除功能（业务上不允许删除，只能冻结）
- 租户统计数据的实时更新（MVP 使用静态数据）
- 租户管理员自动创建（后续迭代）

## Decisions

### 1. Service 层设计

**选择**: 创建 `TenantService` 接口，遵循现有 `AuthService` 模式

```go
type TenantService interface {
    Create(ctx context.Context, req *CreateTenantRequest) (*domain.Tenant, error)
    GetByID(ctx context.Context, id string) (*domain.Tenant, error)
    List(ctx context.Context, filter TenantFilter) (*TenantListResponse, error)
    Update(ctx context.Context, id string, req *UpdateTenantRequest) (*domain.Tenant, error)
    Freeze(ctx context.Context, id string) error
    Unfreeze(ctx context.Context, id string) error
}
```

**理由**: 
- 与现有 `AuthService` 保持一致的接口风格
- 使用 Request/Response 结构体封装参数，便于扩展
- Service 层负责业务逻辑（如检查公司名重复），Repository 层仅做数据访问

### 2. Handler 层设计

**选择**: 创建 `TenantHandler`，使用 DTO 进行请求/响应转换

```go
type TenantHandler struct {
    tenantService service.TenantService
}
```

**理由**:
- 遵循现有 `AuthHandler` 模式
- DTO 与 Service 层解耦，便于 API 版本演进
- 统一错误处理映射

### 3. 前端 API 层设计

**选择**: 创建 `lib/tenant/` 目录，结构同 `lib/auth/`

```
lib/tenant/
├── api.ts      # API 调用函数
├── hooks.ts    # React Query hooks
├── types.ts    # TypeScript 类型定义
└── index.ts    # 导出入口
```

**理由**:
- 与现有 auth 模块保持一致
- React Query 提供缓存和自动刷新
- 类型安全

### 4. 前端页面组件设计

**选择**: 使用 shadcn/ui 组件，页面结构遵循 PRD 设计稿

**组件拆分**:
- `TenantStatsCards` - 统计卡片（4列）
- `TenantList` - 租户列表表格
- `TenantFormDialog` - 新建/编辑弹窗
- `TenantActionsDropdown` - 操作下拉菜单

**理由**:
- 组件化便于测试和复用
- shadcn/ui 与现有技术栈一致
- 遵循 PRD 设计规格

### 5. 路由与权限设计

**选择**: 在 `Router` 中添加 `setupTenantRoutes` 方法，使用 `IsPlatformAdmin` 中间件

**理由**:
- 遵循现有路由结构
- 平台管理员专属功能，需要独立中间件

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 前端组件复杂度高 | 使用 shadcn/ui 预置组件减少工作量 |
| 权限控制遗漏 | 在 Router 层统一添加中间件，Handler 层不再重复校验 |
| API 响应格式不一致 | 使用统一 DTO 和错误处理函数 |
| 租户冻结后影响关联数据 | Service 层检查关联停车场状态，提示确认 |
