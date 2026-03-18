package domain

import (
	"testing"
)

func TestNewGate(t *testing.T) {
	deviceID := "device-1"
	gate := NewGate("gate-1", "lot-1", "东入口", GateTypeEntry, &deviceID)

	if gate.ID != "gate-1" {
		t.Errorf("ID = %v, want gate-1", gate.ID)
	}
	if gate.ParkingLotID != "lot-1" {
		t.Errorf("ParkingLotID = %v, want lot-1", gate.ParkingLotID)
	}
	if gate.Type != GateTypeEntry {
		t.Errorf("Type = %v, want entry", gate.Type)
	}
	if gate.DeviceID == nil || *gate.DeviceID != "device-1" {
		t.Errorf("DeviceID = %v, want device-1", gate.DeviceID)
	}
}

func TestNewGate_NilDevice(t *testing.T) {
	gate := NewGate("gate-1", "lot-1", "东入口", GateTypeEntry, nil)

	if gate.DeviceID != nil {
		t.Errorf("DeviceID = %v, want nil", gate.DeviceID)
	}
}

func TestGate_Update(t *testing.T) {
	gate := NewGate("gate-1", "lot-1", "旧名", GateTypeEntry, nil)
	deviceID := "device-1"

	gate.Update("新名", &deviceID)

	if gate.Name != "新名" {
		t.Errorf("Name = %v, want 新名", gate.Name)
	}
	if gate.DeviceID == nil || *gate.DeviceID != "device-1" {
		t.Errorf("DeviceID = %v, want device-1", gate.DeviceID)
	}
}

func TestGate_BindUnbindDevice(t *testing.T) {
	gate := NewGate("gate-1", "lot-1", "入口", GateTypeEntry, nil)

	if gate.HasDevice() {
		t.Error("new gate without device should not HasDevice()")
	}

	gate.BindDevice("device-1")
	if !gate.HasDevice() {
		t.Error("gate should HasDevice() after BindDevice")
	}
	if *gate.DeviceID != "device-1" {
		t.Errorf("DeviceID = %v, want device-1", *gate.DeviceID)
	}

	gate.UnbindDevice()
	if gate.HasDevice() {
		t.Error("gate should not HasDevice() after UnbindDevice")
	}
}

func TestGate_IsEntryIsExit(t *testing.T) {
	entry := NewGate("g1", "lot-1", "入口", GateTypeEntry, nil)
	exit := NewGate("g2", "lot-1", "出口", GateTypeExit, nil)

	if !entry.IsEntry() {
		t.Error("entry gate should IsEntry()")
	}
	if entry.IsExit() {
		t.Error("entry gate should not IsExit()")
	}
	if !exit.IsExit() {
		t.Error("exit gate should IsExit()")
	}
	if exit.IsEntry() {
		t.Error("exit gate should not IsEntry()")
	}
}

func TestValidateGateType(t *testing.T) {
	tests := []struct {
		gateType GateType
		valid    bool
	}{
		{GateTypeEntry, true},
		{GateTypeExit, true},
		{GateType("invalid"), false},
		{GateType(""), false},
	}
	for _, tt := range tests {
		t.Run(string(tt.gateType), func(t *testing.T) {
			if got := ValidateGateType(tt.gateType); got != tt.valid {
				t.Errorf("ValidateGateType(%v) = %v, want %v", tt.gateType, got, tt.valid)
			}
		})
	}
}
