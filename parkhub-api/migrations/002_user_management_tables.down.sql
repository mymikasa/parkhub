-- 002_user_management_tables.down.sql

ALTER TABLE users DROP COLUMN created_by;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS login_logs;
