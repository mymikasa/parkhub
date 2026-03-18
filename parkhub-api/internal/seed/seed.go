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

	// 6. 创建演示停车场
	lot1ID := uuid.New().String()
	if err := db.Create(&dao.ParkingLotDAO{
		ID:              lot1ID,
		TenantID:        demoTenantID,
		Name:            "阳光广场地下停车场",
		Address:         "北京市朝阳区阳光广场B1-B3层",
		TotalSpaces:     500,
		AvailableSpaces: 328,
		LotType:         string(domain.LotTypeUnderground),
		Status:          string(domain.ParkingLotStatusActive),
		CreatedAt:       now,
		UpdatedAt:       now,
	}).Error; err != nil {
		return err
	}

	lot2ID := uuid.New().String()
	if err := db.Create(&dao.ParkingLotDAO{
		ID:              lot2ID,
		TenantID:        demoTenantID,
		Name:            "星光购物中心停车场",
		Address:         "北京市海淀区星光购物中心负一层",
		TotalSpaces:     300,
		AvailableSpaces: 185,
		LotType:         string(domain.LotTypeUnderground),
		Status:          string(domain.ParkingLotStatusActive),
		CreatedAt:       now,
		UpdatedAt:       now,
	}).Error; err != nil {
		return err
	}

	lot3ID := uuid.New().String()
	if err := db.Create(&dao.ParkingLotDAO{
		ID:              lot3ID,
		TenantID:        demoTenantID,
		Name:            "翠湖花园地面停车场",
		Address:         "北京市西城区翠湖花园东门",
		TotalSpaces:     80,
		AvailableSpaces: 80,
		LotType:         string(domain.LotTypeGround),
		Status:          string(domain.ParkingLotStatusInactive),
		CreatedAt:       now,
		UpdatedAt:       now,
	}).Error; err != nil {
		return err
	}

	// 7. 创建演示出入口
	gateData := []dao.GateDAO{
		{ID: uuid.New().String(), ParkingLotID: lot1ID, Name: "东入口", Type: string(domain.GateTypeEntry), CreatedAt: now, UpdatedAt: now},
		{ID: uuid.New().String(), ParkingLotID: lot1ID, Name: "西入口", Type: string(domain.GateTypeEntry), CreatedAt: now, UpdatedAt: now},
		{ID: uuid.New().String(), ParkingLotID: lot1ID, Name: "东出口", Type: string(domain.GateTypeExit), CreatedAt: now, UpdatedAt: now},
		{ID: uuid.New().String(), ParkingLotID: lot1ID, Name: "西出口", Type: string(domain.GateTypeExit), CreatedAt: now, UpdatedAt: now},
		{ID: uuid.New().String(), ParkingLotID: lot2ID, Name: "A入口", Type: string(domain.GateTypeEntry), CreatedAt: now, UpdatedAt: now},
		{ID: uuid.New().String(), ParkingLotID: lot2ID, Name: "B入口", Type: string(domain.GateTypeEntry), CreatedAt: now, UpdatedAt: now},
		{ID: uuid.New().String(), ParkingLotID: lot2ID, Name: "A出口", Type: string(domain.GateTypeExit), CreatedAt: now, UpdatedAt: now},
		{ID: uuid.New().String(), ParkingLotID: lot3ID, Name: "主入口", Type: string(domain.GateTypeEntry), CreatedAt: now, UpdatedAt: now},
		{ID: uuid.New().String(), ParkingLotID: lot3ID, Name: "主出口", Type: string(domain.GateTypeExit), CreatedAt: now, UpdatedAt: now},
	}
	for _, gate := range gateData {
		if err := db.Create(&gate).Error; err != nil {
			return err
		}
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
	log.Println("------------------------------------")
	log.Println("Demo Parking Lots:")
	log.Println("  1. 阳光广场地下停车场 (500车位, 4个出入口)")
	log.Println("  2. 星光购物中心停车场 (300车位, 3个出入口)")
	log.Println("  3. 翠湖花园地面停车场 (80车位, 暂停运营)")
	log.Println("====================================")

	return nil
}

func strPtr(s string) *string { return &s }
