package db

import (
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// RunMigrations applies pending .up.sql migration files from migrationsDir.
// It tracks applied migrations in a schema_migrations table to prevent re-execution.
func RunMigrations(db *sql.DB, migrationsDir string) error {
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

func ensureMigrationsTable(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename   TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	return err
}

func isMigrationApplied(db *sql.DB, filename string) (bool, error) {
	var count int
	err := db.QueryRow(
		`SELECT COUNT(*) FROM schema_migrations WHERE filename = $1`, filename,
	).Scan(&count)
	return count > 0, err
}

func applyMigration(db *sql.DB, filename, content string) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// Execute each statement separated by semicolons
	for _, stmt := range splitStatements(content) {
		if _, err = tx.Exec(stmt); err != nil {
			return fmt.Errorf("execute statement: %w\nSQL: %s", err, stmt)
		}
	}

	if _, err = tx.Exec(
		`INSERT INTO schema_migrations (filename) VALUES ($1)`, filename,
	); err != nil {
		return err
	}

	return tx.Commit()
}

func splitStatements(content string) []string {
	var stmts []string
	for _, s := range strings.Split(content, ";") {
		s = strings.TrimSpace(s)
		if s != "" && !strings.HasPrefix(s, "--") {
			stmts = append(stmts, s)
		}
	}
	return stmts
}
