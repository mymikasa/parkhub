package impl

import (
	"context"
	"errors"

	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/repository/dao"
	"gorm.io/gorm"
)

// UserRepoSet is the Wire provider set for UserRepo.
var UserRepoSet = wire.NewSet(NewUserRepo)

type userRepo struct {
	db *gorm.DB
}

func NewUserRepo(db *gorm.DB) repository.UserRepo {
	return &userRepo{db: db}
}

func (r *userRepo) Create(ctx context.Context, user *domain.User) error {
	return r.db.WithContext(ctx).Create(dao.ToUserDAO(user)).Error
}

func (r *userRepo) Update(ctx context.Context, user *domain.User) error {
	d := dao.ToUserDAO(user)
	result := r.db.WithContext(ctx).Model(d).Updates(map[string]any{
		"real_name":      d.RealName,
		"email":          d.Email,
		"phone":          d.Phone,
		"password_hash":  d.PasswordHash,
		"role":           d.Role,
		"status":         d.Status,
		"last_login_at":  d.LastLoginAt,
		"updated_at":     d.UpdatedAt,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrUserNotFound
	}
	return nil
}

func (r *userRepo) FindByID(ctx context.Context, id string) (*domain.User, error) {
	var d dao.UserDAO
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&d).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return d.ToDomain(), nil
}

func (r *userRepo) FindByUsername(ctx context.Context, username string) (*domain.User, error) {
	var d dao.UserDAO
	if err := r.db.WithContext(ctx).Where("username = ?", username).First(&d).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return d.ToDomain(), nil
}

func (r *userRepo) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	var d dao.UserDAO
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&d).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return d.ToDomain(), nil
}

func (r *userRepo) FindByPhone(ctx context.Context, phone string) (*domain.User, error) {
	var d dao.UserDAO
	if err := r.db.WithContext(ctx).Where("phone = ?", phone).First(&d).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return d.ToDomain(), nil
}

func (r *userRepo) FindByTenantID(ctx context.Context, tenantID string, filter repository.UserFilter) ([]*domain.User, int64, error) {
	q := r.db.WithContext(ctx).Model(&dao.UserDAO{}).Where("tenant_id = ?", tenantID)
	if filter.Role != nil {
		q = q.Where("role = ?", string(*filter.Role))
	}
	if filter.Status != nil {
		q = q.Where("status = ?", string(*filter.Status))
	}
	if filter.Keyword != "" {
		like := "%" + filter.Keyword + "%"
		q = q.Where("username LIKE ? OR real_name LIKE ?", like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if filter.Page > 0 && filter.PageSize > 0 {
		q = q.Offset((filter.Page - 1) * filter.PageSize).Limit(filter.PageSize)
	}

	var rows []dao.UserDAO
	if err := q.Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	users := make([]*domain.User, len(rows))
	for i := range rows {
		users[i] = rows[i].ToDomain()
	}
	return users, total, nil
}

func (r *userRepo) FindAll(ctx context.Context, filter repository.UserFilter) ([]*domain.User, int64, error) {
	q := r.db.WithContext(ctx).Model(&dao.UserDAO{})
	if filter.TenantID != "" {
		q = q.Where("tenant_id = ?", filter.TenantID)
	}
	if filter.Role != nil {
		q = q.Where("role = ?", string(*filter.Role))
	}
	if filter.Status != nil {
		q = q.Where("status = ?", string(*filter.Status))
	}
	if filter.Keyword != "" {
		like := "%" + filter.Keyword + "%"
		q = q.Where("username LIKE ? OR real_name LIKE ? OR email LIKE ?", like, like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if filter.Page > 0 && filter.PageSize > 0 {
		q = q.Offset((filter.Page - 1) * filter.PageSize).Limit(filter.PageSize)
	}

	q = q.Order("created_at DESC")

	var rows []dao.UserDAO
	if err := q.Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	users := make([]*domain.User, len(rows))
	for i := range rows {
		users[i] = rows[i].ToDomain()
	}
	return users, total, nil
}

func (r *userRepo) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&dao.UserDAO{}).Where("username = ?", username).Count(&count).Error
	return count > 0, err
}

func (r *userRepo) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&dao.UserDAO{}).Where("email = ?", email).Count(&count).Error
	return count > 0, err
}

func (r *userRepo) ExistsByPhone(ctx context.Context, phone string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&dao.UserDAO{}).Where("phone = ?", phone).Count(&count).Error
	return count > 0, err
}

func (r *userRepo) Delete(ctx context.Context, id string) error {
	result := r.db.WithContext(ctx).Delete(&dao.UserDAO{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrUserNotFound
	}
	return nil
}
