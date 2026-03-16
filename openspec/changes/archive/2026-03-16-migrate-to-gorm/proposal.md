## Why

当前 `parkhub-api` 的仓库层使用原始 `database/sql` + 手写 SQL 查询，代码冗长、易出错，且存在 MySQL/PostgreSQL 方言混用问题（如 `?` 占位符、`ON UPDATE CURRENT_TIMESTAMP`）。引入 GORM 可统一数据库访问层，消除方言不一致，减少样板代码，并为后续功能扩展（软删除、关联查询、钩子）打下基础。

## What Changes

- 添加 `gorm.io/gorm` 和 `gorm.io/driver/mysql` 依赖，移除 `github.com/jackc/pgx/v5/stdlib` 驱动依赖（项目基础设施一直是 MySQL，pgx 为历史笔误）
- 将 `internal/pkg/db/db.go` 改为返回 `*gorm.DB` 替代 `*sql.DB`
- 新增 `internal/repository/dao/` 层，定义 `UserDAO`、`TenantDAO`、`RefreshTokenDAO`、`SmsCodeDAO`，手动声明所有字段及 GORM tag，domain 模型保持纯净
- 将 `RefreshToken`、`SmsCode` 及相关枚举从 `repository/interface.go` 迁移至 `internal/domain/`（`token.go`、`sms.go`）
- 重写 `internal/repository/impl/` 下的四个仓库实现，在 domain 对象与 DAO 对象之间做显式转换，使用 GORM API 操作数据库
- 保留现有迁移文件（SQL migrations 继续使用），仅将迁移执行器改用 `*gorm.DB` 的底层连接
- 更新 Wire 依赖注入，将 `*sql.DB` 替换为 `*gorm.DB`
- 更新 `seed/` 种子数据使用 GORM

## Capabilities

### New Capabilities

- `gorm-database-layer`: 基于 GORM 的数据库访问层，包含连接初始化、GORM model 定义及仓库实现

### Modified Capabilities

（无需求层面变更，仅为实现替换）

## Impact

- **代码变更**: `internal/pkg/db/`、`internal/repository/dao/`（新增）、`internal/repository/impl/`、`internal/domain/`（新增 token.go、sms.go）、`internal/wire/`、`internal/seed/`
- **依赖变更**: `go.mod` / `go.sum` — 新增 `gorm.io/gorm`、`gorm.io/driver/mysql`，移除 `pgx/v5/stdlib`
- **API/行为**: 无变化，仓库接口契约不变
- **破坏性变更**: 无（对上层 service/handler 透明）
