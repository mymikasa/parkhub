package impl

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/wire"
	"github.com/parkhub/api/internal/repository"
)

// SmsCodeRepoSet is the Wire provider set for SmsCodeRepo.
var SmsCodeRepoSet = wire.NewSet(NewSmsCodeRepo)

type smsCodeRepo struct {
	db *sql.DB
}

func NewSmsCodeRepo(db *sql.DB) repository.SmsCodeRepo {
	return &smsCodeRepo{db: db}
}

func (r *smsCodeRepo) Create(ctx context.Context, code *repository.SmsCode) error {
	query := `
		INSERT INTO sms_codes (id, phone, code, purpose, expires_at, used, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	_, err := r.db.ExecContext(ctx, query,
		code.ID,
		code.Phone,
		code.Code,
		string(code.Purpose),
		code.ExpiresAt,
		code.Used,
		code.CreatedAt,
	)
	return err
}

func (r *smsCodeRepo) FindLatestValid(ctx context.Context, phone, purpose string) (*repository.SmsCode, error) {
	query := `
		SELECT id, phone, code, purpose, expires_at, used, created_at
		FROM sms_codes
		WHERE phone = ? AND purpose = ? AND used = 0 AND expires_at > ?
		ORDER BY created_at DESC
		LIMIT 1
	`
	code := &repository.SmsCode{}
	var purposeStr string

	err := r.db.QueryRowContext(ctx, query, phone, purpose, time.Now()).Scan(
		&code.ID,
		&code.Phone,
		&code.Code,
		&purposeStr,
		&code.ExpiresAt,
		&code.Used,
		&code.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("valid sms code not found")
		}
		return nil, err
	}

	code.Purpose = repository.SmsCodePurpose(purposeStr)
	return code, nil
}

func (r *smsCodeRepo) MarkUsed(ctx context.Context, id string) error {
	query := `UPDATE sms_codes SET used = 1 WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *smsCodeRepo) DeleteExpired(ctx context.Context) error {
	query := `DELETE FROM sms_codes WHERE expires_at < ? OR used = 1`
	_, err := r.db.ExecContext(ctx, query, time.Now())
	return err
}

// CheckSendFrequency 检查发送频率（60秒内不能重复发送）
func (r *smsCodeRepo) CheckSendFrequency(ctx context.Context, phone string) (bool, error) {
	query := `
		SELECT COUNT(*) FROM sms_codes
		WHERE phone = ? AND created_at > ?
	`
	var count int
	err := r.db.QueryRowContext(ctx, query, phone, time.Now().Add(-60*time.Second)).Scan(&count)
	if err != nil {
		return false, err
	}
	return count == 0, nil
}
