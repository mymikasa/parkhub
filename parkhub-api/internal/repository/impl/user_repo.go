package impl

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
)

type userRepo struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) repository.UserRepo {
	return &userRepo{db: db}
}

func (r *userRepo) Create(ctx context.Context, user *domain.User) error {
	query := `
		INSERT INTO users (id, tenant_id, username, email, phone, password_hash, real_name, role, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	var tenantID interface{}
	if user.TenantID != nil {
		tenantID = *user.TenantID
	}

	_, err := r.db.ExecContext(ctx, query,
		user.ID,
		tenantID,
		user.Username,
		user.Email,
		user.Phone,
		user.PasswordHash,
		user.RealName,
		string(user.Role),
		string(user.Status),
		user.CreatedAt,
		user.UpdatedAt,
	)
	return err
}

func (r *userRepo) Update(ctx context.Context, user *domain.User) error {
	query := `
		UPDATE users
		SET real_name = ?, role = ?, status = ?, last_login_at = ?, updated_at = ?
		WHERE id = ?
	`
	var lastLoginAt interface{}
	if user.LastLoginAt != nil {
		lastLoginAt = *user.LastLoginAt
	}

	result, err := r.db.ExecContext(ctx, query,
		user.RealName,
		string(user.Role),
		string(user.Status),
		lastLoginAt,
		time.Now(),
		user.ID,
	)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return domain.ErrUserNotFound
	}
	return nil
}

func (r *userRepo) FindByID(ctx context.Context, id string) (*domain.User, error) {
	query := `
		SELECT id, tenant_id, username, email, phone, password_hash, real_name, role, status, last_login_at, created_at, updated_at
		FROM users WHERE id = ?
	`
	return r.scanUser(r.db.QueryRowContext(ctx, query, id))
}

func (r *userRepo) FindByUsername(ctx context.Context, username string) (*domain.User, error) {
	query := `
		SELECT id, tenant_id, username, email, phone, password_hash, real_name, role, status, last_login_at, created_at, updated_at
		FROM users WHERE username = ?
	`
	return r.scanUser(r.db.QueryRowContext(ctx, query, username))
}

func (r *userRepo) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT id, tenant_id, username, email, phone, password_hash, real_name, role, status, last_login_at, created_at, updated_at
		FROM users WHERE email = ?
	`
	return r.scanUser(r.db.QueryRowContext(ctx, query, email))
}

func (r *userRepo) FindByPhone(ctx context.Context, phone string) (*domain.User, error) {
	query := `
		SELECT id, tenant_id, username, email, phone, password_hash, real_name, role, status, last_login_at, created_at, updated_at
		FROM users WHERE phone = ?
	`
	return r.scanUser(r.db.QueryRowContext(ctx, query, phone))
}

func (r *userRepo) FindByTenantID(ctx context.Context, tenantID string, filter repository.UserFilter) ([]*domain.User, int64, error) {
	// TODO: Implement with proper filtering and pagination
	return nil, 0, nil
}

func (r *userRepo) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	query := `SELECT COUNT(*) FROM users WHERE username = ?`
	var count int
	err := r.db.QueryRowContext(ctx, query, username).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *userRepo) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	query := `SELECT COUNT(*) FROM users WHERE email = ?`
	var count int
	err := r.db.QueryRowContext(ctx, query, email).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *userRepo) ExistsByPhone(ctx context.Context, phone string) (bool, error) {
	query := `SELECT COUNT(*) FROM users WHERE phone = ?`
	var count int
	err := r.db.QueryRowContext(ctx, query, phone).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *userRepo) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM users WHERE id = ?`
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return domain.ErrUserNotFound
	}
	return nil
}

func (r *userRepo) scanUser(row *sql.Row) (*domain.User, error) {
	user := &domain.User{}
	var tenantID, email, phone, lastLoginAt sql.NullString
	var role, status string

	err := row.Scan(
		&user.ID,
		&tenantID,
		&user.Username,
		&email,
		&phone,
		&user.PasswordHash,
		&user.RealName,
		&role,
		&status,
		&lastLoginAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}

	if tenantID.Valid {
		user.TenantID = &tenantID.String
	}
	if email.Valid {
		user.Email = &email.String
	}
	if phone.Valid {
		user.Phone = &phone.String
	}
	if lastLoginAt.Valid {
		t, _ := time.Parse("2006-01-02 15:04:05", lastLoginAt.String)
		user.LastLoginAt = &t
	}

	user.Role = domain.UserRole(role)
	user.Status = domain.UserStatus(status)

	return user, nil
}
