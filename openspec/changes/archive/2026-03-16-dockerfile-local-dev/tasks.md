## 1. 基础配置文件

- [x] 1.1 创建根目录 docker-compose.yml 服务编排文件
- [x] 1.2 创建根目录 .env.example 环境变量模板
- [x] 1.3 创建根目录 .dockerignore 文件

## 2. Go 后端容器配置

- [x] 2.1 创建 parkhub-api/Dockerfile.dev Go 开发环境镜像
- [x] 2.2 创建 parkhub-api/.dockerignore 文件
- [x] 2.3 创建 parkhub-api/.air.toml 热重载配置
- [x] 2.4 配置 api 服务在 docker-compose.yml 中

## 3. Next.js 前端容器配置

- [x] 3.1 创建 parkhub-web/Dockerfile.dev Node.js 开发环境镜像
- [x] 3.2 创建 parkhub-web/.dockerignore 文件
- [x] 3.3 配置 web 服务在 docker-compose.yml 中

## 4. PostgreSQL 数据库配置

- [x] 4.1 创建 docker/postgres/init.sql 数据库初始化脚本
- [x] 4.2 配置 postgres 服务在 docker-compose.yml 中
- [x] 4.3 配置数据库持久化 volume

## 5. 验证与文档

- [x] 5.1 测试 docker compose up 完整启动流程
- [x] 5.2 验证 Go 后端热重载功能
- [x] 5.3 验证 Next.js 前端热重载功能
- [x] 5.4 更新 README.md 添加 Docker 开发环境说明
