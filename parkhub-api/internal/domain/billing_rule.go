package domain

import (
	"errors"
	"math"
	"time"
)

// BillingRule 计费规则实体
type BillingRule struct {
	ID           string
	TenantID     string
	ParkingLotID string
	FreeMinutes  int
	PricePerHour float64
	DailyCap     float64
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// 计费规则相关错误
var (
	ErrBillingRuleNotFound    = errors.New("计费规则不存在")
	ErrInvalidFreeMinutes     = errors.New("免费时长必须在0-120分钟之间")
	ErrInvalidPricePerHour    = errors.New("计费单价必须在1-50元之间")
	ErrInvalidDailyCap        = errors.New("每日封顶必须在0-500元之间")
	ErrInvalidTimeRange       = errors.New("出场时间必须晚于入场时间")
)

// 计费规则错误码
const (
	CodeBillingRuleNotFound = "BILLING_RULE_NOT_FOUND"
	CodeInvalidFreeMinutes  = "INVALID_FREE_MINUTES"
	CodeInvalidPricePerHour = "INVALID_PRICE_PER_HOUR"
	CodeInvalidDailyCap     = "INVALID_DAILY_CAP"
	CodeInvalidTimeRange    = "INVALID_TIME_RANGE"
)

// 审计操作
const (
	AuditActionBillingRuleUpdated AuditAction = "billing_rule_updated"
)

// 默认计费规则
const (
	DefaultFreeMinutes  = 15
	DefaultPricePerHour = 2.00
	DefaultDailyCap     = 20.00
)

// NewBillingRule 创建新计费规则
func NewBillingRule(id, tenantID, parkingLotID string) *BillingRule {
	now := time.Now()
	return &BillingRule{
		ID:           id,
		TenantID:     tenantID,
		ParkingLotID: parkingLotID,
		FreeMinutes:  DefaultFreeMinutes,
		PricePerHour: DefaultPricePerHour,
		DailyCap:     DefaultDailyCap,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

// Validate 校验计费规则字段
func (b *BillingRule) Validate() error {
	if b.FreeMinutes < 0 || b.FreeMinutes > 120 {
		return ErrInvalidFreeMinutes
	}
	if b.PricePerHour < 1.0 || b.PricePerHour > 50.0 {
		return ErrInvalidPricePerHour
	}
	if b.DailyCap < 0.0 || b.DailyCap > 500.0 {
		return ErrInvalidDailyCap
	}
	return nil
}

// Update 更新计费规则
func (b *BillingRule) Update(freeMinutes int, pricePerHour, dailyCap float64) error {
	b.FreeMinutes = freeMinutes
	b.PricePerHour = pricePerHour
	b.DailyCap = dailyCap
	if err := b.Validate(); err != nil {
		return err
	}
	b.UpdatedAt = time.Now()
	return nil
}

// CalculateResult 计费计算结果
type CalculateResult struct {
	ParkingDuration int     // 停车时长（分钟）
	FreeMinutes     int     // 免费时长（分钟）
	BillableMinutes int     // 计费时长（分钟）
	BillableHours   int     // 计费小时数
	PricePerHour    float64 // 单价
	DailyCap        float64 // 每日封顶
	Days            int     // 停车天数
	RawFee          float64 // 原始费用
	FinalFee        float64 // 最终费用
}

// Calculate 计算停车费用
func (b *BillingRule) Calculate(entryTime, exitTime time.Time) (*CalculateResult, error) {
	if !exitTime.After(entryTime) {
		return nil, ErrInvalidTimeRange
	}

	parkingDuration := int(exitTime.Sub(entryTime).Minutes())

	billableMinutes := parkingDuration - b.FreeMinutes
	if billableMinutes < 0 {
		billableMinutes = 0
	}

	billableHours := 0
	if billableMinutes > 0 {
		billableHours = int(math.Ceil(float64(billableMinutes) / 60.0))
	}

	rawFee := float64(billableHours) * b.PricePerHour

	days := 1
	if parkingDuration > 0 {
		days = int(math.Ceil(float64(parkingDuration) / 1440.0))
	}

	finalFee := rawFee
	if b.DailyCap > 0 {
		cap := b.DailyCap * float64(days)
		if finalFee > cap {
			finalFee = cap
		}
	}

	return &CalculateResult{
		ParkingDuration: parkingDuration,
		FreeMinutes:     b.FreeMinutes,
		BillableMinutes: billableMinutes,
		BillableHours:   billableHours,
		PricePerHour:    b.PricePerHour,
		DailyCap:        b.DailyCap,
		Days:            days,
		RawFee:          rawFee,
		FinalFee:        finalFee,
	}, nil
}
