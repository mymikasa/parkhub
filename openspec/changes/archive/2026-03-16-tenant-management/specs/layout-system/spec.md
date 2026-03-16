## MODIFIED Requirements

### Requirement: 侧边栏导航链接

系统 SHALL 实现侧边栏导航链接功能。

#### Scenario: 导航跳转
- **WHEN** 点击侧边栏导航项
- **THEN** 使用 Next.js Link 组件进行客户端导航
- **AND** 不刷新页面，使用 pushState 进行匹配

#### Scenario: 导航项状态
- **WHEN** 导航项在激活状态
- **THEN** 左边框 `rgba(37, 99, 235, 1)` 颜色
- **AND** 背景色 `rgba(37, 99, 235, 0.1)`

#### Scenario: 租户管理导航项可见性
- **WHEN** 当前用户为平台管理员
- **THEN** 侧边栏显示「租户管理」导航项
- **WHEN** 当前用户为租户管理员或操作员
- **THEN** 侧边栏隐藏「租户管理」导航项
