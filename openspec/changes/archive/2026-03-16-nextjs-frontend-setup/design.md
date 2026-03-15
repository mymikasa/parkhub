## Context

ParkHub 是一个停车场计费管理系统，需要构建现代化的前端界面以支持：
- 计费引擎配置与监控
- 车辆出入场记录管理
- IoT 设备（道闸、相机）状态监控
- 优惠券管理

当前状态：新项目，无现有前端代码。需要从零搭建 Next.js 项目。

**技术约束：**
- 必须使用 TypeScript
- 必须使用 Tailwind CSS
- 必须遵循 shadcn/ui 设计规范
- 需要支持移动端响应式

## Goals / Non-Goals

**Goals:**
- 搭建可扩展的 Next.js 14+ 项目架构（App Router）
- 集成 shadcn/ui 组件库，确保 UI 一致性
- 建立清晰的项目目录结构，便于团队协作
- 配置完整的开发工具链（ESLint、Prettier、TypeScript）
- 实现基础布局系统（Header、Sidebar、Main）
- 支持亮色/暗色主题切换

**Non-Goals:**
- 本阶段不实现具体业务逻辑（计费、出入场等）
- 不涉及后端 API 开发
- 不配置 CI/CD 流水线
- 不设置用户认证系统

## Decisions

### 1. 框架选择：Next.js 14+ App Router

**理由：**
- App Router 提供更好的性能（Server Components 默认）
- 支持流式渲染，适合数据密集的仪表盘场景
- 内置 API 路由，便于后续对接后端服务
- 优秀的开发体验和生态系统

**备选方案：**
- Vite + React SPA：更轻量，但缺乏 SSR 和 API 路由能力
- Remix：类似能力，但 Next.js 生态更成熟

### 2. 组件库：shadcn/ui

**理由：**
- 基于 Radix UI，无障碍性优秀
- 组件代码直接复制到项目，完全可控
- Tailwind CSS 原生支持
- 设计风格现代、专业

**备选方案：**
- Ant Design：功能丰富但样式定制困难
- MUI：与 Tailwind CSS 集成复杂

### 3. 样式方案：Tailwind CSS

**理由：**
- 与 shadcn/ui 完美配合
- 原子化 CSS，避免样式冲突
- 响应式设计便捷
- 打包体积小（仅包含使用的类）

### 4. 目录结构

```
parkhub/
├── app/                        # Next.js App Router
│   ├── (dashboard)/            # 仪表盘布局组
│   │   ├── layout.tsx          # 仪表盘布局
│   │   ├── page.tsx            # 首页仪表盘
│   │   ├── billing/            # 计费管理
│   │   ├── records/            # 出入场记录
│   │   ├── devices/            # IoT 设备
│   │   └── coupons/            # 优惠券管理
│   ├── api/                    # API 路由
│   ├── layout.tsx              # 根布局
│   └── globals.css             # 全局样式
├── components/
│   ├── ui/                     # shadcn/ui 组件
│   ├── shared/                 # 共享业务组件
│   └── icons/                  # 图标组件
├── lib/
│   ├── utils.ts                # 工具函数
│   └── constants.ts            # 常量定义
├── hooks/                      # 自定义 Hooks
├── types/                      # TypeScript 类型定义
└── public/                     # 静态资源
```

### 5. 布局架构

基于设计稿 (`/pages/`) 定义的实际布局：

**登录页布局** (`login.html`)：


**仪表盘布局** (`realtime-monitor.html` 等)：


**关键布局参数：**
- 侧边栏：`w-64` (256px)，固定定位，渐变背景 `linear-gradient(180deg, #1e3a5f 0%, #1a3454 100%)`
- 主内容：`flex-1 ml-64`，背景 `#f8fafc`
- Header：`sticky top-0`，白色背景，底部边框
- 导航项：`nav-item` 类，激活态 `.active` 带左边框高亮

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| Next.js 版本升级可能带来破坏性变更 | 锁定主版本号，升级前充分测试 |
| shadcn/ui 组件需要手动更新 | 定期检查更新，使用 `npx shadcn-ui@latest diff` |
| App Router 生态仍在发展中 | 遇到问题时参考官方文档和社区方案 |
| 初始构建可能较慢 | 利用 Turbopack（`next dev --turbo`）加速开发 |

## Migration Plan

不适用（新项目）

## Open Questions

- [ ] 是否需要支持国际化 (i18n)？→ 建议后续迭代
- [ ] 是否需要 PWA 支持？→ 建议后续迭代
- [ ] 状态管理方案选择？→ 建议 Zustand 或 Jotai，在需要时引入
