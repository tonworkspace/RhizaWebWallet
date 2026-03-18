-- Fix Airdrop Integration - Discover and Fix Column Names
-- Run this in Supabase SQL Editor to fix the column name issues

-- STEP 1: Discover actual wallet_users table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'wallet_users'
ORDER BY ordinal_position;

-- STEP 2: Check what tables exist in the database
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%wallet%'
ORDER BY table_name;

-- STEP 3: Check wallet_referrals structure
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'wallet_referrals'
ORDER BY ordinal_position;

-- STEP 4: Check wallet_rzc_transactions structure  
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'wallet_rzc_transactions'
ORDER BY ordinal_position;

-- STEP 5: Sample data to understand the actual column names
SELECT * FROM wallet_users LIMIT 1;