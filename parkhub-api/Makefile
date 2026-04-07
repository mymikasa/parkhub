.PHONY: proto-lint proto-breaking proto-gen build-monolith run-monolith

# buf 工具链
proto-lint:
	buf lint

proto-breaking:
	buf breaking --against '.git#branch=main,subdir=parkhub-api'

proto-gen:
	buf generate

# 单进程入口
build-monolith:
	go build -o bin/monolith ./cmd/server

run-monolith: build-monolith
	./bin/monolith
