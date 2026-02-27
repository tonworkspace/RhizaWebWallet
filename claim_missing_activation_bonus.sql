-- ============================================================================
-- CLAIM MISSING ACTIVATION BONUS
-- Award 150 RZC to users who activated but didn't receive the bonus
-- ============================================================================

-- Step 1: Find users who are activated but haven't received activation bonus
-- These are users who activated before the bonus feature was implemented
SELECT 
  wu.id as user_id,
  wu.wallet_address,
  wu.name,
  wu.is_activated,
  wu.activated_at,
  wu.rzc_balance,
  wa.activation_fee_paid,
  -- Check if they already received activation bonus
  (SELECT COUNT(*) FROM wallet_rzc_transactions 
   WHERE user_id = wu.id AND type = 'activation_bonus') as has_activation_bonus
FROM wallet_users wu
LEFT JOIN wallet_activations wa ON wu.wallet_address = wa.wallet_address
WHERE wu.is_activated = true
  AND wu.activated_at IS NOT NULL
  -- Only users who haven't received the bonus yet
  AND NOT EXISTS (
    SELECT 1 FROM wallet_rzc_transactions 
    WHERE user_id = wu.id AND type = 'activation_bonus'
  )
ORDER BY wu.activated_at ASC;

-- ============================================================================
-- Step 2: Award 150 RZC to eligible users
-- Run this for each user who needs the bonus
-- ============================================================================

-- Example: Award bonus to a specific user
-- Replace 'USER_ID_HERE' with actual user ID
/*
SELECT award_rzc_tokens(
  'USER_ID_HERE'::uuid,
  150,
  'activation_bonus',
  'Retroactive activation bonus - Welcome to RhizaCore!',
  jsonb_build_object(
    'bonus_type', 'activation',
    'retroactive', true,
    'reason', 'Activated before bonus feature was implemented'
  )
);
*/

-- ============================================================================
-- Step 3: Bulk award to all eligible users
-- WARNING: This will award 150 RZC to ALL users who activated without bonus
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
  awarded_count INTEGER := 0;
  failed_count INTEGER := 0;
BEGIN
  -- Loop through all eligible users
  FOR user_record IN 
    SELECT 
      wu.id as user_id,
      wu.wallet_address,
      wu.name
    FROM wallet_users wu
    WHERE wu.is_activated = true
      AND wu.activated_at IS NOT NULL
      -- Only users who haven't received the bonus yet
      AND NOT EXISTS (
        SELECT 1 FROM wallet_rzc_transactions 
        WHERE user_id = wu.id AND type = 'activation_bonus'
      )
  LOOP
    BEGIN
      -- Award 150 RZC activation bonus
      PERFORM award_rzc_tokens(
        user_record.user_id,
        150,
        'activation_bonus',
        'Retroactive activation bonus - Welcome to RhizaCore!',
        jsonb_build_object(
          'bonus_type', 'activation',
          'retroactive', true,
          'reason', 'Activated before bonus feature was implemented',
          'wallet_address', user_record.wallet_address
        )
      );
      
      awarded_count := awarded_count + 1;
      
      RAISE NOTICE 'Awarded 150 RZC to user: % (%) - Total: %', 
        user_record.name, 
        user_record.wallet_address, 
        awarded_count;
        
    EXCEPTION WHEN OTHERS THEN
      failed_count := failed_count + 1;
      RAISE NOTICE 'Failed to award bonus to user: % - Error: %', 
        user_record.wallet_address, 
        SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Activation Bonus Award Complete';
  RAISE NOTICE 'Successfully awarded: % users', awarded_count;
  RAISE NOTICE 'Failed: % users', failed_count;
  RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- Step 4: Verify the awards
-- ============================================================================

-- Check how many users received the retroactive bonus
SELECT 
  COUNT(*) as total_retroactive_bonuses,
  SUM(amount) as total_rzc_awarded
FROM wallet_rzc_transactions
WHERE type = 'activation_bonus'
  AND metadata->>'retroactive' = 'true';

-- List all users who received retroactive bonus
SELECT 
  wu.wallet_address,
  wu.name,
  wu.activated_at,
  wrt.amount,
  wrt.created_at as bonus_awarded_at,
  wu.rzc_balance as current_balance
FROM wallet_rzc_transactions wrt
JOIN wallet_users wu ON wrt.user_id = wu.id
WHERE wrt.type = 'activation_bonus'
  AND wrt.metadata->>'retroactive' = 'true'
ORDER BY wrt.created_at DESC;

-- ============================================================================
-- Step 5: Create notification for users who received retroactive bonus
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT
      wu.wallet_address,
      wu.name,
      wrt.amount,
      wu.rzc_balance
    FROM wallet_rzc_transactions wrt
    JOIN wallet_users wu ON wrt.user_id = wu.id
    WHERE wrt.type = 'activation_bonus'
      AND wrt.metadata->>'retroactive' = 'true'
      -- Only create notification if it doesn't exist
      AND NOT EXISTS (
        SELECT 1 FROM wallet_notifications
        WHERE wallet_address = wu.wallet_address
          AND type = 'reward_claimed'
          AND message LIKE '%Retroactive activation bonus%'
      )
  LOOP
    -- Create notification
    INSERT INTO wallet_notifications (
      wallet_address,
      type,
      title,
      message,
      data,
      priority,
      created_at
    ) VALUES (
      user_record.wallet_address,
      'reward_claimed',
      '🎁 Activation Bonus Awarded!',
      'You received 150 RZC as a retroactive activation bonus. Thank you for being an early supporter!',
      jsonb_build_object(
        'amount', 150,
        'type', 'activation_bonus',
        'retroactive', true,
        'new_balance', user_record.rzc_balance
      ),
      'normal',
      NOW()
    );
    
    RAISE NOTICE 'Created notification for: %', user_record.wallet_address;
  END LOOP;
END $$;

-- ============================================================================
-- ROLLBACK (if needed - USE WITH CAUTION)
-- ============================================================================

/*
-- Only use this if you need to reverse the awards
-- This will remove the activation bonus transactions and adjust balances

DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT 
      wrt.id as transaction_id,
      wrt.user_id,
      wrt.amount,
      wu.wallet_address
    FROM wallet_rzc_transactions wrt
    JOIN wallet_users wu ON wrt.user_id = wu.id
    WHERE wrt.type = 'activation_bonus'
      AND wrt.metadata->>'retroactive' = 'true'
  LOOP
    -- Deduct the amount from user's balance
    UPDATE wallet_users
    SET rzc_balance = rzc_balance - user_record.amount
    WHERE id = user_record.user_id;
    
    -- Delete the transaction
    DELETE FROM wallet_rzc_transactions
    WHERE id = user_record.transaction_id;
    
    RAISE NOTICE 'Rolled back bonus for: %', user_record.wallet_address;
  END LOOP;
END $$;
*/

