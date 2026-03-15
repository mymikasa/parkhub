package impl

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/parkhub/api/internal/repository"
)

type refreshTokenRepo struct {
	db *sql.DB
}

func NewRefreshTokenRepo(db *sql.DB) repository.RefreshTokenRepo {
	return &refreshTokenRepo{db: db}
}

func (r *refreshTokenRepo) Create(ctx context.Context, token *repository.RefreshToken) error {
	query := `
		INSERT INTO refresh_tokens (id, user_id, token_hash, device_info, ip_address, expires_at, revoked, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`
	var deviceInfo, ipAddress interface{}
	if token.DeviceInfo != nil {
		deviceInfo = *token.DeviceInfo
	}
	if token.IPAddress != nil {
		ipAddress = *token.IPAddress
	}

	_, err := r.db.ExecContext(ctx, query,
		token.ID,
		token.UserID,
		token.TokenHash,
		deviceInfo,
		ipAddress,
		token.ExpiresAt,
		token.Revoked,
		token.CreatedAt,
	)
	return err
}

func (r *refreshTokenRepo) FindByTokenHash(ctx context.Context, tokenHash string) (*repository.RefreshToken, error) {
	query := `
		SELECT id, user_id, token_hash, device_info, ip_address, expires_at, revoked, created_at
		FROM refresh_tokens WHERE token_hash = ?
	`
	token := &repository.RefreshToken{}
	var deviceInfo, ipAddress sql.NullString

	err := r.db.QueryRowContext(ctx, query, tokenHash).Scan(
		&token.ID,
		&token.UserID,
		&token.TokenHash,
		&deviceInfo,
		&ipAddress,
		&token.ExpiresAt,
		&token.Revoked,
		&token.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("refresh token not found")
		}
		return nil, err
	}

	if deviceInfo.Valid {
		token.DeviceInfo = &deviceInfo.String
	}
	if ipAddress.Valid {
		token.IPAddress = &ipAddress.String
	}

	return token, nil
}

func (r *refreshTokenRepo) Revoke(ctx context.Context, id string) error {
	query := `UPDATE refresh_tokens SET revoked = 1 WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *refreshTokenRepo) RevokeByUserID(ctx context.Context, userID string) error {
	query := `UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?`
	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

func (r *refreshTokenRepo) DeleteExpired(ctx context.Context) error {
	query := `DELETE FROM refresh_tokens WHERE expires_at < ? OR revoked = 1`
	_, err := r.db.ExecContext(ctx, query, time.Now())
	return err
}
