# auth-jwt-token

JWT Token 生成、校验、刷新机制。

## ADDED Requirements

### Requirement: 生成 JWT Token

系统 SHALL 在用户登录成功后生成 Access Token 和 Refresh Token。

#### Scenario: 生成双 Token
- **WHEN** 用户登录成功
- **THEN** 系统生成 Access Token（有效期 2 小时）
- **AND** 生成 Refresh Token（有效期 7 天）

#### Scenario: Access Token 载荷
- **WHEN** 生成 Access Token
- **THEN** Token 载荷包含 sub(user_id), tenant_id, role, exp, iat
- **AND** 使用 HS256 算法签名

#### Scenario: Refresh Token 存储
- **WHEN** 生成 Refresh Token
- **THEN** Token 哈希值存储到数据库 refresh_tokens 表
- **AND** 可通过数据库吊销

### Requirement: 校验 JWT Token

系统 SHALL 校验每个需要认证的请求的 Access Token。

#### Scenario: 有效 Token 通过
- **WHEN** 请求携带有效的 Authorization: Bearer <token>
- **THEN** 系统解析 Token 并注入用户信息到请求上下文

#### Scenario: Token 过期
- **WHEN** 请求携带已过期的 Access Token
- **THEN** 系统返回 401 错误 "Token 已过期"
- **AND** 错误码为 "TOKEN_EXPIRED"

#### Scenario: Token 无效
- **WHEN** 请求携带格式错误或签名无效的 Token
- **THEN** 系统返回 401 错误 "无效的 Token"
- **AND** 错误码为 "TOKEN_INVALID"

#### Scenario: 缺少 Token
- **WHEN** 请求未携带 Authorization 头
- **THEN** 系统返回 401 错误 "未提供认证信息"
- **AND** 错误码为 "TOKEN_MISSING"

### Requirement: 刷新 Token

系统 SHALL 允许客户端使用 Refresh Token 获取新的 Access Token。

#### Scenario: 刷新成功
- **WHEN** 客户端 POST `/api/v1/auth/refresh` with valid refresh_token
- **THEN** 系统返回新的 Access Token 和新的 Refresh Token
- **AND** 旧的 Refresh Token 失效

#### Scenario: Refresh Token 过期
- **WHEN** 使用已过期的 Refresh Token
- **THEN** 系统返回 401 错误 "登录已过期，请重新登录"
- **AND** 错误码为 "REFRESH_TOKEN_EXPIRED"

#### Scenario: Refresh Token 已被吊销
- **WHEN** 使用已被吊销的 Refresh Token
- **THEN** 系统返回 401 错误 "登录已失效"

### Requirement: 吊销 Token

系统 SHALL 支持吊销 Refresh Token。

#### Scenario: 登出时吊销
- **WHEN** 用户调用 POST `/api/v1/auth/logout`
- **THEN** 系统将当前 Refresh Token 标记为已吊销
- **AND** Access Token 继续有效直到过期

#### Scenario: 强制登出
- **WHEN** 管理员吊销某用户的所有 Token
- **THEN** 该用户所有 Refresh Token 失效
- **AND** 用户需要重新登录

### Requirement: Token 配置

系统 SHALL 通过配置文件管理 Token 参数。

#### Scenario: 默认配置
- **WHEN** 未配置 Token 参数
- **THEN** Access Token 有效期 2 小时
- **AND** Refresh Token 有效期 7 天
- **AND** 签名密钥从环境变量 JWT_SECRET 读取

#### Scenario: 可配置项
- **WHEN** 配置 Token 参数
- **THEN** 支持配置 access_token_ttl, refresh_token_ttl, jwt_secret
