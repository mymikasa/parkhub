package seed

import (
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/pkg/crypto"
	"github.com/parkhub/api/internal/repository/dao"
	"gorm.io/gorm"
)

// SeedData 初始化种子数据
func SeedData(db *gorm.DB) error {
	// 检查是否已有数据
	var count int64
	if err := db.Model(&dao.UserDAO{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		log.Println("Seed data already exists, skipping...")
		return nil
	}

	log.Println("Seeding initial data...")

	now := time.Now()

	// 1. 创建平台租户（用于平台管理员）
	platformTenantID := uuid.New().String()
	if err := db.Create(&dao.TenantDAO{
		ID:           platformTenantID,
		CompanyName:  "ParkHub 平台",
		ContactName:  "平台管理员",
		ContactPhone: "13800000000",
		Status:       string(domain.TenantStatusActive),
		CreatedAt:    now,
		UpdatedAt:    now,
	}).Error; err != nil {
		return err
	}

	// 2. 创建平台管理员
	passwordHash, err := crypto.HashPassword("Admin@123456")
	if err != nil {
		return err
	}
	platformAdminID := uuid.New().String()
	if err := db.Create(&dao.UserDAO{
		ID:           platformAdminID,
		TenantID:     nil,
		Username:     "platform_admin",
		Email:        strPtr("platform@parkhub.cn"),
		Phone:        strPtr("13800000001"),
		PasswordHash: passwordHash,
		RealName:     "平台管理员",
		Role:         string(domain.RolePlatformAdmin),
		Status:       string(domain.UserStatusActive),
		CreatedAt:    now,
		UpdatedAt:    now,
	}).Error; err != nil {
		return err
	}

	// 3. 创建演示租户
	demoTenantID := uuid.New().String()
	if err := db.Create(&dao.TenantDAO{
		ID:           demoTenantID,
		CompanyName:  "演示停车场公司",
		ContactName:  "张三",
		ContactPhone: "13800000002",
		Status:       string(domain.TenantStatusActive),
		CreatedAt:    now,
		UpdatedAt:    now,
	}).Error; err != nil {
		return err
	}

	// 4. 创建租户管理员
	tenantAdminPassword, err := crypto.HashPassword("Tenant@123456")
	if err != nil {
		return err
	}
	tenantAdminID := uuid.New().String()
	if err := db.Create(&dao.UserDAO{
		ID:           tenantAdminID,
		TenantID:     &demoTenantID,
		Username:     "tenant_admin",
		Email:        strPtr("tenant@parkhub.cn"),
		Phone:        strPtr("13800000003"),
		PasswordHash: tenantAdminPassword,
		RealName:     "租户管理员",
		Role:         string(domain.RoleTenantAdmin),
		Status:       string(domain.UserStatusActive),
		CreatedAt:    now,
		UpdatedAt:    now,
	}).Error; err != nil {
		return err
	}

	// 5. 创建操作员
	operatorPassword, err := crypto.HashPassword("Operator@123456")
	if err != nil {
		return err
	}
	operatorID := uuid.New().String()
	if err := db.Create(&dao.UserDAO{
		ID:           operatorID,
		TenantID:     &demoTenantID,
		Username:     "operator",
		Email:        strPtr("operator@parkhub.cn"),
		Phone:        strPtr("13800000004"),
		PasswordHash: operatorPassword,
		RealName:     "操作员",
		Role:         string(domain.RoleOperator),
		Status:       string(domain.UserStatusActive),
		CreatedAt:    now,
		UpdatedAt:    now,
	}).Error; err != nil {
		return err
	}

	log.Println("Seed data created successfully!")
	log.Println("====================================")
	log.Println("Initial accounts created:")
	log.Println("------------------------------------")
	log.Println("Platform Admin:")
	log.Println("  Username: platform_admin")
	log.Println("  Email: platform@parkhub.cn")
	log.Println("  Password: Admin@123456")
	log.Println("  Phone: 13800000001")
	log.Println("------------------------------------")
	log.Println("Tenant Admin (Demo Company):")
	log.Println("  Username: tenant_admin")
	log.Println("  Email: tenant@parkhub.cn")
	log.Println("  Password: Tenant@123456")
	log.Println("  Phone: 13800000003")
	log.Println("------------------------------------")
	log.Println("Operator (Demo Company):")
	log.Println("  Username: operator")
	log.Println("  Email: operator@parkhub.cn")
	log.Println("  Password: Operator@123456")
	log.Println("  Phone: 13800000004")
	log.Println("====================================")

	return nil
}

func strPtr(s string) *string { return &s }
