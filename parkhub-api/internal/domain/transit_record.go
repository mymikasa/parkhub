package domain

import (
	"errors"
	"time"
)

// TransitRecord 通行记录实体
type TransitRecord struct {
	ID              string
	TenantID        string
	ParkingLotID    string
	GateID          string
	PlateNumber     *string
	Type            TransitType
	Status          TransitStatus
	ImageURL        *string
	Fee             *float64
	EntryRecordID   *string
	ParkingDuration *int
	Remark          *string
	ResolvedAt      *time.Time
	ResolvedBy      *string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// TransitType 通行类型
type TransitType string

const (
	TransitTypeEntry TransitType = "entry" // 入场
	TransitTypeExit  TransitType = "exit"  // 出场
)

// TransitStatus 通行记录状态
type TransitStatus string

const (
	TransitStatusNormal             TransitStatus = "normal"              // 正常（入场在场中）
	TransitStatusPaid               TransitStatus = "paid"                // 已缴费（出场已付款）
	TransitStatusNoExit             TransitStatus = "no_exit"             // 有入无出（超时未出场）
	TransitStatusNoEntry            TransitStatus = "no_entry"            // 有出无入（无匹配入场记录）
	TransitStatusRecognitionFailed  TransitStatus = "recognition_failed"  // 识别失败
)

// 通行记录相关错误
var (
	ErrTransitRecordNotFound = errors.New("通行记录不存在")
	ErrNoMatchingEntry       = errors.New("未找到匹配的入场记录")
	ErrParkingLotFull        = errors.New("车场已满，无可用车位")
	ErrInvalidTransitType    = errors.New("无效的通行类型")
	ErrGateTypeMismatch      = errors.New("通道类型与通行类型不匹配")
	ErrRecordAlreadyResolved = errors.New("该记录已处理")
)

// 通行记录错误码
const (
	CodeTransitRecordNotFound = "TRANSIT_RECORD_NOT_FOUND"
	CodeNoMatchingEntry       = "NO_MATCHING_ENTRY"
	CodeParkingLotFull        = "PARKING_LOT_FULL"
	CodeInvalidTransitType    = "INVALID_TRANSIT_TYPE"
	CodeGateTypeMismatch      = "GATE_TYPE_MISMATCH"
	CodeRecordAlreadyResolved = "RECORD_ALREADY_RESOLVED"
)

// OverstayThresholdHours 超时停放阈值（小时）
const OverstayThresholdHours = 48

// NewEntryRecord 创建入场记录
func NewEntryRecord(id, tenantID, parkingLotID, gateID string, plateNumber, imageURL *string) *TransitRecord {
	now := time.Now()
	status := TransitStatusNormal
	if plateNumber == nil || *plateNumber == "" {
		status = TransitStatusRecognitionFailed
	}

	return &TransitRecord{
		ID:           id,
		TenantID:     tenantID,
		ParkingLotID: parkingLotID,
		GateID:       gateID,
		PlateNumber:  plateNumber,
		Type:         TransitTypeEntry,
		Status:       status,
		ImageURL:     imageURL,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

// NewExitRecord 创建出场记录
func NewExitRecord(id, tenantID, parkingLotID, gateID string, plateNumber, imageURL *string, entryRecordID *string, fee *float64, parkingDuration *int) *TransitRecord {
	now := time.Now()

	status := TransitStatusPaid
	if plateNumber == nil || *plateNumber == "" {
		status = TransitStatusRecognitionFailed
	} else if entryRecordID == nil {
		status = TransitStatusNoEntry
	}

	return &TransitRecord{
		ID:              id,
		TenantID:        tenantID,
		ParkingLotID:    parkingLotID,
		GateID:          gateID,
		PlateNumber:     plateNumber,
		Type:            TransitTypeExit,
		Status:          status,
		ImageURL:        imageURL,
		Fee:             fee,
		EntryRecordID:   entryRecordID,
		ParkingDuration: parkingDuration,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
}

// Resolve 处理异常记录
func (t *TransitRecord) Resolve(resolvedBy string, plateNumber, remark *string) error {
	if t.ResolvedAt != nil {
		return ErrRecordAlreadyResolved
	}

	now := time.Now()
	if plateNumber != nil && *plateNumber != "" {
		t.PlateNumber = plateNumber
	}
	if remark != nil {
		t.Remark = remark
	}
	t.ResolvedAt = &now
	t.ResolvedBy = &resolvedBy
	t.UpdatedAt = now
	return nil
}

// MarkOverstay 标记为超时未出场
func (t *TransitRecord) MarkOverstay() {
	t.Status = TransitStatusNoExit
	t.UpdatedAt = time.Now()
}

// IsException 是否为异常记录
func (t *TransitRecord) IsException() bool {
	return t.Status == TransitStatusNoExit ||
		t.Status == TransitStatusNoEntry ||
		t.Status == TransitStatusRecognitionFailed
}

// IsResolved 是否已处理
func (t *TransitRecord) IsResolved() bool {
	return t.ResolvedAt != nil
}

// ValidateTransitType 校验通行类型
func ValidateTransitType(t TransitType) bool {
	return t == TransitTypeEntry || t == TransitTypeExit
}

// TransitRecordListItem 通行记录列表项（带关联信息）
type TransitRecordListItem struct {
	TransitRecord
	ParkingLotName string
	GateName       string
}
