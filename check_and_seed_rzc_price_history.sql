-- Check and Seed RZC Price History for Testing
-- This script checks if price history exists and seeds test data if needed

-- ============================================
-- STEP 1: Check Current State
-- ============================================

-- Check current RZC price in rzc_config
SELECT 
  'Current RZC Price' as check_type,
  key,
  value as price,
  updated_at
FROM rzc_config
WHERE key = 'RZC_PRICE';

-- Check if price history table exists and has data
SELECT 
  'Price History Count' as check_type,
  COUNT(*) as total_records,
  MIN(changed_at) as oldest_record,
  MAX(changed_at) as newest_record
FROM rzc_price_history;

-- Show recent price history
SELECT 
  'Recent Price History' as check_type,
  old_price,
  new_price,
  changed_at,
  EXTRACT(EPOCH FROM (NOW() - changed_at))/3600 as hours_ago
FROM rzc_price_history
ORDER BY changed_at DESC
LIMIT 10;

-- ============================================
-- STEP 2: Seed Test Data (if needed)
-- ============================================

-- Only run this if you have NO price history data
-- This creates a realistic price history for testing

DO $$
DECLARE
  current_price NUMERIC;
  history_count INTEGER;
BEGIN
  -- Get current price
  SELECT value::NUMERIC INTO current_price
  FROM rzc_config
  WHERE key = 'RZC_PRICE';

  -- Check if history exists
  SELECT COUNT(*) INTO history_count
  FROM rzc_price_history;

  -- If no history, seed test data
  IF history_count = 0 THEN
    RAISE NOTICE 'No price history found. Seeding test data...';
    
    -- Insert historical prices (simulating price changes over last 30 days)
    -- Day 30 ago: $0.0008
    INSERT INTO rzc_price_history (old_price, new_price, changed_at)
    VALUES (0.0007, 0.0008, NOW() - INTERVAL '30 days');
    
    -- Day 25 ago: $0.00085
    INSERT INTO rzc_price_history (old_price, new_price, changed_at)
    VALUES (0.0008, 0.00085, NOW() - INTERVAL '25 days');
    
    -- Day 20 ago: $0.0009
    INSERT INTO rzc_price_history (old_price, new_price, changed_at)
    VALUES (0.00085, 0.0009, NOW() - INTERVAL '20 days');
    
    -- Day 15 ago: $0.00095
    INSERT INTO rzc_price_history (old_price, new_price, changed_at)
    VALUES (0.0009, 0.00095, NOW() - INTERVAL '15 days');
    
    -- Day 10 ago: $0.00092 (small dip)
    INSERT INTO rzc_price_history (old_price, new_price, changed_at)
    VALUES (0.00095, 0.00092, NOW() - INTERVAL '10 days');
    
    -- Day 7 ago: $0.00098
    INSERT INTO rzc_price_history (old_price, new_price, changed_at)
    VALUES (0.00092, 0.00098, NOW() - INTERVAL '7 days');
    
    -- Day 5 ago: $0.00096 (small dip)
    INSERT INTO rzc_price_history (old_price, new_price, changed_at)
    VALUES (0.00098, 0.00096, NOW() - INTERVAL '5 days');
    
    -- Day 3 ago: $0.00099
    INSERT INTO rzc_price_history (old_price, new_price, changed_at)
    VALUES (0.00096, 0.00099, NOW() - INTERVAL '3 days');
    
    -- Day 2 ago: $0.00097 (for 24h comparison)
    INSERT INTO rzc_price_history (old_price, new_price, changed_at)
    VALUES (0.00099, 0.00097, NOW() - INTERVAL '2 days');
    
    -- 25 hours ago: $0.00095 (this will be used for 24h change calculation)
    INSERT INTO rzc_price_history (old_price, new_price, changed_at)
    VALUES (0.00097, 0.00095, NOW() - INTERVAL '25 hours');
    
    -- 12 hours ago: $0.00098
    INSERT INTO rzc_price_history (old_price, new_price, changed_at)
    VALUES (0.00095, 0.00098, NOW() - INTERVAL '12 hours');
    
    -- 6 hours ago: current_price
    INSERT INTO rzc_price_history (old_price, new_price, changed_at)
    VALUES (0.00098, current_price, NOW() - INTERVAL '6 hours');
    
    RAISE NOTICE 'Seeded % price history records', (SELECT COUNT(*) FROM rzc_price_history);
    RAISE NOTICE 'Current price: %', current_price;
    RAISE NOTICE 'Price 24h ago: $0.00095';
    RAISE NOTICE 'Expected 24h change: %', ((current_price - 0.00095) / 0.00095 * 100);
  ELSE
    RAISE NOTICE 'Price history already exists (% records). Skipping seed.', history_count;
  END IF;
END $$;

-- ============================================
-- STEP 3: Verify 24h Change Calculation
-- ============================================

-- Calculate what the 24h change should be
WITH current_price AS (
  SELECT value::NUMERIC as price
  FROM rzc_config
  WHERE key = 'RZC_PRICE'
),
price_24h_ago AS (
  SELECT new_price
  FROM rzc_price_history
  WHERE changed_at <= NOW() - INTERVAL '24 hours'
  ORDER BY changed_at DESC
  LIMIT 1
)
SELECT 
  'Expected 24h Change' as calculation,
  cp.price as current_price,
  p24.new_price as price_24h_ago,
  ROUND(((cp.price - p24.new_price) / p24.new_price * 100)::NUMERIC, 2) as change_percent
FROM current_price cp, price_24h_ago p24;

-- ============================================
-- STEP 4: Final Verification
-- ============================================

SELECT 
  '✅ Setup Complete' as status,
  'Check browser console for RZC Service logs' as next_step,
  'Refresh Dashboard to see 24h change' as action;
