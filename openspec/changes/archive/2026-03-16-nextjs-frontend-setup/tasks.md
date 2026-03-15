## 1. 项目初始化

- [x] 1.1 使用 `npx create-next-app@latest` 创建 Next.js 14+ 项目，启用 TypeScript、Tailwind CSS、ESLint、App Router
- [x] 1.2 配置 pnpm 作为包管理器，生成 pnpm-lock.yaml
- [x] 1.3 配置 TypeScript 严格模式 (strict: true)
- [x] 1.4 配置 Prettier 代码格式化，创建 .prettierrc 文件
- [x] 1.5 创建标准目录结构 (components/, lib/, hooks/, types/, public/)

## 2. Tailwind CSS 主题配置

- [x] 2.1 在 tailwind.config.ts 中添加 brand 颜色系统 (50, 100, 500, 600, 700, 900)
- [x] 2.2 在 tailwind.config.ts 中添加 surface 颜色系统 (DEFAULT, muted, border)
- [x] 2.3 配置 Inter 字体作为默认 sans-serif 字体
- [x] 2.4 创建 globals.css，定义特殊样式类 (sidebar-gradient, nav-item, card-hover, btn-primary, glow-*)
- [x] 2.5 定义动画 keyframes (pulse, slideIn, float)

## 3. shadcn/ui 集成

- [x] 3.1 执行 `npx shadcn@latest init` 初始化 shadcn/ui
- [x] 3.2 安装基础组件：Button, Card, Input, Label
- [x] 3.3 安装交互组件：Dialog, Sheet, Dropdown Menu, Tabs
- [x] 3.4 安装数据展示组件：Table, Badge, Avatar
- [x] 3.5 安装表单组件：Form, Select
- [x] 3.6 配置组件导入别名 @/components

## 4. FontAwesome 图标集成

- [x] 4.1 安装 FontAwesome 核心包和图标包 (@fortawesome/fontawesome-svg-core, @fortawesome/free-solid-svg-icons, @fortawesome/free-regular-svg-icons, @fortawesome/free-brands-svg-icons, @fortawesome/react)
- [x] 4.2 创建 lib/fontawesome.ts 配置文件，注册常用图标
- [x] 4.3 创建 components/icons/FontAwesome.tsx 组件封装

## 5. 主题系统

- [x] 5.1 安装 next-themes 包
- [x] 5.2 创建 components/ThemeProvider.tsx 主题提供者
- [x] 5.3 在根布局中集成 ThemeProvider
- [x] 5.4 创建 components/ThemeToggle.tsx 主题切换组件
- [x] 5.5 定义 CSS 变量 (--background, --foreground, --primary 等)

## 6. 布局组件

- [x] 6.1 创建 components/layout/Sidebar.tsx 侧边栏组件（渐变背景、Logo、导航菜单、用户信息）
- [x] 6.2 创建 components/layout/Header.tsx 页面头部组件（标题、描述、状态指示、时间）
- [x] 6.3 创建 components/layout/NavItem.tsx 导航项组件（支持高亮状态）
- [x] 6.4 创建 components/layout/DashboardLayout.tsx 仪表盘布局组件
- [x] 6.5 创建 app/(dashboard)/layout.tsx 嵌套布局

## 7. 登录页

- [x] 7.1 创建 app/login/page.tsx 登录页面
- [x] 7.2 实现左右分栏布局（品牌区 + 表单区）
- [x] 7.3 实现账号登录 / 手机号登录 Tab 切换
- [x] 7.4 实现账号密码表单
- [x] 7.5 实现手机验证码表单（含倒计时功能）
- [x] 7.6 实现第三方登录入口
- [x] 7.7 实现移动端响应式布局

## 8. 仪表盘页面骨架

- [x] 8.1 创建 app/(dashboard)/page.tsx 首页（重定向到实时监控）
- [x] 8.2 创建 app/(dashboard)/realtime-monitor/page.tsx 实时监控页面骨架
- [x] 8.3 创建 app/(dashboard)/tenant-management/page.tsx 租户管理页面骨架
- [x] 8.4 创建 app/(dashboard)/parking-lot/page.tsx 停车场管理页面骨架
- [x] 8.5 创建 app/(dashboard)/device-management/page.tsx 设备管理页面骨架
- [x] 8.6 创建 app/(dashboard)/billing-rules/page.tsx 计费规则页面骨架
- [x] 8.7 创建 app/(dashboard)/entry-exit-records/page.tsx 出入记录页面骨架
- [x] 8.8 创建 app/(dashboard)/operator-workspace/page.tsx 操作员工作台页面骨架
- [x] 8.9 创建 app/(dashboard)/payment/page.tsx 支付管理页面骨架

## 9. 工具函数和类型

- [x] 9.1 创建 lib/utils.ts 工具函数（cn 类名合并等）
- [x] 9.2 创建 lib/constants.ts 常量定义
- [x] 9.3 创建 types/index.ts 公共类型定义
- [x] 9.4 创建 hooks/useCurrentTime.ts 当前时间 Hook

## 10. 验证和测试

- [x] 10.1 验证 `pnpm dev` 启动开发服务器
- [x] 10.2 验证所有页面路由可访问
- [x] 10.3 验证侧边栏导航高亮正确
- [x] 10.4 验证主题切换功能正常
- [x] 10.5 验证登录页响应式布局
- [x] 10.6 验证 `pnpm build` 构建成功
- [x] 10.7 验证 `pnpm lint` 无错误
