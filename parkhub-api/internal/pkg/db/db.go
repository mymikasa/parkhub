package db

import (
	"fmt"
	"log/slog"
	"time"

	gormmysql "gorm.io/driver/mysql"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"github.com/parkhub/api/internal/config"
)

// New initializes a MySQL connection pool using GORM.
// Returns the *gorm.DB and a cleanup function to close it.
func New(cfg *config.Config) (*gorm.DB, func(), error) {
	logLevel := gormlogger.Info
	if cfg.AppEnv == "production" {
		logLevel = gormlogger.Silent
	}

	db, err := gorm.Open(gormmysql.Open(cfg.DSN()), &gorm.Config{
		Logger: gormlogger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, nil, fmt.Errorf("open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, nil, fmt.Errorf("get sql.DB: %w", err)
	}

	sqlDB.SetMaxOpenConns(cfg.DBMaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.DBMaxIdleConns)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	if err := sqlDB.Ping(); err != nil {
		sqlDB.Close()
		return nil, nil, fmt.Errorf("ping database: %w", err)
	}

	slog.Info("database connected", "host", cfg.DBHost, "port", cfg.DBPort, "db", cfg.DBName)

	cleanup := func() {
		if err := sqlDB.Close(); err != nil {
			slog.Error("database close error", "error", err)
		}
	}

	return db, cleanup, nil
}
