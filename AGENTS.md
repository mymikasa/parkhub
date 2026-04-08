# ParkHub 代理指南

始终使用中文回复。
本文档为在此 monorepo 中工作的 AI 编码代理提供指导。

## 项目概览

ParkHub 是一个智慧停车管理 SaaS 平台：
- **parkhub-api**：基于 Gin 框架的 Go 后端（整洁架构）
- **parkhub-web**：基于 Next.js 15 App Router 和 shadcn/ui 的前端

---

## 构建 / 测试 / Lint 命令

### 后端（parkhub-api）

```bash
cd parkhub-api

go test ./...                                          # 运行全部测试
go test ./internal/service/impl/...                    # 运行指定包测试
go test -v -run TestLogin_Success ./...                # 按测试名运行单个测试
wire gen ./internal/wire                               # 生成 Wire 依赖注入代码
go build -o bin/server ./cmd/server && ./bin/server    # 构建并运行
```

### 前端（parkhub-web）

```bash
cd parkhub-web

pnpm install                      # 安装依赖
pnpm dev                          # 启动开发服务器（http://localhost:3000）
pnpm build                        # 生产构建
pnpm lint                         # 运行 Lint 检查
npx shadcn@latest add [component] # 添加 shadcn 组件
```

---

## 后端架构（Go）

### 整洁架构分层

```
Router → Handler → Middleware → Service → Repository → Domain
```

| 分层 | 目录 | 职责 |
|------|------|------|
| Router | `internal/router/` | 路由定义与中间件链组装 |
| Handler | `internal/handler/` | HTTP 请求/响应处理与 DTO 转换 |
| Middleware | `internal/middleware/` | JWT、租户隔离、RBAC |
| Service | `internal/service/` | 业务逻辑（接口定义在 `interface.go`） |
| Repository | `internal/repository/` | 数据库操作（接口定义在 `interface.go`） |
| Domain | `internal/domain/` | 实体、枚举、业务规则、错误定义 |

### 接口优先设计

```go
// internal/service/interface.go
type AuthService interface {
    Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error)
}

// internal/service/impl/auth_service.go
type authServiceImpl struct {
    userRepo repository.UserRepo
}

func NewAuthService(userRepo repository.UserRepo) service.AuthService {
    return &authServiceImpl{userRepo: userRepo}
}

var AuthServiceSet = wire.NewSet(NewAuthService)
```

新增依赖后，重新生成代码：`wire gen ./internal/wire`

---

## 多租户模型

| 角色 | tenant_id | 权限 |
|------|-----------|------|
| `platform_admin` | NULL | 管理所有租户 |
| `tenant_admin` | 已分配 | 管理所属租户 |
| `operator` | 已分配 | 监控与闸机控制 |

**关键规则：**
- 非平台管理员在所有查询中都必须按 `tenant_id` 过滤
- 跨租户访问必须返回 `403 Forbidden`
- 登录时需要检查租户状态（冻结租户禁止登录）

---

## 代码风格规范

### Go 后端

**导入顺序：** 标准库 → 第三方包 → 内部包

**命名约定：**
- 接口：`XxxService`、`XxxRepo`（不要使用 `I` 前缀）
- 实现：`xxxServiceImpl`（私有结构体），构造函数使用 `NewXxx`
- ProviderSet：`XxxServiceSet`、`XxxRepoSet`
- 领域错误：`ErrNotFound`、`ErrUserNotFound`
- 错误码：`CodeNotFound`、`CodeInvalidCredentials`

**错误处理：**
```go
// 对哨兵错误使用 errors.Is
if errors.Is(err, domain.ErrUserNotFound) { /* handle */ }

// 对 DomainError 使用 errors.As
var domainErr *domain.DomainError
if errors.As(err, &domainErr) { /* access domainErr.Code */ }
```

**代码中不要添加注释：** 除非用户明确要求，否则不要写注释。

### 前端（TypeScript/React）

**路径别名：** `@/*` 映射到项目根目录

**表单处理（react-hook-form + zod）：**
```tsx
const schema = z.object({
  username: z.string().min(1, 'Required'),
  password: z.string().min(6, 'Min 6 characters'),
});
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

**图标：** 使用 `@/components/icons/FontAwesome` 中的 FontAwesome

**样式：** 使用 Tailwind CSS v4 与 shadcn/ui 组件

---

## 测试模式

为接口编写 mock 实现：

```go
type mockUserRepo struct {
    users map[string]*domain.User
}

func (m *mockUserRepo) FindByID(ctx context.Context, id string) (*domain.User, error) {
    if user, ok := m.users[id]; ok { return user, nil }
    return nil, domain.ErrUserNotFound
}
```

**重要：** 测试中创建带有 `tenant_id` 的用户时，必须确保对应租户也存在于 mock tenant repo 中。

---

## 认证流程

```
Request → AuthMiddleware → TenantMiddleware → RBACMiddleware → Handler
```

- Access token：2 小时
- Refresh token：7 天
- JWT claims：`sub`（userID）、`tenant_id`、`role`、`type`（access/refresh）

---

## 环境变量

### 后端必需变量

| 变量 | 是否必需 | 默认值 |
|------|----------|--------|
| `APP_ENV`, `APP_PORT` | 是 | development, 8080 |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | 是 | - |
| `JWT_SECRET` | 是 | 至少 32 个字符 |

### 前端

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_API_BASE_URL` | 后端 API 地址 |

---

## 开发环境种子数据

| 角色 | 用户名 | 密码 |
|------|--------|------|
| Platform Admin | `platform_admin` | `Admin@123456` |
| Tenant Admin | `tenant_admin` | `Tenant@123456` |
| Operator | `operator` | `Operator@123456` |
