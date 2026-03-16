# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ParkHub is a smart parking management SaaS platform for property management companies and commercial complexes. The project is a monorepo with two main components:

- **parkhub-api**: Go backend with Gin framework, implementing a clean architecture (domain/service/repository/handler layers)
- **parkhub-web**: Next.js 15 frontend using App Router with shadcn/ui components

The system supports multi-tenant architecture where platform admins manage tenants, and tenant admins manage their parking lots, devices, and billing rules.

## @ References

For detailed guidance, refer to these rule files:

| File | Description |
|-------|-------------|
| `.claude/rules/product_manager.md` | Product design philosophy, workflow, and domain expertise |
| `.claude/rules/ui.md` | UI/UX design standards and fidelity requirements |
| `.claude/rules/backend.md` | Backend architecture, multi-tenant model, auth flow, IoT integration |
| `.claude/rules/frontend.md` | Frontend architecture, routing, and component standards |

## Quick Links

- **API Specs**: [parkhub-api/docs/openapi.yaml](parkhub-api/docs/openapi.yaml)
- **Deployment**: [parkhub-api/docs/deployment.md](parkhub-api/docs/deployment.md)
- **PRD**: [docs/prd-mvp.md](docs/prd-mvp.md)
- **MVP Scope**: [docs/mvp-scope.md](docs/mvp-scope.md)
- **Product Plan**: [docs/product-plan.md](docs/product-plan.md)
