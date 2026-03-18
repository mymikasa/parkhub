package domain

import (
	"testing"
	"time"
)

func TestNewDevice(t *testing.T) {
	d := NewDevice("SN-001", PlatformTenantID)

	if d.ID != "SN-001" {
		t.Errorf("ID = %v, want SN-001", d.ID)
	}
	if d.TenantID != PlatformTenantID {
		t.Errorf("TenantID = %v, want %v", d.TenantID, PlatformTenantID)
	}
	if d.Status != DeviceStatusPending {
		t.Errorf("Status = %v, want pending", d.Status)
	}
}

func TestUpdateHeartbeat(t *testing.T) {
	d := NewDevice("SN-001", PlatformTenantID)
	now := time.Now()
	d.UpdateHeartbeat("v1.2.3", now)

	if d.FirmwareVersion != "v1.2.3" {
		t.Errorf("FirmwareVersion = %v, want v1.2.3", d.FirmwareVersion)
	}
	if d.LastHeartbeat == nil || !d.LastHeartbeat.Equal(now) {
		t.Errorf("LastHeartbeat = %v, want %v", d.LastHeartbeat, now)
	}
}

func TestMarkOnline_AssignedDevice(t *testing.T) {
	d := &Device{
		ID:       "SN-001",
		TenantID: "some-real-tenant",
		Status:   DeviceStatusOffline,
	}
	now := time.Now()
	d.MarkOnline(now)

	if d.Status != DeviceStatusActive {
		t.Errorf("Status = %v, want active (assigned device should recover to active)", d.Status)
	}
}

func TestMarkOnline_UnassignedDevice(t *testing.T) {
	d := &Device{
		ID:       "SN-001",
		TenantID: PlatformTenantID,
		Status:   DeviceStatusOffline,
	}
	now := time.Now()
	d.MarkOnline(now)

	if d.Status != DeviceStatusPending {
		t.Errorf("Status = %v, want pending (unassigned device should recover to pending)", d.Status)
	}
}

func TestMarkOnline_ActiveDevice_NoChange(t *testing.T) {
	d := &Device{
		ID:       "SN-001",
		TenantID: "some-tenant",
		Status:   DeviceStatusActive,
	}
	before := d.UpdatedAt
	d.MarkOnline(time.Now())

	if d.Status != DeviceStatusActive {
		t.Errorf("Status = %v, want active", d.Status)
	}
	if d.UpdatedAt != before {
		t.Error("UpdatedAt should not change for already-active device")
	}
}

func TestMarkOnline_DisabledDevice_NoChange(t *testing.T) {
	d := &Device{
		ID:       "SN-001",
		TenantID: "some-tenant",
		Status:   DeviceStatusDisabled,
	}
	d.MarkOnline(time.Now())

	if d.Status != DeviceStatusDisabled {
		t.Errorf("Status = %v, want disabled (should not change)", d.Status)
	}
}

func TestMarkOffline_ActiveDevice(t *testing.T) {
	d := &Device{
		ID:       "SN-001",
		TenantID: "some-tenant",
		Status:   DeviceStatusActive,
	}
	now := time.Now()
	d.MarkOffline(now)

	if d.Status != DeviceStatusOffline {
		t.Errorf("Status = %v, want offline", d.Status)
	}
}

func TestMarkOffline_PendingDevice(t *testing.T) {
	d := &Device{
		ID:       "SN-001",
		TenantID: PlatformTenantID,
		Status:   DeviceStatusPending,
	}
	now := time.Now()
	d.MarkOffline(now)

	if d.Status != DeviceStatusOffline {
		t.Errorf("Status = %v, want offline", d.Status)
	}
}

func TestMarkOffline_DisabledDevice_NoChange(t *testing.T) {
	d := &Device{
		ID:     "SN-001",
		Status: DeviceStatusDisabled,
	}
	d.MarkOffline(time.Now())

	if d.Status != DeviceStatusDisabled {
		t.Errorf("Status = %v, want disabled (should not change)", d.Status)
	}
}

func TestMarkOffline_AlreadyOffline_NoChange(t *testing.T) {
	d := &Device{
		ID:     "SN-001",
		Status: DeviceStatusOffline,
	}
	before := d.UpdatedAt
	d.MarkOffline(time.Now())

	if d.UpdatedAt != before {
		t.Error("UpdatedAt should not change for already-offline device")
	}
}

func TestValidateDeviceStatus(t *testing.T) {
	tests := []struct {
		status DeviceStatus
		want   bool
	}{
		{DeviceStatusPending, true},
		{DeviceStatusActive, true},
		{DeviceStatusOffline, true},
		{DeviceStatusDisabled, true},
		{DeviceStatus("invalid"), false},
		{DeviceStatus(""), false},
	}
	for _, tt := range tests {
		if got := ValidateDeviceStatus(tt.status); got != tt.want {
			t.Errorf("ValidateDeviceStatus(%q) = %v, want %v", tt.status, got, tt.want)
		}
	}
}

func TestIsOnline(t *testing.T) {
	tests := []struct {
		status DeviceStatus
		want   bool
	}{
		{DeviceStatusActive, true},
		{DeviceStatusPending, false},
		{DeviceStatusOffline, false},
		{DeviceStatusDisabled, false},
	}
	for _, tt := range tests {
		d := &Device{Status: tt.status}
		if got := d.IsOnline(); got != tt.want {
			t.Errorf("IsOnline() with status %q = %v, want %v", tt.status, got, tt.want)
		}
	}
}
