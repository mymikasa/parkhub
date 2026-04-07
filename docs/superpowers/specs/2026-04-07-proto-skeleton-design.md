# Task 0.3: Proto 接口骨架设计

> **日期**: 2026-04-07
> **状态**: 已批准
> **所属阶段**: 阶段 0 — 架构骨架搭建

## 1. 目标

为所有 domain 定义 protobuf 接口骨架（RPC 方法签名 + Request/Response 消息结构），不实现任何业务逻辑。所有 proto 文件需通过 `buf lint`，`buf generate` 能正确生成 Go 代码。

## 2. 目录结构

```
api/proto/
├── common/v1/          # 共享类型（无 service）
│   ├── pagination.proto
│   ├── money.proto
│   ├── tenant_context.proto
│   └── enums.proto
├── core/v1/            # 核心域：Tenant、User、Auth、ParkingLot、Gate
│   ├── tenant.proto        → TenantService (6 RPCs)
│   ├── user.proto          → UserService (7 RPCs)
│   ├── auth.proto          → AuthService (5 RPCs)
│   ├── parking_lot.proto   → ParkingLotService (6 RPCs)
│   └── gate.proto          → GateService (4 RPCs)
├── iot/v1/             # IoT 域：Device、Heartbeat、Command
│   ├── device.proto        → DeviceService (6 RPCs)
│   ├── heartbeat.proto     → HeartbeatService (5 RPCs)
│   └── command.proto       → CommandService (5 RPCs)
├── event/v1/           # 事件域：Transit、Monitor、Anomaly
│   ├── transit.proto       → TransitService (6 RPCs)
│   ├── monitor.proto       → MonitorService (5 RPCs)
│   └── anomaly.proto       → AnomalyService (5 RPCs)
├── billing/v1/         # 计费域：Rule、Calculator
│   ├── rule.proto          → RuleService (6 RPCs)
│   └── calculator.proto    → CalculatorService (5 RPCs)
├── payment/v1/         # 支付域：Order、Payment、Coupon
│   ├── order.proto         → OrderService (6 RPCs)
│   ├── payment.proto       → PaymentService (5 RPCs)
│   └── coupon.proto        → CouponService (6 RPCs)
└── bff/v1/             # BFF 聚合层：Monitor、ParkingLot、ExitFlow
    ├── monitor.proto       → MonitorBffService (5 RPCs)
    ├── parking_lot.proto   → ParkingLotBffService (5 RPCs)
    └── exit_flow.proto     → ExitFlowBffService (5 RPCs)
```

**总计**: 7 个 domain，19 个 service，103 个 RPC 方法，24 个 proto 文件。

## 3. 设计约定

### 3.1 命名规范（遵循 target-architecture.md §4.2）

| 元素 | 规则 | 示例 |
|------|------|------|
| Service | `<Resource>Service` | TenantService |
| RPC Method | `Verb + Resource` | GetTenant, ListTenants |
| Request | `<Method>Request` | GetTenantRequest |
| Response | `<Method>Response` | GetTenantResponse |
| Enum Values | `ALL_CAPS + prefix` | TENANT_STATUS_ACTIVE |

### 3.2 字段约定

| 约定 | 规则 |
|------|------|
| Resource ID | `string`（UUID） |
| 时间字段 | `google.protobuf.Timestamp` |
| 分页 | `common.v1.PaginationRequest` / `PaginationResponse` |
| 金额 | `common.v1.Money`（currency + amount_cents） |
| 租户上下文 | 所有 Request 的 `string tenant_id = 1;`（平台级 API 除外） |
| 跨域引用 | 只能 import `common/v1/*.proto`，禁止跨域直接 import |

### 3.3 Proto 模板

每个 proto 文件遵循以下模板：

```protobuf
syntax = "proto3";
package parkhub.<domain>.v1;
import "google/protobuf/timestamp.proto";
import "common/v1/<shared_types>.proto";
option go_package = "github.com/parkhub/api/internal/gen/proto/<domain>/v1;<domain>v1";
```

## 4. 各 Domain 详细定义

### 4.1 common/v1 — 共享类型（无 service）

**enums.proto** — 全局枚举：
- `UserRole`: USER_ROLE_UNSPECIFIED, USER_ROLE_PLATFORM_ADMIN, USER_ROLE_TENANT_ADMIN, USER_ROLE_OPERATOR
- `TenantStatus`: TENANT_STATUS_UNSPECIFIED, TENANT_STATUS_ACTIVE, TENANT_STATUS_FROZEN
- `DeviceStatus`: DEVICE_STATUS_UNSPECIFIED, DEVICE_STATUS_PENDING, DEVICE_STATUS_ACTIVE, DEVICE_STATUS_OFFLINE, DEVICE_STATUS_DISABLED
- `TransitType`: TRANSIT_TYPE_UNSPECIFIED, TRANSIT_TYPE_ENTRY, TRANSIT_TYPE_EXIT
- `TransitStatus`: TRANSIT_STATUS_UNSPECIFIED, TRANSIT_STATUS_NORMAL, TRANSIT_STATUS_PAID, TRANSIT_STATUS_NO_EXIT, TRANSIT_STATUS_NO_ENTRY, TRANSIT_STATUS_RECOGNITION_FAILED
- `LotType`: LOT_TYPE_UNSPECIFIED, LOT_TYPE_UNDERGROUND, LOT_TYPE_GROUND, LOT_TYPE_STEREO
- `GateType`: GATE_TYPE_UNSPECIFIED, GATE_TYPE_ENTRY, GATE_TYPE_EXIT
- `OrderStatus`: ORDER_STATUS_UNSPECIFIED, ORDER_STATUS_PENDING, ORDER_STATUS_PAID, ORDER_STATUS_CANCELLED, ORDER_STATUS_REFUNDED
- `PaymentMethod`: PAYMENT_METHOD_UNSPECIFIED, PAYMENT_METHOD_WECHAT, PAYMENT_METHOD_ALIPAY, PAYMENT_METHOD_CASH
- `CouponType`: COUPON_TYPE_UNSPECIFIED, COUPON_TYPE_PERCENTAGE, COUPON_TYPE_FIXED
- `AnomalyType`: ANOMALY_TYPE_UNSPECIFIED, ANOMALY_TYPE_NO_EXIT, ANOMALY_TYPE_NO_ENTRY, ANOMALY_TYPE_RECOGNITION_FAILED

**pagination.proto**:
- `PaginationRequest`: page (int32), page_size (int32)
- `PaginationResponse`: total (int32), has_more (bool)

**money.proto**:
- `Money`: currency (string), amount_cents (int64)

**tenant_context.proto**:
- `TenantContext`: tenant_id (string), user_role (UserRole)

### 4.2 core/v1 — 核心域（5 service, 28 RPCs）

**tenant.proto → TenantService**:
| RPC | Request | Response |
|-----|---------|----------|
| GetTenant | GetTenantRequest (tenant_id) | GetTenantResponse (tenant) |
| ListTenants | ListTenantsRequest (pagination, status_filter) | ListTenantsResponse (tenants, pagination) |
| CreateTenant | CreateTenantRequest (company_name, contact_name, contact_phone) | CreateTenantResponse (tenant) |
| UpdateTenant | UpdateTenantRequest (tenant_id, company_name, contact_name, contact_phone) | UpdateTenantResponse (tenant) |
| FreezeTenant | FreezeTenantRequest (tenant_id) | FreezeTenantResponse |
| UnfreezeTenant | UnfreezeTenantRequest (tenant_id) | UnfreezeTenantResponse |

**user.proto → UserService**:
| RPC | Request | Response |
|-----|---------|----------|
| GetUser | GetUserRequest (user_id) | GetUserResponse (user) |
| ListUsers | ListUsersRequest (tenant_id, role_filter, pagination) | ListUsersResponse (users, pagination) |
| CreateUser | CreateUserRequest (tenant_id, username, email, phone, real_name, role) | CreateUserResponse (user) |
| UpdateUser | UpdateUserRequest (user_id, email, phone, real_name) | UpdateUserResponse (user) |
| DeleteUser | DeleteUserRequest (user_id) | DeleteUserResponse |
| AssignRole | AssignRoleRequest (user_id, role) | AssignRoleResponse |
| ResetPassword | ResetPasswordRequest (user_id, new_password) | ResetPasswordResponse |

**auth.proto → AuthService**:
| RPC | Request | Response |
|-----|---------|----------|
| Login | LoginRequest (username, password) | LoginResponse (access_token, refresh_token, expires_at, user) |
| Logout | LogoutRequest (access_token) | LogoutResponse |
| RefreshToken | RefreshTokenRequest (refresh_token) | RefreshTokenResponse (access_token, refresh_token, expires_at) |
| SendSmsCode | SendSmsCodeRequest (phone, purpose) | SendSmsCodeResponse |
| GetCurrentUser | GetCurrentUserRequest (access_token) | GetCurrentUserResponse (user, tenant) |

**parking_lot.proto → ParkingLotService**:
| RPC | Request | Response |
|-----|---------|----------|
| GetParkingLot | GetParkingLotRequest (parking_lot_id) | GetParkingLotResponse (parking_lot) |
| ListParkingLots | ListParkingLotsRequest (tenant_id, status_filter, pagination) | ListParkingLotsResponse (parking_lots, pagination) |
| CreateParkingLot | CreateParkingLotRequest (tenant_id, name, address, total_spaces, lot_type) | CreateParkingLotResponse (parking_lot) |
| UpdateParkingLot | UpdateParkingLotRequest (parking_lot_id, name, address, total_spaces, lot_type, status) | UpdateParkingLotResponse (parking_lot) |
| DeleteParkingLot | DeleteParkingLotRequest (parking_lot_id) | DeleteParkingLotResponse |
| ListGates | ListGatesRequest (parking_lot_id) | ListGatesResponse (gates) |

**gate.proto → GateService**:
| RPC | Request | Response |
|-----|---------|----------|
| GetGate | GetGateRequest (gate_id) | GetGateResponse (gate) |
| CreateGate | CreateGateRequest (parking_lot_id, name, gate_type, device_id) | CreateGateResponse (gate) |
| UpdateGate | UpdateGateRequest (gate_id, name, gate_type, device_id) | UpdateGateResponse (gate) |
| DeleteGate | DeleteGateRequest (gate_id) | DeleteGateResponse |

### 4.3 iot/v1 — IoT 域（3 service, 16 RPCs）

**device.proto → DeviceService**:
| RPC | Request | Response |
|-----|---------|----------|
| GetDevice | GetDeviceRequest (device_id) | GetDeviceResponse (device) |
| ListDevices | ListDevicesRequest (tenant_id, parking_lot_id, status_filter, pagination) | ListDevicesResponse (devices, pagination) |
| CreateDevice | CreateDeviceRequest (tenant_id, name, parking_lot_id, gate_id, firmware_version) | CreateDeviceResponse (device) |
| UpdateDevice | UpdateDeviceRequest (device_id, name, parking_lot_id, gate_id) | UpdateDeviceResponse (device) |
| DeleteDevice | DeleteDeviceRequest (device_id) | DeleteDeviceResponse |
| UpdateDeviceStatus | UpdateDeviceStatusRequest (device_id, status) | UpdateDeviceStatusResponse (device) |

**heartbeat.proto → HeartbeatService**:
| RPC | Request | Response |
|-----|---------|----------|
| ReportHeartbeat | ReportHeartbeatRequest (device_id, status, firmware_version) | ReportHeartbeatResponse |
| GetLatestHeartbeat | GetLatestHeartbeatRequest (device_id) | GetLatestHeartbeatResponse (heartbeat) |
| GetHeartbeatHistory | GetHeartbeatHistoryRequest (device_id, start_time, end_time, pagination) | GetHeartbeatHistoryResponse (heartbeats, pagination) |
| GetDeviceOnlineStatistics | GetDeviceOnlineStatisticsRequest (tenant_id, parking_lot_id) | GetDeviceOnlineStatisticsResponse (total, online, offline) |
| ListOfflineDevices | ListOfflineDevicesRequest (tenant_id, parking_lot_id, pagination) | ListOfflineDevicesResponse (devices, pagination) |

**command.proto → CommandService**:
| RPC | Request | Response |
|-----|---------|----------|
| SendLiftBarrier | SendLiftBarrierRequest (device_id, reason) | SendLiftBarrierResponse (command_id) |
| SendLowerBarrier | SendLowerBarrierRequest (device_id) | SendLowerBarrierResponse (command_id) |
| SendRestart | SendRestartRequest (device_id) | SendRestartResponse (command_id) |
| GetCommandStatus | GetCommandStatusRequest (command_id) | GetCommandStatusResponse (command) |
| ListCommandHistory | ListCommandHistoryRequest (device_id, pagination) | ListCommandHistoryResponse (commands, pagination) |

### 4.4 event/v1 — 事件域（3 service, 16 RPCs）

**transit.proto → TransitService**:
| RPC | Request | Response |
|-----|---------|----------|
| GetTransitRecord | GetTransitRecordRequest (transit_id) | GetTransitRecordResponse (transit) |
| ListTransitRecords | ListTransitRecordsRequest (tenant_id, parking_lot_id, transit_type, plate_number, pagination) | ListTransitRecordsResponse (transits, pagination) |
| CreateEntryRecord | CreateEntryRecordRequest (tenant_id, parking_lot_id, gate_id, plate_number, image_url) | CreateEntryRecordResponse (transit) |
| CreateExitRecord | CreateExitRecordRequest (tenant_id, parking_lot_id, gate_id, plate_number, image_url, entry_record_id) | CreateExitRecordResponse (transit) |
| MatchEntryRecord | MatchEntryRecordRequest (exit_record_id) | MatchEntryRecordResponse (matched, entry_record) |
| ListByPlate | ListByPlateRequest (tenant_id, plate_number, pagination) | ListByPlateResponse (transits, pagination) |

**monitor.proto → MonitorService**:
| RPC | Request | Response |
|-----|---------|----------|
| GetRealtimeStatus | GetRealtimeStatusRequest (parking_lot_id) | GetRealtimeStatusResponse (lot_status) |
| GetLotOccupancy | GetLotOccupancyRequest (tenant_id) | GetLotOccupancyResponse (occupancies) |
| GetRecentTransits | GetRecentTransitsRequest (parking_lot_id, limit) | GetRecentTransitsResponse (transits) |
| GetDashboardData | GetDashboardDataRequest (tenant_id) | GetDashboardDataResponse (summary) |
| SubscribeEvents | SubscribeEventsRequest (tenant_id, parking_lot_id) | stream SubscribeEventsResponse (event) |

**anomaly.proto → AnomalyService**:
| RPC | Request | Response |
|-----|---------|----------|
| GetAnomaly | GetAnomalyRequest (anomaly_id) | GetAnomalyResponse (anomaly) |
| ListAnomalies | ListAnomaliesRequest (tenant_id, parking_lot_id, anomaly_type, resolved, pagination) | ListAnomaliesResponse (anomalies, pagination) |
| CreateAnomaly | CreateAnomalyRequest (tenant_id, parking_lot_id, transit_id, anomaly_type, description) | CreateAnomalyResponse (anomaly) |
| ResolveAnomaly | ResolveAnomalyRequest (anomaly_id, resolution, resolved_by) | ResolveAnomalyResponse (anomaly) |
| ListUnresolvedAnomalies | ListUnresolvedAnomaliesRequest (tenant_id, parking_lot_id, pagination) | ListUnresolvedAnomaliesResponse (anomalies, pagination) |

### 4.5 billing/v1 — 计费域（2 service, 11 RPCs）

**rule.proto → RuleService**:
| RPC | Request | Response |
|-----|---------|----------|
| GetRule | GetRuleRequest (rule_id) | GetRuleResponse (rule) |
| ListRules | ListRulesRequest (tenant_id, parking_lot_id, pagination) | ListRulesResponse (rules, pagination) |
| CreateRule | CreateRuleRequest (tenant_id, parking_lot_id, free_minutes, price_per_hour, daily_cap) | CreateRuleResponse (rule) |
| UpdateRule | UpdateRuleRequest (rule_id, free_minutes, price_per_hour, daily_cap) | UpdateRuleResponse (rule) |
| DeleteRule | DeleteRuleRequest (rule_id) | DeleteRuleResponse |
| GetDefaultRule | GetDefaultRuleRequest (parking_lot_id) | GetDefaultRuleResponse (rule) |

**calculator.proto → CalculatorService**:
| RPC | Request | Response |
|-----|---------|----------|
| CalculateFee | CalculateFeeRequest (parking_lot_id, plate_number, entry_time, exit_time) | CalculateFeeResponse (fee, rule_applied, duration_minutes) |
| CalculateBatch | CalculateBatchRequest (parking_lot_id, plates) | CalculateBatchResponse (results) |
| GetFeeDetail | GetFeeDetailRequest (transit_id) | GetFeeDetailResponse (fee, breakdown) |
| ValidateRule | ValidateRuleRequest (free_minutes, price_per_hour, daily_cap) | ValidateRuleResponse (valid, errors) |
| PreviewFee | PreviewFeeRequest (rule_id, entry_time, exit_time) | PreviewFeeResponse (fee, breakdown) |

### 4.6 payment/v1 — 支付域（3 service, 17 RPCs）

**order.proto → OrderService**:
| RPC | Request | Response |
|-----|---------|----------|
| GetOrder | GetOrderRequest (order_id) | GetOrderResponse (order) |
| ListOrders | ListOrdersRequest (tenant_id, status_filter, pagination) | ListOrdersResponse (orders, pagination) |
| CreateOrder | CreateOrderRequest (tenant_id, parking_lot_id, plate_number, amount, transit_id) | CreateOrderResponse (order) |
| CancelOrder | CancelOrderRequest (order_id) | CancelOrderResponse |
| GetOrderByPlate | GetOrderByPlateRequest (tenant_id, plate_number) | GetOrderByPlateResponse (order) |
| UpdateOrderStatus | UpdateOrderStatusRequest (order_id, status) | UpdateOrderStatusResponse (order) |

**payment.proto → PaymentService**:
| RPC | Request | Response |
|-----|---------|----------|
| CreatePayment | CreatePaymentRequest (order_id, payment_method) | CreatePaymentResponse (payment) |
| ProcessPayment | ProcessPaymentRequest (payment_id) | ProcessPaymentResponse (payment) |
| Refund | RefundRequest (payment_id, reason) | RefundResponse (payment) |
| GetPaymentStatus | GetPaymentStatusRequest (payment_id) | GetPaymentStatusResponse (payment) |
| ListPayments | ListPaymentsRequest (tenant_id, order_id, pagination) | ListPaymentsResponse (payments, pagination) |

**coupon.proto → CouponService**:
| RPC | Request | Response |
|-----|---------|----------|
| GetCoupon | GetCouponRequest (coupon_id) | GetCouponResponse (coupon) |
| ListCoupons | ListCouponsRequest (tenant_id, pagination) | ListCouponsResponse (coupons, pagination) |
| CreateCoupon | CreateCouponRequest (tenant_id, name, coupon_type, value, valid_from, valid_until, max_uses) | CreateCouponResponse (coupon) |
| UpdateCoupon | UpdateCouponRequest (coupon_id, name, value, valid_from, valid_until) | UpdateCouponResponse (coupon) |
| DeleteCoupon | DeleteCouponRequest (coupon_id) | DeleteCouponResponse |
| ApplyCoupon | ApplyCouponRequest (coupon_id, order_id) | ApplyCouponResponse (discounted_amount) |

### 4.7 bff/v1 — BFF 聚合层（3 service, 15 RPCs）

**monitor.proto → MonitorBffService**:
| RPC | Request | Response |
|-----|---------|----------|
| GetDashboard | GetDashboardRequest (tenant_id) | GetDashboardResponse (lots_summary, devices_summary, recent_alerts) |
| GetLotDetail | GetLotDetailRequest (parking_lot_id) | GetLotDetailResponse (lot, gates, devices, occupancy) |
| GetDeviceStatus | GetDeviceStatusRequest (tenant_id) | GetDeviceStatusResponse (devices, online_count, offline_count) |
| GetAlerts | GetAlertsRequest (tenant_id, parking_lot_id, pagination) | GetAlertsResponse (alerts, pagination) |
| GetStatistics | GetStatisticsRequest (tenant_id, start_date, end_date) | GetStatisticsResponse (total_entries, total_exits, revenue, avg_duration) |

**parking_lot.proto → ParkingLotBffService**:
| RPC | Request | Response |
|-----|---------|----------|
| GetLotDetail | GetLotDetailRequest (parking_lot_id) | GetLotDetailResponse (lot, gates, devices, billing_rule, occupancy) |
| ListLotsWithStats | ListLotsWithStatsRequest (tenant_id, pagination) | ListLotsWithStatsResponse (lots, pagination) |
| GetAvailableSpaces | GetAvailableSpacesRequest (parking_lot_id) | GetAvailableSpacesResponse (total, available, occupied) |
| GetLotGates | GetLotGatesRequest (parking_lot_id) | GetLotGatesResponse (gates, devices) |
| GetLotDevices | GetLotDevicesRequest (parking_lot_id) | GetLotDevicesResponse (devices, online_count, offline_count) |

**exit_flow.proto → ExitFlowBffService**:
| RPC | Request | Response |
|-----|---------|----------|
| GetExitFee | GetExitFeeRequest (parking_lot_id, plate_number) | GetExitFeeResponse (fee, entry_time, duration, order) |
| ConfirmPayment | ConfirmPaymentRequest (order_id, payment_method, coupon_id) | ConfirmPaymentResponse (payment, order) |
| ProcessExit | ProcessExitRequest (parking_lot_id, plate_number, gate_id) | ProcessExitResponse (transit, barrier_command) |
| GetExitRecord | GetExitRecordRequest (transit_id) | GetExitRecordResponse (transit, fee, payment) |
| RetryExit | RetryExitRequest (transit_id) | RetryExitResponse (transit, barrier_command) |

## 5. buf 配置更新

清理旧的 `api/proto/v1/.gitkeep`，现有 `buf.yaml` 保持不变（单模块模式，proto 包名提供逻辑分离）。

## 6. 验收标准

- [ ] 24 个 proto 文件全部创建
- [ ] `buf lint` 通过（0 errors, 0 warnings）
- [ ] `buf generate` 生成 Go 代码到 `internal/gen/`
- [ ] 每个 domain 至少 1 个 service + 5 个 RPC
- [ ] 所有 Request 包含 `tenant_id` 字段（平台级 API 除外）
- [ ] 字段命名遵循 target-architecture.md §4.2 规范
