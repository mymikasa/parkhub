## ADDED Requirements

### Requirement: useAuth Hook
系统 SHALL 提供 `useAuth()` Hook 访问认证状态和方法。

#### Scenario: 获取认证状态
- **WHEN** 组件调用 `const { user, isAuthenticated, isLoading } = useAuth()`
- **THEN** 返回当前认证状态

#### Scenario: 调用登录方法
- **WHEN** 组件调用 `login(account, password)`
- **THEN** 执行登录并更新状态

#### Scenario: 调用登出方法
- **WHEN** 组件调用 `logout()`
- **THEN** 执行登出并清除状态

### Requirement: useUser Hook
系统 SHALL 提供 `useUser()` Hook 快捷访问当前用户信息。

#### Scenario: 获取用户信息
- **WHEN** 组件调用 `const user = useUser()`
- **THEN** 返回当前用户对象或 null

#### Scenario: 未登录状态
- **WHEN** 未登录时调用 `useUser()`
- **THEN** 返回 null

### Requirement: usePermissions Hook
系统 SHALL 提供 `usePermissions()` Hook 检查用户权限。

#### Scenario: 检查角色权限
- **WHEN** 组件调用 `const { canManageTenants, canManageParkingLots } = usePermissions()`
- **THEN** 返回基于当前用户角色的权限布尔值

#### Scenario: 平台管理员权限
- **WHEN** `platform_admin` 用户使用 `usePermissions()`
- **THEN** `canManageTenants` 为 `true`

#### Scenario: 租户管理员权限
- **WHEN** `tenant_admin` 用户使用 `usePermissions()`
- **THEN** `canManageTenants` 为 `false`，`canManageParkingLots` 为 `true`

### Requirement: useRequireAuth Hook
系统 SHALL 提供 `useRequireAuth()` Hook 用于需要认证的组件。

#### Scenario: 已登录时返回用户
- **WHEN** 已登录组件调用 `const user = useRequireAuth()`
- **THEN** 返回用户对象

#### Scenario: 未登录时重定向
- **WHEN** 未登录组件调用 `useRequireAuth()`
- **THEN** 重定向到登录页

### Requirement: Hooks 类型定义
系统 SHALL 为所有 Hooks 提供完整的 TypeScript 类型定义。

#### Scenario: useAuth 返回类型
- **WHEN** 使用 `useAuth()`
- **THEN** 返回类型为 `{ user: User | null; isAuthenticated: boolean; isLoading: boolean; login: LoginFunction; logout: LogoutFunction }`

#### Scenario: User 类型定义
- **WHEN** 使用 `User` 类型
- **THEN** 包含 `id, username, email, phone, real_name, role, tenant_id` 字段
