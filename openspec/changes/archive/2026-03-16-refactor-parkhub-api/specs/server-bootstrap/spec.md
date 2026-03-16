## ADDED Requirements

### Requirement: Server startup from environment configuration
The system SHALL load all runtime configuration from environment variables at startup. Missing required variables SHALL cause immediate startup failure with a descriptive error message.

#### Scenario: All required env vars present
- **WHEN** `APP_PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` are all set
- **THEN** the server starts and listens on the configured port

#### Scenario: Missing required env var
- **WHEN** `JWT_SECRET` is absent from the environment
- **THEN** the process exits with a non-zero exit code and logs which variable is missing

### Requirement: Database connection pool initialization
The system SHALL initialize a PostgreSQL connection pool at startup using pgx driver via `database/sql`. The pool SHALL be verified with a `Ping` before the HTTP server begins accepting requests.

#### Scenario: Database reachable
- **WHEN** the database is running and credentials are valid
- **THEN** connection pool is created and `db.Ping()` succeeds within startup

#### Scenario: Database unreachable at startup
- **WHEN** the database host is unreachable
- **THEN** startup fails immediately with a logged error, process exits non-zero

### Requirement: Database migrations run at startup
The system SHALL execute pending SQL migrations (from `migrations/` directory) automatically on every startup before accepting HTTP traffic.

#### Scenario: Fresh database
- **WHEN** no migration has been applied
- **THEN** all `*.up.sql` files are applied in numeric order

#### Scenario: Already migrated
- **WHEN** migrations have already been applied
- **THEN** startup completes without re-applying existing migrations and without error

### Requirement: Seed data created on first run
The system SHALL create the platform admin user and demo accounts if they do not already exist, using the credentials defined in `internal/seed/seed.go`.

#### Scenario: First startup
- **WHEN** no users exist in the database
- **THEN** platform_admin, tenant_admin, and operator accounts are created

#### Scenario: Subsequent startups
- **WHEN** users already exist
- **THEN** seed is skipped without error

### Requirement: Wire-based compile-time dependency injection
All dependencies (config, db, repositories, services, handlers, router) SHALL be assembled via Google Wire generated code. Manual constructor chaining in `main.go` is not permitted.

#### Scenario: Wire graph is valid
- **WHEN** `wire gen ./internal/wire` is executed
- **THEN** `wire_gen.go` is generated without error and the resulting `InitializeApp()` function compiles

### Requirement: Structured JSON logging
The system SHALL emit structured log output in JSON format using `log/slog`. Log level SHALL default to `INFO` and be overridable via `LOG_LEVEL` env var.

#### Scenario: Request logged
- **WHEN** any HTTP request is processed
- **THEN** a log entry with level, timestamp, method, path, and status code is written to stdout

#### Scenario: LOG_LEVEL=debug set
- **WHEN** `LOG_LEVEL=debug` is in the environment
- **THEN** debug-level messages are included in output
