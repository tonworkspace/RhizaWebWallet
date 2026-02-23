-- ============================================================================
-- Check if Newsletter Table Exists in Your Database
-- ============================================================================
-- Run this query in Supabase SQL Editor to check if the table exists

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'wallet_newsletter_subscriptions'
) as newsletter_table_exists;

-- If the result is FALSE, run the migration below
-- If the result is TRUE, the table already exists and you're good to go!
