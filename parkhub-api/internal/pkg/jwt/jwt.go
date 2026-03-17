package jwt

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Token 类型
const (
	AccessTokenType  = "access"
	RefreshTokenType = "refresh"
)

// 默认有效期
const (
	DefaultAccessTokenTTL  = 2 * time.Hour      // Access Token 2小时
	DefaultRefreshTokenTTL = 7 * 24 * time.Hour // Refresh Token 7天
)

var (
	ErrTokenExpired     = errors.New("token has expired")
	ErrTokenInvalid     = errors.New("token is invalid")
	ErrTokenMalformed   = errors.New("token is malformed")
	ErrTokenNotValidYet = errors.New("token is not valid yet")
)

// Claims JWT 声明
type Claims struct {
	UserID   string  `json:"sub"`
	TenantID *string `json:"tenant_id,omitempty"`
	Role     string  `json:"role"`
	Type     string  `json:"type"` // access 或 refresh
	jwt.RegisteredClaims
}

// JWTManager JWT 管理器
type JWTManager struct {
	secretKey       []byte
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
	issuer          string
}

// NewJWTManager 创建 JWT 管理器
func NewJWTManager(secretKey string, accessTokenTTL, refreshTokenTTL time.Duration, issuer string) *JWTManager {
	if accessTokenTTL == 0 {
		accessTokenTTL = DefaultAccessTokenTTL
	}
	if refreshTokenTTL == 0 {
		refreshTokenTTL = DefaultRefreshTokenTTL
	}
	return &JWTManager{
		secretKey:       []byte(secretKey),
		accessTokenTTL:  accessTokenTTL,
		refreshTokenTTL: refreshTokenTTL,
		issuer:          issuer,
	}
}

// GenerateAccessToken 生成 Access Token
func (m *JWTManager) GenerateAccessToken(userID string, tenantID *string, role string) (string, error) {
	return m.generateToken(userID, tenantID, role, AccessTokenType, m.accessTokenTTL)
}

// GenerateRefreshToken 生成 Refresh Token
func (m *JWTManager) GenerateRefreshToken(userID string, tenantID *string, role string) (string, error) {
	return m.generateToken(userID, tenantID, role, RefreshTokenType, m.refreshTokenTTL)
}

// generateToken 生成 Token
func (m *JWTManager) generateToken(userID string, tenantID *string, role, tokenType string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := &Claims{
		UserID:   userID,
		TenantID: tenantID,
		Role:     role,
		Type:     tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        fmt.Sprintf("%d", now.UnixNano()),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			Issuer:    m.issuer,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.secretKey)
}

// ParseToken 解析 Token
func (m *JWTManager) ParseToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrTokenInvalid
		}
		return m.secretKey, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		if errors.Is(err, jwt.ErrTokenMalformed) {
			return nil, ErrTokenMalformed
		}
		return nil, ErrTokenInvalid
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrTokenInvalid
	}

	return claims, nil
}

// ValidateAccessToken 验证 Access Token
func (m *JWTManager) ValidateAccessToken(tokenString string) (*Claims, error) {
	claims, err := m.ParseToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.Type != AccessTokenType {
		return nil, ErrTokenInvalid
	}

	return claims, nil
}

// ValidateRefreshToken 验证 Refresh Token
func (m *JWTManager) ValidateRefreshToken(tokenString string) (*Claims, error) {
	claims, err := m.ParseToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.Type != RefreshTokenType {
		return nil, ErrTokenInvalid
	}

	return claims, nil
}

// RefreshTokens 刷新 Token 对
func (m *JWTManager) RefreshTokens(refreshToken string) (newAccessToken, newRefreshToken string, err error) {
	claims, err := m.ValidateRefreshToken(refreshToken)
	if err != nil {
		return "", "", err
	}

	newAccessToken, err = m.GenerateAccessToken(claims.UserID, claims.TenantID, claims.Role)
	if err != nil {
		return "", "", err
	}

	newRefreshToken, err = m.GenerateRefreshToken(claims.UserID, claims.TenantID, claims.Role)
	if err != nil {
		return "", "", err
	}

	return newAccessToken, newRefreshToken, nil
}

// GetAccessTokenTTL 获取 Access Token 有效期
func (m *JWTManager) GetAccessTokenTTL() time.Duration {
	return m.accessTokenTTL
}

// GetRefreshTokenTTL 获取 Refresh Token 有效期
func (m *JWTManager) GetRefreshTokenTTL() time.Duration {
	return m.refreshTokenTTL
}
