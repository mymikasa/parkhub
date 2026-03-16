package dto

// CreateTenantRequest 创建租户请求
type CreateTenantRequest struct {
	CompanyName  string `json:"company_name" binding:"required,min=2,max=50"` // 公司名称
	CreditCode   string `json:"credit_code"`                                  // 统一社会信用代码
	ContactName  string `json:"contact_name" binding:"required,min=2,max=20"` // 联系人
	ContactPhone string `json:"contact_phone" binding:"required,mobile"`      // 联系电话
	AdminEmail   string `json:"admin_email" binding:"omitempty,email"`        // 管理员邮箱
	Remark       string `json:"remark"`                                       // 备注
}

// UpdateTenantRequest 更新租户请求
type UpdateTenantRequest struct {
	CompanyName  string `json:"company_name" binding:"required,min=2,max=50"` // 公司名称
	ContactName  string `json:"contact_name" binding:"required,min=2,max=20"` // 联系人
	ContactPhone string `json:"contact_phone" binding:"required,mobile"`      // 联系电话
}

// Tenant 租户信息
type Tenant struct {
	ID           string `json:"id"`
	CompanyName  string `json:"company_name"`
	CreditCode   string `json:"credit_code,omitempty"`
	ContactName  string `json:"contact_name"`
	ContactPhone string `json:"contact_phone"`
	AdminEmail   string `json:"admin_email,omitempty"`
	Status       string `json:"status"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

// TenantListResponse 租户列表响应
type TenantListResponse struct {
	Items    []Tenant `json:"items"`
	Total    int64    `json:"total"`
	Page     int      `json:"page"`
	PageSize int      `json:"page_size"`
}

// TenantStatsResponse 租户统计响应
type TenantStatsResponse struct {
	TotalTenants     int64 `json:"total_tenants"`      // 总租户数
	ActiveTenants    int64 `json:"active_tenants"`     // 正常运营数
	FrozenTenants    int64 `json:"frozen_tenants"`     // 已冻结数
	TotalParkingLots int64 `json:"total_parking_lots"` // 接入车场数
}
