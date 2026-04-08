## ADDED Requirements

### Requirement: Configuration loading from environment variables
`cmd/monolith` SHALL load all runtime configuration exclusively from environment variables at startup. Missing required variables SHALL cause immediate startup failure with a descriptive error message listing all missing variables.

#### Scenario: All required env vars present
- **WHEN** all required env vars (`CORE_DB_DSN`, `IOT_DB_DSN`, `EVENT_DB_DSN`, `BILLING_DB_DSN`, `PAYMENT_DB_DSN`, `APP_PORT`, `JWT_SECRET`) are set
- **THEN** the process starts without error and logs `"monolith starting"` at INFO level

#### Scenario: Missing required env var
- **WHEN** `CORE_DB_DSN` is absent from the environment
- **THEN** the process exits with exit code 1 and logs which variable is missing before any dependency is initialized

### Requirement: Deterministic startup initialization order
`cmd/monolith` SHALL initialize dependencies in the following strict order:
1. Load configuration
2. Initialize logger
3. Initialize OpenTelemetry SDK
4. Initialize all 5 database connection pools (with Ping verification)
5. Initialize in-process gRPC server
6. Register HTTP handlers (`/healthz`)
7. Start HTTP server and begin accepting requests

Any failure at steps 3–6 SHALL abort startup with a non-zero exit code. Step 7 failure SHALL be logged and the process shall exit.

#### Scenario: All dependencies initialize successfully
- **WHEN** all 5 databases are reachable and OTel SDK initializes without error
- **THEN** the HTTP server starts and logs the bound port

#### Scenario: Database Ping fails during startup
- **WHEN** any one of the 5 databases is unreachable at startup
- **THEN** startup aborts at step 4 with a descriptive log identifying which database failed

### Requirement: Graceful shutdown on OS signal
`cmd/monolith` SHALL intercept `SIGINT` and `SIGTERM` and perform a graceful shutdown sequence with a 15-second total deadline:
1. Stop accepting new HTTP requests (HTTP server Shutdown)
2. Stop in-process gRPC server (GracefulStop)
3. Close all 5 database connection pools

#### Scenario: Clean shutdown within deadline
- **WHEN** SIGTERM is received and all in-flight requests complete within 15 seconds
- **THEN** the process exits with code 0 and logs `"monolith stopped cleanly"`

#### Scenario: Shutdown deadline exceeded
- **WHEN** SIGTERM is received but in-flight requests do not complete within 15 seconds
- **THEN** the process force-exits and logs `"shutdown deadline exceeded, forcing exit"`

### Requirement: Structured JSON logging
`cmd/monolith` SHALL emit structured log output in JSON format using `log/slog`. Log level SHALL default to `INFO` and be overridable via `LOG_LEVEL` env var.

#### Scenario: Startup log at INFO
- **WHEN** the monolith starts
- **THEN** a JSON log entry with fields `env`, `port`, `otel_endpoint` is emitted at INFO level

#### Scenario: LOG_LEVEL=debug
- **WHEN** `LOG_LEVEL=debug` is set
- **THEN** debug-level messages (e.g., per-database connection success) are included in output
