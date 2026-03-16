## ADDED Requirements

### Requirement: Docker Compose 服务编排

系统 SHALL 提供 docker-compose.yml 文件，编排所有开发环境服务。

#### Scenario: 启动所有服务
- **WHEN** 执行 `docker compose up -d`
- **THEN** 系统启动以下服务：
  - api (Go 后端，端口 8080)
  - web (Next.js 前端，端口 3000)
  - mysql (MySQL 8.0，端口 3306)
- **AND** 所有服务健康检查通过

#### Scenario: 服务依赖顺序
- **WHEN** 启动开发环境
- **THEN** api 服务 SHALL 等待 mysql 服务就绪后启动
- **AND** web 服务可与 api 服务通信

### Requirement: Go 后端开发容器

系统 SHALL 为 parkhub-api 提供 Dockerfile.dev，支持 Go 1.26 开发环境。

#### Scenario: Go 版本
- **WHEN** api 容器启动
- **THEN** Go 版本 SHALL 为 1.26.x

#### Scenario: 热重载支持
- **WHEN** 修改 Go 源代码文件
- **THEN** Air 工具 SHALL 自动重新编译并重启服务
- **AND** 重启时间不超过 5 秒

#### Scenario: 端口映射
- **WHEN** 容器运行
- **THEN** 8080 端口 SHALL 映射到宿主机 8080 端口

### Requirement: Next.js 前端开发容器

系统 SHALL 为 parkhub-web 提供 Dockerfile.dev，支持 Node.js 20 开发环境。

#### Scenario: Node.js 版本
- **WHEN** web 容器启动
- **THEN** Node.js 版本 SHALL 为 20.x LTS

#### Scenario: 热重载支持
- **WHEN** 修改 TypeScript/React 源代码文件
- **THEN** Next.js Fast Refresh SHALL 自动更新页面
- **AND** 更新时间不超过 2 秒

#### Scenario: 端口映射
- **WHEN** 容器运行
- **THEN** 3000 端口 SHALL 映射到宿主机 3000 端口

### Requirement: MySQL 数据库容器

系统 SHALL 提供 MySQL 8.0 数据库容器，支持开发数据持久化。

#### Scenario: 数据库版本
- **WHEN** mysql 容器启动
- **THEN** MySQL 版本 SHALL 为 8.0.x

#### Scenario: 数据持久化
- **WHEN** 容器重启或删除
- **THEN** 数据库数据 SHALL 通过 Docker volume 持久保存
- **AND** 执行 `docker compose down -v` 时数据被清除

#### Scenario: 初始化脚本
- **WHEN** mysql 容器首次启动
- **THEN** 系统 SHALL 执行初始化脚本创建开发数据库和用户

### Requirement: 环境变量配置

系统 SHALL 通过 .env 文件配置开发环境变量。

#### Scenario: 环境变量文件
- **WHEN** 启动开发环境
- **THEN** docker-compose.yml SHALL 读取根目录 .env 文件
- **AND** 提供 .env.example 作为配置模板

#### Scenario: 数据库连接
- **WHEN** api 服务启动
- **THEN** 数据库连接 SHALL 使用以下默认配置：
  - Host: mysql
  - Port: 3306
  - Database: parkhub_dev
  - User: parkhub
