## 1. Database Migration

- [x] 1.1 Create migration file for device_control_logs table
- [x] 1.2 Run migration and verify table structure

## 2. Backend Domain Layer

- [x] 2.1 Add DeviceControlLog entity to internal/domain/device.go
- [x] 2.2 Add control-related errors to domain errors

## 3. Backend Repository Layer

- [x] 3.1 Add DeviceControlLogRepo interface to internal/repository/interface.go
- [x] 3.2 Implement DeviceControlLogRepo in internal/repository/impl/device_control_log_repo.go
- [x] 3.3 Add DeviceControlLogRepoSet to wire ProviderSet

## 4. Backend Service Layer

- [x] 4.1 Add DeviceControlService interface to internal/service/interface.go
- [x] 4.2 Add ControlRequest and ControlResponse DTOs
- [x] 4.3 Implement DeviceControlService in internal/service/impl/device_control_service.go
- [x] 4.4 Implement offline detection logic (reuse IsDeviceOnline)
- [x] 4.5 Implement MQTT publish to device/{device_id}/command
- [x] 4.6 Implement control log persistence
- [x] 4.7 Add DeviceControlServiceSet to wire ProviderSet

## 5. Backend Handler Layer

- [x] 5.1 Add Control method to DeviceHandler
- [x] 5.2 Add request validation (command must be "open_gate")
- [x] 5.3 Extract operator info from JWT context
- [x] 5.4 Handle offline device error response

## 6. Backend Routing

- [x] 6.1 Register POST /api/v1/devices/:id/control route
- [x] 6.2 Apply AuthMiddleware and TenantMiddleware
- [x] 6.3 Apply RBAC middleware (admin, operator only)

## 7. Backend Dependency Injection

- [x] 7.1 Update wire.go with new dependencies
- [x] 7.2 Run wire gen ./internal/wire

## 8. Backend Unit Tests

- [x] 8.1 Write unit tests for DeviceControlService
- [x] 8.2 Test offline device rejection
- [x] 8.3 Test MQTT publish success/failure
- [x] 8.4 Test control log persistence
- [x] 8.5 Write unit tests for DeviceHandler.Control
- [x] 8.6 Test permission control scenarios
- [x] 8.7 Run all tests and verify passing

## 9. Frontend Components

- [x] 9.1 Create DeviceControlButton component with confirm dialog
- [x] 9.2 Implement online/offline state detection
- [x] 9.3 Add loading state during control request
- [x] 9.4 Add success/error toast notifications

## 10. Frontend Integration

- [x] 10.1 Integrate DeviceControlButton into device detail page
- [x] 10.2 Integrate DeviceControlButton into device list page operations column
- [x] 10.3 Add permission check (hide button for unauthorized users)

## 11. Final Verification

- [x] 11.1 Test full flow: online device → click button → MQTT message sent
- [x] 11.2 Test offline device → button disabled → error message shown
- [x] 11.3 Verify control logs saved to database
- [x] 11.4 Test permission scenarios (admin, operator, unauthorized)
