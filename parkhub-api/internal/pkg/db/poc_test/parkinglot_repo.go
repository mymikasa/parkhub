// Package poctest is the Phase-0 tenant isolation Proof-of-Concept.
//
// It demonstrates that BaseRepo.WithTenant correctly enforces tenant_id
// filtering across realistic query patterns (CRUD, JOIN, subquery,
// aggregation, pagination), and that platform admins can opt out via
// the explicit whitelist mechanism.
//
// This package exists ONLY to validate the architectural decision in
// Task 0.6. It is not imported by production code.
package poctest

import (
	"context"

	"gorm.io/gorm"

	"github.com/parkhub/api/internal/pkg/db"
)

// ParkingLot is a sample tenant-scoped business model used in the POC.
type ParkingLot struct {
	ID       string `gorm:"primaryKey"`
	TenantID string `gorm:"index;column:tenant_id"`
	Name     string
	City     string
	Capacity int
}

func (ParkingLot) TableName() string { return "parking_lots" }

// ParkingSpot is a child entity used to validate JOIN-style queries.
type ParkingSpot struct {
	ID           string `gorm:"primaryKey"`
	TenantID     string `gorm:"index;column:tenant_id"`
	ParkingLotID string `gorm:"index;column:parking_lot_id"`
	Code         string
	Occupied     bool
}

func (ParkingSpot) TableName() string { return "parking_spots" }

// ParkingLotRepo is the canonical example repository: it embeds BaseRepo
// and obtains all tenant-scoped sessions via r.WithTenant(ctx).
type ParkingLotRepo struct {
	*db.BaseRepo
}

func NewParkingLotRepo(base *db.BaseRepo) *ParkingLotRepo {
	return &ParkingLotRepo{BaseRepo: base}
}

// List returns all parking lots visible to the caller.
func (r *ParkingLotRepo) List(ctx context.Context) ([]ParkingLot, error) {
	var lots []ParkingLot
	err := r.WithTenant(ctx).Find(&lots).Error
	return lots, err
}

// Get fetches a single parking lot by ID, scoped to caller's tenant.
func (r *ParkingLotRepo) Get(ctx context.Context, id string) (*ParkingLot, error) {
	var lot ParkingLot
	if err := r.WithTenant(ctx).Where("id = ?", id).First(&lot).Error; err != nil {
		return nil, err
	}
	return &lot, nil
}

// ListPage returns one page of parking lots ordered by ID.
func (r *ParkingLotRepo) ListPage(ctx context.Context, offset, limit int) ([]ParkingLot, error) {
	var lots []ParkingLot
	err := r.WithTenant(ctx).
		Order("id ASC").
		Offset(offset).
		Limit(limit).
		Find(&lots).Error
	return lots, err
}

// LotWithSpotCount is the result row of a JOIN + GROUP BY query.
type LotWithSpotCount struct {
	LotID    string
	LotName  string
	SpotCnt  int
	Occupied int
}

// ListWithSpotCounts demonstrates that complex JOIN + aggregate queries
// remain tenant-scoped: the WHERE clause injected by WithTenant applies to
// the driving table, and the JOIN condition itself enforces tenant_id
// equality on the joined table.
func (r *ParkingLotRepo) ListWithSpotCounts(ctx context.Context) ([]LotWithSpotCount, error) {
	var rows []LotWithSpotCount
	err := r.WithTenantTable(ctx, "parking_lots").
		Table("parking_lots").
		Select(`parking_lots.id        AS lot_id,
		        parking_lots.name      AS lot_name,
		        COUNT(parking_spots.id) AS spot_cnt,
		        COALESCE(SUM(CASE WHEN parking_spots.occupied THEN 1 ELSE 0 END), 0) AS occupied`).
		Joins(`LEFT JOIN parking_spots
		         ON parking_spots.parking_lot_id = parking_lots.id
		        AND parking_spots.tenant_id      = parking_lots.tenant_id`).
		Group("parking_lots.id, parking_lots.name").
		Order("parking_lots.id ASC").
		Scan(&rows).Error
	return rows, err
}

// CountByCity demonstrates an aggregation: how many lots per city the
// caller can see.
func (r *ParkingLotRepo) CountByCity(ctx context.Context) (map[string]int, error) {
	type row struct {
		City string
		N    int
	}
	var rs []row
	if err := r.WithTenant(ctx).
		Table("parking_lots").
		Select("city, COUNT(*) AS n").
		Group("city").
		Scan(&rs).Error; err != nil {
		return nil, err
	}
	out := make(map[string]int, len(rs))
	for _, r := range rs {
		out[r.City] = r.N
	}
	return out, nil
}

// IDsViaSubquery demonstrates a subquery: lots that contain at least one
// occupied spot. The subquery itself runs through WithTenant so it cannot
// observe rows from other tenants.
func (r *ParkingLotRepo) IDsViaSubquery(ctx context.Context) ([]string, error) {
	sub := r.WithTenant(ctx).
		Table("parking_spots").
		Select("parking_lot_id").
		Where("occupied = ?", true)

	var ids []string
	err := r.WithTenant(ctx).
		Table("parking_lots").
		Where("id IN (?)", sub).
		Order("id ASC").
		Pluck("id", &ids).Error
	return ids, err
}

// MigratePOCSchema creates the POC tables on the given gorm DB.
func MigratePOCSchema(g *gorm.DB) error {
	return g.AutoMigrate(&ParkingLot{}, &ParkingSpot{})
}
