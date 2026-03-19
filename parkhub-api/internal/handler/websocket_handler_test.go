package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/parkhub/api/internal/pkg/jwt"
	"github.com/parkhub/api/internal/ws"
)

func TestWebSocketHandler_RejectsWithoutToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	jwtManager := jwt.NewJWTManager("test-secret", 0, 0, "test")
	hub := ws.NewAlertHub()
	handler := NewWebSocketHandler(jwtManager, hub)

	router := gin.New()
	router.GET("/ws", handler.ServeWS)

	req := httptest.NewRequest(http.MethodGet, "/ws", nil)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.Code)
	}
}

func TestWebSocketHandler_RoleTenantFiltering(t *testing.T) {
	gin.SetMode(gin.TestMode)

	jwtManager := jwt.NewJWTManager("test-secret", 0, 0, "test")
	hub := ws.NewAlertHub()
	handler := NewWebSocketHandler(jwtManager, hub)

	router := gin.New()
	router.GET("/ws", handler.ServeWS)

	server := httptest.NewServer(router)
	defer server.Close()

	platformConn := mustDialWS(t, server.URL, mustAccessToken(t, jwtManager, "u-platform", nil, "platform_admin"))
	defer platformConn.Close()

	tenantID1 := "tenant-1"
	tenantConn := mustDialWS(t, server.URL, mustAccessToken(t, jwtManager, "u-tenant-1", &tenantID1, "tenant_admin"))
	defer tenantConn.Close()

	tenantID2 := "tenant-2"
	otherTenantConn := mustDialWS(t, server.URL, mustAccessToken(t, jwtManager, "u-tenant-2", &tenantID2, "tenant_admin"))
	defer otherTenantConn.Close()

	operatorConn := mustDialWS(t, server.URL, mustAccessToken(t, jwtManager, "u-operator", &tenantID1, "operator"))
	defer operatorConn.Close()

	hub.BroadcastOffline("tenant-1", "车场A", 2, time.Now())

	msgPlatform := mustReadJSON(t, platformConn)
	if msgPlatform["type"] != "devices_offline" {
		t.Fatalf("platform msg type = %v, want devices_offline", msgPlatform["type"])
	}
	if msgPlatform["count"] != float64(2) {
		t.Fatalf("platform msg count = %v, want 2", msgPlatform["count"])
	}

	msgTenant := mustReadJSON(t, tenantConn)
	if msgTenant["type"] != "devices_offline" {
		t.Fatalf("tenant msg type = %v, want devices_offline", msgTenant["type"])
	}

	expectNoMessage(t, otherTenantConn)
	expectNoMessage(t, operatorConn)
}

func mustAccessToken(t *testing.T, manager *jwt.JWTManager, userID string, tenantID *string, role string) string {
	t.Helper()
	token, err := manager.GenerateAccessToken(userID, tenantID, role)
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}
	return token
}

func mustDialWS(t *testing.T, baseURL, token string) *websocket.Conn {
	t.Helper()
	wsURL := "ws" + strings.TrimPrefix(baseURL, "http") + "/ws?token=" + token
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial websocket error = %v", err)
	}
	return conn
}

func mustReadJSON(t *testing.T, conn *websocket.Conn) map[string]any {
	t.Helper()
	_ = conn.SetReadDeadline(time.Now().Add(500 * time.Millisecond))
	_, data, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("ReadMessage() error = %v", err)
	}
	var msg map[string]any
	if err := json.Unmarshal(data, &msg); err != nil {
		t.Fatalf("json unmarshal error = %v", err)
	}
	return msg
}

func expectNoMessage(t *testing.T, conn *websocket.Conn) {
	t.Helper()
	_ = conn.SetReadDeadline(time.Now().Add(200 * time.Millisecond))
	_, _, err := conn.ReadMessage()
	if err == nil {
		t.Fatal("expected no message, but received one")
	}
}
