package redis

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"strconv"

	"github.com/redis/go-redis/v9"
)

// New creates a Redis client from a URL like "redis://host:port" or "redis://host:port/db".
func New(redisURL string) (*redis.Client, func(), error) {
	addr, db, err := parseRedisURL(redisURL)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid REDIS_URL: %w", err)
	}

	client := redis.NewClient(&redis.Options{
		Addr: addr,
		DB:   db,
	})

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, nil, fmt.Errorf("redis ping failed: %w", err)
	}

	slog.Info("redis connected", "addr", addr, "db", db)

	cleanup := func() {
		if err := client.Close(); err != nil {
			slog.Error("redis close error", "error", err)
		}
	}
	return client, cleanup, nil
}

func parseRedisURL(rawURL string) (addr string, db int, err error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return "", 0, err
	}
	host := u.Hostname()
	port := u.Port()
	if port == "" {
		port = "6379"
	}
	addr = host + ":" + port

	if len(u.Path) > 1 {
		db, err = strconv.Atoi(u.Path[1:])
		if err != nil {
			return "", 0, fmt.Errorf("invalid db number in URL path: %w", err)
		}
	}
	return addr, db, nil
}
