-- ============================================================================
-- BULK UNLOCK ALL USERS
-- ============================================================================
-- This script permanently removes the balance lock for all users
-- and marks their balances as verified so they can transfer RZC without restrictions.
-- ============================================================================

BEGIN;

-- 1. Update all wallet users to be verified and unlocked
UPDATE wallet_users
SET 
  balance_locked = FALSE,
  balance_verified = TRUE;

-- 2. Optional: Set default for future users to be unlocked
ALTER TABLE wallet_users 
ALTER COLUMN balance_locked SET DEFAULT FALSE,
ALTER COLUMN balance_verified SET DEFAULT TRUE;

COMMIT;

SELECT 'Successfully unlocked all user balances!' as status;
