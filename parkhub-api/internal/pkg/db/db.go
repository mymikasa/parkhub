package db

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/parkhub/api/internal/config"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// New initializes a PostgreSQL connection pool using the pgx driver.
// Returns the *sql.DB and a cleanup function to close it.
func New(cfg *config.Config) (*sql.DB, func(), error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode,
	)

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, nil, fmt.Errorf("open database: %w", err)
	}

	db.SetMaxOpenConns(cfg.DBMaxOpenConns)
	db.SetMaxIdleConns(cfg.DBMaxIdleConns)
	db.SetConnMaxLifetime(30 * time.Minute)

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, nil, fmt.Errorf("ping database: %w", err)
	}

	cleanup := func() {
		db.Close()
	}

	return db, cleanup, nil
}
