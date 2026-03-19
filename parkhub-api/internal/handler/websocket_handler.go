package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/wire"
	"github.com/gorilla/websocket"
	"github.com/parkhub/api/internal/handler/dto"
	"github.com/parkhub/api/internal/pkg/jwt"
	"github.com/parkhub/api/internal/ws"
)

var WebSocketHandlerSet = wire.NewSet(NewWebSocketHandler)

const (
	wsReadTimeout  = 60 * time.Second
	wsPingInterval = 25 * time.Second
)

type WebSocketHandler struct {
	jwtManager *jwt.JWTManager
	hub        *ws.AlertHub
	upgrader   websocket.Upgrader
}

func NewWebSocketHandler(jwtManager *jwt.JWTManager, hub *ws.AlertHub) *WebSocketHandler {
	return &WebSocketHandler{
		jwtManager: jwtManager,
		hub:        hub,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (h *WebSocketHandler) GetAlertHub() *ws.AlertHub {
	return h.hub
}

func (h *WebSocketHandler) ServeWS(c *gin.Context) {
	tokenString := extractToken(c)
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Code:    "TOKEN_MISSING",
			Message: "未提供认证信息",
		})
		return
	}

	claims, err := h.jwtManager.ValidateAccessToken(tokenString)
	if err != nil {
		c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Code:    "TOKEN_INVALID",
			Message: "无效的 Token",
		})
		return
	}

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	tenantID := ""
	if claims.TenantID != nil {
		tenantID = *claims.TenantID
	}

	client := h.hub.Register(conn, claims.UserID, claims.Role, tenantID)
	defer h.hub.Unregister(client)

	conn.SetReadLimit(1024)
	_ = conn.SetReadDeadline(time.Now().Add(wsReadTimeout))
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(wsReadTimeout))
	})
	done := make(chan struct{})
	defer close(done)

	go func() {
		ticker := time.NewTicker(wsPingInterval)
		defer ticker.Stop()
		for {
			select {
			case <-done:
				return
			case <-ticker.C:
				if err := h.hub.Ping(client); err != nil {
					_ = conn.Close()
					return
				}
			}
		}
	}()

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			return
		}
	}
}

func extractToken(c *gin.Context) string {
	if token := c.Query("token"); token != "" {
		return token
	}

	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		return ""
	}

	return parts[1]
}
