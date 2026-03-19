package dao

import (
	"testing"
	"time"

	"github.com/parkhub/api/internal/domain"
)

func TestToBillingRuleDAO(t *testing.T) {
	now := time.Now()
	rule := &domain.BillingRule{
		ID:           "rule-1",
		TenantID:     "tenant-1",
		ParkingLotID: "lot-1",
		FreeMinutes:  15,
		PricePerHour: 2.50,
		DailyCap:     20.00,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	d := ToBillingRuleDAO(rule)

	if d.ID != "rule-1" {
		t.Errorf("ID = %v, want rule-1", d.ID)
	}
	if d.TenantID != "tenant-1" {
		t.Errorf("TenantID = %v, want tenant-1", d.TenantID)
	}
	if d.ParkingLotID != "lot-1" {
		t.Errorf("ParkingLotID = %v, want lot-1", d.ParkingLotID)
	}
	if d.FreeMinutes != 15 {
		t.Errorf("FreeMinutes = %v, want 15", d.FreeMinutes)
	}
	if d.PricePerHour != 2.50 {
		t.Errorf("PricePerHour = %v, want 2.50", d.PricePerHour)
	}
	if d.DailyCap != 20.00 {
		t.Errorf("DailyCap = %v, want 20.00", d.DailyCap)
	}
}

func TestBillingRuleDAO_ToDomain(t *testing.T) {
	now := time.Now()
	d := &BillingRuleDAO{
		ID:           "rule-1",
		TenantID:     "tenant-1",
		ParkingLotID: "lot-1",
		FreeMinutes:  30,
		PricePerHour: 5.00,
		DailyCap:     0.00,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	rule := d.ToDomain()

	if rule.FreeMinutes != 30 {
		t.Errorf("FreeMinutes = %v, want 30", rule.FreeMinutes)
	}
	if rule.DailyCap != 0.00 {
		t.Errorf("DailyCap = %v, want 0.00 (no cap)", rule.DailyCap)
	}
}

func TestBillingRuleDAO_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	original := &domain.BillingRule{
		ID:           "rule-1",
		TenantID:     "tenant-1",
		ParkingLotID: "lot-1",
		FreeMinutes:  60,
		PricePerHour: 10.00,
		DailyCap:     100.00,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	converted := ToBillingRuleDAO(original).ToDomain()

	if converted.ID != original.ID {
		t.Errorf("ID mismatch: %v != %v", converted.ID, original.ID)
	}
	if converted.ParkingLotID != original.ParkingLotID {
		t.Errorf("ParkingLotID mismatch: %v != %v", converted.ParkingLotID, original.ParkingLotID)
	}
	if converted.FreeMinutes != original.FreeMinutes {
		t.Errorf("FreeMinutes mismatch: %v != %v", converted.FreeMinutes, original.FreeMinutes)
	}
	if converted.PricePerHour != original.PricePerHour {
		t.Errorf("PricePerHour mismatch: %v != %v", converted.PricePerHour, original.PricePerHour)
	}
	if converted.DailyCap != original.DailyCap {
		t.Errorf("DailyCap mismatch: %v != %v", converted.DailyCap, original.DailyCap)
	}
}

func TestBillingRuleDAO_TableName(t *testing.T) {
	d := BillingRuleDAO{}
	if d.TableName() != "billing_rules" {
		t.Errorf("TableName() = %v, want billing_rules", d.TableName())
	}
}
