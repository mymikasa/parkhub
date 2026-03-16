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
