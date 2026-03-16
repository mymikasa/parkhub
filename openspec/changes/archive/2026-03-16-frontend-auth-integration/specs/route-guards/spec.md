## ADDED Requirements

### Requirement: 路由权限配置
系统 SHALL 根据用户角色配置路由访问权限。

#### Scenario: 平台管理员路由
- **WHEN** `platform_admin` 用户访问 `/tenant-management`
- **THEN** 允许访问

#### Scenario: 租户管理员路由限制
- **WHEN** `tenant_admin` 用户访问 `/tenant-management`
- **THEN** 重定向到 403 页面或首页

#### Scenario: 操作员路由限制
- **WHEN** `operator` 用户访问 `/parking-lot` 或 `/billing-rules`
- **THEN** 重定向到 403 页面或首页

### Requirement: 未登录访问保护
系统 SHALL 对需要认证的路由进行保护。

#### Scenario: 未登录访问受保护页面
- **WHEN** 未登录用户访问受保护页面（如 `/parking-lot`）
- **THEN** 重定向到 `/login?redirect=<original_url>`

#### Scenario: 登录后跳转回原页面
- **WHEN** 用户从 `/parking-lot` 重定向到登录页后登录成功
- **THEN** 跳转回 `/parking-lot`

### Requirement: 公开路由配置
系统 SHALL 允许未登录用户访问公开路由。

#### Scenario: 访问公开路由
- **WHEN** 未登录用户访问 `/login` 或 `/payment`
- **THEN** 允许访问，不重定向

### Requirement: 路由权限表
系统 SHALL 按以下规则控制路由访问：

| 路由 | platform_admin | tenant_admin | operator | 未登录 |
|------|:--------------:|:------------:|:--------:|:------:|
| `/tenant-management` | ✅ | ❌ | ❌ | ❌ |
| `/parking-lot` | ✅ | ✅ | ❌ | ❌ |
| `/device-management` | ✅ | ✅ | ✅ | ❌ |
| `/billing-rules` | ✅ | ✅ | ❌ | ❌ |
| `/realtime-monitor` | ✅ | ✅ | ✅ | ❌ |
| `/entry-exit-records` | ✅ | ✅ | ✅ | ❌ |
| `/operator-workspace` | ❌ | ✅ | ✅ | ❌ |
| `/payment` | ❌ | ❌ | ❌ | ✅ |
| `/login` | ❌ | ❌ | ❌ | ✅ |

#### Scenario: 验证权限表
- **WHEN** 用户访问任意路由
- **THEN** 根据上表判断是否允许访问

### Requirement: 中间件实现
系统 SHALL 使用 Next.js Middleware 实现路由保护。

#### Scenario: 中间件拦截
- **WHEN** 请求到达任意路由
- **THEN** Middleware 检查 Token 和用户角色，决定放行或重定向
