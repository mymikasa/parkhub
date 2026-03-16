## Why

租户管理是 ParkHub 平台管理员的核心功能，用于管理平台上的所有租户（物业公司）。当前后端已有租户 Domain 层和 Repository 接口定义，但缺少 Service 实现、Handler 和前端页面。完成此功能后，平台管理员可以创建、编辑、冻结/解冻租户，实现完整的租户生命周期管理。

## What Changes

- **后端 Service 层**: 实现 `TenantService` 接口及业务逻辑（CRUD + 冻结/解冻）
- **后端 Handler 层**: 实现 `TenantHandler` 处理 HTTP 请求，包含 DTO 转换
- **Wire 依赖注入**: 注册 TenantService 和 TenantHandler 的 ProviderSet
- **路由注册**: 添加 `/tenants` 相关路由到路由器
- **前端页面**: 实现租户管理页面（列表、搜索、新建、编辑、冻结/解冻）
- **前端 API 层**: 封装租户相关 API 调用

## Capabilities

### New Capabilities

- `tenant-service`: 后端租户服务层，包含 CRUD、冻结/解冻业务逻辑
- `tenant-handler`: 后端租户 HTTP Handler，处理 API 请求
- `tenant-api`: 前端租户 API 封装（React Query hooks）
- `tenant-management-page`: 前端租户管理页面，包含列表、新建、编辑弹窗

### Modified Capabilities

- `routing`: 添加 `/tenant-management` 路由（平台管理员专用）
- `layout-system`: 添加租户管理导航项（仅平台管理员可见）

## Impact

- **后端代码**: `internal/service/`, `internal/handler/`, `internal/router/`
- **前端代码**: `src/app/(dashboard)/tenant-management/`, `src/services/`, `src/hooks/`
- **数据库**: 无变更（tenant 表已存在）
- **API**: OpenAPI 中 `/tenants` 相关端点已定义，需实现
