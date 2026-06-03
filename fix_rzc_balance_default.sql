-- ============================================================================
-- Fix: Remove silent DEFAULT 100 from rzc_balance column
-- ============================================================================
-- Problem: wallet_users.rzc_balance has DEFAULT 100.0
-- This silently gives every new DB row 100 RZC with NO transaction record.
-- The balance appears in the wallet but has no history entry — looks like
-- a ghost balance that can't be explained in transaction history.
--
-- Fix: Set default to 0. All bonuses must go through awardRZCTokens()
-- which creates a proper transaction record in wallet_rzc_transactions.
-- ============================================================================

-- Step 1: Change the column default to 0
ALTER TABLE wallet_users
  ALTER COLUMN rzc_balance SET DEFAULT 0;

-- Step 2: Verify the change
SELECT
  column_name,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_name = 'wallet_users'
  AND column_name = 'rzc_balance';

-- Expected result:
-- column_name  | column_default | data_type
-- rzc_balance  | 0              | numeric

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
-- 1. This does NOT change existing users' balances — only affects NEW rows.
-- 2. Existing users who got the silent 100 RZC keep it (no rollback needed).
-- 3. New users will start at 0 and receive bonuses via awardRZCTokens().
-- 4. The signup bonus in rzcRewardService.ts (SIGNUP_BONUS = 2.5) will be
--    the only bonus new users receive on wallet creation.
--
-- If you want new users to get 100 RZC as a welcome bonus WITH a transaction
-- record, update rzcRewardService.ts:
--
--   SIGNUP_BONUS: 100,  // was 2.5
--
-- This ensures the bonus shows in transaction history.
-- ============================================================================

-- Optional: Check how many existing users have the default 100 balance
-- (users who never received any additional RZC)
SELECT
  COUNT(*) as users_with_exactly_100,
  'These users got the silent DB default' as note
FROM wallet_users
WHERE rzc_balance = 100.0
  AND NOT EXISTS (
    SELECT 1 FROM wallet_rzc_transactions t
    WHERE t.user_id = wallet_users.id
      AND t.type = 'signup_bonus'
  );
