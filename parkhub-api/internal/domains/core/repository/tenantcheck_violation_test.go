//go:build tenantcheck_violation

// Package repository contains INTENTIONAL tenant isolation violations used to
// verify that the tenantcheck linter detects them correctly.
//
// This file is excluded from normal builds via the tenantcheck_violation build
// tag. Run:
//
//	go vet -tags tenantcheck_violation -vettool=bin/tenantcheck ./internal/domains/core/repository/
package repository

import (
	"gorm.io/gorm"
)

// Violation: no-raw-sql — db.Raw() without nolint comment.
// Expected: no-raw-sql: db.Raw() bypasses tenant isolation
func violationRawSQLNoComment(db *gorm.DB) {
	_ = db.Raw("SELECT * FROM parking_lots") // want "no-raw-sql"
}

// Violation: no-raw-sql — db.Exec() without nolint comment.
// Expected: no-raw-sql: db.Exec() bypasses tenant isolation
func violationExecNoComment(db *gorm.DB) {
	_ = db.Exec("DELETE FROM parking_lots WHERE 1=1") // want "no-raw-sql"
}

// PASS case: no-raw-sql with nolint comment — should NOT be flagged.
func violationRawSQLWithNolint(db *gorm.DB) { //nolint:tenant-bypass
	_ = db.Raw("SELECT * FROM parking_lots WHERE tenant_id = 'test'")
}

// PASS case: no-raw-sql with inline nolint comment — should NOT be flagged.
func violationExecWithNolint(db *gorm.DB) {
	_ = db.Exec("DELETE FROM parking_lots WHERE tenant_id = 'test'") //nolint:tenant-bypass
}
