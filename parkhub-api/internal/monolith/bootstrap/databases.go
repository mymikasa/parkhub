package bootstrap

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"github.com/parkhub/api/internal/monolith/config"
)

// initSQL maps domain name → CREATE DATABASE statement.
// These are identical to migrations/<domain>/000_init.up.sql and
// are compiled into the binary so the monolith can self-bootstrap
// without relying on an external migration tool.
var initSQL = map[string]string{
	"core":    "CREATE DATABASE IF NOT EXISTS parkhub_core    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
	"iot":     "CREATE DATABASE IF NOT EXISTS parkhub_iot     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
	"event":   "CREATE DATABASE IF NOT EXISTS parkhub_event   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
	"billing": "CREATE DATABASE IF NOT EXISTS parkhub_billing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
	"payment": "CREATE DATABASE IF NOT EXISTS parkhub_payment CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
}

// domainDB holds the DSN and pool size for one domain database.
type domainDB struct {
	name         string
	dsn          string
	maxOpenConns int
}

// InitDatabases opens and Pings all 5 domain databases.
// It returns:
//   - a map[domain]*gorm.DB  (keys: core, iot, event, billing, payment)
//   - a cleanup func that closes all pools
//   - an error if any pool fails to open or Ping
//
// On error, cleanup() closes any already-opened pools.
func InitDatabases(cfg *config.MonolithConfig) (map[string]*gorm.DB, func(), error) {
	domains := []domainDB{
		{name: "core",    dsn: cfg.CoreDSN,    maxOpenConns: cfg.CoreMaxOpenConns},
		{name: "iot",     dsn: cfg.IoTDSN,     maxOpenConns: cfg.IoTMaxOpenConns},
		{name: "event",   dsn: cfg.EventDSN,   maxOpenConns: cfg.EventMaxOpenConns},
		{name: "billing", dsn: cfg.BillingDSN, maxOpenConns: cfg.BillingMaxOpenConns},
		{name: "payment", dsn: cfg.PaymentDSN, maxOpenConns: cfg.PaymentMaxOpenConns},
	}

	dbs := make(map[string]*gorm.DB, len(domains))
	var mu sync.Mutex

	cleanup := func() {
		mu.Lock()
		defer mu.Unlock()
		for name, db := range dbs {
			sqlDB, err := db.DB()
			if err == nil {
				if closeErr := sqlDB.Close(); closeErr != nil {
					slog.Error("db close error", "domain", name, "error", closeErr)
				}
			}
		}
	}

	type result struct {
		name string
		db   *gorm.DB
		err  error
	}

	ch := make(chan result, len(domains))
	for _, d := range domains {
		go func() {
			db, err := openDB(d, cfg)
			ch <- result{name: d.name, db: db, err: err}
		}()
	}

	var firstErr error
	for range domains {
		r := <-ch
		if r.err != nil {
			if firstErr == nil {
				firstErr = fmt.Errorf("domain %s: %w", r.name, r.err)
			}
		} else {
			mu.Lock()
			dbs[r.name] = r.db
			mu.Unlock()
			slog.Debug("db connected", "domain", r.name)
		}
	}

	if firstErr != nil {
		cleanup()
		return nil, func() {}, firstErr
	}

	return dbs, cleanup, nil
}

func openDB(d domainDB, cfg *config.MonolithConfig) (*gorm.DB, error) {
	gormCfg := &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Silent),
	}

	// Expect d.dsn to be a server-level DSN without a database name.
	// See .env.monolith for the phase-0 contract: monolith starts by running
	// CREATE DATABASE IF NOT EXISTS before using the domain database.
	db, err := gorm.Open(mysql.Open(d.dsn), gormCfg)
	if err != nil {
		return nil, fmt.Errorf("open: %w", err)
	}

	// Run init migration (idempotent CREATE DATABASE IF NOT EXISTS).
	if sql, ok := initSQL[d.name]; ok {
		if err := db.Exec(sql).Error; err != nil {
			return nil, fmt.Errorf("init migration: %w", err)
		}
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get sql.DB: %w", err)
	}
	sqlDB.SetMaxOpenConns(d.maxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.DefaultMaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.DefaultConnMaxLife)

	// Ping with 5-second deadline.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := sqlDB.PingContext(ctx); err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("ping: %w", err)
	}

	return db, nil
}
