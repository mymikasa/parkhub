package impl

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"
	"sync"
	"time"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/redis/go-redis/v9"
)

const (
	heartbeatTopic      = "device/+/heartbeat"
	redisKeyPrefix      = "device:"
	redisTTL            = 10 * time.Minute
	syncInterval        = 1 * time.Minute
	offlineScanInterval = 1 * time.Minute
)

// atomicGetAndDel 原子读取并删除 Redis hash key，避免竞态
var atomicGetAndDel = redis.NewScript(`
	local vals = redis.call('HGETALL', KEYS[1])
	if #vals == 0 then return nil end
	redis.call('DEL', KEYS[1])
	return vals
`)

// HeartbeatService 心跳处理服务
type HeartbeatService struct {
	mqttClient  pahomqtt.Client
	redisClient *redis.Client
	deviceRepo  repository.DeviceRepo
	timeout     time.Duration

	stopCh chan struct{}
	wg     sync.WaitGroup
}

// NewHeartbeatService 创建心跳服务
func NewHeartbeatService(
	mqttClient pahomqtt.Client,
	redisClient *redis.Client,
	deviceRepo repository.DeviceRepo,
	timeoutSeconds int,
) *HeartbeatService {
	return &HeartbeatService{
		mqttClient:  mqttClient,
		redisClient: redisClient,
		deviceRepo:  deviceRepo,
		timeout:     time.Duration(timeoutSeconds) * time.Second,
		stopCh:      make(chan struct{}),
	}
}

// SetMQTTClient 设置 MQTT 客户端（用于解决初始化顺序依赖）
func (s *HeartbeatService) SetMQTTClient(client pahomqtt.Client) {
	s.mqttClient = client
}

// Subscribe 订阅心跳主题（也用于 MQTT 重连后重新订阅）
func (s *HeartbeatService) Subscribe(c pahomqtt.Client) {
	token := c.Subscribe(heartbeatTopic, 1, s.handleHeartbeat)
	token.Wait()
	if err := token.Error(); err != nil {
		slog.Error("mqtt subscribe failed", "topic", heartbeatTopic, "error", err)
		return
	}
	slog.Info("mqtt subscribed", "topic", heartbeatTopic)
}

// Start 启动心跳服务：启动同步和离线扫描定时器
// 注意：MQTT 订阅由 OnConnect 回调处理（首次连接和重连时都会触发）
func (s *HeartbeatService) Start() {
	// 启动定时同步 Redis → DB
	s.wg.Add(1)
	go s.syncLoop()

	// 启动离线检测
	s.wg.Add(1)
	go s.offlineScanLoop()

	slog.Info("heartbeat service started", "timeout", s.timeout)
}

// Stop 停止心跳服务
func (s *HeartbeatService) Stop() {
	close(s.stopCh)
	s.mqttClient.Unsubscribe(heartbeatTopic)
	s.wg.Wait()
	slog.Info("heartbeat service stopped")
}

// handleHeartbeat 处理单条心跳消息
// Topic 格式: device/{serial_number}/heartbeat
func (s *HeartbeatService) handleHeartbeat(_ pahomqtt.Client, msg pahomqtt.Message) {
	parts := strings.Split(msg.Topic(), "/")
	if len(parts) != 3 {
		slog.Warn("invalid heartbeat topic", "topic", msg.Topic())
		return
	}
	deviceID := parts[1]

	var hb domain.HeartbeatMessage
	if err := json.Unmarshal(msg.Payload(), &hb); err != nil {
		slog.Warn("invalid heartbeat payload", "device_id", deviceID, "error", err)
		return
	}

	ctx := context.Background()
	now := time.Now()

	// 写入 Redis 缓存
	data := map[string]any{
		"status":           "online",
		"firmware_version": hb.FirmwareVersion,
		"last_heartbeat":   now.Format(time.RFC3339Nano),
	}
	key := redisKeyPrefix + deviceID
	if err := s.redisClient.HSet(ctx, key, data).Err(); err != nil {
		slog.Error("redis hset failed", "device_id", deviceID, "error", err)
		return
	}
	if err := s.redisClient.Expire(ctx, key, redisTTL).Err(); err != nil {
		slog.Error("redis expire failed", "device_id", deviceID, "error", err)
	}

	slog.Debug("heartbeat received", "device_id", deviceID, "firmware", hb.FirmwareVersion)
}

// syncLoop 每分钟将 Redis 缓存的心跳数据同步到数据库
func (s *HeartbeatService) syncLoop() {
	defer s.wg.Done()
	ticker := time.NewTicker(syncInterval)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopCh:
			return
		case <-ticker.C:
			s.syncRedisToDatabase()
		}
	}
}

// syncRedisToDatabase 同步所有 Redis 心跳数据到数据库
func (s *HeartbeatService) syncRedisToDatabase() {
	ctx := context.Background()

	var cursor uint64
	pattern := redisKeyPrefix + "*"

	for {
		keys, nextCursor, err := s.redisClient.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			slog.Error("redis scan failed", "error", err)
			return
		}

		for _, key := range keys {
			s.syncOneDevice(ctx, key)
		}

		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}
}

// syncOneDevice 原子读取并删除 Redis 数据，然后同步到数据库
func (s *HeartbeatService) syncOneDevice(ctx context.Context, key string) {
	deviceID := strings.TrimPrefix(key, redisKeyPrefix)

	// 原子读取并删除，避免与 handleHeartbeat 的竞态
	result, err := atomicGetAndDel.Run(ctx, s.redisClient, []string{key}).StringSlice()
	if err != nil {
		if err == redis.Nil {
			return
		}
		slog.Error("redis atomic read-delete failed", "device_id", deviceID, "error", err)
		return
	}

	// 将 string slice 转为 map
	vals := make(map[string]string, len(result)/2)
	for i := 0; i < len(result)-1; i += 2 {
		vals[result[i]] = result[i+1]
	}

	firmwareVersion := vals["firmware_version"]
	lastHeartbeatStr := vals["last_heartbeat"]
	lastHeartbeat, err := time.Parse(time.RFC3339Nano, lastHeartbeatStr)
	if err != nil {
		slog.Warn("invalid last_heartbeat in redis", "device_id", deviceID, "value", lastHeartbeatStr)
		return
	}

	// 查找设备（全局查找，不限租户）
	device, err := s.deviceRepo.FindByIDGlobal(ctx, deviceID)
	if err != nil {
		slog.Error("find device failed", "device_id", deviceID, "error", err)
		return
	}

	if device == nil {
		// 新设备：自动创建（pending 状态，归属平台租户）
		device = domain.NewDevice(deviceID, domain.PlatformTenantID)
		device.UpdateHeartbeat(firmwareVersion, lastHeartbeat)
		if err := s.deviceRepo.Create(ctx, device); err != nil {
			slog.Error("auto-create device failed", "device_id", deviceID, "error", err)
			return
		}
		slog.Info("device auto-registered", "device_id", deviceID)
		return
	}

	// 已有设备：更新心跳数据
	device.UpdateHeartbeat(firmwareVersion, lastHeartbeat)

	// 恢复在线：已分配设备 offline → active，未分配设备 offline → pending
	device.MarkOnline(lastHeartbeat)

	if err := s.deviceRepo.UpdateHeartbeat(ctx, device); err != nil {
		slog.Error("update heartbeat failed", "device_id", deviceID, "error", err)
		return
	}
}

// offlineScanLoop 定期扫描超时设备并标记为离线
func (s *HeartbeatService) offlineScanLoop() {
	defer s.wg.Done()
	ticker := time.NewTicker(offlineScanInterval)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopCh:
			return
		case <-ticker.C:
			s.detectOfflineDevices()
		}
	}
}

// detectOfflineDevices 检测超时设备并标记离线
func (s *HeartbeatService) detectOfflineDevices() {
	ctx := context.Background()

	threshold := time.Now().Add(-s.timeout)
	devices, err := s.deviceRepo.FindTimedOutDevices(ctx, threshold)
	if err != nil {
		slog.Error("find timed-out devices failed", "error", err)
		return
	}

	if len(devices) == 0 {
		return
	}

	ids := make([]string, len(devices))
	for i, d := range devices {
		ids[i] = d.ID
	}

	// 批量更新数据库状态为 offline
	if err := s.deviceRepo.BatchUpdateStatus(ctx, ids, domain.DeviceStatusOffline); err != nil {
		slog.Error("batch update offline status failed", "error", err)
		return
	}

	slog.Info("devices marked offline", "count", len(ids), "device_ids", ids)
}
