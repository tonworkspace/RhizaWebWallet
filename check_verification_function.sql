-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔍 CHECK BALANCE VERIFICATION FUNCTION STATUS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Check if the function exists
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  provolatile as volatility,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'submit_balance_verification_request';

-- Check RLS policies on balance_verification_requests table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'balance_verification_requests';

-- Check if table exists and its structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'balance_verification_requests'
ORDER BY ordinal_position;

-- Try to call the function as anon user (this will show what error users see)
SELECT submit_balance_verification_request(
  '@testuser',
  'EQTest123',
  25000,
  NULL,
  'Test from SQL'
);
