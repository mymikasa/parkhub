// tenantcheck is a standalone vet tool for the tenantcheck analyzer.
//
// Build and run:
//
//	go build -o bin/tenantcheck ./internal/pkg/linter/tenantcheck/cmd/tenantcheck
//	./bin/tenantcheck ./...
package main

import (
	"golang.org/x/tools/go/analysis/singlechecker"

	"github.com/parkhub/api/internal/pkg/linter/tenantcheck"
)

func main() {
	singlechecker.Main(tenantcheck.Analyzer)
}
