## ADDED Requirements

### Requirement: GORM 数据库连接初始化
系统 SHALL 通过 `internal/pkg/db/db.go` 返回 `*gorm.DB` 实例，使用 MySQL 驱动（`gorm.io/driver/mysql`）连接数据库，DSN 包含 `charset=utf8mb4&parseTime=True&loc=Local` 参数，并根据 `APP_ENV` 配置日志级别（开发环境 Info，生产环境 Silent）。

#### Scenario: 成功建立连接
- **WHEN** 传入有效的数据库配置
- **THEN** 返回可用的 `*gorm.DB` 实例及 cleanup 函数，连接池参数（MaxOpenConns、MaxIdleConns、ConnMaxLifetime）与原配置一致

#### Scenario: 连接失败
- **WHEN** 数据库地址不可达或凭证错误
- **THEN** 返回非 nil error，程序启动中止

### Requirement: DAO 层隔离数据库模型
`internal/repository/dao/` 下 SHALL 存在 `UserDAO`、`TenantDAO`、`RefreshTokenDAO`、`SmsCodeDAO` 四个结构体，手动声明所有列字段及 `gorm:"column:..."` tag，实现 `TableName() string` 方法。domain 模型（`domain.User` 等）不得携带任何 GORM tag。每个 DAO 文件 SHALL 提供 `toDAO` 和 `toDomain` 转换函数。

#### Scenario: 列名映射
- **WHEN** GORM 对 DAO 结构体执行 `First` 或 `Find`
- **THEN** 返回的结构体字段与数据库列值正确对应，包括可为 NULL 的指针字段

#### Scenario: domain 模型保持纯净
- **WHEN** 查看 `internal/domain/` 下任意文件
- **THEN** 不包含任何 `gorm:` struct tag

### Requirement: 仓库实现使用 GORM API
`internal/repository/impl/` 下的四个仓库 SHALL 使用 GORM 的 `Create`、`Save`、`First`、`Where`、`Updates` 等方法替代原始 SQL，同时保持原有接口契约不变。

#### Scenario: 创建用户
- **WHEN** 调用 `UserRepo.Create(ctx, user)`
- **THEN** 用户记录被插入数据库，无 error 返回

#### Scenario: 用户不存在时查询
- **WHEN** 调用 `UserRepo.FindByID(ctx, nonExistentID)`
- **THEN** 返回 `domain.ErrNotFound` 错误

#### Scenario: 租户查询所有
- **WHEN** 调用 `TenantRepo.FindAll(ctx, filter)`
- **THEN** 返回符合过滤条件的租户列表，无 error

### Requirement: GORM ErrRecordNotFound 映射
当 GORM 查询返回 `gorm.ErrRecordNotFound` 时，仓库 SHALL 将其映射为 `domain.ErrNotFound`，不将 GORM 错误类型泄露至上层。

#### Scenario: 记录不存在
- **WHEN** 任意仓库的单条查询方法未找到记录
- **THEN** 返回 `domain.ErrNotFound`，而非 `gorm.ErrRecordNotFound`

### Requirement: 迁移执行器兼容 GORM
`internal/pkg/db/migrate.go` SHALL 使用 `*gorm.DB` 执行迁移 SQL，通过 `gorm.DB.Exec()` 运行语句，并继续维护 `schema_migrations` 表追踪已执行的迁移。

#### Scenario: 首次运行迁移
- **WHEN** 数据库中不存在 `schema_migrations` 表
- **THEN** 自动创建该表并依次执行所有 `.up.sql` 文件

#### Scenario: 幂等执行
- **WHEN** 迁移已执行过，再次启动程序
- **THEN** 跳过已记录的迁移文件，不重复执行

### Requirement: 迁移 SQL 在 MySQL 环境正常执行
`migrations/001_init_auth_tables.up.sql` 已使用 MySQL 语法编写，迁移执行器 SHALL 能在 MySQL 8.0 环境下成功执行所有迁移文件，无语法错误。

#### Scenario: MySQL 环境执行迁移
- **WHEN** 在 MySQL 8.0 数据库上首次运行迁移
- **THEN** 所有表（tenants、users、refresh_tokens、sms_codes）成功创建，`schema_migrations` 表记录已执行的迁移文件名
