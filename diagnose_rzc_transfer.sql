-- ============================================================================
-- RZC TRANSFER DIAGNOSTICS
-- Run this in Supabase SQL editor to find why transfer_rzc is failing
-- ============================================================================

-- 1. Check rzc_transactions table exists
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'rzc_transactions'
  ) THEN '✅ rzc_transactions table EXISTS' 
  ELSE '❌ rzc_transactions table MISSING — this is the problem!' 
  END AS check_1;

-- 2. Check transfer_rzc function exists
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines WHERE routine_name = 'transfer_rzc'
  ) THEN '✅ transfer_rzc function EXISTS' 
  ELSE '❌ transfer_rzc function MISSING' 
  END AS check_2;

-- 3. Check ALL users' lock status + balance
SELECT 
  name,
  wallet_address,
  rzc_balance,
  COALESCE(balance_locked, true) AS balance_locked,
  COALESCE(balance_verified, false) AS balance_verified
FROM wallet_users
ORDER BY created_at DESC
LIMIT 20;

-- 4. Check rzc_transactions columns (if table exists)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rzc_transactions'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 5: LIVE TEST — replace the two UUIDs below with real values
-- Get sender UUID: SELECT id, name FROM wallet_users WHERE wallet_address = 'YOUR_WALLET';
-- ============================================================================
-- SELECT * FROM transfer_rzc(
--   'SENDER_UUID_HERE'::UUID,
--   '@RECIPIENT_USERNAME_HERE',
--   1,
--   'test transfer'
-- );

-- ============================================================================
-- QUICK FIX: If balance_locked = true for your user, run this to unlock
-- (Only for testing — normally admin approves via dashboard)
-- Replace YOUR_WALLET_ADDRESS with the actual address
-- ============================================================================
-- UPDATE wallet_users
-- SET balance_locked = false, balance_verified = true
-- WHERE wallet_address = 'YOUR_WALLET_ADDRESS';
