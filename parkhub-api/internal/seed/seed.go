package seed

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/pkg/crypto"
)

// SeedData 初始化种子数据
func SeedData(db *sql.DB) error {
	ctx := context.Background()

	// 检查是否已有数据
	var count int
	err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to check existing users: %w", err)
	}
	if count > 0 {
		log.Println("Seed data already exists, skipping...")
		return nil
	}

	log.Println("Seeding initial data...")

	// 1. 创建平台租户（用于平台管理员）
	platformTenantID := uuid.New().String()
	_, err = db.ExecContext(ctx, `
		INSERT INTO tenants (id, company_name, contact_name, contact_phone, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, platformTenantID, "ParkHub 平台", "平台管理员", "13800000000", string(domain.TenantStatusActive), time.Now(), time.Now())
	if err != nil {
		return fmt.Errorf("failed to create platform tenant: %w", err)
	}

	// 2. 创建平台管理员
	passwordHash, err := crypto.HashPassword("Admin@123456")
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	platformAdminID := uuid.New().String()
	_, err = db.ExecContext(ctx, `
		INSERT INTO users (id, tenant_id, username, email, phone, password_hash, real_name, role, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, platformAdminID, nil, "platform_admin", "platform@parkhub.cn", "13800000001", passwordHash, "平台管理员", string(domain.RolePlatformAdmin), string(domain.UserStatusActive), time.Now(), time.Now())
	if err != nil {
		return fmt.Errorf("failed to create platform admin: %w", err)
	}

	// 3. 创建演示租户
	demoTenantID := uuid.New().String()
	_, err = db.ExecContext(ctx, `
		INSERT INTO tenants (id, company_name, contact_name, contact_phone, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, demoTenantID, "演示停车场公司", "张三", "13800000002", string(domain.TenantStatusActive), time.Now(), time.Now())
	if err != nil {
		return fmt.Errorf("failed to create demo tenant: %w", err)
	}

	// 4. 创建租户管理员
	tenantAdminPassword, err := crypto.HashPassword("Tenant@123456")
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	tenantAdminID := uuid.New().String()
	_, err = db.ExecContext(ctx, `
		INSERT INTO users (id, tenant_id, username, email, phone, password_hash, real_name, role, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, tenantAdminID, demoTenantID, "tenant_admin", "tenant@parkhub.cn", "13800000003", tenantAdminPassword, "租户管理员", string(domain.RoleTenantAdmin), string(domain.UserStatusActive), time.Now(), time.Now())
	if err != nil {
		return fmt.Errorf("failed to create tenant admin: %w", err)
	}

	// 5. 创建操作员
	operatorPassword, err := crypto.HashPassword("Operator@123456")
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	operatorID := uuid.New().String()
	_, err = db.ExecContext(ctx, `
		INSERT INTO users (id, tenant_id, username, email, phone, password_hash, real_name, role, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, operatorID, demoTenantID, "operator", "operator@parkhub.cn", "13800000004", operatorPassword, "操作员", string(domain.RoleOperator), string(domain.UserStatusActive), time.Now(), time.Now())
	if err != nil {
		return fmt.Errorf("failed to create operator: %w", err)
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
