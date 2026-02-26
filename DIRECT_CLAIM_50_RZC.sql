-- ============================================================================
-- DIRECT CLAIM 50 RZC - NO FUNCTION NEEDED
-- This directly updates the database without relying on award_rzc_tokens function
-- ============================================================================

-- STEP 1: Check current balance
SELECT 
  'BEFORE CLAIM' as status,
  name,
  rzc_balance as current_balance,
  (SELECT COUNT(*) FROM wallet_rzc_transactions WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641' AND type = 'referral_bonus') as bonuses_received
FROM wallet_users
WHERE id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- STEP 2: Update balance directly
UPDATE wallet_users
SET 
  rzc_balance = rzc_balance + 50,
  updated_at = NOW()
WHERE id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- STEP 3: Insert transaction record
INSERT INTO wallet_rzc_transactions (
  user_id,
  type,
  amount,
  balance_after,
  description,
  metadata,
  created_at
)
SELECT 
  '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'::uuid,
  'referral_bonus',
  50,
  rzc_balance,
  'Referral bonus - retroactive claim',
  jsonb_build_object(
    'referred_user_id', 'ce852b0e-a3cb-468b-9c85-5bb4a23e0f94',
    'referred_user_address', 'EQAie1sT4_ng9saBvIZsoOfWwsPqZmL-2BtoOCubI1x4',
    'retroactive', true,
    'manual_claim', true
  ),
  NOW()
FROM wallet_users
WHERE id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- STEP 4: Update referral earnings
UPDATE wallet_referrals
SET 
  total_earned = total_earned + 50,
  updated_at = NOW()
WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- STEP 5: Verify the claim
SELECT 
  'AFTER CLAIM' as status,
  name,
  rzc_balance as new_balance,
  (SELECT COUNT(*) FROM wallet_rzc_transactions WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641' AND type = 'referral_bonus') as bonuses_received
FROM wallet_users
WHERE id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- STEP 6: Check transaction history
SELECT 
  type,
  amount,
  balance_after,
  description,
  metadata,
  created_at
FROM wallet_rzc_transactions
WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- BEFORE CLAIM: rzc_balance = X, bonuses_received = 0
-- AFTER CLAIM:  rzc_balance = X + 50, bonuses_received = 1
-- Transaction history should show the new referral_bonus entry
-- ============================================================================
