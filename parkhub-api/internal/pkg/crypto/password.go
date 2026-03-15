package crypto

import (
	"golang.org/x/crypto/bcrypt"
)

const (
	// DefaultCost bcrypt 默认计算成本（12 约需 250ms）
	DefaultCost = 12
)

// HashPassword 对密码进行哈希
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// VerifyPassword 验证密码是否匹配
func VerifyPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// MustHashPassword 对密码进行哈希，如果出错则 panic
func MustHashPassword(password string) string {
	hash, err := HashPassword(password)
	if err != nil {
		panic(err)
	}
	return hash
}
