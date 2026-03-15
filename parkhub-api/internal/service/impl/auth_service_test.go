package impl

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"testing"
	"time"

	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/pkg/crypto"
	"github.com/parkhub/api/internal/pkg/jwt"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/service"
)

// Mock implementations

type mockUserRepo struct {
	users map[string]*domain.User
}

func (m *mockUserRepo) Create(ctx context.Context, user *domain.User) error {
	m.users[user.ID] = user
	return nil
}

func (m *mockUserRepo) Update(ctx context.Context, user *domain.User) error {
	if _, ok := m.users[user.ID]; !ok {
		return domain.ErrUserNotFound
	}
	m.users[user.ID] = user
	return nil
}

func (m *mockUserRepo) FindByID(ctx context.Context, id string) (*domain.User, error) {
	if user, ok := m.users[id]; ok {
		return user, nil
	}
	return nil, domain.ErrUserNotFound
}

func (m *mockUserRepo) FindByUsername(ctx context.Context, username string) (*domain.User, error) {
	for _, user := range m.users {
		if user.Username == username {
			return user, nil
		}
	}
	return nil, domain.ErrUserNotFound
}

func (m *mockUserRepo) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	for _, user := range m.users {
		if user.Email != nil && *user.Email == email {
			return user, nil
		}
	}
	return nil, domain.ErrUserNotFound
}

func (m *mockUserRepo) FindByPhone(ctx context.Context, phone string) (*domain.User, error) {
	for _, user := range m.users {
		if user.Phone != nil && *user.Phone == phone {
			return user, nil
		}
	}
	return nil, domain.ErrUserNotFound
}

func (m *mockUserRepo) FindByTenantID(ctx context.Context, tenantID string, filter repository.UserFilter) ([]*domain.User, int64, error) {
	return nil, 0, nil
}

func (m *mockUserRepo) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	for _, user := range m.users {
		if user.Username == username {
			return true, nil
		}
	}
	return false, nil
}

func (m *mockUserRepo) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	for _, user := range m.users {
		if user.Email != nil && *user.Email == email {
			return true, nil
		}
	}
	return false, nil
}

func (m *mockUserRepo) ExistsByPhone(ctx context.Context, phone string) (bool, error) {
	for _, user := range m.users {
		if user.Phone != nil && *user.Phone == phone {
			return true, nil
		}
	}
	return false, nil
}

func (m *mockUserRepo) Delete(ctx context.Context, id string) error {
	delete(m.users, id)
	return nil
}

type mockTenantRepo struct {
	tenants map[string]*domain.Tenant
}

func (m *mockTenantRepo) Create(ctx context.Context, tenant *domain.Tenant) error {
	m.tenants[tenant.ID] = tenant
	return nil
}

func (m *mockTenantRepo) Update(ctx context.Context, tenant *domain.Tenant) error {
	m.tenants[tenant.ID] = tenant
	return nil
}

func (m *mockTenantRepo) FindByID(ctx context.Context, id string) (*domain.Tenant, error) {
	if tenant, ok := m.tenants[id]; ok {
		return tenant, nil
	}
	return nil, domain.ErrTenantNotFound
}

func (m *mockTenantRepo) FindAll(ctx context.Context, filter repository.TenantFilter) ([]*domain.Tenant, int64, error) {
	return nil, 0, nil
}

func (m *mockTenantRepo) ExistsByCompanyName(ctx context.Context, companyName string) (bool, error) {
	for _, tenant := range m.tenants {
		if tenant.CompanyName == companyName {
			return true, nil
		}
	}
	return false, nil
}

type mockRefreshTokenRepo struct {
	tokens map[string]*repository.RefreshToken
}

func (m *mockRefreshTokenRepo) Create(ctx context.Context, token *repository.RefreshToken) error {
	m.tokens[token.ID] = token
	return nil
}

func (m *mockRefreshTokenRepo) FindByTokenHash(ctx context.Context, tokenHash string) (*repository.RefreshToken, error) {
	for _, token := range m.tokens {
		if token.TokenHash == tokenHash {
			return token, nil
		}
	}
	return nil, errors.New("token not found")
}

func (m *mockRefreshTokenRepo) Revoke(ctx context.Context, id string) error {
	if token, ok := m.tokens[id]; ok {
		token.Revoked = true
	}
	return nil
}

func (m *mockRefreshTokenRepo) RevokeByUserID(ctx context.Context, userID string) error {
	for _, token := range m.tokens {
		if token.UserID == userID {
			token.Revoked = true
		}
	}
	return nil
}

func (m *mockRefreshTokenRepo) DeleteExpired(ctx context.Context) error {
	return nil
}

type mockSmsCodeRepo struct {
	codes map[string]*repository.SmsCode
}

func (m *mockSmsCodeRepo) Create(ctx context.Context, code *repository.SmsCode) error {
	m.codes[code.ID] = code
	return nil
}

func (m *mockSmsCodeRepo) FindLatestValid(ctx context.Context, phone, purpose string) (*repository.SmsCode, error) {
	for _, code := range m.codes {
		if code.Phone == phone && string(code.Purpose) == purpose && !code.Used && code.ExpiresAt.After(time.Now()) {
			return code, nil
		}
	}
	return nil, errors.New("valid sms code not found")
}

func (m *mockSmsCodeRepo) MarkUsed(ctx context.Context, id string) error {
	if code, ok := m.codes[id]; ok {
		code.Used = true
	}
	return nil
}

func (m *mockSmsCodeRepo) DeleteExpired(ctx context.Context) error {
	return nil
}

func (m *mockSmsCodeRepo) CheckSendFrequency(ctx context.Context, phone string) (bool, error) {
	return true, nil
}

// Test helpers

func setupTestAuthService() (service.AuthService, *mockUserRepo, *mockTenantRepo) {
	userRepo := &mockUserRepo{users: make(map[string]*domain.User)}
	tenantRepo := &mockTenantRepo{tenants: make(map[string]*domain.Tenant)}
	refreshTokenRepo := &mockRefreshTokenRepo{tokens: make(map[string]*repository.RefreshToken)}
	smsCodeRepo := &mockSmsCodeRepo{codes: make(map[string]*repository.SmsCode)}
	jwtManager := jwt.NewJWTManager("test-secret-key", time.Hour, 24*time.Hour, "parkhub")

	// 创建测试租户
	tenant := &domain.Tenant{
		ID:           "tenant-1",
		CompanyName:  "测试公司",
		ContactName:  "测试联系人",
		ContactPhone: "13800138000",
		Status:       domain.TenantStatusActive,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	tenantRepo.tenants[tenant.ID] = tenant

	// 创建测试用户
	passwordHash, _ := crypto.HashPassword("Password123")
	user := &domain.User{
		ID:           "user-1",
		TenantID:     &tenant.ID,
		Username:     "admin",
		Email:        strPtr("admin@test.com"),
		Phone:        strPtr("13800138001"),
		PasswordHash: passwordHash,
		RealName:     "管理员",
		Role:         domain.RoleTenantAdmin,
		Status:       domain.UserStatusActive,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	userRepo.users[user.ID] = user

	authService := NewAuthService(userRepo, tenantRepo, refreshTokenRepo, smsCodeRepo, jwtManager)
	return authService, userRepo, tenantRepo
}

func strPtr(s string) *string {
	return &s
}

// Tests

func TestLogin_Success(t *testing.T) {
	authService, _, _ := setupTestAuthService()

	resp, err := authService.Login(context.Background(), &service.LoginRequest{
		Account:  "admin",
		Password: "Password123",
	})

	if err != nil {
		t.Fatalf("Login() error = %v", err)
	}

	if resp.AccessToken == "" {
		t.Error("AccessToken is empty")
	}
	if resp.RefreshToken == "" {
		t.Error("RefreshToken is empty")
	}
	if resp.User == nil {
		t.Fatal("User is nil")
	}
	if resp.User.Username != "admin" {
		t.Errorf("Username = %v, want admin", resp.User.Username)
	}
}

func TestLogin_WithWrongPassword(t *testing.T) {
	authService, _, _ := setupTestAuthService()

	_, err := authService.Login(context.Background(), &service.LoginRequest{
		Account:  "admin",
		Password: "WrongPassword",
	})

	if err == nil {
		t.Error("Login() should return error with wrong password")
	}
	if !errors.Is(err, domain.ErrInvalidCredentials) {
		t.Errorf("error = %v, want %v", err, domain.ErrInvalidCredentials)
	}
}

func TestLogin_WithNonExistentUser(t *testing.T) {
	authService, _, _ := setupTestAuthService()

	_, err := authService.Login(context.Background(), &service.LoginRequest{
		Account:  "nonexistent",
		Password: "Password123",
	})

	if err == nil {
		t.Error("Login() should return error with non-existent user")
	}
}

func TestLogin_WithEmail(t *testing.T) {
	authService, _, _ := setupTestAuthService()

	resp, err := authService.Login(context.Background(), &service.LoginRequest{
		Account:  "admin@test.com",
		Password: "Password123",
	})

	if err != nil {
		t.Fatalf("Login() error = %v", err)
	}

	if resp.User.Username != "admin" {
		t.Errorf("Username = %v, want admin", resp.User.Username)
	}
}

func TestLogin_FrozenAccount(t *testing.T) {
	authService, userRepo, _ := setupTestAuthService()

	// 冻结用户
	user := userRepo.users["user-1"]
	user.Status = domain.UserStatusFrozen

	_, err := authService.Login(context.Background(), &service.LoginRequest{
		Account:  "admin",
		Password: "Password123",
	})

	if err == nil {
		t.Error("Login() should return error for frozen account")
	}
	if !errors.Is(err, domain.ErrAccountFrozen) {
		t.Errorf("error = %v, want %v", err, domain.ErrAccountFrozen)
	}
}

func TestSmsLogin_Success(t *testing.T) {
	authService, _, _ := setupTestAuthService()

	// 先发送验证码
	err := authService.SendSmsCode(context.Background(), &service.SendSmsCodeRequest{
		Phone:   "13800138001",
		Purpose: "login",
	})
	if err != nil {
		t.Fatalf("SendSmsCode() error = %v", err)
	}

	// 使用固定验证码登录
	resp, err := authService.SmsLogin(context.Background(), &service.SmsLoginRequest{
		Phone: "13800138001",
		Code:  "123456",
	})

	if err != nil {
		t.Fatalf("SmsLogin() error = %v", err)
	}

	if resp.AccessToken == "" {
		t.Error("AccessToken is empty")
	}
}

func TestSmsLogin_InvalidCode(t *testing.T) {
	authService, _, _ := setupTestAuthService()

	_, err := authService.SmsLogin(context.Background(), &service.SmsLoginRequest{
		Phone: "13800138001",
		Code:  "654321",
	})

	if err == nil {
		t.Error("SmsLogin() should return error with invalid code")
	}
}

func TestRefreshToken_Success(t *testing.T) {
	authService, _, _ := setupTestAuthService()

	// 先登录获取 refresh token
	loginResp, _ := authService.Login(context.Background(), &service.LoginRequest{
		Account:  "admin",
		Password: "Password123",
	})

	// 刷新 token
	refreshResp, err := authService.RefreshToken(context.Background(), loginResp.RefreshToken)

	if err != nil {
		t.Fatalf("RefreshToken() error = %v", err)
	}

	if refreshResp.AccessToken == "" {
		t.Error("AccessToken is empty")
	}
	if refreshResp.RefreshToken == "" {
		t.Error("RefreshToken is empty")
	}
	if refreshResp.RefreshToken == loginResp.RefreshToken {
		t.Error("New RefreshToken should be different from old one")
	}
}

func TestLogout_Success(t *testing.T) {
	authService, _, _ := setupTestAuthService()

	// 先登录
	loginResp, _ := authService.Login(context.Background(), &service.LoginRequest{
		Account:  "admin",
		Password: "Password123",
	})

	// 登出
	err := authService.Logout(context.Background(), "user-1", loginResp.RefreshToken)

	if err != nil {
		t.Fatalf("Logout() error = %v", err)
	}
}

func TestGetCurrentUser_Success(t *testing.T) {
	authService, _, _ := setupTestAuthService()

	user, err := authService.GetCurrentUser(context.Background(), "user-1")

	if err != nil {
		t.Fatalf("GetCurrentUser() error = %v", err)
	}

	if user.Username != "admin" {
		t.Errorf("Username = %v, want admin", user.Username)
	}
}

func TestTenantIsolation(t *testing.T) {
	authService, userRepo, _ := setupTestAuthService()

	// 创建另一个租户的用户
	passwordHash, _ := crypto.HashPassword("Password123")
	otherTenantID := "tenant-2"
	otherUser := &domain.User{
		ID:           "user-2",
		TenantID:     &otherTenantID,
		Username:     "otheradmin",
		PasswordHash: passwordHash,
		RealName:     "其他管理员",
		Role:         domain.RoleTenantAdmin,
		Status:       domain.UserStatusActive,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	userRepo.users[otherUser.ID] = otherUser

	// 用户1登录
	resp1, _ := authService.Login(context.Background(), &service.LoginRequest{
		Account:  "admin",
		Password: "Password123",
	})

	// 用户2登录
	resp2, _ := authService.Login(context.Background(), &service.LoginRequest{
		Account:  "otheradmin",
		Password: "Password123",
	})

	// 验证两个用户的 tenant_id 不同
	if resp1.User.TenantID == nil || resp2.User.TenantID == nil {
		t.Fatal("TenantID should not be nil")
	}

	if *resp1.User.TenantID == *resp2.User.TenantID {
		t.Error("Users from different tenants should have different tenant IDs")
	}
}

// Utility function for SQL DB mock (used in actual implementation)
func mockDB() *sql.DB {
	return nil
}

func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
