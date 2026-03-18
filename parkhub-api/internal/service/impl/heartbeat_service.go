package impl

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/redis/go-redis/v9"
)

var HeartbeatServiceSet = wire.NewSet(NewHeartbeatService)

const (
	heartbeatTopic   = "device/+/heartbeat"
	redisKeyPrefix   = "device:heartbeat:"
	redisTTL         = 10 * time.Minute
	syncInterval     = 1 * time.Minute
	offlineScanInterval = 1 * time.Minute
)

// HeartbeatService 心跳处理服务
type HeartbeatService struct {
	mqttClient  pahomqtt.Client
	redisClient *redis.Client
	deviceRepo  repository.DeviceRepo
	timeout     int // 超时秒数

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
		timeout:     timeoutSeconds,
		stopCh:      make(chan struct{}),
	}
}

// Start 启动心跳服务：订阅 MQTT、启动同步和离线扫描定时器
func (s *HeartbeatService) Start() error {
	// 订阅心跳主题
	token := s.mqttClient.Subscribe(heartbeatTopic, 1, s.handleHeartbeat)
	token.Wait()
	if err := token.Error(); err != nil {
		return fmt.Errorf("subscribe %s failed: %w", heartbeatTopic, err)
	}
	slog.Info("mqtt subscribed", "topic", heartbeatTopic)

	// 启动定时同步 Redis → DB
	s.wg.Add(1)
	go s.syncLoop()

	// 启动离线检测
	s.wg.Add(1)
	go s.offlineScanLoop()

	slog.Info("heartbeat service started", "timeout_seconds", s.timeout)
	return nil
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
		"last_heartbeat":   now.Format(time.RFC3339),
	}
	key := redisKeyPrefix + deviceID
	if err := s.redisClient.HSet(ctx, key, data).Err(); err != nil {
		slog.Error("redis hset failed", "device_id", deviceID, "error", err)
		return
	}
	s.redisClient.Expire(ctx, key, redisTTL)

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

	// 扫描所有心跳 key
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

// syncOneDevice 同步单个设备的心跳数据
func (s *HeartbeatService) syncOneDevice(ctx context.Context, key string) {
	deviceID := strings.TrimPrefix(key, redisKeyPrefix)

	vals, err := s.redisClient.HGetAll(ctx, key).Result()
	if err != nil || len(vals) == 0 {
		return
	}

	firmwareVersion := vals["firmware_version"]
	lastHeartbeatStr := vals["last_heartbeat"]
	lastHeartbeat, err := time.Parse(time.RFC3339, lastHeartbeatStr)
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
		// 创建完成后删除 Redis key
		s.redisClient.Del(ctx, key)
		return
	}

	// 已有设备：更新心跳数据
	device.UpdateHeartbeat(firmwareVersion, lastHeartbeat)

	// 恢复在线（offline → active，仅限已分配设备）
	device.MarkOnline(lastHeartbeat)

	if err := s.deviceRepo.UpdateHeartbeat(ctx, device); err != nil {
		slog.Error("update heartbeat failed", "device_id", deviceID, "error", err)
		return
	}

	// 同步完成后删除 Redis key
	s.redisClient.Del(ctx, key)
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

	devices, err := s.deviceRepo.FindTimedOutDevices(ctx, s.timeout)
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

	// 同步更新 Redis 中的状态（如果存在）
	for _, id := range ids {
		key := redisKeyPrefix + id
		s.redisClient.HSet(ctx, key, "status", "offline")
	}

	slog.Info("devices marked offline", "count", len(ids), "device_ids", ids)
}
