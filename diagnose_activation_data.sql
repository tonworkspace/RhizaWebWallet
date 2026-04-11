-- ============================================================================
-- Diagnose Activation Data - Find out why no activations are showing
-- Run these queries one by one to identify the issue
-- ============================================================================

-- ── 1. Check if wallet_activations table exists ────────────────────────────
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'wallet_activations'
) as table_exists;

-- ── 2. Count total records in wallet_activations ───────────────────────────
SELECT COUNT(*) as total_activations
FROM wallet_activations;

-- ── 3. Show first 5 activations (if any exist) ─────────────────────────────
SELECT 
  id,
  wallet_address,
  activation_fee_usd,
  activation_fee_ton,
  transaction_hash,
  status,
  completed_at,
  created_at
FROM wallet_activations
ORDER BY created_at DESC
LIMIT 5;

-- ── 4. Check if wallet_users table has activated users ─────────────────────
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN is_activated = true THEN 1 END) as activated_users,
  COUNT(CASE WHEN is_activated = false THEN 1 END) as not_activated_users
FROM wallet_users;

-- ── 5. Show activated users without activation records ─────────────────────
SELECT 
  wu.wallet_address,
  wu.name,
  wu.is_activated,
  wu.activated_at,
  wu.activation_fee_paid,
  wa.id as activation_record_id
FROM wallet_users wu
LEFT JOIN wallet_activations wa ON wu.wallet_address = wa.wallet_address
WHERE wu.is_activated = true
LIMIT 10;

-- ── 6. Check the JOIN query that Admin Panel uses ──────────────────────────
SELECT 
  wa.id,
  wa.wallet_address,
  wa.activation_fee_usd,
  wa.activation_fee_ton,
  wa.transaction_hash,
  wa.status,
  wa.completed_at,
  wu.name,
  wu.email
FROM wallet_activations wa
LEFT JOIN wallet_users wu ON wa.wallet_address = wu.wallet_address
ORDER BY wa.completed_at DESC NULLS LAST
LIMIT 5;

-- ============================================================================
-- DIAGNOSIS RESULTS
-- ============================================================================

/*
SCENARIO 1: Query 2 returns 0
- No activation records exist in wallet_activations table
- This is normal if no one has activated yet
- Solution: Wait for users to activate, or create test data

SCENARIO 2: Query 2 returns > 0, but Query 6 returns nothing
- Activation records exist but JOIN is failing
- Possible cause: wallet_address mismatch (EQ vs UQ format)
- Solution: Check address formats in both tables

SCENARIO 3: Query 5 shows activated users without activation records
- Users were activated before wallet_activations table was created
- Or activation records were not created properly
- Solution: Run migration to create missing records (see below)

SCENARIO 4: Query 6 returns data but Admin Panel shows blank
- Data exists and JOIN works
- Issue is in the frontend code
- Solution: Check browser console for errors
*/

-- ============================================================================
-- SOLUTION: Create Missing Activation Records (if needed)
-- ============================================================================

-- Run this ONLY if Query 5 shows users without activation records:

/*
INSERT INTO wallet_activations (
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
  wallet_address,
  COALESCE(activation_fee_paid * 2.45, 18.00) as activation_fee_usd,
  COALESCE(activation_fee_paid, 7.35) as activation_fee_ton,
  2.45 as ton_price_at_activation,
  NULL as transaction_hash,
  'completed' as status,
  COALESCE(activated_at, created_at) as completed_at,
  created_at
FROM wallet_users
WHERE is_activated = true
  AND wallet_address NOT IN (
    SELECT wallet_address FROM wallet_activations
  );
*/

-- ============================================================================
-- TEST DATA: Create Sample Activation (for testing)
-- ============================================================================

-- Run this to create a test activation record:

/*
INSERT INTO wallet_activations (
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
  wallet_address,
  18.00,
  7.3469,
  2.45,
  'TEST_' || gen_random_uuid()::text,
  'completed',
  NOW(),
  NOW()
FROM wallet_users
WHERE is_activated = true
LIMIT 1
ON CONFLICT DO NOTHING;
*/

-- Verify the test record was created:
-- SELECT * FROM wallet_activations ORDER BY created_at DESC LIMIT 1;
