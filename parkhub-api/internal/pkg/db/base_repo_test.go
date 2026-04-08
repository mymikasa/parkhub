package db

import (
	"context"
	"strings"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/parkhub/api/internal/pkg/tenant"
)

// fakeModel simulates a tenant-scoped business table.
type fakeModel struct {
	ID       string `gorm:"primaryKey"`
	TenantID string `gorm:"index"`
	Name     string
}

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&fakeModel{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func seedData(t *testing.T, db *gorm.DB) {
	t.Helper()
	rows := []fakeModel{
		{ID: "1", TenantID: "A", Name: "Lot-A1"},
		{ID: "2", TenantID: "A", Name: "Lot-A2"},
		{ID: "3", TenantID: "B", Name: "Lot-B1"},
		{ID: "4", TenantID: "B", Name: "Lot-B2"},
	}
	for _, r := range rows {
		if err := db.Create(&r).Error; err != nil {
			t.Fatalf("seed: %v", err)
		}
	}
}

func TestWithTenant_NormalUser(t *testing.T) {
	db := setupTestDB(t)
	seedData(t, db)
	repo := NewBaseRepo(db)

	ctx := tenant.WithContext(context.Background(), tenant.TenantInfo{
		TenantID: "A",
		UserRole: "tenant_admin",
		UserID:   "u1",
	})

	var results []fakeModel
	if err := repo.WithTenant(ctx).Find(&results).Error; err != nil {
		t.Fatalf("find: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 results for tenant A, got %d", len(results))
	}
	for _, r := range results {
		if r.TenantID != "A" {
			t.Errorf("leaked tenant data: %+v", r)
		}
	}
}

func TestWithTenant_PlatformAdmin(t *testing.T) {
	db := setupTestDB(t)
	seedData(t, db)
	repo := NewBaseRepo(db)

	ctx := tenant.WithContext(context.Background(), tenant.TenantInfo{
		UserRole:        "platform_admin",
		IsPlatformAdmin: true,
		UserID:          "u-admin",
	})

	var results []fakeModel
	if err := repo.WithTenant(ctx).Find(&results).Error; err != nil {
		t.Fatalf("find: %v", err)
	}
	if len(results) != 4 {
		t.Fatalf("expected 4 results for admin, got %d", len(results))
	}
}

func TestWithTenant_MissingContext(t *testing.T) {
	db := setupTestDB(t)
	repo := NewBaseRepo(db)

	defer func() {
		r := recover()
		if r == nil {
			t.Fatal("expected panic")
		}
		if !strings.Contains(r.(string), "tenant context missing") {
			t.Fatalf("unexpected panic: %v", r)
		}
	}()

	repo.WithTenant(context.Background())
}

func TestWithTenant_EmptyTenantID(t *testing.T) {
	db := setupTestDB(t)
	repo := NewBaseRepo(db)

	defer func() {
		r := recover()
		if r == nil {
			t.Fatal("expected panic")
		}
		if !strings.Contains(r.(string), "tenant_id empty") {
			t.Fatalf("unexpected panic: %v", r)
		}
	}()

	ctx := tenant.WithContext(context.Background(), tenant.TenantInfo{
		TenantID: "",
		UserRole: "tenant_admin",
		UserID:   "u1",
	})
	repo.WithTenant(ctx)
}

func TestWithTenantExplicit_AdminTargetA(t *testing.T) {
	db := setupTestDB(t)
	seedData(t, db)
	repo := NewBaseRepo(db)

	ctx := tenant.WithContext(context.Background(), tenant.TenantInfo{
		UserRole:        "platform_admin",
		IsPlatformAdmin: true,
		UserID:          "u-admin",
	})

	var results []fakeModel
	if err := repo.WithTenantExplicit(ctx, "B").Find(&results).Error; err != nil {
		t.Fatalf("find: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 results for target tenant B, got %d", len(results))
	}
	for _, r := range results {
		if r.TenantID != "B" {
			t.Errorf("wrong tenant data: %+v", r)
		}
	}
}

func TestWithTenantExplicit_AdminNoTarget(t *testing.T) {
	db := setupTestDB(t)
	seedData(t, db)
	repo := NewBaseRepo(db)

	ctx := tenant.WithContext(context.Background(), tenant.TenantInfo{
		UserRole:        "platform_admin",
		IsPlatformAdmin: true,
		UserID:          "u-admin",
	})

	var results []fakeModel
	if err := repo.WithTenantExplicit(ctx, "").Find(&results).Error; err != nil {
		t.Fatalf("find: %v", err)
	}
	if len(results) != 4 {
		t.Fatalf("expected 4 (all) for admin with no target, got %d", len(results))
	}
}

func TestWithTenantExplicit_NormalIgnored(t *testing.T) {
	db := setupTestDB(t)
	seedData(t, db)
	repo := NewBaseRepo(db)

	// Normal user belongs to A, tries to target B — should be ignored
	ctx := tenant.WithContext(context.Background(), tenant.TenantInfo{
		TenantID: "A",
		UserRole: "tenant_admin",
		UserID:   "u1",
	})

	var results []fakeModel
	if err := repo.WithTenantExplicit(ctx, "B").Find(&results).Error; err != nil {
		t.Fatalf("find: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 (own tenant A), got %d", len(results))
	}
	for _, r := range results {
		if r.TenantID != "A" {
			t.Errorf("non-admin should only see own tenant: %+v", r)
		}
	}
}

func TestWithTenant_DataIsolation(t *testing.T) {
	db := setupTestDB(t)
	seedData(t, db)
	repo := NewBaseRepo(db)

	// Tenant A queries — should only see A's data
	ctxA := tenant.WithContext(context.Background(), tenant.TenantInfo{
		TenantID: "A",
		UserRole: "tenant_admin",
		UserID:   "uA",
	})
	var resultsA []fakeModel
	if err := repo.WithTenant(ctxA).Find(&resultsA).Error; err != nil {
		t.Fatalf("find A: %v", err)
	}

	// Verify each result
	for _, r := range resultsA {
		if r.TenantID != "A" {
			t.Errorf("tenant A query leaked: %+v", r)
		}
	}

	// Tenant B queries by specific ID from A — should not find it
	var result fakeModel
	err := repo.WithTenant(ctxA).Where("id = ?", "3").First(&result).Error
	if err == nil {
		t.Fatalf("tenant A should not see tenant B's record (id=3), got %+v", result)
	}
}
