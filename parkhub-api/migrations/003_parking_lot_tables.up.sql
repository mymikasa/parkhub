-- 003_parking_lot_tables.up.sql
-- 停车场管理模块：停车场表、出入口表

-- 停车场表
CREATE TABLE IF NOT EXISTS parking_lots (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL COMMENT '所属租户ID',
    name VARCHAR(50) NOT NULL COMMENT '车场名称',
    address VARCHAR(100) NOT NULL COMMENT '车场地址',
    total_spaces INT NOT NULL COMMENT '总车位数',
    available_spaces INT NOT NULL COMMENT '剩余车位',
    lot_type VARCHAR(20) NOT NULL DEFAULT 'underground' COMMENT '车场类型: underground, ground, stereo',
    status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '运营状态: active, inactive',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY idx_tenant_id (tenant_id),
    UNIQUE KEY uk_tenant_name (tenant_id, name),
    CONSTRAINT fk_parking_lots_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='停车场表';

-- 出入口表
CREATE TABLE IF NOT EXISTS gates (
    id VARCHAR(36) PRIMARY KEY,
    parking_lot_id VARCHAR(36) NOT NULL COMMENT '所属停车场ID',
    name VARCHAR(20) NOT NULL COMMENT '出入口名称',
    type VARCHAR(10) NOT NULL COMMENT '类型: entry, exit',
    device_id VARCHAR(36) DEFAULT NULL COMMENT '绑定设备ID',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY idx_parking_lot_id (parking_lot_id),
    KEY idx_device_id (device_id),
    UNIQUE KEY uk_lot_name (parking_lot_id, name),
    CONSTRAINT fk_gates_parking_lot FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='出入口表';
