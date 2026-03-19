package handler

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/handler/dto"
	"github.com/parkhub/api/internal/pkg/validator"
	"github.com/parkhub/api/internal/service"
	"github.com/xuri/excelize/v2"
)

var TransitRecordHandlerSet = wire.NewSet(NewTransitRecordHandler)

type TransitRecordHandler struct {
	transitRecordService service.TransitRecordService
}

func NewTransitRecordHandler(transitRecordService service.TransitRecordService) *TransitRecordHandler {
	return &TransitRecordHandler{transitRecordService: transitRecordService}
}

// Create 创建通行记录（入场或出场）
func (h *TransitRecordHandler) Create(c *gin.Context) {
	var req dto.CreateTransitRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Response{Code: 400, Message: validator.FormatValidationError(err)})
		return
	}

	tenantID := c.GetString("tenant_id")

	if req.Type == "entry" {
		record, err := h.transitRecordService.CreateEntry(c.Request.Context(), &service.CreateEntryRequest{
			TenantID:     tenantID,
			ParkingLotID: req.ParkingLotID,
			GateID:       req.GateID,
			PlateNumber:  req.PlateNumber,
			ImageURL:     req.ImageURL,
		})
		if err != nil {
			h.handleError(c, err)
			return
		}
		c.JSON(http.StatusCreated, dto.Response{Code: 0, Message: "入场记录已创建", Data: gin.H{"id": record.ID}})
	} else {
		record, err := h.transitRecordService.CreateExit(c.Request.Context(), &service.CreateExitRequest{
			TenantID:     tenantID,
			ParkingLotID: req.ParkingLotID,
			GateID:       req.GateID,
			PlateNumber:  req.PlateNumber,
			ImageURL:     req.ImageURL,
		})
		if err != nil {
			h.handleError(c, err)
			return
		}
		c.JSON(http.StatusCreated, dto.Response{Code: 0, Message: "出场记录已创建", Data: gin.H{
			"id":               record.ID,
			"fee":              record.Fee,
			"parking_duration": record.ParkingDuration,
			"status":           string(record.Status),
		}})
	}
}

// Get 获取通行记录详情
func (h *TransitRecordHandler) Get(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.GetString("tenant_id")

	item, err := h.transitRecordService.GetByID(c.Request.Context(), id, tenantID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{Code: 0, Message: "success", Data: dto.ToTransitRecordResponse(item)})
}

// List 获取通行记录列表
func (h *TransitRecordHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	req := &service.ListTransitRecordsRequest{
		TenantID:     c.GetString("tenant_id"),
		ParkingLotID: c.Query("parking_lot_id"),
		PlateNumber:  c.Query("plate_number"),
		Page:         page,
		PageSize:     pageSize,
	}

	if t := c.Query("type"); t != "" {
		tt := domain.TransitType(t)
		req.Type = &tt
	}
	if s := c.Query("status"); s != "" {
		ss := domain.TransitStatus(s)
		req.Status = &ss
	}
	if sd := c.Query("start_date"); sd != "" {
		req.StartDate = &sd
	}
	if ed := c.Query("end_date"); ed != "" {
		req.EndDate = &ed
	}

	result, err := h.transitRecordService.List(c.Request.Context(), req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{
		Code:    0,
		Message: "success",
		Data: gin.H{
			"items":     dto.ToTransitRecordResponseList(result.Items),
			"total":     result.Total,
			"page":      result.Page,
			"page_size": result.PageSize,
		},
	})
}

// GetLatest 获取最新通行记录
func (h *TransitRecordHandler) GetLatest(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	tenantID := c.GetString("tenant_id")

	items, err := h.transitRecordService.GetLatest(c.Request.Context(), tenantID, limit)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{Code: 0, Message: "success", Data: dto.ToTransitRecordResponseList(items)})
}

// GetStats 获取今日统计
func (h *TransitRecordHandler) GetStats(c *gin.Context) {
	tenantID := c.GetString("tenant_id")

	stats, err := h.transitRecordService.GetStats(c.Request.Context(), tenantID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{Code: 0, Message: "success", Data: dto.TransitStatsResponse{
		EntryCount:   stats.EntryCount,
		ExitCount:    stats.ExitCount,
		OnSiteCount:  stats.OnSiteCount,
		TodayRevenue: stats.TodayRevenue,
	}})
}

// GetOverstay 获取超时停放列表
func (h *TransitRecordHandler) GetOverstay(c *gin.Context) {
	tenantID := c.GetString("tenant_id")

	items, err := h.transitRecordService.GetOverstay(c.Request.Context(), tenantID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{Code: 0, Message: "success", Data: dto.ToTransitRecordResponseList(items)})
}

// Resolve 处理异常记录
func (h *TransitRecordHandler) Resolve(c *gin.Context) {
	id := c.Param("id")

	var req dto.ResolveTransitRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Response{Code: 400, Message: validator.FormatValidationError(err)})
		return
	}

	item, err := h.transitRecordService.Resolve(c.Request.Context(), &service.ResolveTransitRecordRequest{
		ID:          id,
		TenantID:    c.GetString("tenant_id"),
		ResolvedBy:  c.GetString("user_id"),
		PlateNumber: req.PlateNumber,
		Remark:      req.Remark,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{Code: 0, Message: "异常已处理", Data: dto.ToTransitRecordResponse(item)})
}

// GetExceptionCount 获取未处理异常数
func (h *TransitRecordHandler) GetExceptionCount(c *gin.Context) {
	tenantID := c.GetString("tenant_id")

	count, err := h.transitRecordService.CountExceptions(c.Request.Context(), tenantID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.Response{Code: 0, Message: "success", Data: gin.H{"count": count}})
}

// Export 导出通行记录
func (h *TransitRecordHandler) Export(c *gin.Context) {
	format := c.DefaultQuery("format", "csv")

	req := &service.ListTransitRecordsRequest{
		TenantID:     c.GetString("tenant_id"),
		ParkingLotID: c.Query("parking_lot_id"),
		PlateNumber:  c.Query("plate_number"),
		Page:         1,
		PageSize:     10000, // 导出上限
	}

	if t := c.Query("type"); t != "" {
		tt := domain.TransitType(t)
		req.Type = &tt
	}
	if s := c.Query("status"); s != "" {
		ss := domain.TransitStatus(s)
		req.Status = &ss
	}
	if sd := c.Query("start_date"); sd != "" {
		req.StartDate = &sd
	}
	if ed := c.Query("end_date"); ed != "" {
		req.EndDate = &ed
	}

	result, err := h.transitRecordService.List(c.Request.Context(), req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	dateStr := time.Now().Format("20060102")

	if format == "xlsx" {
		h.exportExcel(c, result.Items, dateStr)
	} else {
		h.exportCSV(c, result.Items, dateStr)
	}
}

func (h *TransitRecordHandler) exportCSV(c *gin.Context, items []*domain.TransitRecordListItem, dateStr string) {
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="transit-records-%s.csv"`, dateStr))

	// UTF-8 BOM for Excel compatibility
	c.Writer.Write([]byte{0xEF, 0xBB, 0xBF})

	w := csv.NewWriter(c.Writer)
	defer w.Flush()

	w.Write([]string{"时间", "车牌号", "车场", "出入口", "类型", "费用", "状态"})

	for _, item := range items {
		plate := ""
		if item.PlateNumber != nil {
			plate = *item.PlateNumber
		}
		fee := ""
		if item.Fee != nil {
			fee = fmt.Sprintf("%.2f", *item.Fee)
		}
		transitType := "入场"
		if item.Type == domain.TransitTypeExit {
			transitType = "出场"
		}
		w.Write([]string{
			item.CreatedAt.Format("2006-01-02 15:04:05"),
			plate,
			item.ParkingLotName,
			item.GateName,
			transitType,
			fee,
			h.statusText(item.Status),
		})
	}
}

func (h *TransitRecordHandler) exportExcel(c *gin.Context, items []*domain.TransitRecordListItem, dateStr string) {
	f := excelize.NewFile()
	defer f.Close()

	sheet := "Sheet1"
	headers := []string{"时间", "车牌号", "车场", "出入口", "类型", "费用", "状态"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, header)
	}

	// 表头样式
	style, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#E2E8F0"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheet, "A1", "G1", style)

	for i, item := range items {
		row := i + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), item.CreatedAt.Format("2006-01-02 15:04:05"))
		if item.PlateNumber != nil {
			f.SetCellValue(sheet, fmt.Sprintf("B%d", row), *item.PlateNumber)
		}
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), item.ParkingLotName)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), item.GateName)
		transitType := "入场"
		if item.Type == domain.TransitTypeExit {
			transitType = "出场"
		}
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), transitType)
		if item.Fee != nil {
			f.SetCellValue(sheet, fmt.Sprintf("F%d", row), *item.Fee)
		}
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), h.statusText(item.Status))
	}

	// Auto-fit column widths
	for i := range headers {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetColWidth(sheet, col, col, 18)
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="transit-records-%s.xlsx"`, dateStr))
	f.Write(c.Writer)
}

func (h *TransitRecordHandler) statusText(status domain.TransitStatus) string {
	switch status {
	case domain.TransitStatusNormal:
		return "正常"
	case domain.TransitStatusPaid:
		return "已缴费"
	case domain.TransitStatusNoExit:
		return "有入无出"
	case domain.TransitStatusNoEntry:
		return "有出无入"
	case domain.TransitStatusRecognitionFailed:
		return "识别失败"
	default:
		return string(status)
	}
}

func (h *TransitRecordHandler) handleError(c *gin.Context, err error) {
	if de, ok := err.(*domain.DomainError); ok {
		switch de.Code {
		case domain.CodeTransitRecordNotFound:
			c.JSON(http.StatusNotFound, dto.Response{Code: 40401, Message: de.Message})
		case "FORBIDDEN":
			c.JSON(http.StatusForbidden, dto.Response{Code: 40301, Message: de.Message})
		case domain.CodeParkingLotFull:
			c.JSON(http.StatusConflict, dto.Response{Code: 40901, Message: de.Message})
		case domain.CodeGateTypeMismatch, domain.CodeInvalidTransitType, domain.CodeInvalidTimeRange:
			c.JSON(http.StatusBadRequest, dto.Response{Code: 40001, Message: de.Message})
		case domain.CodeRecordAlreadyResolved:
			c.JSON(http.StatusConflict, dto.Response{Code: 40902, Message: de.Message})
		default:
			c.JSON(http.StatusInternalServerError, dto.Response{Code: 500, Message: de.Message})
		}
		return
	}
	c.JSON(http.StatusInternalServerError, dto.Response{Code: 500, Message: "服务器内部错误"})
}
