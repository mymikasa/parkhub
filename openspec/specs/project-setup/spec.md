## ADDED Requirements

### Requirement: Next.js 项目初始化

系统 SHALL 使用 Next.js 14+ 版本创建项目，采用 App Router 架构。

#### Scenario: 创建 Next.js 项目
- **WHEN** 执行项目初始化命令
- **THEN** 系统创建 Next.js 14+ 项目，使用 App Router 作为默认路由方案

#### Scenario: TypeScript 配置
- **WHEN** 项目初始化完成
- **THEN** TypeScript 配置为严格模式 (strict: true)
- **AND** 包含 @types/react 和 @types/node 依赖

### Requirement: Tailwind CSS 配置

系统 SHALL 配置 Tailwind CSS 作为样式方案，包含自定义主题配置。

#### Scenario: Tailwind 初始化
- **WHEN** 项目初始化完成
- **THEN** tailwind.config.ts 包含以下自定义配置：
  - brand 颜色系统 (50, 100, 500, 600, 700, 900)
  - surface 颜色系统 (DEFAULT, muted, border)
  - Inter 字体作为默认 sans-serif 字体

#### Scenario: 全局样式
- **WHEN** 访问任意页面
- **THEN** 全局样式 SHALL 包含 Tailwind 基础指令
- **AND** body 元素应用 font-sans antialiased 类

### Requirement: 代码规范配置

系统 SHALL 配置 ESLint 和 Prettier 以确保代码一致性。

#### Scenario: ESLint 配置
- **WHEN** 项目初始化完成
- **THEN** .eslintrc.json 包含 Next.js 推荐规则
- **AND** 包含 TypeScript 相关规则

#### Scenario: Prettier 配置
- **WHEN** 项目初始化完成
- **THEN** .prettierrc 配置统一的代码格式化规则
- **AND** 与 ESLint 规则兼容

### Requirement: 包管理器

项目 SHALL 使用 pnpm 作为包管理器。

#### Scenario: pnpm 配置
- **WHEN** 项目初始化完成
- **THEN** 存在 pnpm-lock.yaml 文件
- **AND** .npmrc 配置文件（如需要）

### Requirement: 目录结构

系统 SHALL 遵循约定的目录结构组织代码。

#### Scenario: 标准目录结构
- **WHEN** 项目初始化完成
- **THEN** 以下目录 SHALL 存在：
  - app/ (Next.js App Router)
  - components/ui/ (shadcn/ui 组件)
  - components/shared/ (共享业务组件)
  - lib/ (工具函数)
  - hooks/ (自定义 Hooks)
  - types/ (TypeScript 类型)
  - public/ (静态资源)

#### Scenario: Docker 相关文件
- **WHEN** 项目初始化完成
- **THEN** 根目录 SHALL 包含以下 Docker 配置文件：
  - docker-compose.yml (服务编排)
  - .env.example (环境变量模板)
  - docker/postgres/init.sql (数据库初始化)
- **AND** parkhub-api/ 目录 SHALL 包含：
  - Dockerfile.dev (Go 开发环境)
  - .dockerignore
- **AND** parkhub-web/ 目录 SHALL 包含：
  - Dockerfile.dev (Node.js 开发环境)
  - .dockerignore
