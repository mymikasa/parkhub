package redis

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/redis/go-redis/v9"
)

// New creates a Redis client from a URL like "redis://:password@host:port/db".
func New(redisURL string) (*redis.Client, func(), error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid REDIS_URL: %w", err)
	}

	client := redis.NewClient(opts)

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, nil, fmt.Errorf("redis ping failed: %w", err)
	}

	slog.Info("redis connected", "addr", opts.Addr, "db", opts.DB)

	cleanup := func() {
		if err := client.Close(); err != nil {
			slog.Error("redis close error", "error", err)
		}
	}
	return client, cleanup, nil
}
