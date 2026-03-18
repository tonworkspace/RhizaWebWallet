-- Discover the actual structure of wallet_users table
-- Run this first to see what columns exist

-- 1. Check wallet_users table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'wallet_users'
ORDER BY ordinal_position;

-- 2. Check a sample of actual data to understand the structure
SELECT * FROM wallet_users LIMIT 3;

-- 3. Check if there are any ID-like columns
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'wallet_users' 
  AND (
    column_name LIKE '%id%' OR 
    column_name LIKE '%user%' OR
    column_name LIKE '%name%' OR
    column_name LIKE '%avatar%' OR
    column_name LIKE '%balance%'
  )
ORDER BY column_name;

-- 4. Check wallet_referrals structure too
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'wallet_referrals'
ORDER BY ordinal_position;

-- 5. Check wallet_rzc_transactions structure
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'wallet_rzc_transactions'
ORDER BY ordinal_position;