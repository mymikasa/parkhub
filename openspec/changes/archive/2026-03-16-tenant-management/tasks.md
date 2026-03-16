## 1. Backend Service Layer

- [x] 1.1 在 `internal/service/interface.go` 中定义 TenantService 接口
- [x] 1.2 在 `internal/service/impl/tenant_service.go` 中实现 TenantService
- [x] 1.3 实现 Create、List、GetByID、Update、Freeze、Unfreeze 方法

## 2. Backend Handler Layer

- [x] 2.1 在 `internal/handler/dto/tenant_dto.go` 中定义租户相关 DTO
- [x] 2.2 在 `internal/handler/tenant_handler.go` 中实现 TenantHandler
- [x] 2.3 实现 List、Get、Create、Update、Freeze、Unfreeze HTTP 处理方法
- [x] 2.4 添加 TenantHandlerSet Wire ProviderSet

## 3. Backend Router

- [x] 3.1 在 `internal/router/router.go` 中添加 tenantHandler 依赖
- [x] 3.2 实现 setupTenantRoutes 方法，注册租户相关路由
- [x] 3.3 配置 RBAC 中间件（仅 platform_admin 可访问）

## 4. Backend Wire Integration

- [x] 4.1 更新 `internal/wire/wire.go` 添加 TenantService 和 TenantHandler ProviderSet
- [x] 4.2 运行 `wire gen` 重新生成依赖注入代码

## 5. Frontend Types

- [x] 5.1 创建 `parkhub-web/lib/tenant/types.ts` 定义租户相关类型
- [x] 5.2 定义 Tenant、TenantStatus、CreateTenantRequest、UpdateTenantRequest、TenantListResponse 类型

## 6. Frontend API Layer

- [x] 6.1 创建 `parkhub-web/lib/tenant/api.ts` 封装租户 API 调用
- [x] 6.2 实现 getTenants、getTenant、createTenant、updateTenant、freezeTenant、unfreezeTenant 函数

## 7. Frontend React Query Hooks

- [x] 7.1 创建 `parkhub-web/lib/tenant/hooks.ts` 定义 React Query hooks
- [x] 7.2 实现 useTenants、useTenant 查询 hooks
- [x] 7.3 实现 useCreateTenant、useUpdateTenant、useFreezeTenant、useUnfreezeTenant mutation hooks

## 8. Frontend Tenant Management Page

- [x] 8.1 实现租户统计卡片组件（总租户数、正常运营、已冻结、接入车场）
- [x] 8.2 实现租户列表表格组件，包含筛选 Tab 和搜索
- [x] 8.3 实现新建租户弹窗组件
- [x] 8.4 实现编辑租户弹窗组件
- [x] 8.5 实现冻结/解冻确认对话框
- [x] 8.6 更新 `parkhub-web/app/(dashboard)/tenant-management/page.tsx` 完整实现

## 9. Frontend Navigation

- [x] 9.1 更新侧边栏组件，添加租户管理导航项（仅平台管理员可见）

## 10. Testing

- [ ] 10.1 测试后端 API 端点（创建、列表、详情、更新、冻结、解冻）
- [ ] 10.2 测试前端页面功能和交互
- [ ] 10.3 测试 RBAC 权限控制
