## Context

`parkhub-api` 当前使用 `database/sql` + `pgx/v5/stdlib` 驱动编写手写 SQL。代码存在以下问题：

- 项目基础设施（`docker-compose.yml`、`.env.example`、迁移 SQL）一直是 MySQL，但 `db.go` 错误使用了 `pgx`（PostgreSQL 驱动），导致驱动与实际数据库不一致
- 每个仓库方法需手动扫描行字段，容易出错、难以维护
- 仓库层约有 300+ 行样板代码，可通过 GORM 大幅简化

GORM 是 Go 生态中最成熟的 ORM，原生支持 MySQL，提供类型安全的 API、自动化的 CRUD 操作和钩子机制。

## Goals / Non-Goals

**Goals:**
- 将所有 `*sql.DB` 替换为 `*gorm.DB`
- 重写四个仓库实现（user、tenant、refresh_token、sms_code）使用 GORM
- 引入 DAO 层，domain 模型保持纯净，不添加 ORM tag
- 保持仓库接口契约不变（上层 service 无需修改）
- 修复 `config.go` 中错误的 PostgreSQL 配置（`DBSSLMode`、默认端口 5432）改为 MySQL DSN

**Non-Goals:**
- 不使用 GORM AutoMigrate（继续使用现有 SQL migration 文件管理 schema）
- 不更改业务逻辑、API 接口或认证流程
- 不引入软删除或 GORM 关联（当前阶段不需要）

## Decisions

### D1: 使用 GORM + MySQL 驱动

选择 `gorm.io/driver/mysql`，移除 `pgx/v5/stdlib` 依赖。DSN 格式：`user:pass@tcp(host:port)/dbname?charset=utf8mb4&parseTime=True&loc=Local`。

**理由**: 项目所有基础设施（`docker-compose.yml`、`.env.example`、迁移 SQL 文件）均为 MySQL，`pgx` 驱动为历史笔误。迁移 SQL 无需修改，`?` 占位符也符合 MySQL 规范。

**备选方案**: 切换到 PostgreSQL → 需重写所有迁移 SQL，重新配置 Docker 环境，成本高且无收益。

### D2: 保留 SQL 文件迁移，不使用 GORM AutoMigrate

继续使用 `migrations/*.up.sql` 文件，迁移执行器改用 `*gorm.DB` 底层的 `db.Exec()`。

**理由**: SQL 文件迁移可版本化管理、可审计，AutoMigrate 在生产环境风险较高。

**备选方案**: 使用 `golang-migrate` 库 → 增加额外依赖，当前自定义迁移器已满足需求。

### D3: 引入 DAO 层隔离 domain 模型与数据库模型

在 `internal/repository/dao/` 下新建独立的 DAO 结构体（`UserDAO`、`TenantDAO`、`RefreshTokenDAO`、`SmsCodeDAO`），手动定义所有字段及 `gorm:"column:..."` tag。domain 模型保持纯净，不携带任何 ORM 标签。仓库实现（`impl/`）负责在 domain 对象与 DAO 对象之间做显式转换。

**理由**:
- domain 层与 ORM 框架解耦，未来切换 ORM 或数据库不影响业务逻辑
- 数据库列名、表结构变更只需修改 DAO 层，不触碰 domain
- domain 中可包含计算字段、聚合字段，无需担心 GORM 尝试映射不存在的列
- 每个实体约 ~20 行转换代码，4 个实体总计 ~80 行，代价可接受

**备选方案**: 直接在 domain 模型上添加 GORM tag → domain 被 ORM 侵入，未来扩展（计算字段、多表聚合）时冲突难以处理。

### D3.1: DAO 字段手动定义，不嵌入 `gorm.Model`

所有 DAO 结构体手动声明每个列字段（包括 `ID`、`CreatedAt`、`UpdatedAt`），不使用 GORM 的 `gorm.Model` 嵌入基类。

**理由**: 项目使用 `string` 类型的 UUID 作为主键（非 `uint`），`gorm.Model` 的主键类型不兼容；手动定义字段更明确，避免隐式行为。

### D3.2: 硬删除，不使用软删除

DAO 层不引入 `gorm.DeletedAt` 字段，所有删除操作为物理删除。

**理由**: 当前业务场景（用户、租户、令牌、短信码）不需要软删除语义；硬删除逻辑简单、查询无需附加 `WHERE deleted_at IS NULL` 过滤。

### D3.3: RefreshToken 和 SmsCode 迁入 domain 包

将原本定义在 `repository/interface.go` 中的 `RefreshToken`、`SmsCode` 结构体及相关枚举迁移至 `internal/domain/`（分别为 `token.go` 和 `sms.go`）。

**理由**: 这两个类型是业务实体，属于 domain 层语义，不应定义在仓库层。

### D4: Wire 注入点改为 `*gorm.DB`

更新 `internal/wire/` 中的 provider，所有注入 `*sql.DB` 的地方改为 `*gorm.DB`。

## Risks / Trade-offs

- **[风险] GORM 日志输出** → 在生产环境使用 `logger.Silent` 级别，开发环境保留 `logger.Info`，通过 `APP_ENV` 控制
- **[风险] GORM 错误映射** → `gorm.ErrRecordNotFound` 需映射到 domain 错误（`domain.ErrNotFound`），在每个仓库方法中显式处理
- **[风险] MySQL `parseTime=True`** → DSN 必须包含此参数，否则 GORM 无法将 MySQL `TIMESTAMP` 列自动扫描为 `time.Time`

## Migration Plan

1. 更新 `go.mod`：添加 `gorm.io/gorm`、`gorm.io/driver/mysql`，移除 `pgx/v5/stdlib`
2. 修复 `config.go`：移除 `DBSSLMode`，默认端口改为 `3306`，新增 MySQL DSN 构建逻辑
3. 重写 `internal/pkg/db/db.go` 使用 MySQL 驱动返回 `*gorm.DB`
4. 新建 `internal/repository/dao/` DAO 层
5. 将 `RefreshToken`、`SmsCode` 迁入 `internal/domain/`
6. 逐个重写仓库实现（user → tenant → refresh_token → sms_code）
7. 更新迁移执行器使用 `gorm.DB.Exec()`
8. 更新种子数据 `internal/seed/`
9. 重新运行 `wire gen`，本地验证

**回滚策略**: 通过 git revert 回到本次变更前的提交即可，无 schema 变更。

## Open Questions

- 无
