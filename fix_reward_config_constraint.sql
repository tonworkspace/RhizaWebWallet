-- ============================================================================
-- FIX REWARD_CONFIG KEY FORMAT CONSTRAINT
-- ============================================================================
-- The original constraint didn't allow numbers in keys
-- This fixes it to allow A-Z, 0-9, and underscores
-- ============================================================================

-- Drop the old constraint
ALTER TABLE reward_config 
DROP CONSTRAINT IF EXISTS reward_config_key_format;

-- Add the corrected constraint (allows numbers)
ALTER TABLE reward_config 
ADD CONSTRAINT reward_config_key_format CHECK (key ~ '^[A-Z0-9_]+$');

-- Verify it works
DO $$
BEGIN
  RAISE NOTICE '✅ Constraint fixed! Keys can now contain:';
  RAISE NOTICE '   • Uppercase letters (A-Z)';
  RAISE NOTICE '   • Numbers (0-9)';
  RAISE NOTICE '   • Underscores (_)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Now run: add_reward_config_system_fixed.sql';
END $$;
