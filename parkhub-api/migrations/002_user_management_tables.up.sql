-- 002_user_management_tables.up.sql
-- 用户管理模块：登录日志、审计日志、用户表扩展

-- 登录日志表
CREATE TABLE IF NOT EXISTS login_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    ip VARCHAR(45) DEFAULT NULL COMMENT '登录IP',
    user_agent VARCHAR(500) DEFAULT NULL COMMENT '浏览器UA',
    status VARCHAR(20) NOT NULL COMMENT 'success, failed',
    reason VARCHAR(255) DEFAULT NULL COMMENT '失败原因',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_user_id (user_id),
    KEY idx_created_at (created_at),
    CONSTRAINT fk_login_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='登录日志表';

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL COMMENT '操作人',
    tenant_id VARCHAR(36) DEFAULT NULL COMMENT '操作人所属租户',
    action VARCHAR(50) NOT NULL COMMENT '操作类型',
    target_type VARCHAR(50) NOT NULL COMMENT '目标类型: user, tenant',
    target_id VARCHAR(36) NOT NULL COMMENT '目标ID',
    detail JSON DEFAULT NULL COMMENT '操作详情',
    ip VARCHAR(45) DEFAULT NULL COMMENT '操作IP',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_user_id (user_id),
    KEY idx_tenant_id (tenant_id),
    KEY idx_action (action),
    KEY idx_created_at (created_at),
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计日志表';

-- 用户表增加 created_by 列
ALTER TABLE users ADD COLUMN created_by VARCHAR(36) DEFAULT NULL COMMENT '创建者ID' AFTER status;
