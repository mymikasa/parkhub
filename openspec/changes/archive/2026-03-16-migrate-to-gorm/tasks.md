## 1. 依赖与配置

- [x] 1.1 在 `go.mod` 中添加 `gorm.io/gorm` 和 `gorm.io/driver/mysql`，移除 `github.com/jackc/pgx/v5` 依赖，运行 `go mod tidy`
- [x] 1.2 修复 `internal/config/config.go`：移除 `DBSSLMode` 字段，将 `DB_PORT` 默认值从 `5432` 改为 `3306`，新增 `DSN()` 方法构建 MySQL DSN（`user:pass@tcp(host:port)/dbname?charset=utf8mb4&parseTime=True&loc=Local`）

## 2. 数据库连接层

- [x] 2.1 重写 `internal/pkg/db/db.go`：使用 `gorm.Open(mysql.Open(dsn), &gorm.Config{...})` 返回 `*gorm.DB`，根据 `APP_ENV` 配置日志级别（开发 Info / 生产 Silent），保留连接池参数设置
- [x] 2.2 更新 `internal/pkg/db/migrate.go`：接收 `*gorm.DB`，使用 `db.Exec()` 执行迁移 SQL，保留 `schema_migrations` 表追踪逻辑

## 3. Domain 层整理

- [x] 3.1 新建 `internal/domain/token.go`：将 `RefreshToken` 结构体及相关常量从 `repository/interface.go` 迁入，domain 类型保持纯净（无 ORM tag）
- [x] 3.2 新建 `internal/domain/sms.go`：将 `SmsCode` 结构体及 `SmsPurpose` 枚举从 `repository/interface.go` 迁入
- [x] 3.3 清理 `internal/repository/interface.go`：移除已迁移的结构体定义，更新接口方法签名引用 `domain.RefreshToken` 和 `domain.SmsCode`

## 4. DAO 层新建

- [x] 4.1 新建 `internal/repository/dao/user_dao.go`：定义 `UserDAO` 结构体，手动声明所有列字段及 `gorm:"column:..."` tag，设置 `TableName() string` 方法
- [x] 4.2 新建 `internal/repository/dao/tenant_dao.go`：定义 `TenantDAO`，同上
- [x] 4.3 新建 `internal/repository/dao/token_dao.go`：定义 `RefreshTokenDAO`，同上
- [x] 4.4 新建 `internal/repository/dao/sms_dao.go`：定义 `SmsCodeDAO`，同上
- [x] 4.5 在各 DAO 文件中实现转换函数：`toDAO(domain) *DAO` 和 `toDomain(dao *DAO) domain`

## 5. 仓库实现重写

- [x] 5.1 重写 `internal/repository/impl/user_repo.go`：构造函数接收 `*gorm.DB`，使用 `dao.UserDAO` 操作数据库，转换后返回 `domain.User`，`gorm.ErrRecordNotFound` 映射为 `domain.ErrNotFound`
- [x] 5.2 重写 `internal/repository/impl/tenant_repo.go`：同上，实现 `FindAll` 使用 `db.Where(...).Find()`
- [x] 5.3 重写 `internal/repository/impl/refresh_token_repo.go`：使用 `dao.RefreshTokenDAO` 操作数据库
- [x] 5.4 重写 `internal/repository/impl/sms_code_repo.go`：使用 `dao.SmsCodeDAO`，复杂查询（`CheckSendFrequency`）可使用 `db.Raw()`

## 6. 依赖注入更新

- [x] 6.1 更新 `internal/wire/wire.go` 和 `internal/wire/providers.go`：将所有 `*sql.DB` 注入点改为 `*gorm.DB`
- [x] 6.2 更新 `internal/seed/` 种子数据：使用 `*gorm.DB` 的 `Create` 或 `FirstOrCreate` 方法（通过 DAO 结构体操作）
- [x] 6.3 更新 `cmd/server/main.go`：调整 `appdb.New()` 和 `appdb.RunMigrations()` 的返回类型使用
- [x] 6.4 重新运行 `wire gen ./internal/wire/` 生成最新的 `wire_gen.go`

## 7. 验证

- [x] 7.1 运行 `go build ./...` 确保编译通过
- [x] 7.2 本地启动服务，验证迁移执行成功、种子数据写入正常
- [x] 7.3 测试认证接口（登录、刷新令牌）确保仓库逻辑正确
