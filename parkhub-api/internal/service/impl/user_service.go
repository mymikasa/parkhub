package impl

import (
	"context"
	"encoding/json"
	"regexp"
	"time"

	"github.com/google/uuid"
	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/pkg/crypto"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/service"
)

// UserServiceSet is the Wire provider set for UserService.
var UserServiceSet = wire.NewSet(NewUserService)

type userServiceImpl struct {
	userRepo     repository.UserRepo
	tenantRepo   repository.TenantRepo
	loginLogRepo repository.LoginLogRepo
	auditLogSvc  service.AuditLogService
}

func NewUserService(
	userRepo repository.UserRepo,
	tenantRepo repository.TenantRepo,
	loginLogRepo repository.LoginLogRepo,
	auditLogSvc service.AuditLogService,
) service.UserService {
	return &userServiceImpl{
		userRepo:     userRepo,
		tenantRepo:   tenantRepo,
		loginLogRepo: loginLogRepo,
		auditLogSvc:  auditLogSvc,
	}
}

// roleLevel returns numeric level for role comparison
func roleLevel(role string) int {
	switch role {
	case string(domain.RolePlatformAdmin):
		return 100
	case string(domain.RoleTenantAdmin):
		return 50
	case string(domain.RoleOperator):
		return 10
	default:
		return 0
	}
}

// canManageRole checks if operator can manage target role
func canManageRole(operatorRole, targetRole string) bool {
	return roleLevel(operatorRole) > roleLevel(targetRole)
}

// canManageUser checks if operator can manage target user
func (s *userServiceImpl) canManageUser(operatorRole, operatorTenantID string, target *domain.User) error {
	// Must have higher role level
	if !canManageRole(operatorRole, string(target.Role)) {
		return domain.ErrCannotManageHigherRole
	}

	// tenant_admin can only manage users in their own tenant
	if operatorRole == string(domain.RoleTenantAdmin) {
		if target.TenantID == nil || *target.TenantID != operatorTenantID {
			return domain.ErrPermissionDenied
		}
	}

	return nil
}

var (
	hasLower = regexp.MustCompile(`[a-z]`)
	hasUpper = regexp.MustCompile(`[A-Z]`)
	hasDigit = regexp.MustCompile(`[0-9]`)
)

func validatePassword(password string) error {
	if len(password) < 8 || !hasLower.MatchString(password) || !hasUpper.MatchString(password) || !hasDigit.MatchString(password) {
		return domain.ErrPasswordTooWeak
	}
	return nil
}

func (s *userServiceImpl) Create(ctx context.Context, req *service.CreateUserRequest) (*domain.User, error) {
	// Permission check: only platform_admin and tenant_admin can create users
	if req.OperatorRole != string(domain.RolePlatformAdmin) && req.OperatorRole != string(domain.RoleTenantAdmin) {
		return nil, domain.ErrPermissionDenied
	}

	// tenant_admin can only create operators in their own tenant
	if req.OperatorRole == string(domain.RoleTenantAdmin) {
		if req.Role != string(domain.RoleOperator) {
			return nil, domain.ErrCannotManageHigherRole
		}
		if req.TenantID != req.OperatorTenantID {
			return nil, domain.ErrPermissionDenied
		}
	}

	// Validate password strength
	if err := validatePassword(req.Password); err != nil {
		return nil, err
	}

	// Check uniqueness
	if exists, _ := s.userRepo.ExistsByUsername(ctx, req.Username); exists {
		return nil, domain.ErrUsernameExists
	}
	if req.Email != "" {
		if exists, _ := s.userRepo.ExistsByEmail(ctx, req.Email); exists {
			return nil, domain.ErrEmailExists
		}
	}
	if req.Phone != "" {
		if exists, _ := s.userRepo.ExistsByPhone(ctx, req.Phone); exists {
			return nil, domain.ErrPhoneExists
		}
	}

	// Validate tenant exists for non-platform-admin
	if req.Role != string(domain.RolePlatformAdmin) {
		if req.TenantID == "" {
			return nil, domain.ErrTenantNotFound
		}
		if _, err := s.tenantRepo.FindByID(ctx, req.TenantID); err != nil {
			return nil, domain.ErrTenantNotFound
		}
	}

	// Hash password
	passwordHash, err := crypto.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	var email *string
	if req.Email != "" {
		email = &req.Email
	}
	var phone *string
	if req.Phone != "" {
		phone = &req.Phone
	}
	var tenantID *string
	if req.TenantID != "" {
		tenantID = &req.TenantID
	}

	user := domain.NewUser(
		uuid.New().String(),
		tenantID,
		req.Username,
		email,
		phone,
		passwordHash,
		req.RealName,
		domain.UserRole(req.Role),
	)

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	// Audit log
	detail, _ := json.Marshal(map[string]string{
		"username": req.Username,
		"role":     req.Role,
	})
	_ = s.auditLogSvc.Log(ctx, &domain.AuditLog{
		ID:         uuid.New().String(),
		UserID:     req.OperatorID,
		TenantID:   tenantID,
		Action:     domain.AuditActionUserCreated,
		TargetType: "user",
		TargetID:   user.ID,
		Detail:     string(detail),
		IP:         req.IP,
		CreatedAt:  time.Now(),
	})

	return user, nil
}

func (s *userServiceImpl) GetByID(ctx context.Context, req *service.GetUserRequest) (*domain.User, error) {
	user, err := s.userRepo.FindByID(ctx, req.UserID)
	if err != nil {
		return nil, err
	}

	// tenant_admin can only see users in their own tenant
	if req.OperatorRole == string(domain.RoleTenantAdmin) {
		if user.TenantID == nil || *user.TenantID != req.OperatorTenantID {
			return nil, domain.ErrPermissionDenied
		}
	}

	return user, nil
}

func (s *userServiceImpl) List(ctx context.Context, req *service.ListUsersRequest) (*service.UserListResponse, error) {
	filter := repository.UserFilter{
		Keyword:  req.Keyword,
		Page:     req.Page,
		PageSize: req.PageSize,
	}

	if req.Role != "" {
		role := domain.UserRole(req.Role)
		filter.Role = &role
	}
	if req.Status != "" {
		status := domain.UserStatus(req.Status)
		filter.Status = &status
	}

	// tenant_admin can only see their own tenant's users
	if req.OperatorRole == string(domain.RoleTenantAdmin) {
		filter.TenantID = req.OperatorTenantID
	} else if req.TenantID != "" {
		// platform_admin can filter by tenant
		filter.TenantID = req.TenantID
	}

	users, total, err := s.userRepo.FindAll(ctx, filter)
	if err != nil {
		return nil, err
	}

	return &service.UserListResponse{
		Items:    users,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, nil
}

func (s *userServiceImpl) Update(ctx context.Context, req *service.UpdateUserRequest) (*domain.User, error) {
	user, err := s.userRepo.FindByID(ctx, req.UserID)
	if err != nil {
		return nil, err
	}

	// Permission check
	if err := s.canManageUser(req.OperatorRole, req.OperatorTenantID, user); err != nil {
		return nil, err
	}

	// Update fields
	if req.RealName != "" {
		user.RealName = req.RealName
	}
	if req.Email != "" {
		if user.Email == nil || *user.Email != req.Email {
			if exists, _ := s.userRepo.ExistsByEmail(ctx, req.Email); exists {
				return nil, domain.ErrEmailExists
			}
			user.Email = &req.Email
		}
	}
	if req.Phone != "" {
		if user.Phone == nil || *user.Phone != req.Phone {
			if exists, _ := s.userRepo.ExistsByPhone(ctx, req.Phone); exists {
				return nil, domain.ErrPhoneExists
			}
			user.Phone = &req.Phone
		}
	}
	if req.Role != "" && req.Role != string(user.Role) {
		// Can only assign roles lower than operator's own
		if !canManageRole(req.OperatorRole, req.Role) {
			return nil, domain.ErrCannotManageHigherRole
		}
		user.Role = domain.UserRole(req.Role)
	}
	user.UpdatedAt = time.Now()

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	// Audit log
	detail, _ := json.Marshal(map[string]string{"user_id": user.ID})
	_ = s.auditLogSvc.Log(ctx, &domain.AuditLog{
		ID:         uuid.New().String(),
		UserID:     req.OperatorID,
		TenantID:   user.TenantID,
		Action:     domain.AuditActionUserUpdated,
		TargetType: "user",
		TargetID:   user.ID,
		Detail:     string(detail),
		IP:         req.IP,
		CreatedAt:  time.Now(),
	})

	return user, nil
}

func (s *userServiceImpl) Freeze(ctx context.Context, req *service.UserActionRequest) error {
	if req.OperatorID == req.UserID {
		return domain.ErrCannotFreezeYourself
	}

	user, err := s.userRepo.FindByID(ctx, req.UserID)
	if err != nil {
		return err
	}

	if err := s.canManageUser(req.OperatorRole, req.OperatorTenantID, user); err != nil {
		return err
	}

	user.Freeze()
	if err := s.userRepo.Update(ctx, user); err != nil {
		return err
	}

	_ = s.auditLogSvc.Log(ctx, &domain.AuditLog{
		ID:         uuid.New().String(),
		UserID:     req.OperatorID,
		TenantID:   user.TenantID,
		Action:     domain.AuditActionUserFrozen,
		TargetType: "user",
		TargetID:   user.ID,
		IP:         req.IP,
		CreatedAt:  time.Now(),
	})

	return nil
}

func (s *userServiceImpl) Unfreeze(ctx context.Context, req *service.UserActionRequest) error {
	user, err := s.userRepo.FindByID(ctx, req.UserID)
	if err != nil {
		return err
	}

	if err := s.canManageUser(req.OperatorRole, req.OperatorTenantID, user); err != nil {
		return err
	}

	user.Activate()
	if err := s.userRepo.Update(ctx, user); err != nil {
		return err
	}

	_ = s.auditLogSvc.Log(ctx, &domain.AuditLog{
		ID:         uuid.New().String(),
		UserID:     req.OperatorID,
		TenantID:   user.TenantID,
		Action:     domain.AuditActionUserUnfrozen,
		TargetType: "user",
		TargetID:   user.ID,
		IP:         req.IP,
		CreatedAt:  time.Now(),
	})

	return nil
}

func (s *userServiceImpl) ResetPassword(ctx context.Context, req *service.ResetPasswordRequest) error {
	user, err := s.userRepo.FindByID(ctx, req.UserID)
	if err != nil {
		return err
	}

	if err := s.canManageUser(req.OperatorRole, req.OperatorTenantID, user); err != nil {
		return err
	}

	if err := validatePassword(req.NewPassword); err != nil {
		return err
	}

	passwordHash, err := crypto.HashPassword(req.NewPassword)
	if err != nil {
		return err
	}

	user.PasswordHash = passwordHash
	user.UpdatedAt = time.Now()

	if err := s.userRepo.Update(ctx, user); err != nil {
		return err
	}

	_ = s.auditLogSvc.Log(ctx, &domain.AuditLog{
		ID:         uuid.New().String(),
		UserID:     req.OperatorID,
		TenantID:   user.TenantID,
		Action:     domain.AuditActionPasswordReset,
		TargetType: "user",
		TargetID:   user.ID,
		IP:         req.IP,
		CreatedAt:  time.Now(),
	})

	return nil
}

func (s *userServiceImpl) UpdateProfile(ctx context.Context, userID string, req *service.UpdateProfileRequest) (*domain.User, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if req.RealName != "" {
		user.RealName = req.RealName
	}
	if req.Email != "" {
		if user.Email == nil || *user.Email != req.Email {
			if exists, _ := s.userRepo.ExistsByEmail(ctx, req.Email); exists {
				return nil, domain.ErrEmailExists
			}
			user.Email = &req.Email
		}
	}
	if req.Phone != "" {
		if user.Phone == nil || *user.Phone != req.Phone {
			if exists, _ := s.userRepo.ExistsByPhone(ctx, req.Phone); exists {
				return nil, domain.ErrPhoneExists
			}
			user.Phone = &req.Phone
		}
	}
	user.UpdatedAt = time.Now()

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *userServiceImpl) ChangePassword(ctx context.Context, userID string, req *service.ChangePasswordRequest) error {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return err
	}

	// Verify old password
	if !crypto.VerifyPassword(req.OldPassword, user.PasswordHash) {
		return domain.ErrOldPasswordIncorrect
	}

	// Validate new password
	if err := validatePassword(req.NewPassword); err != nil {
		return err
	}

	passwordHash, err := crypto.HashPassword(req.NewPassword)
	if err != nil {
		return err
	}

	user.PasswordHash = passwordHash
	user.UpdatedAt = time.Now()

	if err := s.userRepo.Update(ctx, user); err != nil {
		return err
	}

	_ = s.auditLogSvc.Log(ctx, &domain.AuditLog{
		ID:         uuid.New().String(),
		UserID:     userID,
		TenantID:   user.TenantID,
		Action:     domain.AuditActionPasswordChanged,
		TargetType: "user",
		TargetID:   userID,
		CreatedAt:  time.Now(),
	})

	return nil
}

func (s *userServiceImpl) GetLoginLogs(ctx context.Context, userID string, page, pageSize int) (*service.LoginLogListResponse, error) {
	logs, total, err := s.loginLogRepo.FindByUserID(ctx, userID, page, pageSize)
	if err != nil {
		return nil, err
	}

	return &service.LoginLogListResponse{
		Items:    logs,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func (s *userServiceImpl) ImportUsers(ctx context.Context, req *service.ImportUsersRequest) (*service.ImportResult, error) {
	result := &service.ImportResult{
		Total: len(req.Users),
	}

	for i, userReq := range req.Users {
		userReq.OperatorID = req.OperatorID
		userReq.OperatorRole = req.OperatorRole
		userReq.OperatorTenantID = req.OperatorTenantID
		userReq.IP = req.IP

		_, err := s.Create(ctx, &userReq)
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, service.ImportError{
				Row:     i + 1,
				Message: err.Error(),
			})
		} else {
			result.Success++
		}
	}

	return result, nil
}
