package domain

import (
	"time"
)

// User 用户实体
type User struct {
	ID           string
	TenantID     *string // 平台管理员为 nil
	Username     string
	Email        *string
	Phone        *string
	PasswordHash string
	RealName     string
	Role         UserRole
	Status       UserStatus
	LastLoginAt  *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// UserRole 用户角色
type UserRole string

const (
	RolePlatformAdmin UserRole = "platform_admin" // 平台管理员
	RoleTenantAdmin   UserRole = "tenant_admin"   // 租户管理员
	RoleOperator      UserRole = "operator"       // 操作员
)

// UserStatus 用户状态
type UserStatus string

const (
	UserStatusActive  UserStatus = "active"  // 正常
	UserStatusFrozen  UserStatus = "frozen"  // 冻结
)

// NewUser 创建新用户
func NewUser(
	id string,
	tenantID *string,
	username string,
	email *string,
	phone *string,
	passwordHash string,
	realName string,
	role UserRole,
) *User {
	return &User{
		ID:           id,
		TenantID:     tenantID,
		Username:     username,
		Email:        email,
		Phone:        phone,
		PasswordHash: passwordHash,
		RealName:     realName,
		Role:         role,
		Status:       UserStatusActive,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
}

// IsPlatformAdmin 是否是平台管理员
func (u *User) IsPlatformAdmin() bool {
	return u.Role == RolePlatformAdmin
}

// IsTenantAdmin 是否是租户管理员
func (u *User) IsTenantAdmin() bool {
	return u.Role == RoleTenantAdmin
}

// IsActive 是否处于活跃状态
func (u *User) IsActive() bool {
	return u.Status == UserStatusActive
}

// Freeze 冻结用户
func (u *User) Freeze() {
	u.Status = UserStatusFrozen
	u.UpdatedAt = time.Now()
}

// Activate 激活用户
func (u *User) Activate() {
	u.Status = UserStatusActive
	u.UpdatedAt = time.Now()
}

// UpdateLastLogin 更新最后登录时间
func (u *User) UpdateLastLogin() {
	now := time.Now()
	u.LastLoginAt = &now
	u.UpdatedAt = now
}

// CanManageUsers 是否可以管理用户
func (u *User) CanManageUsers() bool {
	return u.Role == RolePlatformAdmin || u.Role == RoleTenantAdmin
}

// CanManageParkingLots 是否可以管理停车场
func (u *User) CanManageParkingLots() bool {
	return u.Role == RolePlatformAdmin || u.Role == RoleTenantAdmin
}

// CanManageDevices 是否可以管理设备
func (u *User) CanManageDevices() bool {
	return u.Role == RolePlatformAdmin || u.Role == RoleTenantAdmin
}

// CanOperateGate 是否可以操作道闸
func (u *User) CanOperateGate() bool {
	// 所有角色都可以操作道闸
	return true
}

// CanViewAllTenants 是否可以查看所有租户
func (u *User) CanViewAllTenants() bool {
	return u.Role == RolePlatformAdmin
}
