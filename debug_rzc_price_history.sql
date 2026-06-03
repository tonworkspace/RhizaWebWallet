-- ============================================================================
-- DEBUG: RZC Price History Investigation
-- ============================================================================

-- 1. Check if rzc_price_history table exists
SELECT 
  'Table Exists' as check_type,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'rzc_price_history'
  ) as result;

-- 2. Check if table has any data
SELECT 
  'Row Count' as check_type,
  COUNT(*) as result
FROM rzc_price_history;

-- 3. View all price history records
SELECT 
  'All Price History' as info,
  id,
  old_price,
  new_price,
  changed_by,
  changed_at,
  reason
FROM rzc_price_history
ORDER BY changed_at DESC;

-- 4. Check current RZC price in app_config
SELECT 
  'Current RZC Price (app_config)' as info,
  key,
  value as current_price
FROM app_config
WHERE key = 'RZC_PRICE';

-- 5. Check if trigger exists
SELECT 
  'Trigger Exists' as check_type,
  EXISTS (
    SELECT FROM pg_trigger 
    WHERE tgname = 'trigger_log_rzc_price_change'
  ) as result;

-- 6. Check rzc_config table (if it exists)
SELECT 
  'RZC Config Table' as info,
  key,
  value
FROM rzc_config
WHERE key = 'rzc_price_usd'
ORDER BY updated_at DESC
LIMIT 5;

-- 7. Get price from 24 hours ago (if data exists)
SELECT 
  'Price 24h Ago' as info,
  new_price,
  changed_at,
  AGE(NOW(), changed_at) as time_ago
FROM rzc_price_history
WHERE changed_at <= (NOW() - INTERVAL '24 hours')
ORDER BY changed_at DESC
LIMIT 1;

-- 8. Calculate what the change SHOULD be
WITH current_price AS (
  SELECT value::NUMERIC as price FROM app_config WHERE key = 'RZC_PRICE'
),
old_price AS (
  SELECT new_price as price
  FROM rzc_price_history
  WHERE changed_at <= (NOW() - INTERVAL '24 hours')
  ORDER BY changed_at DESC
  LIMIT 1
)
SELECT 
  'Calculated Change' as info,
  c.price as current_price,
  o.price as price_24h_ago,
  CASE 
    WHEN o.price IS NULL THEN 'No history data'
    WHEN o.price = 0 THEN 'Division by zero'
    ELSE ROUND(((c.price - o.price) / o.price * 100)::NUMERIC, 2)::TEXT || '%'
  END as change_24h
FROM current_price c
LEFT JOIN old_price o ON true;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- If table doesn't exist: Need to run update_rzc_price.sql
-- If table is empty: Need to manually insert initial price or wait for admin update
-- If no data from 24h ago: System is new, will show 0% until 24h of history exists
-- If trigger doesn't exist: Price changes won't be logged automatically
