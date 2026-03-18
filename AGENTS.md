# ParkHub Agent Guidelines

Always response in Chinese.
This file provides guidance for AI coding agents working in this monorepo.

## Project Overview

ParkHub is a smart parking management SaaS platform:
- **parkhub-api**: Go backend with Gin framework (clean architecture)
- **parkhub-web**: Next.js 15 frontend with App Router and shadcn/ui

---

## Build / Test / Lint Commands

### Backend (parkhub-api)

```bash
cd parkhub-api

go test ./...                                          # Run all tests
go test ./internal/service/impl/...                    # Run tests for a package
go test -v -run TestLogin_Success ./...                # Run a single test by name
wire gen ./internal/wire                               # Generate Wire DI code
go build -o bin/server ./cmd/server && ./bin/server    # Build and run
```

### Frontend (parkhub-web)

```bash
cd parkhub-web

pnpm install                     # Install dependencies
pnpm dev                         # Development server (http://localhost:3000)
pnpm build                       # Production build
pnpm lint                        # Lint check
npx shadcn@latest add [component] # Add shadcn component
```

---

## Backend Architecture (Go)

### Clean Architecture Layers

```
Router → Handler → Middleware → Service → Repository → Domain
```

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Router | `internal/router/` | Route definitions, middleware chain |
| Handler | `internal/handler/` | HTTP request/response, DTO conversion |
| Middleware | `internal/middleware/` | JWT, tenant isolation, RBAC |
| Service | `internal/service/` | Business logic (interfaces in `interface.go`) |
| Repository | `internal/repository/` | Database operations (interfaces in `interface.go`) |
| Domain | `internal/domain/` | Entities, enums, business rules, errors |

### Interface-First Design

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

After adding new dependencies, regenerate: `wire gen ./internal/wire`

---

## Multi-Tenant Model

| Role | tenant_id | Permissions |
|------|-----------|-------------|
| `platform_admin` | NULL | Manage all tenants |
| `tenant_admin` | Assigned | Manage own tenant |
| `operator` | Assigned | Monitor, gate control |

**Critical Rules:**
- Non-platform admins MUST filter by `tenant_id` in all queries
- Cross-tenant access returns 403 Forbidden
- Tenant status is checked during login (frozen tenant = login rejected)

---

## Code Style Guidelines

### Go Backend

**Imports Ordering:** Standard library → External packages → Internal packages

**Naming Conventions:**
- Interfaces: `XxxService`, `XxxRepo` (no `I` prefix)
- Implementations: `xxxServiceImpl` (private struct), constructor `NewXxx`
- ProviderSets: `XxxServiceSet`, `XxxRepoSet`
- Domain errors: `ErrNotFound`, `ErrUserNotFound`
- Error codes: `CodeNotFound`, `CodeInvalidCredentials`

**Error Handling:**
```go
// Use errors.Is for sentinel errors
if errors.Is(err, domain.ErrUserNotFound) { /* handle */ }

// Use errors.As for DomainError
var domainErr *domain.DomainError
if errors.As(err, &domainErr) { /* access domainErr.Code */ }
```

**No Comments in Code:** Do not add comments unless explicitly requested.

### Frontend (TypeScript/React)

**Path Alias:** `@/*` maps to project root

**Form Handling (react-hook-form + zod):**
```tsx
const schema = z.object({
  username: z.string().min(1, 'Required'),
  password: z.string().min(6, 'Min 6 characters'),
});
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

**Icons:** Use FontAwesome via `@/components/icons/FontAwesome`

**Styling:** Tailwind CSS v4 with shadcn/ui components.

---

## Testing Patterns

Use mock implementations for interfaces:

```go
type mockUserRepo struct {
    users map[string]*domain.User
}

func (m *mockUserRepo) FindByID(ctx context.Context, id string) (*domain.User, error) {
    if user, ok := m.users[id]; ok { return user, nil }
    return nil, domain.ErrUserNotFound
}
```

**Important:** When creating test users with `tenant_id`, ensure the corresponding tenant exists in the mock tenant repo.

---

## Authentication Flow

```
Request → AuthMiddleware → TenantMiddleware → RBACMiddleware → Handler
```

- Access token: 2 hours, Refresh token: 7 days
- JWT claims: `sub` (userID), `tenant_id`, `role`, `type` (access/refresh)

---

## Environment Variables

### Backend Required
| Variable | Required | Default |
|----------|----------|---------|
| `APP_ENV`, `APP_PORT` | Yes | development, 8080 |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Yes | - |
| `JWT_SECRET` | Yes | ≥32 chars |

### Frontend
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL |

---

## Seed Data (Development)

| Role | Username | Password |
|------|----------|----------|
| Platform Admin | `platform_admin` | `Admin@123456` |
| Tenant Admin | `tenant_admin` | `Tenant@123456` |
| Operator | `operator` | `Operator@123456` |
