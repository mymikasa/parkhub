## ADDED Requirements

### Requirement: Five named database connection pools
The system SHALL initialize exactly 5 independent `*gorm.DB` connection pools, one per domain: `core`, `iot`, `event`, `billing`, `payment`. Each pool SHALL be configured from its own DSN environment variable and SHALL be addressable by domain name within the process.

#### Scenario: All 5 pools initialize
- **WHEN** all 5 DSN env vars are valid and the databases are reachable
- **THEN** 5 distinct `*gorm.DB` instances are created, each connected to its own database

#### Scenario: Cross-domain pool isolation
- **WHEN** the `core` pool executes a query
- **THEN** the query is sent only to the `parkhub_core` database, never to `parkhub_iot` or any other domain database

### Requirement: Startup Ping verification for each pool
Each connection pool SHALL be verified with a database Ping before the HTTP server begins accepting requests. A failed Ping SHALL abort startup with an error that identifies the domain name and DSN (with password redacted).

#### Scenario: All pools Ping successfully
- **WHEN** all 5 databases are reachable
- **THEN** each pool logs `"db connected"` at DEBUG with `domain=<name>` and startup proceeds

#### Scenario: One pool Ping fails
- **WHEN** the `event` database is unreachable
- **THEN** startup aborts and logs `"db ping failed" domain=event error=<message>` at ERROR level

### Requirement: Connection pool resource limits
Each pool SHALL be configured with conservative resource limits suitable for development:
- `MaxOpenConns = 5`
- `MaxIdleConns = 2`
- `ConnMaxLifetime = 30m`

These SHALL be overridable per-domain via environment variables following the pattern `<DOMAIN>_DB_MAX_OPEN_CONNS`.

#### Scenario: Default limits applied
- **WHEN** no `<DOMAIN>_DB_MAX_OPEN_CONNS` env vars are set
- **THEN** each pool is configured with `MaxOpenConns=5, MaxIdleConns=2`

#### Scenario: Override for specific domain
- **WHEN** `CORE_DB_MAX_OPEN_CONNS=20` is set
- **THEN** only the `core` pool uses `MaxOpenConns=20`; others remain at the default 5

### Requirement: Per-domain init migration on startup
The system SHALL run the corresponding `migrations/<domain>/000_init.up.sql` against each database during startup, before Ping verification completes. The migration SHALL be idempotent (`CREATE DATABASE IF NOT EXISTS`).

#### Scenario: Fresh database
- **WHEN** the target database does not yet exist
- **THEN** `migrations/core/000_init.up.sql` creates `parkhub_core` and the pool connects to it

#### Scenario: Already migrated
- **WHEN** the database already exists
- **THEN** the `IF NOT EXISTS` clause causes the migration to succeed silently without error
