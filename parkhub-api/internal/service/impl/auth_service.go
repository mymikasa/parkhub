package impl

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/pkg/crypto"
	"github.com/parkhub/api/internal/pkg/jwt"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/service"
)

type authServiceImpl struct {
	userRepo         repository.UserRepo
	tenantRepo       repository.TenantRepo
	refreshTokenRepo repository.RefreshTokenRepo
	smsCodeRepo      repository.SmsCodeRepo
	jwtManager       *jwt.JWTManager
}

func NewAuthService(
	userRepo repository.UserRepo,
	tenantRepo repository.TenantRepo,
	refreshTokenRepo repository.RefreshTokenRepo,
	smsCodeRepo repository.SmsCodeRepo,
	jwtManager *jwt.JWTManager,
) service.AuthService {
	return &authServiceImpl{
		userRepo:         userRepo,
		tenantRepo:       tenantRepo,
		refreshTokenRepo: refreshTokenRepo,
		smsCodeRepo:      smsCodeRepo,
		jwtManager:       jwtManager,
	}
}

func (s *authServiceImpl) Login(ctx context.Context, req *service.LoginRequest) (*service.LoginResponse, error) {
	// 1. 查找用户（支持用户名或邮箱）
	var user *domain.User
	var err error

	user, err = s.userRepo.FindByUsername(ctx, req.Account)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			// 尝试邮箱登录
			user, err = s.userRepo.FindByEmail(ctx, req.Account)
			if err != nil {
				return nil, domain.ErrInvalidCredentials
			}
		} else {
			return nil, err
		}
	}

	// 2. 检查用户状态
	if !user.IsActive() {
		return nil, domain.ErrAccountFrozen
	}

	// 3. 验证密码
	if !crypto.VerifyPassword(req.Password, user.PasswordHash) {
		return nil, domain.ErrInvalidCredentials
	}

	// 4. 检查租户状态（非平台管理员）
	if user.TenantID != nil {
		tenant, err := s.tenantRepo.FindByID(ctx, *user.TenantID)
		if err != nil {
			return nil, err
		}
		if !tenant.IsActive() {
			return nil, domain.ErrTenantFrozen
		}
	}

	// 5. 生成 Token
	accessToken, err := s.jwtManager.GenerateAccessToken(user.ID, user.TenantID, string(user.Role))
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.jwtManager.GenerateRefreshToken(user.ID, user.TenantID, string(user.Role))
	if err != nil {
		return nil, err
	}

	// 6. 存储 Refresh Token
	refreshTokenHash := sha256.Sum256([]byte(refreshToken))
	rt := &repository.RefreshToken{
		ID:         uuid.New().String(),
		UserID:     user.ID,
		TokenHash:  hex.EncodeToString(refreshTokenHash[:]),
		ExpiresAt:  time.Now().Add(s.jwtManager.GetRefreshTokenTTL()),
		Revoked:    false,
		CreatedAt:  time.Now(),
	}
	if err := s.refreshTokenRepo.Create(ctx, rt); err != nil {
		return nil, err
	}

	return &service.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.jwtManager.GetAccessTokenTTL().Seconds()),
		User:         s.toUserInfo(user),
	}, nil
}

func (s *authServiceImpl) SendSmsCode(ctx context.Context, req *service.SendSmsCodeRequest) error {
	// 1. 检查发送频率
	canSend, err := s.smsCodeRepo.CheckSendFrequency(ctx, req.Phone)
	if err != nil {
		return err
	}
	if !canSend {
		return domain.ErrSmsCodeTooFrequent
	}

	// 2. 验证手机号已注册（登录场景）
	if req.Purpose == "login" {
		_, err := s.userRepo.FindByPhone(ctx, req.Phone)
		if err != nil {
			if errors.Is(err, domain.ErrUserNotFound) {
				return domain.ErrPhoneNotRegistered
			}
			return err
		}
	}

	// 3. 生成验证码（MVP 固定为 123456）
	code := "123456"

	// 4. 存储验证码
	smsCode := &repository.SmsCode{
		ID:        uuid.New().String(),
		Phone:     req.Phone,
		Code:      code,
		Purpose:   repository.SmsCodePurpose(req.Purpose),
		ExpiresAt: time.Now().Add(5 * time.Minute),
		Used:      false,
		CreatedAt: time.Now(),
	}

	if err := s.smsCodeRepo.Create(ctx, smsCode); err != nil {
		return err
	}

	// MVP: 只打印日志，不发短信
	fmt.Printf("[SMS] Phone: %s, Code: %s\n", req.Phone, code)

	return nil
}

func (s *authServiceImpl) SmsLogin(ctx context.Context, req *service.SmsLoginRequest) (*service.LoginResponse, error) {
	// 1. 查找验证码
	smsCode, err := s.smsCodeRepo.FindLatestValid(ctx, req.Phone, "login")
	if err != nil {
		return nil, domain.ErrInvalidSmsCode
	}

	// 2. 验证码校验
	if smsCode.Code != req.Code {
		return nil, domain.ErrInvalidSmsCode
	}

	if smsCode.ExpiresAt.Before(time.Now()) {
		return nil, domain.ErrSmsCodeExpired
	}

	// 3. 标记验证码已使用
	if err := s.smsCodeRepo.MarkUsed(ctx, smsCode.ID); err != nil {
		return nil, err
	}

	// 4. 查找用户
	user, err := s.userRepo.FindByPhone(ctx, req.Phone)
	if err != nil {
		return nil, err
	}

	// 5. 检查状态
	if !user.IsActive() {
		return nil, domain.ErrAccountFrozen
	}

	if user.TenantID != nil {
		tenant, err := s.tenantRepo.FindByID(ctx, *user.TenantID)
		if err != nil {
			return nil, err
		}
		if !tenant.IsActive() {
			return nil, domain.ErrTenantFrozen
		}
	}

	// 6. 生成 Token
	accessToken, err := s.jwtManager.GenerateAccessToken(user.ID, user.TenantID, string(user.Role))
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.jwtManager.GenerateRefreshToken(user.ID, user.TenantID, string(user.Role))
	if err != nil {
		return nil, err
	}

	refreshTokenHash := sha256.Sum256([]byte(refreshToken))
	rt := &repository.RefreshToken{
		ID:         uuid.New().String(),
		UserID:     user.ID,
		TokenHash:  hex.EncodeToString(refreshTokenHash[:]),
		ExpiresAt:  time.Now().Add(s.jwtManager.GetRefreshTokenTTL()),
		Revoked:    false,
		CreatedAt:  time.Now(),
	}
	if err := s.refreshTokenRepo.Create(ctx, rt); err != nil {
		return nil, err
	}

	return &service.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.jwtManager.GetAccessTokenTTL().Seconds()),
		User:         s.toUserInfo(user),
	}, nil
}

func (s *authServiceImpl) RefreshToken(ctx context.Context, refreshToken string) (*service.LoginResponse, error) {
	// 1. 验证 Refresh Token
	claims, err := s.jwtManager.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, domain.ErrRefreshTokenExpired
	}

	// 2. 检查是否已被吊销
	refreshTokenHash := sha256.Sum256([]byte(refreshToken))
	rt, err := s.refreshTokenRepo.FindByTokenHash(ctx, hex.EncodeToString(refreshTokenHash[:]))
	if err != nil || rt.Revoked {
		return nil, errors.New("refresh token revoked")
	}

	// 3. 吊销旧 Token
	if err := s.refreshTokenRepo.Revoke(ctx, rt.ID); err != nil {
		return nil, err
	}

	// 4. 生成新 Token
	newAccessToken, err := s.jwtManager.GenerateAccessToken(claims.UserID, claims.TenantID, claims.Role)
	if err != nil {
		return nil, err
	}

	newRefreshToken, err := s.jwtManager.GenerateRefreshToken(claims.UserID, claims.TenantID, claims.Role)
	if err != nil {
		return nil, err
	}

	newRefreshTokenHash := sha256.Sum256([]byte(newRefreshToken))
	newRt := &repository.RefreshToken{
		ID:         uuid.New().String(),
		UserID:     claims.UserID,
		TokenHash:  hex.EncodeToString(newRefreshTokenHash[:]),
		ExpiresAt:  time.Now().Add(s.jwtManager.GetRefreshTokenTTL()),
		Revoked:    false,
		CreatedAt:  time.Now(),
	}
	if err := s.refreshTokenRepo.Create(ctx, newRt); err != nil {
		return nil, err
	}

	// 5. 获取用户信息
	user, err := s.userRepo.FindByID(ctx, claims.UserID)
	if err != nil {
		return nil, err
	}

	return &service.LoginResponse{
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
		ExpiresIn:    int64(s.jwtManager.GetAccessTokenTTL().Seconds()),
		User:         s.toUserInfo(user),
	}, nil
}

func (s *authServiceImpl) Logout(ctx context.Context, userID string, refreshToken string) error {
	if refreshToken != "" {
		refreshTokenHash := sha256.Sum256([]byte(refreshToken))
		rt, err := s.refreshTokenRepo.FindByTokenHash(ctx, hex.EncodeToString(refreshTokenHash[:]))
		if err == nil {
			return s.refreshTokenRepo.Revoke(ctx, rt.ID)
		}
	}
	return nil
}

func (s *authServiceImpl) GetCurrentUser(ctx context.Context, userID string) (*domain.User, error) {
	return s.userRepo.FindByID(ctx, userID)
}

func (s *authServiceImpl) toUserInfo(user *domain.User) *service.UserInfo {
	return &service.UserInfo{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email,
		Phone:    user.Phone,
		RealName: user.RealName,
		Role:     string(user.Role),
		TenantID: user.TenantID,
	}
}
