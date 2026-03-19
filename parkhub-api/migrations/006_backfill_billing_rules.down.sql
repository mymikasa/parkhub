-- 006_backfill_billing_rules.down.sql
-- 回滚：删除由 backfill 插入的计费规则（无法精确区分，删除所有使用默认值的记录）
-- 注意：如果用户已修改过规则参数，这些记录不会被误删

DELETE FROM billing_rules
WHERE free_minutes = 15
  AND price_per_hour = 2.00
  AND daily_cap = 20.00;
