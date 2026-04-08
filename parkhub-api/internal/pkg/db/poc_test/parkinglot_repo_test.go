package poctest

import (
	"context"
	"errors"
	"strings"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/parkhub/api/internal/pkg/db"
	"github.com/parkhub/api/internal/pkg/tenant"
)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

func newDB(t *testing.T) *gorm.DB {
	t.Helper()
	g, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := MigratePOCSchema(g); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return g
}

func seed(t *testing.T, g *gorm.DB) {
	t.Helper()
	lots := []ParkingLot{
		{ID: "lot-A1", TenantID: "A", Name: "A-Central", City: "Shanghai", Capacity: 100},
		{ID: "lot-A2", TenantID: "A", Name: "A-Pudong", City: "Shanghai", Capacity: 200},
		{ID: "lot-A3", TenantID: "A", Name: "A-Hongqiao", City: "Shanghai", Capacity: 150},
		{ID: "lot-B1", TenantID: "B", Name: "B-Wudaokou", City: "Beijing", Capacity: 80},
		{ID: "lot-B2", TenantID: "B", Name: "B-Sanlitun", City: "Beijing", Capacity: 120},
	}
	for i := range lots {
		if err := g.Create(&lots[i]).Error; err != nil {
			t.Fatalf("seed lot: %v", err)
		}
	}
	spots := []ParkingSpot{
		// Tenant A
		{ID: "s-A1-1", TenantID: "A", ParkingLotID: "lot-A1", Code: "A1-01", Occupied: true},
		{ID: "s-A1-2", TenantID: "A", ParkingLotID: "lot-A1", Code: "A1-02", Occupied: false},
		{ID: "s-A2-1", TenantID: "A", ParkingLotID: "lot-A2", Code: "A2-01", Occupied: true},
		{ID: "s-A2-2", TenantID: "A", ParkingLotID: "lot-A2", Code: "A2-02", Occupied: true},
		{ID: "s-A3-1", TenantID: "A", ParkingLotID: "lot-A3", Code: "A3-01", Occupied: false},
		// Tenant B
		{ID: "s-B1-1", TenantID: "B", ParkingLotID: "lot-B1", Code: "B1-01", Occupied: true},
		{ID: "s-B1-2", TenantID: "B", ParkingLotID: "lot-B1", Code: "B1-02", Occupied: false},
		{ID: "s-B2-1", TenantID: "B", ParkingLotID: "lot-B2", Code: "B2-01", Occupied: false},
	}
	for i := range spots {
		if err := g.Create(&spots[i]).Error; err != nil {
			t.Fatalf("seed spot: %v", err)
		}
	}
}

func ctxTenant(id, role, user string) context.Context {
	return tenant.WithContext(context.Background(), tenant.TenantInfo{
		TenantID: id,
		UserRole: role,
		UserID:   user,
	})
}

func ctxAdmin() context.Context {
	return tenant.WithContext(context.Background(), tenant.TenantInfo{
		UserRole:        "platform_admin",
		IsPlatformAdmin: true,
		UserID:          "u-admin",
	})
}

func newRepo(t *testing.T) (*ParkingLotRepo, *gorm.DB) {
	g := newDB(t)
	seed(t, g)
	return NewParkingLotRepo(db.NewBaseRepo(g)), g
}

// ---------------------------------------------------------------------------
// Scenario 1: A 租户用户 List 只看到 A 的数据
// ---------------------------------------------------------------------------

func TestPOC_Scenario1_TenantA_ListOnlyOwnData(t *testing.T) {
	repo, _ := newRepo(t)
	ctx := ctxTenant("A", "tenant_admin", "uA")

	lots, err := repo.List(ctx)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(lots) != 3 {
		t.Fatalf("tenant A expected 3 lots, got %d (%v)", len(lots), lots)
	}
	for _, l := range lots {
		if l.TenantID != "A" {
			t.Errorf("LEAK: tenant A saw row from tenant %q (%+v)", l.TenantID, l)
		}
	}
}

// ---------------------------------------------------------------------------
// Scenario 2: B 租户用户 List 只看到 B 的数据
// ---------------------------------------------------------------------------

func TestPOC_Scenario2_TenantB_ListOnlyOwnData(t *testing.T) {
	repo, _ := newRepo(t)
	ctx := ctxTenant("B", "tenant_admin", "uB")

	lots, err := repo.List(ctx)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(lots) != 2 {
		t.Fatalf("tenant B expected 2 lots, got %d", len(lots))
	}
	for _, l := range lots {
		if l.TenantID != "B" {
			t.Errorf("LEAK: tenant B saw row from tenant %q (%+v)", l.TenantID, l)
		}
	}
}

// ---------------------------------------------------------------------------
// Scenario 3: A 租户用户 GetByID(B 的 ID) 返回 not found
// ---------------------------------------------------------------------------

func TestPOC_Scenario3_CrossTenantGet_NotFound(t *testing.T) {
	repo, _ := newRepo(t)
	ctx := ctxTenant("A", "tenant_admin", "uA")

	got, err := repo.Get(ctx, "lot-B1")
	if err == nil {
		t.Fatalf("expected error, got %+v", got)
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		t.Fatalf("expected ErrRecordNotFound, got %v", err)
	}
}

// ---------------------------------------------------------------------------
// Scenario 4: 平台管理员 List 看到 A+B 全量
// ---------------------------------------------------------------------------

func TestPOC_Scenario4_PlatformAdmin_SeesAll(t *testing.T) {
	repo, _ := newRepo(t)
	ctx := ctxAdmin()

	lots, err := repo.List(ctx)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(lots) != 5 {
		t.Fatalf("platform admin expected 5 lots, got %d", len(lots))
	}

	// Spot-check both tenants are represented.
	seen := map[string]bool{}
	for _, l := range lots {
		seen[l.TenantID] = true
	}
	if !seen["A"] || !seen["B"] {
		t.Fatalf("admin should see both tenants, saw %v", seen)
	}
}

// ---------------------------------------------------------------------------
// Scenario 5: 缺失租户 context 时 panic
// ---------------------------------------------------------------------------

func TestPOC_Scenario5_MissingContext_Panics(t *testing.T) {
	repo, _ := newRepo(t)

	defer func() {
		r := recover()
		if r == nil {
			t.Fatal("expected panic on missing tenant context")
		}
		msg, ok := r.(string)
		if !ok || !strings.Contains(msg, "tenant context missing") {
			t.Fatalf("unexpected panic value: %v", r)
		}
	}()

	_, _ = repo.List(context.Background())
}

// ---------------------------------------------------------------------------
// Scenario 6: 复杂查询（JOIN、子查询、聚合）也能正确隔离
// ---------------------------------------------------------------------------

func TestPOC_Scenario6a_JoinAndAggregate_TenantScoped(t *testing.T) {
	repo, _ := newRepo(t)

	// Tenant A: 3 lots, occupancy {A1:1, A2:2, A3:0}
	rowsA, err := repo.ListWithSpotCounts(ctxTenant("A", "tenant_admin", "uA"))
	if err != nil {
		t.Fatalf("A join: %v", err)
	}
	if len(rowsA) != 3 {
		t.Fatalf("A expected 3 rows, got %d (%+v)", len(rowsA), rowsA)
	}
	wantA := map[string]int{"lot-A1": 1, "lot-A2": 2, "lot-A3": 0}
	for _, r := range rowsA {
		if !strings.HasPrefix(r.LotID, "lot-A") {
			t.Errorf("LEAK in JOIN result: %+v", r)
		}
		if w, ok := wantA[r.LotID]; ok && r.Occupied != w {
			t.Errorf("%s occupied=%d want %d", r.LotID, r.Occupied, w)
		}
	}

	// Tenant B: 2 lots, occupancy {B1:1, B2:0}
	rowsB, err := repo.ListWithSpotCounts(ctxTenant("B", "tenant_admin", "uB"))
	if err != nil {
		t.Fatalf("B join: %v", err)
	}
	if len(rowsB) != 2 {
		t.Fatalf("B expected 2 rows, got %d", len(rowsB))
	}
	for _, r := range rowsB {
		if !strings.HasPrefix(r.LotID, "lot-B") {
			t.Errorf("LEAK in JOIN result: %+v", r)
		}
	}
}

func TestPOC_Scenario6b_GroupByAggregate_TenantScoped(t *testing.T) {
	repo, _ := newRepo(t)

	cntA, err := repo.CountByCity(ctxTenant("A", "tenant_admin", "uA"))
	if err != nil {
		t.Fatalf("A count: %v", err)
	}
	if cntA["Shanghai"] != 3 || len(cntA) != 1 {
		t.Errorf("A countByCity = %v, want {Shanghai:3}", cntA)
	}

	cntB, err := repo.CountByCity(ctxTenant("B", "tenant_admin", "uB"))
	if err != nil {
		t.Fatalf("B count: %v", err)
	}
	if cntB["Beijing"] != 2 || len(cntB) != 1 {
		t.Errorf("B countByCity = %v, want {Beijing:2}", cntB)
	}

	cntAdmin, err := repo.CountByCity(ctxAdmin())
	if err != nil {
		t.Fatalf("admin count: %v", err)
	}
	if cntAdmin["Shanghai"] != 3 || cntAdmin["Beijing"] != 2 {
		t.Errorf("admin countByCity = %v, want {Shanghai:3, Beijing:2}", cntAdmin)
	}
}

func TestPOC_Scenario6c_Subquery_TenantScoped(t *testing.T) {
	repo, _ := newRepo(t)

	// Tenant A: lots with at least one occupied spot → A1, A2
	idsA, err := repo.IDsViaSubquery(ctxTenant("A", "tenant_admin", "uA"))
	if err != nil {
		t.Fatalf("A subquery: %v", err)
	}
	if got := strings.Join(idsA, ","); got != "lot-A1,lot-A2" {
		t.Errorf("A subquery = %q, want lot-A1,lot-A2", got)
	}

	// Tenant B: only B1 has an occupied spot
	idsB, err := repo.IDsViaSubquery(ctxTenant("B", "tenant_admin", "uB"))
	if err != nil {
		t.Fatalf("B subquery: %v", err)
	}
	if got := strings.Join(idsB, ","); got != "lot-B1" {
		t.Errorf("B subquery = %q, want lot-B1", got)
	}
}

// ---------------------------------------------------------------------------
// Scenario 7: 分页查询不会泄露其他租户数据
// ---------------------------------------------------------------------------

func TestPOC_Scenario7_Pagination_NoLeak(t *testing.T) {
	repo, _ := newRepo(t)
	ctx := ctxTenant("A", "tenant_admin", "uA")

	// Page 1 (size 2)
	page1, err := repo.ListPage(ctx, 0, 2)
	if err != nil {
		t.Fatalf("page1: %v", err)
	}
	if len(page1) != 2 {
		t.Fatalf("page1 expected 2 rows, got %d", len(page1))
	}

	// Page 2 (size 2) — should yield exactly 1 row (A has 3 total)
	page2, err := repo.ListPage(ctx, 2, 2)
	if err != nil {
		t.Fatalf("page2: %v", err)
	}
	if len(page2) != 1 {
		t.Fatalf("page2 expected 1 row, got %d (%+v)", len(page2), page2)
	}

	// Page 3 — beyond the data → 0 rows, NOT spillover into B
	page3, err := repo.ListPage(ctx, 4, 2)
	if err != nil {
		t.Fatalf("page3: %v", err)
	}
	if len(page3) != 0 {
		t.Fatalf("page3 expected 0 rows, got %d (LEAK?: %+v)", len(page3), page3)
	}

	// Verify no row across all pages belongs to another tenant.
	all := append(append(page1, page2...), page3...)
	for _, l := range all {
		if l.TenantID != "A" {
			t.Errorf("LEAK in pagination: %+v", l)
		}
	}
}
