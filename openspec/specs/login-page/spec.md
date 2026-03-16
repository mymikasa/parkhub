## ADDED Requirements

### Requirement: 登录页面布局
系统 SHALL 提供登录页面，包含品牌标识、登录表单和登录方式切换。

#### Scenario: 页面展示
- **WHEN** 用户访问 `/login`
- **THEN** 显示品牌 Logo、登录表单、登录方式切换 Tab

### Requirement: 账号密码登录表单
系统 SHALL 提供账号密码登录表单。

#### Scenario: 表单字段
- **WHEN** 选择账号密码登录
- **THEN** 显示账号输入框、密码输入框、记住我复选框、登录按钮

#### Scenario: 表单验证
- **WHEN** 账号或密码为空时提交
- **THEN** 显示对应字段错误提示

#### Scenario: 登录成功跳转
- **WHEN** 登录成功
- **THEN** 跳转到原请求页面或默认首页

#### Scenario: 登录失败提示
- **WHEN** 登录失败
- **THEN** 显示错误提示信息（账号或密码错误、账号被冻结等）

### Requirement: 短信验证码登录表单
系统 SHALL 提供短信验证码登录表单。

#### Scenario: 表单字段
- **WHEN** 选择短信验证码登录
- **THEN** 显示手机号输入框、验证码输入框、获取验证码按钮、登录按钮

#### Scenario: 手机号格式验证
- **WHEN** 输入非 11 位手机号
- **THEN** 显示手机号格式错误提示

#### Scenario: 验证码倒计时
- **WHEN** 点击获取验证码
- **THEN** 按钮显示 60 秒倒计时，期间不可再次点击

#### Scenario: 登录成功跳转
- **WHEN** 验证码登录成功
- **THEN** 跳转到原请求页面或默认首页

### Requirement: 登录方式切换
系统 SHALL 支持在账号密码登录和短信验证码登录之间切换。

#### Scenario: Tab 切换
- **WHEN** 点击登录方式 Tab
- **THEN** 切换到对应的登录表单

### Requirement: 已登录重定向
系统 SHALL 对已登录用户重定向到首页。

#### Scenario: 已登录访问登录页
- **WHEN** 已登录用户访问 `/login`
- **THEN** 重定向到首页 `/`
