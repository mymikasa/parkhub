package domain

import (
	"time"
)

// Tenant 租户实体
type Tenant struct {
	ID           string
	CompanyName  string
	ContactName  string
	ContactPhone string
	Status       TenantStatus
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// TenantStatus 租户状态
type TenantStatus string

const (
	TenantStatusActive  TenantStatus = "active"  // 正常运营
	TenantStatusFrozen  TenantStatus = "frozen"  // 已冻结
)

// NewTenant 创建新租户
func NewTenant(
	id string,
	companyName string,
	contactName string,
	contactPhone string,
) *Tenant {
	return &Tenant{
		ID:           id,
		CompanyName:  companyName,
		ContactName:  contactName,
		ContactPhone: contactPhone,
		Status:       TenantStatusActive,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
}

// IsActive 是否处于活跃状态
func (t *Tenant) IsActive() bool {
	return t.Status == TenantStatusActive
}

// Freeze 冻结租户
func (t *Tenant) Freeze() {
	t.Status = TenantStatusFrozen
	t.UpdatedAt = time.Now()
}

// Unfreeze 解冻租户
func (t *Tenant) Unfreeze() {
	t.Status = TenantStatusActive
	t.UpdatedAt = time.Now()
}

// UpdateContact 更新联系人信息
func (t *Tenant) UpdateContact(contactName, contactPhone string) {
	t.ContactName = contactName
	t.ContactPhone = contactPhone
	t.UpdatedAt = time.Now()
}

// UpdateCompanyName 更新公司名称
func (t *Tenant) UpdateCompanyName(companyName string) {
	t.CompanyName = companyName
	t.UpdatedAt = time.Now()
}
