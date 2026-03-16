## MODIFIED Requirements

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
