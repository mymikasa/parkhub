package dao

import (
	"testing"
	"time"

	"github.com/parkhub/api/internal/domain"
)

func TestToGateDAO(t *testing.T) {
	now := time.Now()
	deviceID := "device-1"
	gate := &domain.Gate{
		ID:           "gate-1",
		ParkingLotID: "lot-1",
		Name:         "东入口",
		Type:         domain.GateTypeEntry,
		DeviceID:     &deviceID,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	dao := ToGateDAO(gate)

	if dao.ID != "gate-1" {
		t.Errorf("ID = %v, want gate-1", dao.ID)
	}
	if dao.ParkingLotID != "lot-1" {
		t.Errorf("ParkingLotID = %v, want lot-1", dao.ParkingLotID)
	}
	if dao.Type != "entry" {
		t.Errorf("Type = %v, want entry", dao.Type)
	}
	if dao.DeviceID == nil || *dao.DeviceID != "device-1" {
		t.Errorf("DeviceID = %v, want device-1", dao.DeviceID)
	}
}

func TestToGateDAO_NilDeviceID(t *testing.T) {
	gate := &domain.Gate{
		ID:           "gate-1",
		ParkingLotID: "lot-1",
		Name:         "东入口",
		Type:         domain.GateTypeEntry,
		DeviceID:     nil,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	dao := ToGateDAO(gate)

	if dao.DeviceID != nil {
		t.Errorf("DeviceID = %v, want nil", dao.DeviceID)
	}
}

func TestGateDAO_ToDomain(t *testing.T) {
	now := time.Now()
	deviceID := "device-1"
	dao := &GateDAO{
		ID:           "gate-1",
		ParkingLotID: "lot-1",
		Name:         "西出口",
		Type:         "exit",
		DeviceID:     &deviceID,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	gate := dao.ToDomain()

	if gate.Type != domain.GateTypeExit {
		t.Errorf("Type = %v, want exit", gate.Type)
	}
	if gate.DeviceID == nil || *gate.DeviceID != "device-1" {
		t.Errorf("DeviceID = %v, want device-1", gate.DeviceID)
	}
}

func TestGateDAO_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	deviceID := "device-abc"
	original := &domain.Gate{
		ID:           "gate-1",
		ParkingLotID: "lot-1",
		Name:         "南入口",
		Type:         domain.GateTypeEntry,
		DeviceID:     &deviceID,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	converted := ToGateDAO(original).ToDomain()

	if converted.ID != original.ID {
		t.Errorf("ID mismatch: %v != %v", converted.ID, original.ID)
	}
	if converted.Type != original.Type {
		t.Errorf("Type mismatch: %v != %v", converted.Type, original.Type)
	}
	if *converted.DeviceID != *original.DeviceID {
		t.Errorf("DeviceID mismatch: %v != %v", *converted.DeviceID, *original.DeviceID)
	}
}

func TestGateDAO_TableName(t *testing.T) {
	dao := GateDAO{}
	if dao.TableName() != "gates" {
		t.Errorf("TableName() = %v, want gates", dao.TableName())
	}
}
