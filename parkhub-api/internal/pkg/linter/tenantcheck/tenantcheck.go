// Package tenantcheck defines a go/analysis analyzer that enforces tenant
// isolation rules in the parkhub-api codebase.
//
// Three rules are checked:
//
//  1. no-gorm-outside-repo: *gorm.DB must not be accessed outside
//     internal/domains/*/repository/ packages.
//
//  2. must-use-with-tenant: inside repository packages, direct field
//     accesses like r.db.Where(...) are forbidden — callers must use
//     r.WithTenant(ctx) or r.WithTenantExplicit(ctx, id).
//
//  3. no-raw-sql: db.Raw() / db.Exec() calls require an explicit
//     //nolint:tenant-bypass comment on the same or preceding line.
//
// Usage:
//
//	go vet -vettool=$(which tenantcheck) ./...
//	  or
//	go run ./internal/pkg/linter/tenantcheck/cmd/tenantcheck ./...
package tenantcheck

import (
	"go/ast"
	"go/token"
	"go/types"
	"path"
	"strings"

	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/passes/inspect"
	"golang.org/x/tools/go/ast/inspector"
)

// Analyzer is the top-level tenantcheck analyzer.
var Analyzer = &analysis.Analyzer{
	Name:     "tenantcheck",
	Doc:      "enforce tenant isolation rules in parkhub-api",
	Requires: []*analysis.Analyzer{inspect.Analyzer},
	Run:      run,
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

// isRepositoryPkg returns true for paths matching internal/domains/*/repository.
func isRepositoryPkg(pkgPath string) bool {
	// pkgPath is e.g. "github.com/parkhub/api/internal/domains/core/repository"
	base := path.Base(pkgPath)
	if base != "repository" {
		return false
	}
	parent := path.Dir(pkgPath)
	grandparent := path.Dir(parent)
	return strings.HasSuffix(grandparent, "/internal/domains")
}

// isPkgAllowed reports whether the package is explicitly allowed to use *gorm.DB
// without tenant isolation checks (infra-level code, legacy monolith, etc.).
func isPkgAllowed(pkgPath string) bool {
	allowed := []string{
		"internal/pkg/db",       // BaseRepo + migrations — infra-level
		"internal/pkg/linter/",  // the linter itself
		"internal/repository/",  // legacy monolith repo package
		"internal/dao/",         // legacy monolith dao package
		"internal/migrations",   // migration scripts
		"internal/seed",         // seed data — infra-level, no tenant scope
		"internal/service/impl", // legacy monolith services (migrated in later phases)
		"internal/service/test", // legacy service tests
		"internal/monolith/",    // bootstrap / health infra for phase 0 monolith
	}
	for _, a := range allowed {
		if strings.Contains(pkgPath, a) {
			return true
		}
	}
	return false
}

// ---------------------------------------------------------------------------
// GORM type helpers
// ---------------------------------------------------------------------------

func isGormDBType(t types.Type) bool {
	named, ok := t.(*types.Named)
	if !ok {
		return false
	}
	obj := named.Obj()
	return obj.Pkg() != nil &&
		obj.Pkg().Path() == "gorm.io/gorm" &&
		obj.Name() == "DB"
}

// isGormDBPtrOrNamed checks both *gorm.DB and gorm.DB.
func isGormDBPtrOrNamed(t types.Type) bool {
	if isGormDBType(t) {
		return true
	}
	ptr, ok := t.(*types.Pointer)
	if ok {
		return isGormDBType(ptr.Elem())
	}
	return false
}

// ---------------------------------------------------------------------------
// nolint comment detection
// ---------------------------------------------------------------------------

func hasNolintComment(fset *token.FileSet, files []*ast.File, pos token.Pos) bool {
	for _, f := range files {
		start, end := f.FileStart, f.FileEnd
		if pos < start || pos > end {
			continue
		}
		posLine := fset.Position(pos).Line
		for _, cg := range f.Comments {
			for _, c := range cg.List {
				cLine := fset.Position(c.Slash).Line
				// Check the comment on the same line, or up to 2 lines before
				// (handles function-level doc comments).
				if cLine >= posLine-2 && cLine <= posLine {
					if strings.Contains(c.Text, "nolint:tenant-bypass") ||
						strings.Contains(c.Text, "nolint:tenantcheck") {
						return true
					}
				}
			}
		}
	}
	return false
}

// ---------------------------------------------------------------------------
// Main run function
// ---------------------------------------------------------------------------

func run(pass *analysis.Pass) (any, error) {
	inspect := pass.ResultOf[inspect.Analyzer].(*inspector.Inspector)
	pkgPath := pass.Pkg.Path()

	// Don't lint the linter itself.
	if strings.Contains(pkgPath, "internal/pkg/linter/") {
		return nil, nil
	}

	// Skip all rules for allowed packages (infra, legacy monolith).
	if isPkgAllowed(pkgPath) {
		return nil, nil
	}

	// -----------------------------------------------------------------------
	// Rule 1: no-gorm-outside-repo
	// *gorm.DB must not appear outside internal/domains/*/repository/
	// -----------------------------------------------------------------------
	if !isRepositoryPkg(pkgPath) {
		nodeFilter := []ast.Node{(*ast.SelectorExpr)(nil), (*ast.ValueSpec)(nil)}

		inspect.Preorder(nodeFilter, func(n ast.Node) {
			switch node := n.(type) {
			case *ast.SelectorExpr:
				tv, ok := pass.TypesInfo.Types[node.X]
				if !ok {
					return
				}
				if isGormDBPtrOrNamed(tv.Type) {
					pass.Reportf(node.Pos(),
						"no-gorm-outside-repo: *gorm.DB accessed outside repository package (%s)", pkgPath)
				}

			case *ast.ValueSpec:
				// Check type declaration: var x *gorm.DB
				for _, name := range node.Names {
					obj := pass.TypesInfo.ObjectOf(name)
					if obj != nil && isGormDBPtrOrNamed(obj.Type()) {
						pass.Reportf(node.Pos(),
							"no-gorm-outside-repo: *gorm.DB used outside repository package (%s)", pkgPath)
						return
					}
				}
				// Check value assignment: var x = someGormDB
				for _, val := range node.Values {
					tv, ok := pass.TypesInfo.Types[val]
					if !ok {
						continue
					}
					if isGormDBPtrOrNamed(tv.Type) {
						pass.Reportf(node.Pos(),
							"no-gorm-outside-repo: *gorm.DB used outside repository package (%s)", pkgPath)
						return
					}
				}
			}
		})
	}

	// -----------------------------------------------------------------------
	// Rule 2: must-use-with-tenant
	// Inside repository packages, direct r.db.Where(...) is forbidden.
	// Must use r.WithTenant(ctx) or r.WithTenantExplicit(ctx, id).
	// -----------------------------------------------------------------------
	if isRepositoryPkg(pkgPath) {
		nodeFilter := []ast.Node{(*ast.SelectorExpr)(nil)}

		inspect.Preorder(nodeFilter, func(n ast.Node) {
			sel := n.(*ast.SelectorExpr)

			// Resolve the type of sel.X so we can confirm it is *gorm.DB.
			// Use TypesInfo.Types first (covers both *ast.Ident "db" and
			// *ast.SelectorExpr "r.db"); fall back to ObjectOf for bare idents.
			var isGormDB bool
			if tv, ok := pass.TypesInfo.Types[sel.X]; ok {
				isGormDB = isGormDBPtrOrNamed(tv.Type)
			} else if ident, ok := sel.X.(*ast.Ident); ok {
				if obj := pass.TypesInfo.ObjectOf(ident); obj != nil {
					isGormDB = isGormDBPtrOrNamed(obj.Type())
				}
			}
			if !isGormDB {
				return
			}

			// Allow .DB() method (BaseRepo method to get raw db for migrations).
			if sel.Sel.Name == "DB" {
				return
			}

			pass.Reportf(sel.Pos(),
				"must-use-with-tenant: direct r.db.%s() bypasses tenant isolation — use r.WithTenant(ctx) instead",
				sel.Sel.Name)
		})
	}

	// -----------------------------------------------------------------------
	// Rule 3: no-raw-sql
	// db.Raw() / db.Exec() require //nolint:tenant-bypass comment.
	// Only checked in repository packages — other packages are covered by
	// Rule 1 which bans *gorm.DB access entirely outside repos.
	// -----------------------------------------------------------------------
	if isRepositoryPkg(pkgPath) {
		nodeFilter := []ast.Node{(*ast.CallExpr)(nil)}
		inspect.Preorder(nodeFilter, func(n ast.Node) {
			call := n.(*ast.CallExpr)

			fun, ok := call.Fun.(*ast.SelectorExpr)
			if !ok {
				return
			}

			methodName := fun.Sel.Name
			if methodName != "Raw" && methodName != "Exec" {
				return
			}

			tv, ok := pass.TypesInfo.Types[fun.X]
			if !ok {
				return
			}
			if !isGormDBPtrOrNamed(tv.Type) {
				return
			}

			if hasNolintComment(pass.Fset, pass.Files, fun.Pos()) {
				return
			}

			pass.Reportf(fun.Pos(),
				"no-raw-sql: db.%s() bypasses tenant isolation — add //nolint:tenant-bypass if intentional",
				methodName)
		})
	}

	return nil, nil
}
