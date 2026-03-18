-- ============================================================================
-- BALANCE VERIFICATION APPROVAL SCRIPT
-- ============================================================================
-- This script helps admins approve balance verification requests
-- and unlock RZC transfers for users
-- ============================================================================

-- ─── OPTION 1: Approve ALL Users (Bulk Unlock) ─────────────────────────────
-- Use this to unlock RZC transfers for everyone at once
-- WARNING: This bypasses individual verification!

-- Unlock RZC transfers for all users
UPDATE wallet_users
SET 
  balance_verified = true,
  can_send_rzc = true,
  verification_badge_awarded = true,
  updated_at = NOW()
WHERE balance_verified IS NOT TRUE OR can_send_rzc IS NOT TRUE;

-- Mark all pending verification requests as resolved
UPDATE balance_verification_requests
SET 
  status = 'resolved',
  admin_notes = 'Bulk approval - balance verification complete',
  resolution_notes = 'All balances verified and approved',
  reviewed_at = NOW()
WHERE status IN ('pending', 'under_review');

-- ─── OPTION 2: Approve Specific User ───────────────────────────────────────
-- Replace 'USER_WALLET_ADDRESS' with the actual wallet address

/*
UPDATE wallet_users
SET 
  balance_verified = true,
  can_send_rzc = true,
  verification_badge_awarded = true,
  updated_at = NOW()
WHERE wallet_address = 'USER_WALLET_ADDRESS';

-- Also update their verification request if they have one
UPDATE balance_verification_requests
SET 
  status = 'resolved',
  admin_notes = 'Approved by admin',
  resolution_notes = 'Balance verified and approved',
  reviewed_at = NOW()
WHERE wallet_address = 'USER_WALLET_ADDRESS' 
  AND status IN ('pending', 'under_review');
*/

-- ─── OPTION 3: Approve by Telegram Username ────────────────────────────────
-- Replace '@username' with the actual Telegram username

/*
UPDATE wallet_users wu
SET 
  balance_verified = true,
  can_send_rzc = true,
  verification_badge_awarded = true,
  updated_at = NOW()
FROM balance_verification_requests bvr
WHERE wu.wallet_address = bvr.wallet_address
  AND bvr.telegram_username = '@username';

UPDATE balance_verification_requests
SET 
  status = 'resolved',
  admin_notes = 'Approved by admin',
  resolution_notes = 'Balance verified and approved',
  reviewed_at = NOW()
WHERE telegram_username = '@username'
  AND status IN ('pending', 'under_review');
*/

-- ─── VERIFICATION: Check Results ────────────────────────────────────────────

-- Count users by verification status
SELECT 
  CASE 
    WHEN balance_verified = true AND can_send_rzc = true THEN 'Verified & Unlocked'
    WHEN balance_verified = true AND can_send_rzc = false THEN 'Verified but Locked'
    WHEN balance_verified = false OR balance_verified IS NULL THEN 'Not Verified'
    ELSE 'Unknown'
  END as status,
  COUNT(*) as user_count
FROM wallet_users
GROUP BY 
  CASE 
    WHEN balance_verified = true AND can_send_rzc = true THEN 'Verified & Unlocked'
    WHEN balance_verified = true AND can_send_rzc = false THEN 'Verified but Locked'
    WHEN balance_verified = false OR balance_verified IS NULL THEN 'Not Verified'
    ELSE 'Unknown'
  END;

-- Show recent verifications
SELECT 
  wu.wallet_address,
  wu.name,
  wu.rzc_balance,
  wu.balance_verified,
  wu.can_send_rzc,
  wu.verification_badge_awarded,
  wu.updated_at
FROM wallet_users wu
WHERE wu.balance_verified = true
ORDER BY wu.updated_at DESC
LIMIT 20;

-- Show verification request status
SELECT 
  status,
  COUNT(*) as request_count
FROM balance_verification_requests
GROUP BY status;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Run OPTION 1 to unlock RZC for all users (recommended for initial launch)
-- 2. Use OPTION 2 or 3 for individual approvals
-- 3. Check the verification queries at the end to confirm changes
-- 4. Users will see the Send button instead of Lock icon after approval
-- ============================================================================
