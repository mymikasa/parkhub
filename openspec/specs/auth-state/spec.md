## ADDED Requirements

### Requirement: Token 存储管理
系统 SHALL 使用 localStorage 存储 Token 信息，支持持久化登录状态。

#### Scenario: 存储 Token
- **WHEN** 登录成功
- **THEN** 将 `access_token`、`refresh_token`、`expires_at` 存入 localStorage

#### Scenario: 读取 Token
- **WHEN** 应用初始化
- **THEN** 从 localStorage 读取 Token 信息

#### Scenario: 清除 Token
- **WHEN** 用户登出或 Token 刷新失败
- **THEN** 清除 localStorage 中的 Token 信息

### Requirement: Token 自动刷新
系统 SHALL 在 access_token 过期前自动刷新。

#### Scenario: 提前刷新 Token
- **WHEN** access_token 剩余有效期少于 5 分钟
- **THEN** 自动调用 refresh 接口获取新 Token

#### Scenario: 401 响应自动刷新
- **WHEN** API 请求返回 401 错误
- **THEN** 尝试刷新 Token 后重新发起请求

#### Scenario: 刷新失败处理
- **WHEN** Token 刷新失败（refresh_token 过期）
- **THEN** 清除登录状态，跳转登录页

### Requirement: 认证状态管理
系统 SHALL 提供 AuthContext 管理全局认证状态。

#### Scenario: 提供认证状态
- **WHEN** 组件使用 `useAuth()` Hook
- **THEN** 返回 `{ user, isAuthenticated, isLoading, login, logout }`

#### Scenario: 登录状态更新
- **WHEN** 登录成功
- **THEN** `isAuthenticated` 变为 `true`，`user` 包含用户信息

#### Scenario: 登出状态更新
- **WHEN** 登出成功
- **THEN** `isAuthenticated` 变为 `false`，`user` 变为 `null`

### Requirement: 记住登录状态
系统 SHALL 支持"记住我"功能延长 Token 有效期。

#### Scenario: 启用记住登录
- **WHEN** 登录时 `remember: true`
- **THEN** 使用更长的 Token 有效期（后端处理）

#### Scenario: 未启用记住登录
- **WHEN** 登录时 `remember: false` 或未指定
- **THEN** 使用默认 Token 有效期
