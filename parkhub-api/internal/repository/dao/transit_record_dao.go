package dao

import (
	"time"

	"github.com/parkhub/api/internal/domain"
)

// TransitRecordDAO is the GORM database model for the transit_records table.
type TransitRecordDAO struct {
	ID              string     `gorm:"column:id;primaryKey"`
	TenantID        string     `gorm:"column:tenant_id"`
	ParkingLotID    string     `gorm:"column:parking_lot_id"`
	GateID          string     `gorm:"column:gate_id"`
	PlateNumber     *string    `gorm:"column:plate_number"`
	Type            string     `gorm:"column:type"`
	Status          string     `gorm:"column:status"`
	ImageURL        *string    `gorm:"column:image_url"`
	Fee             *float64   `gorm:"column:fee"`
	EntryRecordID   *string    `gorm:"column:entry_record_id"`
	ParkingDuration *int       `gorm:"column:parking_duration"`
	Remark          *string    `gorm:"column:remark"`
	ResolvedAt      *time.Time `gorm:"column:resolved_at"`
	ResolvedBy      *string    `gorm:"column:resolved_by"`
	CreatedAt       time.Time  `gorm:"column:created_at"`
	UpdatedAt       time.Time  `gorm:"column:updated_at"`
}

func (TransitRecordDAO) TableName() string { return "transit_records" }

// ToTransitRecordDAO converts a domain.TransitRecord to a TransitRecordDAO.
func ToTransitRecordDAO(t *domain.TransitRecord) *TransitRecordDAO {
	return &TransitRecordDAO{
		ID:              t.ID,
		TenantID:        t.TenantID,
		ParkingLotID:    t.ParkingLotID,
		GateID:          t.GateID,
		PlateNumber:     t.PlateNumber,
		Type:            string(t.Type),
		Status:          string(t.Status),
		ImageURL:        t.ImageURL,
		Fee:             t.Fee,
		EntryRecordID:   t.EntryRecordID,
		ParkingDuration: t.ParkingDuration,
		Remark:          t.Remark,
		ResolvedAt:      t.ResolvedAt,
		ResolvedBy:      t.ResolvedBy,
		CreatedAt:       t.CreatedAt,
		UpdatedAt:       t.UpdatedAt,
	}
}

// ToDomain converts a TransitRecordDAO to a domain.TransitRecord.
func (d *TransitRecordDAO) ToDomain() *domain.TransitRecord {
	return &domain.TransitRecord{
		ID:              d.ID,
		TenantID:        d.TenantID,
		ParkingLotID:    d.ParkingLotID,
		GateID:          d.GateID,
		PlateNumber:     d.PlateNumber,
		Type:            domain.TransitType(d.Type),
		Status:          domain.TransitStatus(d.Status),
		ImageURL:        d.ImageURL,
		Fee:             d.Fee,
		EntryRecordID:   d.EntryRecordID,
		ParkingDuration: d.ParkingDuration,
		Remark:          d.Remark,
		ResolvedAt:      d.ResolvedAt,
		ResolvedBy:      d.ResolvedBy,
		CreatedAt:       d.CreatedAt,
		UpdatedAt:       d.UpdatedAt,
	}
}

// TransitRecordListDAO 通行记录列表项（带关联名称）
type TransitRecordListDAO struct {
	TransitRecordDAO
	ParkingLotName string `gorm:"column:parking_lot_name"`
	GateName       string `gorm:"column:gate_name"`
}

// ToTransitRecordListItem converts to domain TransitRecordListItem.
func (d *TransitRecordListDAO) ToTransitRecordListItem() *domain.TransitRecordListItem {
	record := d.ToDomain()
	return &domain.TransitRecordListItem{
		TransitRecord:  *record,
		ParkingLotName: d.ParkingLotName,
		GateName:       d.GateName,
	}
}
