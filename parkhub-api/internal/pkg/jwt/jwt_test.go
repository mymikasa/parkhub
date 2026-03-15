package jwt

import (
	"testing"
	"time"
)

func TestNewJWTManager(t *testing.T) {
	tests := []struct {
		name             string
		secretKey        string
		accessTTL        time.Duration
		refreshTTL       time.Duration
		wantAccessTTL    time.Duration
		wantRefreshTTL   time.Duration
	}{
		{
			name:             "默认配置",
			secretKey:        "test-secret-key",
			accessTTL:        0,
			refreshTTL:       0,
			wantAccessTTL:    DefaultAccessTokenTTL,
			wantRefreshTTL:   DefaultRefreshTokenTTL,
		},
		{
			name:             "自定义配置",
			secretKey:        "test-secret-key",
			accessTTL:        time.Hour,
			refreshTTL:       24 * time.Hour,
			wantAccessTTL:    time.Hour,
			wantRefreshTTL:   24 * time.Hour,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			manager := NewJWTManager(tt.secretKey, tt.accessTTL, tt.refreshTTL, "parkhub")
			if manager == nil {
				t.Fatal("NewJWTManager() returned nil")
			}
			if manager.GetAccessTokenTTL() != tt.wantAccessTTL {
				t.Errorf("AccessTokenTTL = %v, want %v", manager.GetAccessTokenTTL(), tt.wantAccessTTL)
			}
			if manager.GetRefreshTokenTTL() != tt.wantRefreshTTL {
				t.Errorf("RefreshTokenTTL = %v, want %v", manager.GetRefreshTokenTTL(), tt.wantRefreshTTL)
			}
		})
	}
}

func TestGenerateAndValidateAccessToken(t *testing.T) {
	manager := NewJWTManager("test-secret-key", 0, 0, "parkhub")
	userID := "user-123"
	tenantID := "tenant-456"
	role := "tenant_admin"

	token, err := manager.GenerateAccessToken(userID, &tenantID, role)
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}

	if token == "" {
		t.Error("GenerateAccessToken() returned empty token")
	}

	claims, err := manager.ValidateAccessToken(token)
	if err != nil {
		t.Fatalf("ValidateAccessToken() error = %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("UserID = %v, want %v", claims.UserID, userID)
	}
	if claims.TenantID == nil || *claims.TenantID != tenantID {
		t.Errorf("TenantID = %v, want %v", claims.TenantID, tenantID)
	}
	if claims.Role != role {
		t.Errorf("Role = %v, want %v", claims.Role, role)
	}
	if claims.Type != AccessTokenType {
		t.Errorf("Type = %v, want %v", claims.Type, AccessTokenType)
	}
}

func TestGenerateAndValidateRefreshToken(t *testing.T) {
	manager := NewJWTManager("test-secret-key", 0, 0, "parkhub")
	userID := "user-123"
	tenantID := "tenant-456"
	role := "operator"

	token, err := manager.GenerateRefreshToken(userID, &tenantID, role)
	if err != nil {
		t.Fatalf("GenerateRefreshToken() error = %v", err)
	}

	claims, err := manager.ValidateRefreshToken(token)
	if err != nil {
		t.Fatalf("ValidateRefreshToken() error = %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("UserID = %v, want %v", claims.UserID, userID)
	}
	if claims.Type != RefreshTokenType {
		t.Errorf("Type = %v, want %v", claims.Type, RefreshTokenType)
	}
}

func TestValidateAccessTokenWithRefreshToken(t *testing.T) {
	manager := NewJWTManager("test-secret-key", 0, 0, "parkhub")

	refreshToken, _ := manager.GenerateRefreshToken("user-123", nil, "operator")

	// 使用 refresh token 验证 access token 应该失败
	_, err := manager.ValidateAccessToken(refreshToken)
	if err == nil {
		t.Error("ValidateAccessToken() should fail with refresh token")
	}
	if err != ErrTokenInvalid {
		t.Errorf("error = %v, want %v", err, ErrTokenInvalid)
	}
}

func TestValidateRefreshTokenWithAccessToken(t *testing.T) {
	manager := NewJWTManager("test-secret-key", 0, 0, "parkhub")

	accessToken, _ := manager.GenerateAccessToken("user-123", nil, "operator")

	// 使用 access token 验证 refresh token 应该失败
	_, err := manager.ValidateRefreshToken(accessToken)
	if err == nil {
		t.Error("ValidateRefreshToken() should fail with access token")
	}
	if err != ErrTokenInvalid {
		t.Errorf("error = %v, want %v", err, ErrTokenInvalid)
	}
}

func TestParseTokenWithInvalidToken(t *testing.T) {
	manager := NewJWTManager("test-secret-key", 0, 0, "parkhub")

	tests := []struct {
		name    string
		token   string
		wantErr error
	}{
		{
			name:    "空token",
			token:   "",
			wantErr: ErrTokenMalformed,
		},
		{
			name:    "无效格式",
			token:   "invalid.token.format",
			wantErr: ErrTokenMalformed,
		},
		{
			name:    "错误签名",
			token:   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
			wantErr: ErrTokenInvalid,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := manager.ParseToken(tt.token)
			if err == nil {
				t.Error("ParseToken() should return error")
			}
		})
	}
}

func TestRefreshTokens(t *testing.T) {
	manager := NewJWTManager("test-secret-key", 0, 0, "parkhub")
	userID := "user-123"
	tenantID := "tenant-456"
	role := "tenant_admin"

	refreshToken, _ := manager.GenerateRefreshToken(userID, &tenantID, role)

	newAccessToken, newRefreshToken, err := manager.RefreshTokens(refreshToken)
	if err != nil {
		t.Fatalf("RefreshTokens() error = %v", err)
	}

	if newAccessToken == "" {
		t.Error("newAccessToken is empty")
	}
	if newRefreshToken == "" {
		t.Error("newRefreshToken is empty")
	}
	if newRefreshToken == refreshToken {
		t.Error("newRefreshToken should be different from old token")
	}

	// 验证新的 access token
	accessClaims, err := manager.ValidateAccessToken(newAccessToken)
	if err != nil {
		t.Errorf("ValidateAccessToken(new) error = %v", err)
	}
	if accessClaims.UserID != userID {
		t.Errorf("UserID = %v, want %v", accessClaims.UserID, userID)
	}
}

func TestPlatformAdminToken(t *testing.T) {
	manager := NewJWTManager("test-secret-key", 0, 0, "parkhub")

	// 平台管理员没有租户 ID
	token, err := manager.GenerateAccessToken("platform-admin", nil, "platform_admin")
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}

	claims, err := manager.ValidateAccessToken(token)
	if err != nil {
		t.Fatalf("ValidateAccessToken() error = %v", err)
	}

	if claims.TenantID != nil {
		t.Errorf("TenantID should be nil for platform admin, got %v", claims.TenantID)
	}
}

func BenchmarkGenerateAccessToken(b *testing.B) {
	manager := NewJWTManager("test-secret-key", 0, 0, "parkhub")
	tenantID := "tenant-456"
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		manager.GenerateAccessToken("user-123", &tenantID, "tenant_admin")
	}
}

func BenchmarkValidateAccessToken(b *testing.B) {
	manager := NewJWTManager("test-secret-key", 0, 0, "parkhub")
	tenantID := "tenant-456"
	token, _ := manager.GenerateAccessToken("user-123", &tenantID, "tenant_admin")
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		manager.ValidateAccessToken(token)
	}
}
