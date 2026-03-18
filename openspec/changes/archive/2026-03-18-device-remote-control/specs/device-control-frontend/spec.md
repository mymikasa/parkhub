## ADDED Requirements

### Requirement: Gate control button visibility
前端 SHALL 在设备详情页和设备列表页显示抬杆按钮。

#### Scenario: Show control button on device detail page
- **WHEN** 用户访问设备详情页
- **THEN** 系统 SHALL 显示抬杆按钮

#### Scenario: Show control button on device list
- **WHEN** 用户访问设备列表页
- **THEN** 系统 SHALL 在操作列显示抬杆按钮

### Requirement: Button state based on device status
前端 SHALL 根据设备在线状态自动禁用/启用抬杆按钮。

#### Scenario: Enable button for online device
- **WHEN** 设备状态为 active 且 last_heartbeat 在 5 分钟内
- **THEN** 抬杆按钮 SHALL 可点击

#### Scenario: Disable button for offline device
- **WHEN** 设备状态为 offline 或 last_heartbeat 超过 5 分钟
- **THEN** 抬杆按钮 SHALL 禁用并显示提示 "设备离线，无法操作"

#### Scenario: Disable button for disabled device
- **WHEN** 设备状态为 disabled
- **THEN** 抬杆按钮 SHALL 禁用

### Requirement: Control button interaction
前端 SHALL 在点击抬杆按钮时发送控制请求并提供反馈。

#### Scenario: Click control button
- **WHEN** 用户点击抬杆按钮
- **THEN** 前端 SHALL 显示确认对话框，提示 "确认抬杆？"

#### Scenario: Control success feedback
- **WHEN** 控制请求成功
- **THEN** 前端 SHALL 显示成功提示 "抬杆指令已发送"

#### Scenario: Control failure feedback
- **WHEN** 控制请求失败
- **THEN** 前端 SHALL 显示错误提示，包含错误消息

#### Scenario: Button loading state
- **WHEN** 控制请求进行中
- **THEN** 按钮 SHALL 显示 loading 状态，禁用重复点击

### Requirement: Permission-based button visibility
前端 SHALL 根据用户角色显示/隐藏抬杆按钮。

#### Scenario: Show button for admin and operator
- **WHEN** 用户角色为 admin 或 operator
- **THEN** 抬杆按钮 SHALL 可见

#### Scenario: Hide button for unauthorized roles
- **WHEN** 用户角色无控制权限
- **THEN** 抬杆按钮 SHALL 隐藏
