# ParkHub

智能停车管理 SaaS 平台

## 快速开始 (Docker 开发环境)

### 前置要求

- Docker Desktop 4.0+ (或 Docker Engine + Docker Compose)
- 推荐配置: 4GB+ RAM

### 启动开发环境

```bash
# 1. 复制环境变量配置
cp .env.example .env

# 2. 启动所有服务
docker compose up -d

# 3. 查看日志
docker compose logs -f
```

服务启动后:
- **前端**: http://localhost:3000
- **后端 API**: http://localhost:8080
- **MySQL**: localhost:3306
- **Redis**: localhost:6379
- **EMQX 管理控制台**: http://localhost:18083 (admin/public)

### 常用命令

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 停止并清除数据
docker compose down -v

# 查看服务状态
docker compose ps

# 进入容器
docker compose exec api sh
docker compose exec web sh

# 重新构建镜像
docker compose build --no-cache
```

### 热重载

- **后端 (Go)**: 使用 Air 实现热重载，修改 `.go` 文件后自动重新编译
- **前端 (Next.js)**: 使用 Fast Refresh，修改代码后页面自动更新

### 项目结构

```
parkhub/
├── parkhub-api/          # Go 后端
│   ├── cmd/server/       # 入口文件
│   ├── internal/         # 业务代码
│   ├── migrations/       # 数据库迁移
│   ├── Dockerfile.dev    # 开发环境镜像
│   └── .air.toml         # 热重载配置
├── parkhub-web/          # Next.js 前端
│   ├── app/              # App Router
│   ├── components/       # 组件
│   └── Dockerfile.dev    # 开发环境镜像
├── docker/
│   ├── mysql/           # 数据库初始化脚本
│   └── emqx/            # EMQX 配置文件
│       └── acl.conf     # MQTT ACL 规则
├── docker-compose.yml    # 服务编排
├── .env.example          # 环境变量模板
└── README.md
```

## 功能模块

### 租户管理
平台管理员管理租户（公司）的创建、冻结、解冻等操作。

### 用户管理
支持平台管理员和租户管理员管理用户账号，包括创建、冻结、重置密码等。

### 停车场管理
租户管理员管理停车场的完整生命周期：
- 停车场 CRUD（创建、查看、编辑、状态切换）
- 出入口配置（添加、编辑、删除、设备绑定）
- 统计数据聚合（总车位、可用车位、在场车辆、出入口数量）
- 搜索与筛选
- 多租户数据隔离

## 本地开发 (不使用 Docker)

### 后端

```bash
cd parkhub-api
go mod download
go run ./cmd/server
```

### 前端

```bash
cd parkhub-web
pnpm install
pnpm dev
```

## 技术栈

- **后端**: Go 1.26, Gin, GORM, MySQL 8.0, Redis 7, EMQX 5.4, JWT
- **前端**: Next.js 15, React 19, Tailwind CSS, shadcn/ui


### 测试账号密码

+ 超级管理员：
    platform_admin Admin@123
+ 租户管理员：
    lis 1234qwerQWER
+ 操作员
    zhs 1234QWERqwer