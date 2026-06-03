-- ============================================================================
-- FIX SIMULTANEOUS DUPLICATE REFERRAL CLAIMS
-- 
-- 1. Cleans up existing duplicates
-- 2. Adds strict unique index to prevent future race conditions
-- 3. Updates award_rzc_tokens to handle unique violations gracefully
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Identify and Cleanup Existing Duplicates
-- We keep the earliest referral_bonus transaction for each user_id + referred_user_id
-- and delete the rest, correcting the user's balance and referral earnings.
-- ============================================================================

-- A. Identify the duplicates to delete
CREATE TEMP TABLE duplicates_to_delete AS
WITH RankedClaims AS (
  SELECT 
    id,
    user_id,
    amount,
    metadata->>'referred_user_id' as referred_user_id,
    ROW_NUMBER() OVER(PARTITION BY user_id, metadata->>'referred_user_id' ORDER BY created_at ASC) as rn
  FROM wallet_rzc_transactions
  WHERE type = 'referral_bonus'
    AND metadata->>'referred_user_id' IS NOT NULL
)
SELECT id, user_id, amount
FROM RankedClaims
WHERE rn > 1;

-- B. Correct the user's balances
UPDATE wallet_users u
SET rzc_balance = u.rzc_balance - subquery.total_deduct
FROM (
  SELECT user_id, SUM(amount) as total_deduct
  FROM duplicates_to_delete
  GROUP BY user_id
) subquery
WHERE u.id = subquery.user_id;

-- C. Correct the user's referral total earnings
UPDATE wallet_referrals r
SET total_earned = r.total_earned - subquery.total_deduct
FROM (
  SELECT user_id, SUM(amount) as total_deduct
  FROM duplicates_to_delete
  GROUP BY user_id
) subquery
WHERE r.user_id = subquery.user_id;

-- D. Delete the duplicate transaction rows
DELETE FROM wallet_rzc_transactions
WHERE id IN (SELECT id FROM duplicates_to_delete);

DROP TABLE duplicates_to_delete;


-- ============================================================================
-- STEP 2: Enforce Unique Constraints at the Database Level
-- ============================================================================

-- Create a unique index that prevents multiple referral bonuses for the same referred user
CREATE UNIQUE INDEX IF NOT EXISTS unique_referral_bonus_per_referred 
ON wallet_rzc_transactions (user_id, (metadata->>'referred_user_id'))
WHERE type = 'referral_bonus' AND metadata->>'referred_user_id' IS NOT NULL;


-- ============================================================================
-- STEP 3: Update `award_rzc_tokens` to handle the constraint gracefully
-- ============================================================================

CREATE OR REPLACE FUNCTION award_rzc_tokens(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_new_balance NUMERIC;
  v_referred_user_id UUID;
BEGIN
  -- First, perform a row lock on the user's balance to safely update it
  SELECT rzc_balance INTO v_new_balance
  FROM wallet_users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  v_new_balance := v_new_balance + p_amount;

  -- Attempt to insert the transaction record FIRST
  -- This will throw an exception if a race condition hits the unique index
  BEGIN
    INSERT INTO wallet_rzc_transactions (
      user_id,
      type,
      amount,
      balance_after,
      description,
      metadata,
      created_at
    ) VALUES (
      p_user_id,
      p_type,
      p_amount,
      v_new_balance,
      p_description,
      p_metadata,
      NOW()
    );
  EXCEPTION WHEN unique_violation THEN
    -- A duplicate referral was intercepted!
    RAISE NOTICE 'Duplicate referral bonus intercepted and prevented for user %.', p_user_id;
    RETURN; -- Exit early without updating balances
  END;

  -- If we reach here, the transaction is safely recorded and unique.
  -- Update user's RZC balance
  UPDATE wallet_users
  SET 
    rzc_balance = v_new_balance,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Update referral earnings if it's a referral bonus
  IF p_type = 'referral_bonus' THEN
    UPDATE wallet_referrals
    SET 
      total_earned = total_earned + p_amount,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  RAISE NOTICE 'Awarded % RZC to user %. New balance: %', p_amount, p_user_id, v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

SELECT 'Successfully cleaned duplicates, created unique index, and updated award_rzc_tokens function!' as status;
