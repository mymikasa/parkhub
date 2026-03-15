package crypto

import (
	"testing"
)

func TestHashPassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{
			name:     "正常密码",
			password: "Password123",
			wantErr:  false,
		},
		{
			name:     "短密码",
			password: "123456",
			wantErr:  false,
		},
		{
			name:     "长密码",
			password: "ThisIsAVeryLongPasswordThatShouldStillWork123!@#",
			wantErr:  false,
		},
		{
			name:     "包含特殊字符",
			password: "P@ssw0rd!#$%",
			wantErr:  false,
		},
		{
			name:     "中文密码",
			password: "密码测试123",
			wantErr:  false,
		},
		{
			name:     "空密码",
			password: "",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := HashPassword(tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("HashPassword() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && hash == "" {
				t.Error("HashPassword() returned empty hash")
			}
			if !tt.wantErr && hash == tt.password {
				t.Error("HashPassword() returned plaintext password")
			}
		})
	}
}

func TestVerifyPassword(t *testing.T) {
	password := "Password123"
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	tests := []struct {
		name     string
		password string
		hash     string
		want     bool
	}{
		{
			name:     "正确密码",
			password: password,
			hash:     hash,
			want:     true,
		},
		{
			name:     "错误密码",
			password: "WrongPassword",
			hash:     hash,
			want:     false,
		},
		{
			name:     "空密码",
			password: "",
			hash:     hash,
			want:     false,
		},
		{
			name:     "大小写敏感",
			password: "password123",
			hash:     hash,
			want:     false,
		},
		{
			name:     "无效哈希",
			password: password,
			hash:     "invalid_hash",
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := VerifyPassword(tt.password, tt.hash); got != tt.want {
				t.Errorf("VerifyPassword() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestHashPasswordUniqueness(t *testing.T) {
	password := "Password123"

	hash1, err := HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	hash2, err := HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	// 每次哈希应该生成不同的值（因为有随机盐）
	if hash1 == hash2 {
		t.Error("HashPassword() should generate unique hashes due to salt")
	}

	// 但两个哈希都应该能验证原始密码
	if !VerifyPassword(password, hash1) {
		t.Error("hash1 should verify original password")
	}
	if !VerifyPassword(password, hash2) {
		t.Error("hash2 should verify original password")
	}
}

func BenchmarkHashPassword(b *testing.B) {
	password := "Password123"
	for i := 0; i < b.N; i++ {
		HashPassword(password)
	}
}

func BenchmarkVerifyPassword(b *testing.B) {
	password := "Password123"
	hash, _ := HashPassword(password)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		VerifyPassword(password, hash)
	}
}
