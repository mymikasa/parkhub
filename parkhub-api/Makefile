.PHONY: proto-lint proto-breaking proto-gen build-monolith run-monolith build-linter lint-tenant lint-tenant-violations

# buf 工具链
proto-lint:
	buf lint

proto-breaking:
	buf breaking --against '.git#branch=main,subdir=parkhub-api'

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

# 单进程入口 (Task 0.7 目标架构入口 — cmd/monolith)
build-monolith:
	go build -o bin/monolith ./cmd/monolith

run-monolith: build-monolith
	./bin/monolith -config .env.monolith
