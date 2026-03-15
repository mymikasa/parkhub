-- 001_init_auth_tables.down.sql
-- ParkHub 认证相关表回滚

DROP TABLE IF EXISTS sms_codes;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;
