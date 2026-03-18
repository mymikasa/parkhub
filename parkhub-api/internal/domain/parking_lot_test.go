package domain

import (
	"testing"
)

func TestNewParkingLot_Success(t *testing.T) {
	lot, err := NewParkingLot("id-1", "tenant-1", "阳光停车场", "测试地址", 200, LotTypeUnderground)

	if err != nil {
		t.Fatalf("NewParkingLot() error = %v", err)
	}
	if lot.TotalSpaces != 200 {
		t.Errorf("TotalSpaces = %v, want 200", lot.TotalSpaces)
	}
	if lot.AvailableSpaces != 200 {
		t.Errorf("AvailableSpaces = %v, want 200 (should equal TotalSpaces for new lot)", lot.AvailableSpaces)
	}
	if lot.Status != ParkingLotStatusActive {
		t.Errorf("Status = %v, want active", lot.Status)
	}
}

func TestNewParkingLot_InvalidSpaces(t *testing.T) {
	tests := []struct {
		name   string
		spaces int
	}{
		{"zero spaces", 0},
		{"negative spaces", -1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := NewParkingLot("id-1", "tenant-1", "测试", "地址", tt.spaces, LotTypeGround)
			if err != ErrInvalidTotalSpaces {
				t.Errorf("NewParkingLot() error = %v, want ErrInvalidTotalSpaces", err)
			}
		})
	}
}

func TestParkingLot_Update_Success(t *testing.T) {
	lot, _ := NewParkingLot("id-1", "tenant-1", "旧名", "旧地址", 100, LotTypeUnderground)

	err := lot.Update("新名", "新地址", 150, LotTypeGround)

	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if lot.Name != "新名" {
		t.Errorf("Name = %v, want 新名", lot.Name)
	}
	if lot.TotalSpaces != 150 {
		t.Errorf("TotalSpaces = %v, want 150", lot.TotalSpaces)
	}
	if lot.AvailableSpaces != 150 {
		t.Errorf("AvailableSpaces = %v, want 150", lot.AvailableSpaces)
	}
}

func TestParkingLot_Update_WithOccupiedVehicles(t *testing.T) {
	lot, _ := NewParkingLot("id-1", "tenant-1", "测试", "地址", 100, LotTypeUnderground)
	lot.AvailableSpaces = 30 // 70 occupied

	err := lot.Update("测试", "地址", 120, LotTypeUnderground)

	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if lot.AvailableSpaces != 50 {
		t.Errorf("AvailableSpaces = %v, want 50 (120-70)", lot.AvailableSpaces)
	}
}

func TestParkingLot_Update_TotalSpacesLessThanOccupied(t *testing.T) {
	lot, _ := NewParkingLot("id-1", "tenant-1", "测试", "地址", 100, LotTypeUnderground)
	lot.AvailableSpaces = 30 // 70 occupied

	err := lot.Update("测试", "地址", 50, LotTypeUnderground)

	if err != ErrTotalSpacesLessThanOccupied {
		t.Errorf("Update() error = %v, want ErrTotalSpacesLessThanOccupied", err)
	}
}

func TestParkingLot_Update_InvalidSpaces(t *testing.T) {
	lot, _ := NewParkingLot("id-1", "tenant-1", "测试", "地址", 100, LotTypeUnderground)

	err := lot.Update("测试", "地址", 0, LotTypeUnderground)

	if err != ErrInvalidTotalSpaces {
		t.Errorf("Update() error = %v, want ErrInvalidTotalSpaces", err)
	}
}

func TestParkingLot_StatusChanges(t *testing.T) {
	lot, _ := NewParkingLot("id-1", "tenant-1", "测试", "地址", 100, LotTypeUnderground)

	if !lot.IsActive() {
		t.Error("new lot should be active")
	}

	lot.Deactivate()
	if lot.IsActive() {
		t.Error("lot should be inactive after Deactivate()")
	}
	if lot.Status != ParkingLotStatusInactive {
		t.Errorf("Status = %v, want inactive", lot.Status)
	}

	lot.Activate()
	if !lot.IsActive() {
		t.Error("lot should be active after Activate()")
	}
}

func TestParkingLot_UsageRate(t *testing.T) {
	tests := []struct {
		name     string
		total    int
		avail    int
		expected float64
	}{
		{"empty lot", 100, 100, 0},
		{"half full", 100, 50, 50},
		{"full lot", 100, 0, 100},
		{"zero total", 0, 0, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lot := &ParkingLot{TotalSpaces: tt.total, AvailableSpaces: tt.avail}
			if got := lot.UsageRate(); got != tt.expected {
				t.Errorf("UsageRate() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestParkingLot_OccupiedVehicles(t *testing.T) {
	lot := &ParkingLot{TotalSpaces: 100, AvailableSpaces: 65}
	if got := lot.OccupiedVehicles(); got != 35 {
		t.Errorf("OccupiedVehicles() = %v, want 35", got)
	}
}

func TestValidateLotType(t *testing.T) {
	tests := []struct {
		lotType LotType
		valid   bool
	}{
		{LotTypeUnderground, true},
		{LotTypeGround, true},
		{LotTypeStereo, true},
		{LotType("invalid"), false},
		{LotType(""), false},
	}
	for _, tt := range tests {
		t.Run(string(tt.lotType), func(t *testing.T) {
			if got := ValidateLotType(tt.lotType); got != tt.valid {
				t.Errorf("ValidateLotType(%v) = %v, want %v", tt.lotType, got, tt.valid)
			}
		})
	}
}
