-- ============================================================================
-- CHECK IF DUPLICATE PREVENTION FIX IS ACTIVE
-- ============================================================================

-- Check 1: Does the function exist?
SELECT 
  '1️⃣ Function Exists?' as check,
  routine_name,
  '✅ YES' as status
FROM information_schema.routines
WHERE routine_name = 'award_rzc_tokens'
  AND routine_schema = 'public'
UNION ALL
SELECT 
  '1️⃣ Function Exists?' as check,
  'award_rzc_tokens' as routine_name,
  '❌ NO - RUN fix_duplicate_referral_claims.sql' as status
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.routines
  WHERE routine_name = 'award_rzc_tokens'
    AND routine_schema = 'public'
);

-- Check 2: Does it have duplicate prevention?
SELECT 
  '2️⃣ Has Duplicate Prevention?' as check,
  CASE 
    WHEN routine_definition LIKE '%v_existing_bonus_count%' 
      OR routine_definition LIKE '%existing_bonus%'
      OR routine_definition LIKE '%duplicate%'
    THEN '✅ YES - Fix is active'
    ELSE '❌ NO - Old version, run fix_duplicate_referral_claims.sql'
  END as status
FROM information_schema.routines
WHERE routine_name = 'award_rzc_tokens'
  AND routine_schema = 'public';

-- Check 3: Show the function source (to manually verify)
SELECT 
  '3️⃣ Function Source' as check,
  routine_definition as source_code
FROM information_schema.routines
WHERE routine_name = 'award_rzc_tokens'
  AND routine_schema = 'public';

-- ============================================================================
-- INTERPRETATION:
-- ============================================================================
-- 
-- Check 1: Should show "✅ YES"
--   If "❌ NO", the function doesn't exist at all
--
-- Check 2: Should show "✅ YES - Fix is active"
--   If "❌ NO", you need to run fix_duplicate_referral_claims.sql
--
-- Check 3: Look for this code in the source:
--   - "v_existing_bonus_count"
--   - "SELECT COUNT(*) INTO v_existing_bonus_count"
--   - "IF v_existing_bonus_count > 0 THEN RETURN"
--
-- If you see those lines, the fix is properly installed!
-- ============================================================================
