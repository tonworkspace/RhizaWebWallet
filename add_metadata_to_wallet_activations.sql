-- ============================================================================
-- Add metadata column to wallet_activations table (OPTIONAL)
-- This allows storing additional information like admin activation details
-- ============================================================================

-- Add metadata column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'wallet_activations' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE wallet_activations 
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Added metadata column to wallet_activations';
  ELSE
    RAISE NOTICE 'ℹ️ metadata column already exists';
  END IF;
END $$;

-- Create index for faster JSONB queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_wallet_activations_metadata 
  ON wallet_activations USING gin(metadata);

-- Verify the column was added
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'wallet_activations'
  AND column_name = 'metadata';

-- ============================================================================
-- Usage Examples
-- ============================================================================

-- Example 1: Store admin activation details
/*
INSERT INTO wallet_activations (
  wallet_address,
  activation_fee_usd,
  activation_fee_ton,
  ton_price_at_activation,
  transaction_hash,
  metadata
) VALUES (
  'UQDck6IU82sfLqAD1el005JcqzPwC8JSgLfOGsF_IUCyEf96',
  0,
  0,
  0,
  NULL,
  jsonb_build_object(
    'admin_activated', true,
    'admin_wallet', 'EQB2b3Ukq5akEQ-Vhu5xLZC_t1p-BiF0pCbpQcfPcecP_Uj8',
    'reason', 'Manual activation for testing',
    'activated_at', NOW()
  )
);
*/

-- Example 2: Query admin activations
/*
SELECT 
  wallet_address,
  metadata->>'admin_wallet' as admin_who_activated,
  metadata->>'reason' as reason,
  completed_at
FROM wallet_activations
WHERE metadata->>'admin_activated' = 'true';
*/

-- Example 3: Update existing admin activations to add metadata
/*
UPDATE wallet_activations
SET metadata = jsonb_build_object(
  'admin_activated', true,
  'reason', 'Legacy admin activation'
)
WHERE transaction_hash IS NULL
  AND activation_fee_usd = 0
  AND (metadata IS NULL OR metadata = '{}'::jsonb);
*/
