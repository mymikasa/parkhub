package impl

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
	"github.com/google/wire"
	"github.com/parkhub/api/internal/domain"
	"github.com/parkhub/api/internal/repository"
	"github.com/parkhub/api/internal/service"
)

var DeviceControlServiceSet = wire.NewSet(NewDeviceControlService)

type deviceControlServiceImpl struct {
	deviceRepo     repository.DeviceRepo
	controlLogRepo repository.DeviceControlLogRepo
	auditLogSvc    service.AuditLogService
	mqttClient     pahomqtt.Client
	offlineTimeout time.Duration
}

func NewDeviceControlService(
	deviceRepo repository.DeviceRepo,
	controlLogRepo repository.DeviceControlLogRepo,
	auditLogSvc service.AuditLogService,
) service.DeviceControlService {
	return &deviceControlServiceImpl{
		deviceRepo:     deviceRepo,
		controlLogRepo: controlLogRepo,
		auditLogSvc:    auditLogSvc,
		mqttClient:     nil,
		offlineTimeout: time.Duration(domain.DefaultHeartbeatTimeoutSeconds) * time.Second,
	}
}

func (s *deviceControlServiceImpl) SetMQTTClient(client pahomqtt.Client) {
	s.mqttClient = client
}

func (s *deviceControlServiceImpl) Control(ctx context.Context, req *service.ControlDeviceRequest) (*service.ControlDeviceResponse, error) {
	device, err := s.deviceRepo.FindByID(ctx, req.DeviceID)
	if err != nil {
		if err == domain.ErrDeviceNotFound {
			return nil, &domain.DomainError{Code: "DEVICE_NOT_FOUND", Message: err.Error()}
		}
		return nil, err
	}

	if req.TenantID != "" && device.TenantID != req.TenantID {
		return nil, &domain.DomainError{Code: "FORBIDDEN", Message: "无权操作该设备"}
	}

	if !domain.IsValidControlCommand(req.Command) {
		return nil, &domain.DomainError{Code: domain.CodeInvalidCommand, Message: domain.ErrInvalidCommand.Error()}
	}

	controlLog := domain.NewDeviceControlLog(
		uuid.NewString(),
		device.TenantID,
		device.ID,
		req.OperatorID,
		req.OperatorName,
		req.Command,
	)

	if err := s.controlLogRepo.Create(ctx, controlLog); err != nil {
		slog.Error("failed to create control log", "device_id", device.ID, "error", err)
		return nil, &domain.DomainError{Code: "INTERNAL_ERROR", Message: "保存操作日志失败"}
	}

	if !s.isDeviceOnline(device) {
		return nil, &domain.DomainError{Code: domain.CodeDeviceOffline, Message: domain.ErrDeviceOffline.Error()}
	}

	s.publishCommand(device.ID, req.Command, req.OperatorID, req.OperatorName)

	detail, _ := json.Marshal(map[string]string{
		"command": req.Command,
	})
	tenantID := device.TenantID
	_ = s.auditLogSvc.Log(ctx, &domain.AuditLog{
		ID:         uuid.NewString(),
		UserID:     req.OperatorID,
		TenantID:   &tenantID,
		Action:     domain.AuditActionDeviceGateOpened,
		TargetType: "device",
		TargetID:   device.ID,
		Detail:     string(detail),
		IP:         req.OperatorIP,
		CreatedAt:  time.Now(),
	})

	return &service.ControlDeviceResponse{Success: true}, nil
}

func (s *deviceControlServiceImpl) isDeviceOnline(device *domain.Device) bool {
	if device.Status != domain.DeviceStatusActive {
		return false
	}
	if device.LastHeartbeat == nil {
		return false
	}
	return time.Since(*device.LastHeartbeat) < s.offlineTimeout
}

func (s *deviceControlServiceImpl) publishCommand(deviceID, command, operatorID, operatorName string) {
	if s.mqttClient == nil {
		slog.Warn("mqtt client not initialized, skipping command publish", "device_id", deviceID)
		return
	}

	topic := fmt.Sprintf("device/%s/command", deviceID)
	msg := domain.ControlMessage{
		Command:      command,
		OperatorID:   operatorID,
		OperatorName: operatorName,
		Timestamp:    time.Now().Unix(),
	}

	payload, err := json.Marshal(msg)
	if err != nil {
		slog.Error("failed to marshal control message", "device_id", deviceID, "error", err)
		return
	}

	token := s.mqttClient.Publish(topic, 1, false, payload)
	go func() {
		token.Wait()
		if err := token.Error(); err != nil {
			slog.Error("failed to publish control command", "device_id", deviceID, "error", err)
		} else {
			slog.Info("control command published", "device_id", deviceID, "command", command)
		}
	}()
}
