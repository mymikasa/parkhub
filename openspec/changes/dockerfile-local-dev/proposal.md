## Why

Setting up a consistent local development environment for ParkHub is time-consuming and error-prone. Developers need to manually install Go 1.26+, Node.js 20+, PostgreSQL, and configure environment variables. This leads to "works on my machine" issues and slows down onboarding. A Dockerfile-based development environment ensures all team members work with identical tooling and dependencies.

## What Changes

- Add `Dockerfile.dev` for parkhub-api (Go 1.23 development environment)
- Add `Dockerfile.dev` for parkhub-web (Node.js 20 development environment)
- Add `docker-compose.yml` to orchestrate all services (api, web, mysql)
- Add `.dockerignore` files for both projects
- Add development environment configuration with hot-reload support
- Add database initialization scripts for local development

## Capabilities

### New Capabilities

- `docker-dev-environment`: Containerized local development environment with hot-reload, database persistence, and service orchestration

### Modified Capabilities

- `project-setup`: Extends existing project setup capability to include Docker-based setup option

## Impact

- **Affected Code**: Root directory (docker-compose.yml), parkhub-api/, parkhub-web/
- **New Files**: Dockerfile.dev files, docker-compose.yml, .dockerignore, docker-entrypoint scripts
- **Dependencies**: Docker and Docker Compose required on developer machines
- **Database**: MySQL 8.0 container with persistent volume for local data
