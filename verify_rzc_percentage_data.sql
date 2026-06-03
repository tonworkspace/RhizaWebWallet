-- ============================================================================
-- DIAGNOSTIC: Verify RZC Percentage Change Data
-- ============================================================================
-- Run this to check if the database has the data needed for percentage display
-- ============================================================================

-- STEP 1: Check current RZC price in rzc_config
-- ============================================================================
SELECT 
  '📊 STEP 1: Current RZC Price' as check_name,
  key,
  value as price_value,
  value::NUMERIC as price_numeric,
  updated_by,
  updated_at
FROM rzc_config
WHERE key = 'RZC_PRICE';

-- STEP 2: Check if rzc_price_history table exists and has data
-- ============================================================================
SELECT 
  '📊 STEP 2: Price History Records' as check_name,
  COUNT(*) as total_records,
  MIN(changed_at) as oldest_record,
  MAX(changed_at) as newest_record,
  MAX(changed_at) > (NOW() - INTERVAL '24 hours') as has_recent_data
FROM rzc_price_history;

-- STEP 3: Show all price history records
-- ============================================================================
SELECT 
  '📊 STEP 3: All Price History' as check_name,
  id,
  old_price,
  new_price,
  ROUND(((new_price - old_price) / NULLIF(old_price, 0) * 100)::NUMERIC, 2) as change_percent,
  changed_by,
  changed_at,
  AGE(NOW(), changed_at) as time_ago,
  reason
FROM rzc_price_history
ORDER BY changed_at DESC;

-- STEP 4: Calculate 24h change (exactly what the service does)
-- ============================================================================
WITH current_price AS (
  SELECT value::NUMERIC as price 
  FROM rzc_config 
  WHERE key = 'RZC_PRICE'
),
price_24h_ago AS (
  SELECT new_price as price
  FROM rzc_price_history
  WHERE changed_at <= (NOW() - INTERVAL '24 hours')
  ORDER BY changed_at DESC
  LIMIT 1
)
SELECT 
  '📊 STEP 4: Calculated 24h Change' as check_name,
  c.price as current_price,
  p.price as price_24h_ago,
  CASE 
    WHEN p.price IS NULL THEN 'NO DATA - Need records older than 24h'
    WHEN p.price = 0 THEN 'ERROR - Division by zero'
    ELSE ROUND(((c.price - p.price) / p.price * 100)::NUMERIC, 2)::TEXT || '%'
  END as change_24h,
  CASE 
    WHEN p.price IS NULL THEN '❌ FAIL'
    WHEN p.price = 0 THEN '❌ FAIL'
    ELSE '✅ PASS'
  END as status
FROM current_price c
LEFT JOIN price_24h_ago p ON true;

-- STEP 5: Check trigger exists and is enabled
-- ============================================================================
SELECT 
  '📊 STEP 5: Trigger Status' as check_name,
  tgname as trigger_name,
  CASE tgenabled 
    WHEN 'O' THEN '✅ Enabled'
    WHEN 'D' THEN '❌ Disabled'
    ELSE '⚠️ Unknown'
  END as status,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname = 'trigger_log_rzc_price_change';

-- STEP 6: Check function exists
-- ============================================================================
SELECT 
  '📊 STEP 6: Function Status' as check_name,
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'log_rzc_price_change';

-- ============================================================================
-- EXPECTED RESULTS FOR WORKING SYSTEM:
-- ============================================================================
-- STEP 1: Should show RZC_PRICE with a numeric value (e.g., 0.0015)
-- STEP 2: Should show at least 6 records, oldest should be ~30 days ago
-- STEP 3: Should show 6 backfilled records with timestamps spread over 30 days
-- STEP 4: Should show a percentage (e.g., +5.26%) with status ✅ PASS
-- STEP 5: Should show trigger exists and is ✅ Enabled
-- STEP 6: Should show function exists with full definition
-- ============================================================================

-- ============================================================================
-- TROUBLESHOOTING:
-- ============================================================================
-- If STEP 4 shows "NO DATA - Need records older than 24h":
--   → The backfill didn't work or records are too recent
--   → Run the backfill section from fix_rzc_price_history_trigger.sql again
--
-- If STEP 1 shows no results:
--   → RZC_PRICE key doesn't exist in rzc_config
--   → Check the key name (should be uppercase 'RZC_PRICE')
--
-- If STEP 2 shows 0 records:
--   → Price history table is empty
--   → Run the backfill section from fix_rzc_price_history_trigger.sql
--
-- If STEP 5 or 6 shows no results:
--   → Trigger or function wasn't created
--   → Re-run fix_rzc_price_history_trigger.sql
-- ============================================================================
