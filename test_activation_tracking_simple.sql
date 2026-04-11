-- ============================================================================
-- Test Activation Tracking System (Simplified Version)
-- Works with basic wallet_activations schema (no metadata column required)
-- Run these queries in Supabase SQL Editor to verify the system is working
-- ============================================================================

-- ── 1. Check Recent Activations (Last 10) ──────────────────────────────────
SELECT 
  wa.id,
  wa.wallet_address,
  wu.name as user_name,
  wu.email,
  wa.activation_fee_usd,
  wa.activation_fee_ton,
  wa.ton_price_at_activation,
  wa.transaction_hash,
  wa.status,
  wa.completed_at,
  wa.created_at
FROM wallet_activations wa
LEFT JOIN wallet_users wu ON wa.wallet_address = wu.wallet_address
ORDER BY wa.completed_at DESC NULLS LAST
LIMIT 10;

-- ── 2. Count Total Activations ─────────────────────────────────────────────
SELECT 
  COUNT(*) as total_activations,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN transaction_hash IS NULL THEN 1 END) as no_tx_hash,
  COUNT(CASE WHEN transaction_hash IS NOT NULL THEN 1 END) as with_tx_hash,
  COUNT(CASE WHEN activation_fee_usd = 0 THEN 1 END) as zero_fee
FROM wallet_activations;

-- ── 3. Revenue Summary ─────────────────────────────────────────────────────
SELECT 
  COUNT(*) as total_paid_activations,
  SUM(activation_fee_usd) as total_revenue_usd,
  SUM(activation_fee_ton) as total_revenue_ton,
  AVG(activation_fee_usd) as avg_payment_usd,
  AVG(ton_price_at_activation) as avg_ton_price,
  MIN(activation_fee_usd) as min_payment,
  MAX(activation_fee_usd) as max_payment
FROM wallet_activations
WHERE transaction_hash IS NOT NULL
  AND status = 'completed'
  AND activation_fee_usd > 0;

-- ── 4. Today's Activations ─────────────────────────────────────────────────
SELECT 
  COUNT(*) as activations_today,
  SUM(activation_fee_usd) as revenue_today_usd,
  SUM(activation_fee_ton) as revenue_today_ton,
  COUNT(CASE WHEN transaction_hash IS NOT NULL THEN 1 END) as paid_activations,
  COUNT(CASE WHEN transaction_hash IS NULL THEN 1 END) as admin_activations
FROM wallet_activations
WHERE DATE(completed_at) = CURRENT_DATE
  AND status = 'completed';

-- ── 5. Activations by Date (Last 7 Days) ──────────────────────────────────
SELECT 
  DATE(completed_at) as activation_date,
  COUNT(*) as count,
  SUM(activation_fee_usd) as revenue_usd,
  SUM(activation_fee_ton) as revenue_ton,
  COUNT(CASE WHEN transaction_hash IS NOT NULL THEN 1 END) as paid,
  COUNT(CASE WHEN transaction_hash IS NULL THEN 1 END) as admin
FROM wallet_activations
WHERE completed_at >= CURRENT_DATE - INTERVAL '7 days'
  AND status = 'completed'
GROUP BY DATE(completed_at)
ORDER BY activation_date DESC;

-- ── 6. Find Specific User Activation ──────────────────────────────────────
-- Replace {last_8_chars} with actual address suffix
SELECT 
  wa.*,
  wu.name,
  wu.email,
  wu.is_activated,
  wu.activated_at as user_activated_at,
  wu.rzc_balance
FROM wallet_activations wa
LEFT JOIN wallet_users wu ON wa.wallet_address = wu.wallet_address
WHERE wa.wallet_address ILIKE '%{last_8_chars}%'
ORDER BY wa.completed_at DESC;

-- ── 7. Verify Transaction Hashes ──────────────────────────────────────────
SELECT 
  wallet_address,
  activation_fee_usd,
  activation_fee_ton,
  transaction_hash,
  completed_at,
  CASE 
    WHEN transaction_hash IS NULL AND activation_fee_usd = 0 THEN '🔧 Admin activation (no payment)'
    WHEN transaction_hash IS NULL THEN '⚠️ Missing tx hash (paid activation)'
    WHEN transaction_hash LIKE 'manual_%' THEN '📝 Manual tx hash'
    WHEN transaction_hash LIKE 'TEST_%' THEN '🧪 Test activation'
    ELSE '✅ Valid tx hash'
  END as tx_status
FROM wallet_activations
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 20;

-- ── 8. Admin/Manual Activations (No Payment or No TX Hash) ────────────────
SELECT 
  wa.wallet_address,
  wu.name,
  wa.activation_fee_usd,
  wa.activation_fee_ton,
  wa.transaction_hash,
  wa.completed_at,
  CASE 
    WHEN wa.transaction_hash IS NULL AND wa.activation_fee_usd = 0 THEN 'Admin Activated (Free)'
    WHEN wa.transaction_hash IS NULL THEN 'Payment Received (No TX Hash)'
    ELSE 'Other'
  END as activation_type
FROM wallet_activations wa
LEFT JOIN wallet_users wu ON wa.wallet_address = wu.wallet_address
WHERE wa.transaction_hash IS NULL 
   OR wa.activation_fee_usd = 0
ORDER BY wa.completed_at DESC;

-- ── 9. Payment Method Breakdown ────────────────────────────────────────────
SELECT 
  CASE 
    WHEN transaction_hash IS NULL AND activation_fee_usd = 0 THEN 'Admin Activated (Free)'
    WHEN transaction_hash IS NULL THEN 'Manual Payment (No TX Hash)'
    WHEN transaction_hash LIKE 'manual_%' THEN 'Manual Payment'
    WHEN transaction_hash LIKE 'TEST_%' THEN 'Test Activation'
    ELSE 'Auto Payment'
  END as payment_method,
  COUNT(*) as count,
  SUM(activation_fee_usd) as total_usd,
  AVG(activation_fee_usd) as avg_usd,
  SUM(activation_fee_ton) as total_ton
FROM wallet_activations
WHERE status = 'completed'
GROUP BY payment_method
ORDER BY count DESC;

-- ── 10. Users Without Activation Record ───────────────────────────────────
-- Find users marked as activated but missing activation record
SELECT 
  wu.wallet_address,
  wu.name,
  wu.email,
  wu.is_activated,
  wu.activated_at,
  wu.activation_fee_paid
FROM wallet_users wu
LEFT JOIN wallet_activations wa ON wu.wallet_address = wa.wallet_address
WHERE wu.is_activated = true
  AND wa.id IS NULL
LIMIT 20;

-- ── 11. Duplicate Activations (Should be empty) ───────────────────────────
SELECT 
  wallet_address,
  COUNT(*) as activation_count,
  ARRAY_AGG(transaction_hash) as tx_hashes,
  ARRAY_AGG(completed_at ORDER BY completed_at) as dates,
  SUM(activation_fee_usd) as total_paid
FROM wallet_activations
GROUP BY wallet_address
HAVING COUNT(*) > 1
ORDER BY activation_count DESC;

-- ── 12. Recent Activations with Full User Context ─────────────────────────
-- This is what the Admin Panel displays
SELECT 
  wa.id,
  wa.wallet_address,
  wu.name,
  wu.email,
  wu.rzc_balance,
  wa.activation_fee_usd,
  wa.activation_fee_ton,
  wa.ton_price_at_activation,
  wa.transaction_hash,
  wa.status,
  wa.completed_at,
  wa.created_at,
  CASE 
    WHEN wa.transaction_hash IS NULL THEN 'Admin'
    ELSE SUBSTRING(wa.transaction_hash, 1, 8) || '...'
  END as tx_display
FROM wallet_activations wa
INNER JOIN wallet_users wu ON wa.wallet_address = wu.wallet_address
ORDER BY wa.completed_at DESC NULLS LAST
LIMIT 20;

-- ============================================================================
-- Additional Useful Queries
-- ============================================================================

-- ── 13. Hourly Activation Rate (Today) ────────────────────────────────────
SELECT 
  EXTRACT(HOUR FROM completed_at) as hour,
  COUNT(*) as activations,
  SUM(activation_fee_usd) as revenue_usd
FROM wallet_activations
WHERE DATE(completed_at) = CURRENT_DATE
GROUP BY EXTRACT(HOUR FROM completed_at)
ORDER BY hour;

-- ── 14. Average Time Between Activations ──────────────────────────────────
WITH activation_times AS (
  SELECT 
    completed_at,
    LAG(completed_at) OVER (ORDER BY completed_at) as prev_activation
  FROM wallet_activations
  WHERE status = 'completed'
)
SELECT 
  AVG(EXTRACT(EPOCH FROM (completed_at - prev_activation))) / 60 as avg_minutes_between,
  MIN(EXTRACT(EPOCH FROM (completed_at - prev_activation))) / 60 as min_minutes_between,
  MAX(EXTRACT(EPOCH FROM (completed_at - prev_activation))) / 60 as max_minutes_between
FROM activation_times
WHERE prev_activation IS NOT NULL;

-- ── 15. Top Payment Amounts ────────────────────────────────────────────────
SELECT 
  activation_fee_usd,
  activation_fee_ton,
  COUNT(*) as frequency,
  ARRAY_AGG(wallet_address) as wallets
FROM wallet_activations
WHERE activation_fee_usd > 0
GROUP BY activation_fee_usd, activation_fee_ton
ORDER BY frequency DESC, activation_fee_usd DESC
LIMIT 10;

-- ============================================================================
-- Performance Check
-- ============================================================================

-- Check if indexes exist for fast queries
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'wallet_activations'
ORDER BY indexname;

-- ============================================================================
-- Recommended Indexes (if not present)
-- ============================================================================

-- Uncomment and run these if indexes don't exist:

/*
CREATE INDEX IF NOT EXISTS idx_wallet_activations_wallet_address 
  ON wallet_activations(wallet_address);

CREATE INDEX IF NOT EXISTS idx_wallet_activations_completed_at 
  ON wallet_activations(completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_activations_status 
  ON wallet_activations(status);

CREATE INDEX IF NOT EXISTS idx_wallet_activations_transaction_hash 
  ON wallet_activations(transaction_hash) 
  WHERE transaction_hash IS NOT NULL;
*/

-- ============================================================================
-- Expected Results Summary
-- ============================================================================
/*
Query 1:  Should show recent activations with user details
Query 2:  Should show counts of different activation types
Query 3:  Should show total revenue from paid activations
Query 4:  Should show today's activation count and revenue
Query 5:  Should show daily breakdown for last 7 days
Query 6:  Should find specific user's activation (replace placeholder)
Query 7:  Should verify all tx hashes and categorize them
Query 8:  Should show admin/manual activations
Query 9:  Should break down by payment method
Query 10: Should be empty (all activated users have records)
Query 11: Should be empty (no duplicate activations)
Query 12: Should match what Admin Panel displays
Query 13: Shows hourly distribution of activations today
Query 14: Shows average time between activations
Query 15: Shows most common payment amounts
*/
