-- 005_billing_rules_tables.up.sql
-- 计费规则模块：计费规则表

-- 计费规则表
CREATE TABLE IF NOT EXISTS billing_rules (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL COMMENT '所属租户ID',
    parking_lot_id VARCHAR(36) NOT NULL COMMENT '所属停车场ID',
    free_minutes INT NOT NULL DEFAULT 15 COMMENT '免费时长（分钟），0-120',
    price_per_hour DECIMAL(10,2) NOT NULL DEFAULT 2.00 COMMENT '每小时单价（元），1-50',
    daily_cap DECIMAL(10,2) NOT NULL DEFAULT 20.00 COMMENT '每日封顶（元），0表示不封顶，0-500',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_parking_lot (parking_lot_id),
    KEY idx_tenant_id (tenant_id),
    CONSTRAINT fk_billing_rules_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_billing_rules_parking_lot FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='计费规则表';
