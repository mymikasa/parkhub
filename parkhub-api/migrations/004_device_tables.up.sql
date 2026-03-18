-- 004_device_tables.up.sql
-- 设备管理模块：设备表、设备控制日志表

CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(36) PRIMARY KEY COMMENT '设备ID（序列号）',
    tenant_id VARCHAR(36) NOT NULL COMMENT '租户ID',
    name VARCHAR(50) COMMENT '设备名称（运维命名）',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '设备状态: pending, active, offline, disabled',
    firmware_version VARCHAR(20) COMMENT '固件版本',
    last_heartbeat DATETIME COMMENT '最后心跳时间',
    parking_lot_id VARCHAR(36) COMMENT '绑定停车场ID',
    gate_id VARCHAR(36) COMMENT '绑定出入口ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME COMMENT '软删除时间',

    KEY idx_tenant_id (tenant_id),
    KEY idx_status (status),
    KEY idx_parking_lot_id (parking_lot_id),
    KEY idx_gate_id (gate_id),
    KEY idx_deleted_at (deleted_at),
    CONSTRAINT fk_devices_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_devices_parking_lot FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE SET NULL,
    CONSTRAINT fk_devices_gate FOREIGN KEY (gate_id) REFERENCES gates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备表';

CREATE TABLE IF NOT EXISTS device_control_logs (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL COMMENT '租户ID',
    device_id VARCHAR(36) NOT NULL COMMENT '设备ID',
    operator_id VARCHAR(36) NOT NULL COMMENT '操作人ID',
    operator_name VARCHAR(50) COMMENT '操作人名称',
    command VARCHAR(20) NOT NULL COMMENT '控制指令: open_gate',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_tenant_id (tenant_id),
    KEY idx_device_id (device_id),
    KEY idx_created_at (created_at),
    CONSTRAINT fk_control_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_control_logs_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    CONSTRAINT fk_control_logs_operator FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备控制日志表';
