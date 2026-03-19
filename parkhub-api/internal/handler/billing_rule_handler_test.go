package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/handler/dto"
	"github.com/parkhub/api/internal/service"
)

type stubBillingRuleService struct {
	getByParkingLotIDFn func(ctx context.Context, req *service.GetBillingRuleRequest) (*domain.BillingRule, error)
	updateFn            func(ctx context.Context, req *service.UpdateBillingRuleRequest) (*domain.BillingRule, error)
	calculateFn         func(ctx context.Context, req *service.CalculateFeeRequest) (*domain.CalculateResult, error)
}

func (s *stubBillingRuleService) GetByParkingLotID(ctx context.Context, req *service.GetBillingRuleRequest) (*domain.BillingRule, error) {
	return s.getByParkingLotIDFn(ctx, req)
}

func (s *stubBillingRuleService) Update(ctx context.Context, req *service.UpdateBillingRuleRequest) (*domain.BillingRule, error) {
	return s.updateFn(ctx, req)
}

func (s *stubBillingRuleService) Calculate(ctx context.Context, req *service.CalculateFeeRequest) (*domain.CalculateResult, error) {
	return s.calculateFn(ctx, req)
}

func newTestRule() *domain.BillingRule {
	now := time.Now()
	return &domain.BillingRule{
		ID:           "rule-1",
		TenantID:     "tenant-1",
		ParkingLotID: "lot-1",
		FreeMinutes:  15,
		PricePerHour: 2.00,
		DailyCap:     20.00,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

func TestBillingRuleHandler_Get_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &stubBillingRuleService{
		getByParkingLotIDFn: func(ctx context.Context, req *service.GetBillingRuleRequest) (*domain.BillingRule, error) {
			return newTestRule(), nil
		},
	}
	handler := NewBillingRuleHandler(svc)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("role", "tenant_admin")
		c.Set("tenant_id", "tenant-1")
	})
	router.GET("/billing-rules", handler.Get)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/billing-rules?parking_lot_id=lot-1", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %v, want 200", w.Code)
	}

	var resp dto.Response
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 0 {
		t.Errorf("code = %v, want 0", resp.Code)
	}
}

func TestBillingRuleHandler_Get_MissingParkingLotID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &stubBillingRuleService{}
	handler := NewBillingRuleHandler(svc)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("role", "tenant_admin")
		c.Set("tenant_id", "tenant-1")
	})
	router.GET("/billing-rules", handler.Get)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/billing-rules", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %v, want 400", w.Code)
	}
}

func TestBillingRuleHandler_Get_Forbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &stubBillingRuleService{
		getByParkingLotIDFn: func(ctx context.Context, req *service.GetBillingRuleRequest) (*domain.BillingRule, error) {
			return nil, &domain.DomainError{Code: "FORBIDDEN", Message: "无权访问"}
		},
	}
	handler := NewBillingRuleHandler(svc)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("role", "tenant_admin")
		c.Set("tenant_id", "tenant-2")
	})
	router.GET("/billing-rules", handler.Get)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/billing-rules?parking_lot_id=lot-1", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("status = %v, want 403", w.Code)
	}
}

func TestBillingRuleHandler_Update_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &stubBillingRuleService{
		updateFn: func(ctx context.Context, req *service.UpdateBillingRuleRequest) (*domain.BillingRule, error) {
			rule := newTestRule()
			rule.FreeMinutes = req.FreeMinutes
			rule.PricePerHour = req.PricePerHour
			rule.DailyCap = req.DailyCap
			return rule, nil
		},
	}
	handler := NewBillingRuleHandler(svc)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("role", "tenant_admin")
		c.Set("tenant_id", "tenant-1")
		c.Set("user_id", "user-1")
	})
	router.PUT("/billing-rules/:id", handler.Update)

	body, _ := json.Marshal(map[string]interface{}{
		"free_minutes":   30,
		"price_per_hour": 5.0,
		"daily_cap":      50.0,
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/billing-rules/rule-1", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %v, want 200", w.Code)
	}
}

func TestBillingRuleHandler_Update_ValidationError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &stubBillingRuleService{}
	handler := NewBillingRuleHandler(svc)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("role", "tenant_admin")
		c.Set("tenant_id", "tenant-1")
	})
	router.PUT("/billing-rules/:id", handler.Update)

	// missing required price_per_hour
	body, _ := json.Marshal(map[string]interface{}{
		"free_minutes": 30,
		"daily_cap":    50.0,
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/billing-rules/rule-1", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %v, want 400", w.Code)
	}
}

func TestBillingRuleHandler_Calculate_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &stubBillingRuleService{
		calculateFn: func(ctx context.Context, req *service.CalculateFeeRequest) (*domain.CalculateResult, error) {
			return &domain.CalculateResult{
				ParkingDuration: 120,
				FreeMinutes:     15,
				BillableMinutes: 105,
				BillableHours:   2,
				PricePerHour:    2.00,
				DailyCap:        20.00,
				Days:            1,
				RawFee:          4.00,
				FinalFee:        4.00,
			}, nil
		},
	}
	handler := NewBillingRuleHandler(svc)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("role", "tenant_admin")
		c.Set("tenant_id", "tenant-1")
	})
	router.POST("/billing-rules/calculate", handler.Calculate)

	body, _ := json.Marshal(map[string]string{
		"parking_lot_id": "lot-1",
		"entry_time":     "2024-01-01T08:00:00Z",
		"exit_time":      "2024-01-01T10:00:00Z",
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/billing-rules/calculate", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %v, want 200", w.Code)
	}
}

func TestBillingRuleHandler_Calculate_MissingParams(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &stubBillingRuleService{}
	handler := NewBillingRuleHandler(svc)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("role", "tenant_admin")
		c.Set("tenant_id", "tenant-1")
	})
	router.POST("/billing-rules/calculate", handler.Calculate)

	body, _ := json.Marshal(map[string]string{
		"parking_lot_id": "lot-1",
		// missing entry_time and exit_time
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/billing-rules/calculate", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %v, want 400", w.Code)
	}
}
