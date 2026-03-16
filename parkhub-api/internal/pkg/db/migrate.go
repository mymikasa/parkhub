package db

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"gorm.io/gorm"
)

// RunMigrations applies pending .up.sql migration files from migrationsDir.
// It tracks applied migrations in a schema_migrations table to prevent re-execution.
func RunMigrations(db *gorm.DB, migrationsDir string) error {
	if err := ensureMigrationsTable(db); err != nil {
		return fmt.Errorf("ensure migrations table: %w", err)
	}

	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.up.sql"))
	if err != nil {
		return fmt.Errorf("glob migrations: %w", err)
	}
	sort.Strings(files)

	for _, file := range files {
		name := filepath.Base(file)
		applied, err := isMigrationApplied(db, name)
		if err != nil {
			return fmt.Errorf("check migration %s: %w", name, err)
		}
		if applied {
			slog.Debug("migration already applied, skipping", "file", name)
			continue
		}

		content, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", name, err)
		}

		slog.Info("applying migration", "file", name)
		if err := applyMigration(db, name, string(content)); err != nil {
			return fmt.Errorf("apply migration %s: %w", name, err)
		}
		slog.Info("migration applied", "file", name)
	}

	return nil
}

func ensureMigrationsTable(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename   VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`).Error
}

func isMigrationApplied(db *gorm.DB, filename string) (bool, error) {
	var count int64
	err := db.Raw(`SELECT COUNT(*) FROM schema_migrations WHERE filename = ?`, filename).Scan(&count).Error
	return count > 0, err
}

func applyMigration(db *gorm.DB, filename, content string) error {
	return db.Transaction(func(tx *gorm.DB) error {
		for _, stmt := range splitStatements(content) {
			if err := tx.Exec(stmt).Error; err != nil {
				return fmt.Errorf("execute statement: %w\nSQL: %s", err, stmt)
			}
		}
		return tx.Exec(`INSERT INTO schema_migrations (filename) VALUES (?)`, filename).Error
	})
}

func splitStatements(content string) []string {
	var stmts []string
	for _, s := range strings.Split(content, ";") {
		s = removeComments(s)
		s = strings.TrimSpace(s)
		if s != "" {
			stmts = append(stmts, s)
		}
	}
	return stmts
}

func removeComments(s string) string {
	var lines []string
	for _, line := range strings.Split(s, "\n") {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "--") {
			lines = append(lines, line)
		}
	}
	return strings.Join(lines, "\n")
}
