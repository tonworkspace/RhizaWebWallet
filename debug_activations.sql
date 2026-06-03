-- ============================================================================
-- Debug Activations - Check Why No Activations Are Showing
-- ============================================================================

-- ── 1. Check if wallet_activations table exists ─────────────────────────────
SELECT 
  '1. Table Exists?' as check_type,
  tablename,
  schemaname
FROM pg_tables 
WHERE tablename = 'wallet_activations';

-- ── 2. Count total records in wallet_activations ────────────────────────────
SELECT 
  '2. Total Activations' as check_type,
  COUNT(*) as total_count
FROM wallet_activations;

-- ── 3. Check activated users in wallet_users ────────────────────────────────
SELECT 
  '3. Activated Users' as check_type,
  COUNT(*) as activated_count
FROM wallet_users 
WHERE is_activated = true;

-- ── 4. Sample activation records ────────────────────────────────────────────
SELECT 
  '4. Sample Activations' as check_type,
  id,
  wallet_address,
  activation_fee_usd,
  activation_fee_ton,
  status,
  completed_at,
  created_at
FROM wallet_activations 
ORDER BY created_at DESC 
LIMIT 5;

-- ── 5. Check if there's a foreign key relationship ──────────────────────────
SELECT 
  '5. Foreign Keys' as check_type,
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table
FROM pg_constraint 
WHERE conrelid = 'wallet_activations'::regclass 
  AND contype = 'f';

-- ── 6. Try the exact query from adminService ────────────────────────────────
SELECT 
  '6. Admin Query Test' as check_type,
  wa.id,
  wa.wallet_address,
  wa.activation_fee_usd,
  wa.activation_fee_ton,
  wa.status,
  wa.completed_at,
  wa.created_at,
  wu.name,
  wu.email,
  wu.rzc_balance
FROM wallet_activations wa
LEFT JOIN wallet_users wu ON wa.wallet_address = wu.wallet_address
ORDER BY wa.completed_at DESC NULLS LAST
LIMIT 10;

-- ── 7. Check for users with is_activated but no activation record ───────────
SELECT 
  '7. Activated Users Without Records' as check_type,
  wu.wallet_address,
  wu.name,
  wu.is_activated,
  wu.activated_at,
  wa.id as activation_record_id
FROM wallet_users wu
LEFT JOIN wallet_activations wa ON wu.wallet_address = wa.wallet_address
WHERE wu.is_activated = true
  AND wa.id IS NULL
LIMIT 10;

-- ── 8. Check table structure ────────────────────────────────────────────────
SELECT 
  '8. Table Columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'wallet_activations'
ORDER BY ordinal_position;

-- ============================================================================
-- SOLUTION: If wallet_activations is empty but users are activated
-- ============================================================================

/*
If you have activated users but no activation records, you need to:

OPTION 1: Create activation records for existing activated users
*/

INSERT INTO wallet_activations (
  wallet_address,
  user_id,
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
  id as user_id,
  COALESCE(activation_fee_paid, 0) as activation_fee_usd,
  COALESCE(activation_fee_paid, 0) as activation_fee_ton,
  5.0 as ton_price_at_activation, -- Estimate
  NULL as transaction_hash,
  'completed' as status,
  COALESCE(activated_at, created_at) as completed_at,
  COALESCE(activated_at, created_at) as created_at
FROM wallet_users
WHERE is_activated = true
  AND wallet_address NOT IN (
    SELECT wallet_address FROM wallet_activations
  );

/*
OPTION 2: Show activated users instead of activation records
This would require modifying the query to use wallet_users table
*/

-- Alternative query using wallet_users:
SELECT 
  id,
  wallet_address,
  name,
  email,
  is_activated,
  activated_at,
  activation_fee_paid,
  created_at
FROM wallet_users
WHERE is_activated = true
ORDER BY activated_at DESC NULLS LAST
LIMIT 20;

-- ============================================================================
-- Verification After Fix
-- ============================================================================

-- Check that activation records were created
SELECT 
  'Verification' as check_type,
  COUNT(*) as activation_records,
  COUNT(DISTINCT wallet_address) as unique_users
FROM wallet_activations;

-- Check the join works
SELECT 
  wa.wallet_address,
  wa.status,
  wa.completed_at,
  wu.name,
  wu.email
FROM wallet_activations wa
LEFT JOIN wallet_users wu ON wa.wallet_address = wu.wallet_address
ORDER BY wa.completed_at DESC
LIMIT 5;
