## Context

ParkHub is a monorepo with two main services:
- **parkhub-api**: Go 1.23 backend with Gin framework, MySQL 8.0 database
- **parkhub-web**: Next.js 15 frontend with Node.js 20+

Currently, developers must manually install Go, Node.js, and MySQL, leading to environment inconsistencies and lengthy onboarding.

## Goals / Non-Goals

**Goals:**
- Provide single-command local development environment startup
- Ensure consistent tooling versions across all developer machines
- Support hot-reload for both frontend and backend code changes
- Persist database data between container restarts
- Enable isolated service debugging

**Non-Goals:**
- Production Docker images (separate concern)
- CI/CD pipeline configuration
- Multi-architecture builds (arm64/amd64)
- Kubernetes deployment manifests

## Decisions

### 1. Multi-stage Development Dockerfiles
**Decision**: Use separate `Dockerfile.dev` files instead of multi-purpose Dockerfiles
**Rationale**: Development images need different tools (debuggers, hot-reload) vs production. Separate files keep concerns clean.
**Alternatives**: Single Dockerfile with target stages - rejected due to complexity and slower builds

### 2. Docker Compose for Orchestration
**Decision**: Use docker-compose.yml at project root
**Rationale**: Declarative service definitions, built-in networking, volume management, and environment variable handling
**Alternatives**: 
- Shell scripts - rejected, harder to maintain
- Makefile - rejected, requires Docker knowledge anyway

### 3. Air for Go Hot-Reload
**Decision**: Use Air (cosmtrek/air) for Go backend hot-reload
**Rationale**: Most popular Go hot-reload tool, simple configuration, works well in containers
**Alternatives**: 
- CompileDaemon - less features
- Fresh - unmaintained

### 4. MySQL 8.0 with Persistent Volume
**Decision**: Use MySQL 8.0 with named volume for database persistence
**Rationale**: Data survives container restarts, easy to reset with `docker compose down -v`. MySQL aligns with existing migration scripts.
**Alternatives**: 
- PostgreSQL - rejected, existing migrations use MySQL syntax
- Bind mount - rejected, filesystem compatibility issues

## Risks / Trade-offs

- **Risk**: Docker Desktop resource usage may slow down older machines
  → Mitigation: Document recommended resource allocation (4GB+ RAM)
- **Risk**: File sync latency on macOS may slow hot-reload
  → Mitigation: Use :cached mount option, document Mutagen alternative
- **Risk**: Database migrations not auto-applied
  → Mitigation: Entrypoint script runs migrations on startup
