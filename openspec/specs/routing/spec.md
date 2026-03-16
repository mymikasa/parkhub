## ADDED Requirements

### Requirement: 页面路由结构

系统 SHALL 实现与设计稿对应的页面路由结构。

#### Scenario: 路由配置
- **WHEN** 项目初始化完成
- **THEN** 以下路由 SHALL 存在：

| 路由路径 | 页面文件 | 功能描述 |
|---------|---------|---------|
| /login | app/login/page.tsx | 登录页 |
| / | app/(dashboard)/page.tsx | 实时监控（首页） |
| /tenant-management | app/(dashboard)/tenant-management/page.tsx | 租户管理 |
| /parking-lot | app/(dashboard)/parking-lot/page.tsx | 停车场管理 |
| /device-management | app/(dashboard)/device-management/page.tsx | 设备管理 |
| /billing-rules | app/(dashboard)/billing-rules/page.tsx | 计费规则 |
| /realtime-monitor | app/(dashboard)/realtime-monitor/page.tsx | 实时监控 |
| /entry-exit-records | app/(dashboard)/entry-exit-records/page.tsx | 出入记录 |
| /operator-workspace | app/(dashboard)/operator-workspace/page.tsx | 操作员工作台 |

### Requirement: 路由分组

系统 SHALL 使用 Next.js 路由分组组织仪表盘页面。

#### Scenario: Dashboard 路由组
- **WHEN** 访问任意仪表盘页面
- **THEN** 页面使用 (dashboard) 布局组
- **AND** 共享仪表盘布局（侧边栏 + Header）

#### Scenario: 登录页独立布局
- **WHEN** 访问登录页
- **THEN** 页面使用独立布局
- **AND** 不显示侧边栏和 Header

### Requirement: 嵌套布局

系统 SHALL 支持嵌套布局以实现代码复用。

#### Scenario: 根布局
- **WHEN** 应用启动
- **THEN** app/layout.tsx 提供根布局
- **AND** 包含 html 和 body 标签
- **AND** 引入全局样式和字体

#### Scenario: Dashboard 布局
- **WHEN** 访问仪表盘页面
- **THEN** app/(dashboard)/layout.tsx 提供仪表盘布局
- **AND** 包含 Sidebar 和 Header 组件
- **AND** 渲染 children 作为主内容

### Requirement: 导航链接

系统 SHALL 实现侧边栏导航链接功能。

#### Scenario: 导航跳转
- **WHEN** 点击侧边栏导航项
- **THEN** 使用 Next.js Link 组件进行客户端导航
- **AND** 不刷新页面

#### Scenario: 导航高亮
- **WHEN** 访问某个页面
- **THEN** 对应的导航项自动高亮
- **AND** 使用 usePathname 获取当前路径进行匹配

## MODIFIED Requirements

### Requirement: 页面路由结构

系统 SHALL 实现与设计稿对应的页面路由结构。

#### Scenario: 路由配置
- **WHEN** 项目初始化完成
- **THEN** 以下路由 SHALL 存在：

| 路由路径 | 页面文件 | 功能描述 |
|---------|---------|---------|
| /login | app/login/page.tsx | 登录页 |
| / | app/(dashboard)/page.tsx | 实时监控（首页） |
| /tenant-management | app/(dashboard)/tenant-management/page.tsx | 租户管理（仅平台管理员） |
| /parking-lot | app/(dashboard)/parking-lot/page.tsx | 停车场管理 |
| /device-management | app/(dashboard)/device-management/page.tsx | 设备管理 |
| /billing-rules | app/(dashboard)/billing-rules/page.tsx | 计费规则 |
| /realtime-monitor | app/(dashboard)/realtime-monitor/page.tsx | 实时监控 |
| /entry-exit-records | app/(dashboard)/entry-exit-records/page.tsx | 出入记录 |
| /operator-workspace | app/(dashboard)/operator-workspace/page.tsx | 操作员工作台 |

#### Scenario: 租户管理路由权限
- **WHEN** 非平台管理员尝试访问 /tenant-management
- **THEN** 系统重定向到首页或显示 403 错误
