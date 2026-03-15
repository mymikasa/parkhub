# auth-sms-login

手机号验证码登录功能。

## ADDED Requirements

### Requirement: 用户可以发送登录验证码

系统 SHALL 允许用户通过手机号获取登录验证码。

#### Scenario: 发送验证码成功
- **WHEN** 用户输入有效手机号 "13888888888" 并点击"获取验证码"
- **THEN** 系统发送 6 位数字验证码（MVP 阶段固定为 123456）
- **AND** 返回成功消息 "验证码已发送"

#### Scenario: 手机号格式错误
- **WHEN** 用户输入无效手机号 "12345"
- **THEN** 系统返回错误 "请输入正确的手机号"

#### Scenario: 手机号未注册
- **WHEN** 用户输入未注册的手机号 "13999999999"
- **THEN** 系统返回错误 "该手机号未注册"

#### Scenario: 验证码发送频率限制
- **WHEN** 同一手机号在 60 秒内重复请求验证码
- **THEN** 系统返回错误 "验证码发送过于频繁，请 N 秒后重试"

### Requirement: 用户可以使用验证码登录

系统 SHALL 允许用户通过手机号和验证码完成登录。

#### Scenario: 验证码登录成功
- **WHEN** 用户输入手机号 "13888888888" 和正确验证码 "123456"
- **THEN** 系统返回 Access Token 和 Refresh Token
- **AND** 返回用户基本信息

#### Scenario: 验证码错误
- **WHEN** 用户输入错误验证码 "654321"
- **THEN** 系统返回错误 "验证码错误"

#### Scenario: 验证码过期
- **WHEN** 用户输入超过 5 分钟的验证码
- **THEN** 系统返回错误 "验证码已过期，请重新获取"

#### Scenario: 验证码格式错误
- **WHEN** 用户输入非 6 位数字 "abc123"
- **THEN** 系统返回错误 "请输入 6 位数字验证码"

### Requirement: 验证码接口定义

系统 SHALL 提供验证码发送和验证登录接口。

#### Scenario: 调用发送验证码接口
- **WHEN** 客户端 POST `/api/v1/auth/sms/send` with body `{ "phone": "13888888888" }`
- **THEN** 系统返回 `{ "message": "验证码已发送" }`

#### Scenario: 调用验证码登录接口
- **WHEN** 客户端 POST `/api/v1/auth/sms/login` with body `{ "phone": "13888888888", "code": "123456" }`
- **THEN** 系统返回 `{ "access_token": "...", "refresh_token": "...", "expires_in": 7200, "user": { ... } }`

### Requirement: MVP 阶段验证码实现

MVP 阶段验证码 SHALL 使用固定值，便于开发测试。

#### Scenario: MVP 固定验证码
- **WHEN** 任意手机号请求验证码
- **THEN** 系统日志打印验证码（实际不发短信）
- **AND** 登录时接受固定验证码 "123456"
