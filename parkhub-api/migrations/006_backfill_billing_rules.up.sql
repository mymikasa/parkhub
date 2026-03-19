-- 006_backfill_billing_rules.up.sql
-- 为已有停车场补建默认计费规则（存量数据兼容）

INSERT INTO billing_rules (id, tenant_id, parking_lot_id, free_minutes, price_per_hour, daily_cap, created_at, updated_at)
SELECT
    UUID(),
    pl.tenant_id,
    pl.id,
    15,
    2.00,
    20.00,
    NOW(),
    NOW()
FROM parking_lots pl
LEFT JOIN billing_rules br ON br.parking_lot_id = pl.id
WHERE br.id IS NULL;
