-- ============================================================================
-- QUICK CHECK: RZC Price History Status
-- ============================================================================
-- Run this to quickly diagnose why RZC percentage is showing 0.00%
-- ============================================================================

-- 1. Does table exist?
SELECT 
  '❓ Table Exists?' as question,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rzc_price_history')
    THEN '✅ YES'
    ELSE '❌ NO - Run fix_rzc_price_history_complete.sql'
  END as answer;

-- 2. Does table have any data?
SELECT 
  '❓ Has Data?' as question,
  CASE 
    WHEN (SELECT COUNT(*) FROM rzc_price_history) > 0
    THEN '✅ YES (' || (SELECT COUNT(*) FROM rzc_price_history) || ' records)'
    ELSE '❌ NO - Run fix_rzc_price_history_complete.sql'
  END as answer;

-- 3. Does table have data from 24h ago?
SELECT 
  '❓ Has 24h History?' as question,
  CASE 
    WHEN (SELECT COUNT(*) FROM rzc_price_history WHERE changed_at <= NOW() - INTERVAL '24 hours') > 0
    THEN '✅ YES (' || (SELECT COUNT(*) FROM rzc_price_history WHERE changed_at <= NOW() - INTERVAL '24 hours') || ' records)'
    ELSE '❌ NO - Run fix_rzc_price_history_complete.sql'
  END as answer;

-- 4. What would the 24h change be?
WITH current_price AS (
  SELECT value::NUMERIC as price FROM app_config WHERE key = 'RZC_PRICE'
),
price_24h_ago AS (
  SELECT new_price as price
  FROM rzc_price_history
  WHERE changed_at <= (NOW() - INTERVAL '24 hours')
  ORDER BY changed_at DESC
  LIMIT 1
)
SELECT 
  '❓ Calculated Change?' as question,
  CASE 
    WHEN p.price IS NULL THEN '❌ NO DATA - Run fix_rzc_price_history_complete.sql'
    WHEN p.price = 0 THEN '❌ INVALID (division by zero)'
    ELSE '✅ ' || ROUND(((c.price - p.price) / p.price * 100)::NUMERIC, 2)::TEXT || '% (from $' || p.price || ' to $' || c.price || ')'
  END as answer
FROM current_price c
LEFT JOIN price_24h_ago p ON true;

-- 5. Show recent price history
SELECT 
  '📊 Recent Price History' as info,
  new_price as price,
  changed_at,
  AGE(NOW(), changed_at) as time_ago
FROM rzc_price_history
ORDER BY changed_at DESC
LIMIT 5;

-- ============================================================================
-- INTERPRETATION:
-- ============================================================================
-- If ANY answer is ❌ NO: Run fix_rzc_price_history_complete.sql
-- If ALL answers are ✅ YES: Check browser console for service logs
-- ============================================================================
