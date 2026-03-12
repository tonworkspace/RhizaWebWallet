-- ============================================================================
-- QUICK NOTIFICATION CHECK
-- Run this to verify notifications exist and create a test one
-- ============================================================================

-- Step 1: Check if table exists
SELECT 
  'Table Status' as check_type,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE is_read = false) as unread,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h
FROM wallet_notifications;

-- Step 2: Check notifications for a specific user
-- Replace with your wallet address
SELECT 
  'Your Notifications' as check_type,
  id,
  type,
  title,
  message,
  is_read,
  created_at
FROM wallet_notifications
WHERE wallet_address = 'EQAie1sT4_ng9saBvIZsoOfWwsPqZmL-2BtoOCubI1x4'
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: Create a test notification
-- Replace with your wallet address
SELECT create_notification(
  'EQAie1sT4_ng9saBvIZsoOfWwsPqZmL-2BtoOCubI1x4',
  'system_announcement',
  '🎉 Notification System Active!',
  'Your notification center is working correctly. You can now receive real-time updates about transactions, referrals, and rewards.',
  jsonb_build_object(
    'test', true,
    'timestamp', NOW()
  ),
  'high',
  '/wallet/dashboard',
  'Go to Dashboard'
) as notification_id;

-- Step 4: Verify test notification was created
SELECT 
  'Test Notification' as check_type,
  id,
  type,
  title,
  is_read,
  created_at
FROM wallet_notifications
WHERE wallet_address = 'EQAie1sT4_ng9saBvIZsoOfWwsPqZmL-2BtoOCubI1x4'
  AND title LIKE '%Notification System Active%'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- WHAT TO DO NEXT:
-- ============================================================================
-- 
-- 1. Replace 'EQAie1sT4_ng9saBvIZsoOfWwsPqZmL-2BtoOCubI1x4' with your actual wallet address
-- 2. Run this script in Supabase SQL Editor
-- 3. Check the results:
--    - Step 1: Shows total notifications in system
--    - Step 2: Shows your existing notifications
--    - Step 3: Creates a test notification (returns UUID)
--    - Step 4: Confirms test notification was created
-- 
-- 4. Go to your app and:
--    - Look at the notification bell (should show a badge)
--    - Click the bell to open the notification center
--    - You should see the test notification
-- 
-- 5. If you don't see it:
--    - Open browser console (F12)
--    - Look for these messages:
--      🔄 Initial notification fetch for: EQA...
--      ✅ Fetched notifications: X
--    - If you see errors, check NOTIFICATION_CENTER_SETUP_GUIDE.md
-- 
-- ============================================================================
