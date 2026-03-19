package ws

import (
	"sync"
	"time"

	"github.com/google/wire"
	"github.com/gorilla/websocket"
)

var AlertHubSet = wire.NewSet(NewAlertHub)

type AlertHub struct {
	mu      sync.RWMutex
	clients map[*client]struct{}
}

type client struct {
	conn     *websocket.Conn
	userID   string
	role     string
	tenantID string
	writeMu  sync.Mutex
}

type offlineMessage struct {
	Type           string `json:"type"`
	Count          int    `json:"count"`
	ParkingLotName string `json:"parking_lot_name"`
	Timestamp      string `json:"timestamp"`
}

type onlineMessage struct {
	Type         string `json:"type"`
	DeviceID     string `json:"device_id"`
	DeviceName   string `json:"device_name"`
	ParkingLotID string `json:"parking_lot_id"`
	Timestamp    string `json:"timestamp"`
}

func NewAlertHub() *AlertHub {
	return &AlertHub{
		clients: make(map[*client]struct{}),
	}
}

func (h *AlertHub) Register(conn *websocket.Conn, userID, role, tenantID string) *client {
	c := &client{
		conn:     conn,
		userID:   userID,
		role:     role,
		tenantID: tenantID,
	}

	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()

	return c
}

func (h *AlertHub) Unregister(c *client) {
	h.mu.Lock()
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		_ = c.conn.Close()
	}
	h.mu.Unlock()
}

func (h *AlertHub) BroadcastOffline(tenantID, parkingLotName string, count int, at time.Time) {
	msg := offlineMessage{
		Type:           "devices_offline",
		Count:          count,
		ParkingLotName: parkingLotName,
		Timestamp:      at.Format(time.RFC3339),
	}
	h.broadcast(tenantID, msg)
}

func (h *AlertHub) BroadcastOnline(tenantID, deviceID, deviceName, parkingLotID string, at time.Time) {
	msg := onlineMessage{
		Type:         "device_online",
		DeviceID:     deviceID,
		DeviceName:   deviceName,
		ParkingLotID: parkingLotID,
		Timestamp:    at.Format(time.RFC3339),
	}
	h.broadcast(tenantID, msg)
}

func (h *AlertHub) broadcast(tenantID string, msg any) {
	h.mu.RLock()
	clients := make([]*client, 0, len(h.clients))
	for c := range h.clients {
		clients = append(clients, c)
	}
	h.mu.RUnlock()

	for _, c := range clients {
		if !c.shouldReceive(tenantID) {
			continue
		}
		if err := c.writeJSON(msg); err != nil {
			h.Unregister(c)
		}
	}
}

func (c *client) shouldReceive(tenantID string) bool {
	if c.role == "platform_admin" {
		return true
	}
	if c.role == "tenant_admin" && c.tenantID == tenantID {
		return true
	}
	return false
}

func (c *client) writeJSON(msg any) error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()

	_ = c.conn.SetWriteDeadline(time.Now().Add(3 * time.Second))
	return c.conn.WriteJSON(msg)
}

func (h *AlertHub) Ping(c *client) error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()

	deadline := time.Now().Add(3 * time.Second)
	_ = c.conn.SetWriteDeadline(deadline)
	return c.conn.WriteControl(websocket.PingMessage, []byte("ping"), deadline)
}
