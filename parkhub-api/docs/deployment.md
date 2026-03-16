# ParkHub 部署配置说明

## 环境要求

### 后端
- Go 1.26+
- MySQL 8.0+
- Redis 7.0+ (可选，用于缓存)

### 前端
- Node.js 18+
- pnpm 8+ (推荐) 或 npm

## 环境变量配置

### 后端环境变量

创建 `.env` 文件或设置环境变量：

```bash
# 服务配置
APP_ENV=production
APP_PORT=8080
APP_HOST=0.0.0.0

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=parkhub
DB_PASSWORD=your_secure_password
DB_NAME=parkhub

# JWT 配置
JWT_SECRET=your_jwt_secret_at_least_32_characters
JWT_ACCESS_TOKEN_TTL=2h
JWT_REFRESH_TOKEN_TTL=168h

# Redis 配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=json
```

### 前端环境变量

创建 `.env.production` 文件：

```bash
VITE_API_BASE_URL=/api/v1
```

## 数据库初始化

### 1. 创建数据库

```sql
CREATE DATABASE parkhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'parkhub'@'%' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON parkhub.* TO 'parkhub'@'%';
FLUSH PRIVILEGES;
```

### 2. 运行迁移

```bash
# 使用迁移工具或直接执行 SQL
mysql -u parkhub -p parkhub < migrations/001_init_schema.sql
```

### 3. 初始化种子数据

首次部署时，运行种子数据脚本创建初始管理员账号：

```bash
# 通过 API 或启动应用时自动执行
go run cmd/server/main.go --seed
```

## Docker 部署

### 后端 Dockerfile

```dockerfile
# Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app

COPY --from=builder /app/server .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080
CMD ["./server"]
```

### 前端 Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Docker Compose

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: parkhub
      MYSQL_USER: parkhub
      MYSQL_PASSWORD: your_secure_password
    volumes:
      - mysql_data:/var/lib/mysql
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./parkhub-api
    environment:
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USER: parkhub
      DB_PASSWORD: your_secure_password
      DB_NAME: parkhub
      JWT_SECRET: your_jwt_secret_at_least_32_characters
    depends_on:
      mysql:
        condition: service_healthy
    ports:
      - "8080:8080"

  frontend:
    build: ./parkhub-web
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mysql_data:
```

## 启动服务

### 使用 Docker Compose

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 手动启动

```bash
# 后端
cd parkhub-api
go build -o server ./cmd/server
./server

# 前端
cd parkhub-web
pnpm install
pnpm build
# 使用 nginx 或其他静态文件服务器托管 dist 目录
```

## 健康检查

```bash
# 后端健康检查
curl http://localhost:8080/health

# 预期响应
{"status": "ok"}
```

## 初始账号

部署完成后，使用以下初始账号登录：

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 平台管理员 | platform_admin | Admin@123456 | 管理所有租户 |
| 租户管理员 | tenant_admin | Tenant@123456 | 演示租户管理员 |
| 操作员 | operator | Operator@123456 | 演示租户操作员 |

**⚠️ 生产环境请务必修改默认密码！**

## 安全建议

1. **JWT Secret**: 使用至少 32 字符的随机字符串
2. **数据库密码**: 使用强密码，并限制访问 IP
3. **HTTPS**: 生产环境必须启用 HTTPS
4. **防火墙**: 只开放必要端口（80, 443）
5. **日志**: 启用访问日志和错误日志
6. **备份**: 定期备份数据库

## 故障排查

### 后端无法连接数据库

```bash
# 检查数据库是否运行
docker-compose ps mysql

# 检查数据库连接
docker-compose exec mysql mysql -u parkhub -p
```

### 前端无法访问 API

1. 检查 nginx 配置中的 proxy_pass 是否正确
2. 检查后端服务是否正常运行
3. 检查 CORS 配置

### JWT Token 无效

1. 检查 JWT_SECRET 是否一致
2. 检查系统时间是否正确
3. 检查 Token 是否过期
