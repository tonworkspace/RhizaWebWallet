-- ============================================================================
-- CHECK NOTIFICATION TYPE CONSTRAINT
-- ============================================================================

-- Check the constraint definition
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'wallet_notifications'::regclass
  AND conname LIKE '%type%';

-- Check all constraints on the table
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'wallet_notifications'::regclass
ORDER BY conname;

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'wallet_notifications'
ORDER BY ordinal_position;
