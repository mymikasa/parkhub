package dao

import (
	"testing"
	"time"

	"github.com/parkhub/api/internal/domain"
)

func TestToParkingLotDAO(t *testing.T) {
	now := time.Now()
	lot := &domain.ParkingLot{
		ID:              "lot-1",
		TenantID:        "tenant-1",
		Name:            "阳光停车场",
		Address:         "北京市朝阳区",
		TotalSpaces:     200,
		AvailableSpaces: 150,
		LotType:         domain.LotTypeUnderground,
		Status:          domain.ParkingLotStatusActive,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	dao := ToParkingLotDAO(lot)

	if dao.ID != "lot-1" {
		t.Errorf("ID = %v, want lot-1", dao.ID)
	}
	if dao.TenantID != "tenant-1" {
		t.Errorf("TenantID = %v, want tenant-1", dao.TenantID)
	}
	if dao.Name != "阳光停车场" {
		t.Errorf("Name = %v, want 阳光停车场", dao.Name)
	}
	if dao.LotType != "underground" {
		t.Errorf("LotType = %v, want underground", dao.LotType)
	}
	if dao.Status != "active" {
		t.Errorf("Status = %v, want active", dao.Status)
	}
	if dao.TotalSpaces != 200 {
		t.Errorf("TotalSpaces = %v, want 200", dao.TotalSpaces)
	}
	if dao.AvailableSpaces != 150 {
		t.Errorf("AvailableSpaces = %v, want 150", dao.AvailableSpaces)
	}
}

func TestParkingLotDAO_ToDomain(t *testing.T) {
	now := time.Now()
	dao := &ParkingLotDAO{
		ID:              "lot-1",
		TenantID:        "tenant-1",
		Name:            "阳光停车场",
		Address:         "北京市朝阳区",
		TotalSpaces:     200,
		AvailableSpaces: 150,
		LotType:         "underground",
		Status:          "active",
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	lot := dao.ToDomain()

	if lot.ID != "lot-1" {
		t.Errorf("ID = %v, want lot-1", lot.ID)
	}
	if lot.LotType != domain.LotTypeUnderground {
		t.Errorf("LotType = %v, want underground", lot.LotType)
	}
	if lot.Status != domain.ParkingLotStatusActive {
		t.Errorf("Status = %v, want active", lot.Status)
	}
	if lot.TotalSpaces != 200 {
		t.Errorf("TotalSpaces = %v, want 200", lot.TotalSpaces)
	}
}

func TestParkingLotDAO_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	original := &domain.ParkingLot{
		ID:              "lot-1",
		TenantID:        "tenant-1",
		Name:            "星光停车场",
		Address:         "上海市浦东新区",
		TotalSpaces:     300,
		AvailableSpaces: 200,
		LotType:         domain.LotTypeGround,
		Status:          domain.ParkingLotStatusInactive,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	converted := ToParkingLotDAO(original).ToDomain()

	if converted.ID != original.ID {
		t.Errorf("ID mismatch: %v != %v", converted.ID, original.ID)
	}
	if converted.LotType != original.LotType {
		t.Errorf("LotType mismatch: %v != %v", converted.LotType, original.LotType)
	}
	if converted.Status != original.Status {
		t.Errorf("Status mismatch: %v != %v", converted.Status, original.Status)
	}
}

func TestParkingLotListDAO_ToDomainWithStats(t *testing.T) {
	now := time.Now()
	listDAO := &ParkingLotListDAO{
		ParkingLotDAO: ParkingLotDAO{
			ID:              "lot-1",
			TenantID:        "tenant-1",
			Name:            "阳光停车场",
			Address:         "测试地址",
			TotalSpaces:     100,
			AvailableSpaces: 40,
			LotType:         "underground",
			Status:          "active",
			CreatedAt:       now,
			UpdatedAt:       now,
		},
		EntryCount: 2,
		ExitCount:  1,
	}

	result := listDAO.ToDomainWithStats()

	if result.EntryCount != 2 {
		t.Errorf("EntryCount = %v, want 2", result.EntryCount)
	}
	if result.ExitCount != 1 {
		t.Errorf("ExitCount = %v, want 1", result.ExitCount)
	}
	if result.UsageRate != 60 {
		t.Errorf("UsageRate = %v, want 60", result.UsageRate)
	}
}

func TestParkingLotDAO_TableName(t *testing.T) {
	dao := ParkingLotDAO{}
	if dao.TableName() != "parking_lots" {
		t.Errorf("TableName() = %v, want parking_lots", dao.TableName())
	}
}
