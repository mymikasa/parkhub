## ADDED Requirements

### Requirement: 账号密码登录接口
系统 SHALL 提供 `login(account, password, remember?)` 方法调用 `POST /auth/login`。

#### Scenario: 用户名登录成功
- **WHEN** 调用 `login("admin", "Password123")`
- **THEN** 返回 `{ access_token, refresh_token, expires_in, user }`

#### Scenario: 邮箱登录成功
- **WHEN** 调用 `login("admin@parkhub.cn", "Password123")`
- **THEN** 返回 `{ access_token, refresh_token, expires_in, user }`

#### Scenario: 账号或密码错误
- **WHEN** 调用 `login("admin", "wrong")`
- **THEN** 抛出错误 `{ code: "INVALID_CREDENTIALS", message: "账号或密码错误" }`

#### Scenario: 账号被冻结
- **WHEN** 调用 `login("frozen_user", "password")`
- **THEN** 抛出错误 `{ code: "ACCOUNT_FROZEN", message: "账号已被冻结，请联系管理员" }`

### Requirement: 短信验证码发送接口
系统 SHALL 提供 `sendSmsCode(phone, purpose)` 方法调用 `POST /auth/sms/send`。

#### Scenario: 发送登录验证码成功
- **WHEN** 调用 `sendSmsCode("13800138000", "login")`
- **THEN** 返回 `{ message: "验证码已发送" }`

#### Scenario: 手机号未注册
- **WHEN** 调用 `sendSmsCode("19999999999", "login")`
- **THEN** 抛出错误 `{ code: "PHONE_NOT_REGISTERED", message: "该手机号未注册" }`

#### Scenario: 发送频率过高
- **WHEN** 60秒内重复调用 `sendSmsCode`
- **THEN** 抛出错误 `{ code: "SMS_TOO_FREQUENT", message: "验证码发送过于频繁，请稍后再试" }`

### Requirement: 短信验证码登录接口
系统 SHALL 提供 `smsLogin(phone, code)` 方法调用 `POST /auth/sms/login`。

#### Scenario: 验证码登录成功
- **WHEN** 调用 `smsLogin("13800138000", "123456")`
- **THEN** 返回 `{ access_token, refresh_token, expires_in, user }`

#### Scenario: 验证码错误或过期
- **WHEN** 调用 `smsLogin("13800138000", "000000")`
- **THEN** 抛出错误 `{ code: "INVALID_SMS_CODE", message: "验证码错误或已过期" }`

### Requirement: Token 刷新接口
系统 SHALL 提供 `refreshToken(refresh_token)` 方法调用 `POST /auth/refresh`。

#### Scenario: 刷新成功
- **WHEN** 调用 `refreshToken(valid_refresh_token)`
- **THEN** 返回新的 `{ access_token, refresh_token, expires_in, user }`

#### Scenario: Refresh Token 过期
- **WHEN** 调用 `refreshToken(expired_refresh_token)`
- **THEN** 抛出错误 `{ code: "TOKEN_EXPIRED", message: "登录已过期，请重新登录" }`

### Requirement: 登出接口
系统 SHALL 提供 `logout(refresh_token?)` 方法调用 `POST /auth/logout`。

#### Scenario: 登出成功
- **WHEN** 调用 `logout(refresh_token)` 且用户已登录
- **THEN** 返回 `{ message: "登出成功" }`

### Requirement: 获取当前用户接口
系统 SHALL 提供 `getCurrentUser()` 方法调用 `GET /auth/me`。

#### Scenario: 获取用户信息成功
- **WHEN** 调用 `getCurrentUser()` 且 Token 有效
- **THEN** 返回用户详情 `{ id, username, email, phone, real_name, role, tenant_id, status, created_at }`

#### Scenario: Token 无效
- **WHEN** 调用 `getCurrentUser()` 且 Token 无效
- **THEN** 抛出 401 错误
