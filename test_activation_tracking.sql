-- ============================================================================
-- Test Activation Tracking System
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
  COUNT(CASE WHEN transaction_hash IS NULL THEN 1 END) as admin_activated,
  COUNT(CASE WHEN transaction_hash IS NOT NULL THEN 1 END) as paid_activated
FROM wallet_activations;

-- ── 3. Revenue Summary ─────────────────────────────────────────────────────
SELECT 
  COUNT(*) as total_paid_activations,
  SUM(activation_fee_usd) as total_revenue_usd,
  SUM(activation_fee_ton) as total_revenue_ton,
  AVG(activation_fee_usd) as avg_payment_usd,
  AVG(ton_price_at_activation) as avg_ton_price
FROM wallet_activations
WHERE transaction_hash IS NOT NULL
  AND status = 'completed';

-- ── 4. Today's Activations ─────────────────────────────────────────────────
SELECT 
  COUNT(*) as activations_today,
  SUM(activation_fee_usd) as revenue_today_usd,
  SUM(activation_fee_ton) as revenue_today_ton
FROM wallet_activations
WHERE DATE(completed_at) = CURRENT_DATE
  AND status = 'completed';

-- ── 5. Activations by Date (Last 7 Days) ──────────────────────────────────
SELECT 
  DATE(completed_at) as activation_date,
  COUNT(*) as count,
  SUM(activation_fee_usd) as revenue_usd,
  SUM(activation_fee_ton) as revenue_ton
FROM wallet_activations
WHERE completed_at >= CURRENT_DATE - INTERVAL '7 days'
  AND status = 'completed'
GROUP BY DATE(completed_at)
ORDER BY activation_date DESC;

-- ── 6. Find Specific User Activation ──────────────────────────────────────
-- Replace {wallet_address} with actual address
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
-- Check if all completed activations have transaction hashes
SELECT 
  wallet_address,
  activation_fee_usd,
  activation_fee_ton,
  transaction_hash,
  completed_at,
  CASE 
    WHEN transaction_hash IS NULL THEN '⚠️ Missing tx hash'
    WHEN transaction_hash LIKE 'manual_%' THEN '🔧 Manual activation'
    ELSE '✅ Valid tx hash'
  END as tx_status
FROM wallet_activations
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 20;

-- ── 8. Admin Activations (No Payment) ─────────────────────────────────────
-- Admin activations typically have no transaction hash or $0 payment
SELECT 
  wa.wallet_address,
  wu.name,
  wa.activation_fee_usd,
  wa.activation_fee_ton,
  wa.transaction_hash,
  wa.completed_at
FROM wallet_activations wa
LEFT JOIN wallet_users wu ON wa.wallet_address = wu.wallet_address
WHERE wa.transaction_hash IS NULL 
   OR wa.activation_fee_usd = 0
ORDER BY wa.completed_at DESC;

-- ── 9. Payment Method Breakdown ────────────────────────────────────────────
SELECT 
  CASE 
    WHEN transaction_hash IS NULL THEN 'Admin Activated'
    WHEN transaction_hash LIKE 'manual_%' THEN 'Manual Payment'
    ELSE 'Auto Payment'
  END as payment_method,
  COUNT(*) as count,
  SUM(activation_fee_usd) as total_usd,
  AVG(activation_fee_usd) as avg_usd
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
  ARRAY_AGG(completed_at) as dates
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
-- Expected Results
-- ============================================================================
-- Query 1: Should show recent activations with user details
-- Query 2: Should show counts of different activation types
-- Query 3: Should show total revenue from paid activations
-- Query 4: Should show today's activation count and revenue
-- Query 5: Should show daily breakdown for last 7 days
-- Query 6: Should find specific user's activation (replace placeholder)
-- Query 7: Should verify all tx hashes are present
-- Query 8: Should show admin-activated users
-- Query 9: Should break down by payment method
-- Query 10: Should be empty (all activated users have records)
-- Query 11: Should be empty (no duplicate activations)
-- Query 12: Should match what Admin Panel displays

-- ============================================================================
-- Troubleshooting
-- ============================================================================

-- If Query 10 returns results:
-- Some users are marked as activated but missing activation records
-- Solution: Run the activation sync script or manually create records

-- If Query 11 returns results:
-- Some users have multiple activation records (shouldn't happen)
-- Solution: Investigate and remove duplicates, check RPC function

-- If Query 7 shows missing tx hashes:
-- Some activations don't have transaction hashes
-- Solution: Check if they're admin activations (expected) or payment failures

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

-- Recommended indexes (if not present):
-- CREATE INDEX IF NOT EXISTS idx_wallet_activations_wallet_address 
--   ON wallet_activations(wallet_address);
-- CREATE INDEX IF NOT EXISTS idx_wallet_activations_completed_at 
--   ON wallet_activations(completed_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_wallet_activations_status 
--   ON wallet_activations(status);
