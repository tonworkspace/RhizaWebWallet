-- ============================================================================
-- Test Activation Query - Verify Exact Response Structure
-- Run this to see what data the Admin Panel should receive
-- ============================================================================

-- ── 1. Simple count to verify data exists ─────────────────────────────────
SELECT COUNT(*) as total_activations
FROM wallet_activations;

-- ── 2. Check if wallet_users JOIN works ───────────────────────────────────
SELECT 
  wa.id,
  wa.wallet_address as activation_address,
  wu.wallet_address as user_address,
  wu.name,
  CASE 
    WHEN wu.wallet_address IS NULL THEN '❌ No user match'
    WHEN wa.wallet_address = wu.wallet_address THEN '✅ Exact match'
    ELSE '⚠️ Different addresses'
  END as match_status
FROM wallet_activations wa
LEFT JOIN wallet_users wu ON wa.wallet_address = wu.wallet_address
ORDER BY wa.completed_at DESC NULLS LAST
LIMIT 10;

-- ── 3. Full query that matches Admin Panel structure ──────────────────────
-- This simulates what Supabase returns
SELECT 
  wa.id,
  wa.wallet_address,
  wa.activation_fee_usd,
  wa.activation_fee_ton,
  wa.ton_price_at_activation,
  wa.transaction_hash,
  wa.status,
  wa.completed_at,
  wa.created_at,
  -- User details (this is what gets nested as wallet_users)
  json_build_object(
    'name', wu.name,
    'email', wu.email,
    'rzc_balance', wu.rzc_balance
  ) as wallet_users
FROM wallet_activations wa
LEFT JOIN wallet_users wu ON wa.wallet_address = wu.wallet_address
ORDER BY wa.completed_at DESC NULLS LAST
LIMIT 5;

-- ── 4. Check for address format mismatches ────────────────────────────────
WITH activation_prefixes AS (
  SELECT DISTINCT SUBSTRING(wallet_address, 1, 2) as prefix
  FROM wallet_activations
),
user_prefixes AS (
  SELECT DISTINCT SUBSTRING(wallet_address, 1, 2) as prefix
  FROM wallet_users
  WHERE is_activated = true
)
SELECT 
  'Activation prefixes' as source,
  STRING_AGG(prefix, ', ') as prefixes
FROM activation_prefixes
UNION ALL
SELECT 
  'User prefixes' as source,
  STRING_AGG(prefix, ', ') as prefixes
FROM user_prefixes;

-- ── 5. Find activations with no matching user ─────────────────────────────
SELECT 
  wa.wallet_address,
  wa.activation_fee_usd,
  wa.transaction_hash,
  wa.completed_at,
  '❌ No matching user record' as issue
FROM wallet_activations wa
LEFT JOIN wallet_users wu ON wa.wallet_address = wu.wallet_address
WHERE wu.wallet_address IS NULL
ORDER BY wa.completed_at DESC;

-- ── 6. Find users with no activation record ───────────────────────────────
SELECT 
  wu.wallet_address,
  wu.name,
  wu.is_activated,
  wu.activated_at,
  '⚠️ Activated but no activation record' as issue
FROM wallet_users wu
LEFT JOIN wallet_activations wa ON wu.wallet_address = wa.wallet_address
WHERE wu.is_activated = true
  AND wa.id IS NULL
LIMIT 10;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================

/*
Query 1: Should return total count > 0 (you said 5 records exist)

Query 2: Should show:
- ✅ Exact match for all rows (addresses match perfectly)
- If you see ❌ or ⚠️, there's an address mismatch issue

Query 3: Should return JSON structure that matches what Admin Panel expects:
{
  "id": "...",
  "wallet_address": "UQ...",
  "activation_fee_usd": 18.00,
  "activation_fee_ton": 7.35,
  "transaction_hash": "...",
  "status": "completed",
  "completed_at": "2024-...",
  "wallet_users": {
    "name": "John Doe",
    "email": "john@example.com",
    "rzc_balance": 1000
  }
}

Query 4: Should show same prefixes for both tables (e.g., both "EQ, UQ")
- If different, addresses need normalization

Query 5: Should be EMPTY (all activations have matching users)
- If not empty, some activations are orphaned

Query 6: Should be EMPTY (all activated users have activation records)
- If not empty, need to create missing activation records
*/

-- ============================================================================
-- QUICK FIX: Create missing activation records
-- ============================================================================

-- Run this ONLY if Query 6 shows missing records:

/*
INSERT INTO wallet_activations (
  user_id,
  wallet_address,
  activation_fee_usd,
  activation_fee_ton,
  ton_price_at_activation,
  transaction_hash,
  status,
  completed_at,
  created_at
)
SELECT 
  wu.id as user_id,
  wu.wallet_address,
  COALESCE(wu.activation_fee_paid * 2.45, 18.00) as activation_fee_usd,
  COALESCE(wu.activation_fee_paid, 7.35) as activation_fee_ton,
  2.45 as ton_price_at_activation,
  NULL as transaction_hash,
  'completed' as status,
  COALESCE(wu.activated_at, wu.created_at) as completed_at,
  wu.created_at
FROM wallet_users wu
LEFT JOIN wallet_activations wa ON wu.wallet_address = wa.wallet_address
WHERE wu.is_activated = true
  AND wa.id IS NULL;
*/

-- Verify records were created:
-- SELECT COUNT(*) FROM wallet_activations;

