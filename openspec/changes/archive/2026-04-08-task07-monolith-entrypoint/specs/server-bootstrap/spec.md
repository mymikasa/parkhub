## MODIFIED Requirements

### Requirement: Database connection pool initialization
The system SHALL initialize database connection pools at startup using GORM with the MySQL driver. In `cmd/monolith`, **five** independent pools SHALL be created (core, iot, event, billing, payment), each configured from its own DSN. In `cmd/server` (legacy path), the existing single-pool behavior is unchanged.

#### Scenario: Five pools initialized (monolith path)
- **WHEN** `cmd/monolith` starts with all 5 DSN env vars set
- **THEN** 5 distinct `*gorm.DB` instances are created, each verified with `Ping` before HTTP traffic is accepted

#### Scenario: Single pool initialized (legacy path)
- **WHEN** `cmd/server` starts with `DB_HOST`, `DB_NAME`, etc. configured
- **THEN** a single `*gorm.DB` instance is created, preserving current behavior

## ADDED Requirements

### Requirement: Per-domain migration directory structure
The system's migration files SHALL be organized under `migrations/<domain>/` subdirectories, one per domain database. Each domain SHALL have at minimum a `000_init.up.sql` file that creates the database if it does not exist.

#### Scenario: Init migration creates database
- **WHEN** `migrations/core/000_init.up.sql` is executed against a MySQL instance
- **THEN** the `parkhub_core` database is created (if it does not already exist)

#### Scenario: Idempotent re-run
- **WHEN** `migrations/core/000_init.up.sql` is executed a second time
- **THEN** no error is returned and the existing database is unchanged
