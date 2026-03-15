# auth-password-login

账号密码登录功能，支持用户名或邮箱登录。

## ADDED Requirements

### Requirement: 用户可以使用账号密码登录

系统 SHALL 允许用户通过用户名或邮箱配合密码进行登录认证。

#### Scenario: 使用用户名登录成功
- **WHEN** 用户输入有效用户名 "admin" 和正确密码 "Password123"
- **THEN** 系统返回 Access Token 和 Refresh Token
- **AND** 返回用户基本信息（id, username, role, tenant_id）

#### Scenario: 使用邮箱登录成功
- **WHEN** 用户输入邮箱 "admin@parkhub.cn" 和正确密码
- **THEN** 系统返回 Access Token 和 Refresh Token

#### Scenario: 用户名为空时提示错误
- **WHEN** 用户未输入用户名直接点击登录
- **THEN** 系统返回错误 "请输入账号"

#### Scenario: 密码为空时提示错误
- **WHEN** 用户输入用户名但未输入密码
- **THEN** 系统返回错误 "请输入密码"

#### Scenario: 用户不存在时提示错误
- **WHEN** 用户输入不存在的用户名 "notexist"
- **THEN** 系统返回错误 "账号或密码错误"（不暴露用户是否存在）

#### Scenario: 密码错误时提示错误
- **WHEN** 用户输入正确用户名但密码错误
- **THEN** 系统返回错误 "账号或密码错误"

#### Scenario: 账号被冻结时拒绝登录
- **WHEN** 用户账号状态为 "frozen"
- **THEN** 系统返回错误 "账号已被冻结，请联系管理员"

### Requirement: 记住登录状态

系统 SHALL 支持用户选择"记住登录状态"，延长 Token 有效期。

#### Scenario: 勾选记住登录
- **WHEN** 用户勾选"记住登录状态"并登录成功
- **THEN** Refresh Token 有效期延长至 30 天

#### Scenario: 不勾选记住登录
- **WHEN** 用户不勾选"记住登录状态"并登录成功
- **THEN** Refresh Token 有效期为 7 天

### Requirement: 登录接口定义

系统 SHALL 提供 RESTful 登录接口。

#### Scenario: 调用登录接口
- **WHEN** 客户端 POST `/api/v1/auth/login` with body `{ "account": "admin", "password": "Password123", "remember": true }`
- **THEN** 系统返回 `{ "access_token": "...", "refresh_token": "...", "expires_in": 7200, "user": { ... } }`

### Requirement: 密码安全存储

系统 SHALL 使用 bcrypt 算法存储密码哈希值，禁止明文存储。

#### Scenario: 新用户密码存储
- **WHEN** 创建新用户时设置密码
- **THEN** 系统使用 bcrypt(cost=12) 生成哈希值存储

#### Scenario: 密码校验
- **WHEN** 用户登录时输入密码
- **THEN** 系统使用 bcrypt.CompareHashAndPassword 校验
