//go:build tenantcheck_violation

// Package service contains INTENTIONAL tenant isolation violations used to
// verify that the tenantcheck linter detects no-gorm-outside-repo violations.
//
// This file is excluded from normal builds via the tenantcheck_violation build tag.
package service

import (
	"gorm.io/gorm"
)

// Violation: no-gorm-outside-repo — *gorm.DB used outside repository package.
// Expected: no-gorm-outside-repo: *gorm.DB used outside repository package
var leakyDB *gorm.DB // want "no-gorm-outside-repo"

// Violation: no-gorm-outside-repo — calling method on *gorm.DB in service layer.
// Expected: no-gorm-outside-repo: *gorm.DB accessed outside repository package
func violationDBAccessInService(db *gorm.DB) {
	_ = db.Find(nil) // want "no-gorm-outside-repo"
}
