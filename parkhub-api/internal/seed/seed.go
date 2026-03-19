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
	lot1EntryGate1 := uuid.New().String()
	lot1EntryGate2 := uuid.New().String()
	lot1ExitGate1 := uuid.New().String()
	lot1ExitGate2 := uuid.New().String()
	lot2EntryGate1 := uuid.New().String()
	lot2EntryGate2 := uuid.New().String()
	lot2ExitGate1 := uuid.New().String()
	lot3EntryGate1 := uuid.New().String()
	lot3ExitGate1 := uuid.New().String()

	gateData := []dao.GateDAO{
		{ID: lot1EntryGate1, ParkingLotID: lot1ID, Name: "东入口", Type: string(domain.GateTypeEntry), CreatedAt: now, UpdatedAt: now},
		{ID: lot1EntryGate2, ParkingLotID: lot1ID, Name: "西入口", Type: string(domain.GateTypeEntry), CreatedAt: now, UpdatedAt: now},
		{ID: lot1ExitGate1, ParkingLotID: lot1ID, Name: "东出口", Type: string(domain.GateTypeExit), CreatedAt: now, UpdatedAt: now},
		{ID: lot1ExitGate2, ParkingLotID: lot1ID, Name: "西出口", Type: string(domain.GateTypeExit), CreatedAt: now, UpdatedAt: now},
		{ID: lot2EntryGate1, ParkingLotID: lot2ID, Name: "A入口", Type: string(domain.GateTypeEntry), CreatedAt: now, UpdatedAt: now},
		{ID: lot2EntryGate2, ParkingLotID: lot2ID, Name: "B入口", Type: string(domain.GateTypeEntry), CreatedAt: now, UpdatedAt: now},
		{ID: lot2ExitGate1, ParkingLotID: lot2ID, Name: "A出口", Type: string(domain.GateTypeExit), CreatedAt: now, UpdatedAt: now},
		{ID: lot3EntryGate1, ParkingLotID: lot3ID, Name: "主入口", Type: string(domain.GateTypeEntry), CreatedAt: now, UpdatedAt: now},
		{ID: lot3ExitGate1, ParkingLotID: lot3ID, Name: "主出口", Type: string(domain.GateTypeExit), CreatedAt: now, UpdatedAt: now},
	}
	for _, gate := range gateData {
		if err := db.Create(&gate).Error; err != nil {
			return err
		}
	}

	// 8. 创建演示通行记录
	if err := seedTransitRecords(db, demoTenantID, operatorID, now,
		lot1ID, lot2ID,
		lot1EntryGate1, lot1ExitGate1,
		lot2EntryGate1, lot2ExitGate1,
	); err != nil {
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
	log.Println("------------------------------------")
	log.Println("Demo Parking Lots:")
	log.Println("  1. 阳光广场地下停车场 (500车位, 4个出入口)")
	log.Println("  2. 星光购物中心停车场 (300车位, 3个出入口)")
	log.Println("  3. 翠湖花园地面停车场 (80车位, 暂停运营)")
	log.Println("------------------------------------")
	log.Println("Demo Transit Records: 15 records seeded")
	log.Println("====================================")

	return nil
}

func strPtr(s string) *string  { return &s }
func floatPtr(f float64) *float64 { return &f }
func intPtr(i int) *int        { return &i }

// seedTransitRecords 创建演示通行记录
func seedTransitRecords(db *gorm.DB, tenantID, operatorID string, now time.Time,
	lot1ID, lot2ID string,
	lot1EntryGate, lot1ExitGate string,
	lot2EntryGate, lot2ExitGate string,
) error {
	// --- 正常入场记录（当前在场） ---
	entry1ID := uuid.New().String()
	entry2ID := uuid.New().String()
	entry3ID := uuid.New().String()
	entry4ID := uuid.New().String()

	entryRecords := []dao.TransitRecordDAO{
		// 今天入场，正常在场
		{ID: entry1ID, TenantID: tenantID, ParkingLotID: lot1ID, GateID: lot1EntryGate,
			PlateNumber: strPtr("京A·12345"), Type: "entry", Status: "normal",
			CreatedAt: now.Add(-2 * time.Hour), UpdatedAt: now.Add(-2 * time.Hour)},
		{ID: entry2ID, TenantID: tenantID, ParkingLotID: lot1ID, GateID: lot1EntryGate,
			PlateNumber: strPtr("京B·67890"), Type: "entry", Status: "normal",
			CreatedAt: now.Add(-90 * time.Minute), UpdatedAt: now.Add(-90 * time.Minute)},
		{ID: entry3ID, TenantID: tenantID, ParkingLotID: lot2ID, GateID: lot2EntryGate,
			PlateNumber: strPtr("沪A·88888"), Type: "entry", Status: "normal",
			CreatedAt: now.Add(-45 * time.Minute), UpdatedAt: now.Add(-45 * time.Minute)},
		{ID: entry4ID, TenantID: tenantID, ParkingLotID: lot1ID, GateID: lot1EntryGate,
			PlateNumber: strPtr("粤B·55555"), Type: "entry", Status: "normal",
			CreatedAt: now.Add(-30 * time.Minute), UpdatedAt: now.Add(-30 * time.Minute)},
	}

	// --- 已完成的入场+出场配对记录（已缴费） ---
	paidEntry1ID := uuid.New().String()
	paidEntry2ID := uuid.New().String()
	paidEntry3ID := uuid.New().String()

	paidEntries := []dao.TransitRecordDAO{
		{ID: paidEntry1ID, TenantID: tenantID, ParkingLotID: lot1ID, GateID: lot1EntryGate,
			PlateNumber: strPtr("京C·11111"), Type: "entry", Status: "normal",
			CreatedAt: now.Add(-5 * time.Hour), UpdatedAt: now.Add(-5 * time.Hour)},
		{ID: paidEntry2ID, TenantID: tenantID, ParkingLotID: lot2ID, GateID: lot2EntryGate,
			PlateNumber: strPtr("京D·22222"), Type: "entry", Status: "normal",
			CreatedAt: now.Add(-3 * time.Hour), UpdatedAt: now.Add(-3 * time.Hour)},
		{ID: paidEntry3ID, TenantID: tenantID, ParkingLotID: lot1ID, GateID: lot1EntryGate,
			PlateNumber: strPtr("沪C·33333"), Type: "entry", Status: "normal",
			CreatedAt: now.Add(-8 * time.Hour), UpdatedAt: now.Add(-8 * time.Hour)},
	}

	exitRecords := []dao.TransitRecordDAO{
		{ID: uuid.New().String(), TenantID: tenantID, ParkingLotID: lot1ID, GateID: lot1ExitGate,
			PlateNumber: strPtr("京C·11111"), Type: "exit", Status: "paid",
			EntryRecordID: strPtr(paidEntry1ID), Fee: floatPtr(6.00), ParkingDuration: intPtr(180),
			CreatedAt: now.Add(-2 * time.Hour), UpdatedAt: now.Add(-2 * time.Hour)},
		{ID: uuid.New().String(), TenantID: tenantID, ParkingLotID: lot2ID, GateID: lot2ExitGate,
			PlateNumber: strPtr("京D·22222"), Type: "exit", Status: "paid",
			EntryRecordID: strPtr(paidEntry2ID), Fee: floatPtr(4.00), ParkingDuration: intPtr(90),
			CreatedAt: now.Add(-90 * time.Minute), UpdatedAt: now.Add(-90 * time.Minute)},
		{ID: uuid.New().String(), TenantID: tenantID, ParkingLotID: lot1ID, GateID: lot1ExitGate,
			PlateNumber: strPtr("沪C·33333"), Type: "exit", Status: "paid",
			EntryRecordID: strPtr(paidEntry3ID), Fee: floatPtr(16.00), ParkingDuration: intPtr(420),
			CreatedAt: now.Add(-1 * time.Hour), UpdatedAt: now.Add(-1 * time.Hour)},
	}

	// --- 异常记录 ---

	// 有入无出：3天前入场，超时未出场
	overstayEntry1ID := uuid.New().String()
	overstayEntry2ID := uuid.New().String()

	overstayRecords := []dao.TransitRecordDAO{
		{ID: overstayEntry1ID, TenantID: tenantID, ParkingLotID: lot1ID, GateID: lot1EntryGate,
			PlateNumber: strPtr("京E·99999"), Type: "entry", Status: "no_exit",
			CreatedAt: now.Add(-72 * time.Hour), UpdatedAt: now.Add(-24 * time.Hour)},
		{ID: overstayEntry2ID, TenantID: tenantID, ParkingLotID: lot2ID, GateID: lot2EntryGate,
			PlateNumber: strPtr("沪B·77777"), Type: "entry", Status: "no_exit",
			CreatedAt: now.Add(-56 * time.Hour), UpdatedAt: now.Add(-8 * time.Hour)},
	}

	// 有出无入：出场时无匹配入场记录
	noEntryRecords := []dao.TransitRecordDAO{
		{ID: uuid.New().String(), TenantID: tenantID, ParkingLotID: lot1ID, GateID: lot1ExitGate,
			PlateNumber: strPtr("浙A·66666"), Type: "exit", Status: "no_entry",
			CreatedAt: now.Add(-4 * time.Hour), UpdatedAt: now.Add(-4 * time.Hour)},
	}

	// 识别失败：车牌为空
	recognitionFailedRecords := []dao.TransitRecordDAO{
		{ID: uuid.New().String(), TenantID: tenantID, ParkingLotID: lot1ID, GateID: lot1EntryGate,
			PlateNumber: nil, Type: "entry", Status: "recognition_failed",
			CreatedAt: now.Add(-20 * time.Minute), UpdatedAt: now.Add(-20 * time.Minute)},
	}

	// 已处理的异常记录
	resolvedAt := now.Add(-1 * time.Hour)
	resolvedRecords := []dao.TransitRecordDAO{
		{ID: uuid.New().String(), TenantID: tenantID, ParkingLotID: lot2ID, GateID: lot2EntryGate,
			PlateNumber: strPtr("苏A·44444"), Type: "entry", Status: "recognition_failed",
			Remark: strPtr("人工核实后补录车牌"),
			ResolvedAt: &resolvedAt, ResolvedBy: strPtr(operatorID),
			CreatedAt: now.Add(-6 * time.Hour), UpdatedAt: resolvedAt},
	}

	// 批量插入所有记录
	allRecords := make([]dao.TransitRecordDAO, 0, 15)
	allRecords = append(allRecords, entryRecords...)
	allRecords = append(allRecords, paidEntries...)
	allRecords = append(allRecords, exitRecords...)
	allRecords = append(allRecords, overstayRecords...)
	allRecords = append(allRecords, noEntryRecords...)
	allRecords = append(allRecords, recognitionFailedRecords...)
	allRecords = append(allRecords, resolvedRecords...)

	for _, record := range allRecords {
		if err := db.Create(&record).Error; err != nil {
			return err
		}
	}

	log.Printf("Seeded %d transit records", len(allRecords))
	return nil
}
