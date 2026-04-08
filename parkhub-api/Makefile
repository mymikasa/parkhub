.PHONY: proto-lint proto-breaking proto-gen build-monolith run-monolith build-linter lint-tenant lint-tenant-violations obs-up obs-down obs-ps obs-verify

BASE_REF ?=
BREAKING_REF ?=
CURRENT_BRANCH := $(shell git branch --show-current)
GIT_ROOT := $(shell git rev-parse --show-toplevel)
HASH := \#

ifdef BREAKING_REF
PROTO_BREAKING_SOURCE_QUERY := ref=$(BREAKING_REF)
else ifdef BASE_REF
PROTO_BREAKING_SOURCE_QUERY := branch=$(BASE_REF)
else ifeq ($(CURRENT_BRANCH),refactor/microservices)
PROTO_BREAKING_SOURCE_QUERY := ref=HEAD~1
else
PROTO_BREAKING_SOURCE_QUERY := branch=refactor/microservices
endif

PROTO_BREAKING_AGAINST := $(GIT_ROOT)/.git$(HASH)$(PROTO_BREAKING_SOURCE_QUERY),subdir=parkhub-api

# buf 工具链
proto-lint:
	buf lint

proto-breaking:
	buf breaking --against '$(PROTO_BREAKING_AGAINST)'

proto-gen:
	buf generate

# 租户隔离 linter
build-linter:
	go build -o bin/tenantcheck ./internal/pkg/linter/tenantcheck/cmd/tenantcheck

lint-tenant: build-linter
	go vet -vettool=./bin/tenantcheck ./...

lint-tenant-violations: build-linter
	@echo "--- Verifying tenantcheck detects intentional violations ---"
	@! go vet -tags tenantcheck_violation -test -vettool=./bin/tenantcheck ./internal/domains/core/repository/ 2>&1 | grep -q "no-raw-sql" && echo "FAIL: no-raw-sql not detected" && exit 1 || true
	@! go vet -tags tenantcheck_violation -test -vettool=./bin/tenantcheck ./internal/domains/core/repository/ 2>&1 | grep -q "must-use-with-tenant" && echo "FAIL: must-use-with-tenant not detected" && exit 1 || true
	@! go vet -tags tenantcheck_violation -test -vettool=./bin/tenantcheck ./internal/domains/core/service/ 2>&1 | grep -q "no-gorm-outside-repo" && echo "FAIL: no-gorm-outside-repo not detected" && exit 1 || true
	@echo "--- All intentional violations detected correctly ---"

# 可观测性栈（Task 0.8）
obs-up:
	docker compose -f deploy/observability/docker-compose.observability.yml up -d

obs-down:
	docker compose -f deploy/observability/docker-compose.observability.yml down

obs-ps:
	docker compose -f deploy/observability/docker-compose.observability.yml ps

# Task 0.8 §7 端到端验收：要求 obs-up 已启动且 monolith 正在运行
obs-verify:
	./scripts/verify-observability.sh

# 单进程入口 (Task 0.7 目标架构入口 — cmd/monolith)
build-monolith:
	go build -o bin/monolith ./cmd/monolith

run-monolith: obs-up build-monolith
	OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317 \
	OTEL_EXPORTER_OTLP_INSECURE=true \
	./bin/monolith -config .env.monolith
