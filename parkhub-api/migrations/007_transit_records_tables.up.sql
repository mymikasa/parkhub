-- 007_transit_records_tables.up.sql
-- 通行记录模块：通行记录表

-- 通行记录表
CREATE TABLE IF NOT EXISTS transit_records (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL COMMENT '所属租户ID',
    parking_lot_id VARCHAR(36) NOT NULL COMMENT '所属停车场ID',
    gate_id VARCHAR(36) NOT NULL COMMENT '出入口ID',
    plate_number VARCHAR(20) DEFAULT NULL COMMENT '车牌号（识别失败时为空）',
    type ENUM('entry', 'exit') NOT NULL COMMENT '通行类型：入场/出场',
    status ENUM('normal', 'paid', 'no_exit', 'no_entry', 'recognition_failed') NOT NULL DEFAULT 'normal' COMMENT '状态：正常/已缴费/有入无出/有出无入/识别失败',
    image_url VARCHAR(512) DEFAULT NULL COMMENT '抓拍图片URL',
    fee DECIMAL(10,2) DEFAULT NULL COMMENT '费用（仅出场记录）',
    entry_record_id VARCHAR(36) DEFAULT NULL COMMENT '出场记录关联的入场记录ID',
    parking_duration INT DEFAULT NULL COMMENT '停车时长（分钟，仅出场记录）',
    remark TEXT DEFAULT NULL COMMENT '异常处理备注',
    resolved_at TIMESTAMP NULL DEFAULT NULL COMMENT '异常处理时间',
    resolved_by VARCHAR(36) DEFAULT NULL COMMENT '异常处理人ID',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '通行时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY idx_tenant_id (tenant_id),
    KEY idx_parking_lot_plate (parking_lot_id, plate_number, type, created_at),
    KEY idx_status (tenant_id, status),
    KEY idx_created_at (tenant_id, created_at DESC),
    UNIQUE KEY uk_entry_record_id (entry_record_id),
    CONSTRAINT fk_transit_records_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_transit_records_parking_lot FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE,
    CONSTRAINT fk_transit_records_gate FOREIGN KEY (gate_id) REFERENCES gates(id) ON DELETE CASCADE,
    CONSTRAINT fk_transit_records_entry FOREIGN KEY (entry_record_id) REFERENCES transit_records(id) ON DELETE SET NULL,
    CONSTRAINT fk_transit_records_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通行记录表';
