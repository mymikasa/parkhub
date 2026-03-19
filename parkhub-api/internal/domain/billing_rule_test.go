package domain

import (
	"testing"
	"time"
)

func TestBillingRule_Validate(t *testing.T) {
	tests := []struct {
		name         string
		freeMinutes  int
		pricePerHour float64
		dailyCap     float64
		wantErr      error
	}{
		{"valid defaults", 15, 2.00, 20.00, nil},
		{"free_minutes=0", 0, 2.00, 20.00, nil},
		{"free_minutes=120", 120, 2.00, 20.00, nil},
		{"free_minutes=-1", -1, 2.00, 20.00, ErrInvalidFreeMinutes},
		{"free_minutes=121", 121, 2.00, 20.00, ErrInvalidFreeMinutes},
		{"price_per_hour=1", 15, 1.00, 20.00, nil},
		{"price_per_hour=50", 15, 50.00, 20.00, nil},
		{"price_per_hour=0.5", 15, 0.50, 20.00, ErrInvalidPricePerHour},
		{"price_per_hour=50.5", 15, 50.50, 20.00, ErrInvalidPricePerHour},
		{"daily_cap=0 (no cap)", 15, 2.00, 0.00, nil},
		{"daily_cap=500", 15, 2.00, 500.00, nil},
		{"daily_cap=-1", 15, 2.00, -1.00, ErrInvalidDailyCap},
		{"daily_cap=501", 15, 2.00, 501.00, ErrInvalidDailyCap},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			b := &BillingRule{
				FreeMinutes:  tt.freeMinutes,
				PricePerHour: tt.pricePerHour,
				DailyCap:     tt.dailyCap,
			}
			err := b.Validate()
			if err != tt.wantErr {
				t.Errorf("Validate() = %v, want %v", err, tt.wantErr)
			}
		})
	}
}

func TestBillingRule_Calculate(t *testing.T) {
	base := time.Date(2024, 1, 1, 8, 0, 0, 0, time.UTC)

	tests := []struct {
		name            string
		freeMinutes     int
		pricePerHour    float64
		dailyCap        float64
		durationMinutes int
		wantFee         float64
		wantBillableMin int
		wantBillableHrs int
		wantDays        int
	}{
		{
			name:            "免费停车",
			freeMinutes:     15,
			pricePerHour:    2.00,
			dailyCap:        20.00,
			durationMinutes: 10,
			wantFee:         0.00,
			wantBillableMin: 0,
			wantBillableHrs: 0,
			wantDays:        1,
		},
		{
			name:            "精确小时边界",
			freeMinutes:     15,
			pricePerHour:    2.00,
			dailyCap:        20.00,
			durationMinutes: 75,
			wantFee:         2.00,
			wantBillableMin: 60,
			wantBillableHrs: 1,
			wantDays:        1,
		},
		{
			name:            "不足一小时向上取整",
			freeMinutes:     15,
			pricePerHour:    2.00,
			dailyCap:        20.00,
			durationMinutes: 76,
			wantFee:         4.00,
			wantBillableMin: 61,
			wantBillableHrs: 2,
			wantDays:        1,
		},
		{
			name:            "每日封顶生效",
			freeMinutes:     15,
			pricePerHour:    5.00,
			dailyCap:        20.00,
			durationMinutes: 600,
			wantFee:         20.00,
			wantBillableMin: 585,
			wantBillableHrs: 10,
			wantDays:        1,
		},
		{
			name:            "多日跨天封顶",
			freeMinutes:     15,
			pricePerHour:    5.00,
			dailyCap:        20.00,
			durationMinutes: 2000,
			wantFee:         40.00,
			wantBillableMin: 1985,
			wantBillableHrs: 34,
			wantDays:        2,
		},
		{
			name:            "不封顶",
			freeMinutes:     15,
			pricePerHour:    5.00,
			dailyCap:        0.00,
			durationMinutes: 600,
			wantFee:         50.00,
			wantBillableMin: 585,
			wantBillableHrs: 10,
			wantDays:        1,
		},
		{
			name:            "超长停留7天",
			freeMinutes:     15,
			pricePerHour:    3.00,
			dailyCap:        30.00,
			durationMinutes: 10080,
			wantFee:         210.00,
			wantBillableMin: 10065,
			wantBillableHrs: 168,
			wantDays:        7,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			b := &BillingRule{
				FreeMinutes:  tt.freeMinutes,
				PricePerHour: tt.pricePerHour,
				DailyCap:     tt.dailyCap,
			}
			entry := base
			exit := base.Add(time.Duration(tt.durationMinutes) * time.Minute)
			result, err := b.Calculate(entry, exit)
			if err != nil {
				t.Fatalf("Calculate() error = %v", err)
			}
			if result.FinalFee != tt.wantFee {
				t.Errorf("FinalFee = %v, want %v", result.FinalFee, tt.wantFee)
			}
			if result.BillableMinutes != tt.wantBillableMin {
				t.Errorf("BillableMinutes = %v, want %v", result.BillableMinutes, tt.wantBillableMin)
			}
			if result.BillableHours != tt.wantBillableHrs {
				t.Errorf("BillableHours = %v, want %v", result.BillableHours, tt.wantBillableHrs)
			}
			if result.Days != tt.wantDays {
				t.Errorf("Days = %v, want %v", result.Days, tt.wantDays)
			}
		})
	}
}

func TestBillingRule_Calculate_InvalidTimeRange(t *testing.T) {
	b := &BillingRule{FreeMinutes: 15, PricePerHour: 2.00, DailyCap: 20.00}
	now := time.Now()

	// exit == entry
	_, err := b.Calculate(now, now)
	if err != ErrInvalidTimeRange {
		t.Errorf("expected ErrInvalidTimeRange, got %v", err)
	}

	// exit before entry
	_, err = b.Calculate(now, now.Add(-1*time.Hour))
	if err != ErrInvalidTimeRange {
		t.Errorf("expected ErrInvalidTimeRange, got %v", err)
	}
}
