-- ============================================================================
-- TEST NOTIFICATION SYSTEM
-- Verify notifications are being created and can be retrieved
-- ============================================================================

-- Replace with your wallet address
\set test_wallet 'EQAie1sT4_ng9saBvIZsoOfWwsPqZmL-2BtoOCubI1x4'

-- ============================================================================
-- Check 1: Does the notifications table exist?
-- ============================================================================
SELECT 
  '1️⃣ Table Check' as test_name,
  table_name,
  'EXISTS ✅' as status
FROM information_schema.tables
WHERE table_name = 'wallet_notifications'
  AND table_schema = 'public';

-- ============================================================================
-- Check 2: Are there any notifications in the system?
-- ============================================================================
SELECT 
  '2️⃣ Total Notifications' as test_name,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE is_read = false) as unread_count,
  COUNT(*) FILTER (WHERE is_archived = false) as active_count
FROM wallet_notifications;

-- ============================================================================
-- Check 3: Notifications for specific wallet
-- ============================================================================
SELECT 
  '3️⃣ User Notifications' as test_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_read = false) as unread,
  COUNT(*) FILTER (WHERE is_archived = false) as active
FROM wallet_notifications
WHERE wallet_address = :'test_wallet';

-- ============================================================================
-- Check 4: Recent notifications for user
-- ============================================================================
SELECT 
  '4️⃣ Recent Notifications' as test_name,
  id,
  type,
  title,
  message,
  is_read,
  is_archived,
  priority,
  created_at
FROM wallet_notifications
WHERE wallet_address = :'test_wallet'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- Check 5: Notification functions exist?
-- ============================================================================
SELECT 
  '5️⃣ Functions Check' as test_name,
  routine_name,
  'EXISTS ✅' as status
FROM information_schema.routines
WHERE routine_name IN (
  'create_notification',
  'mark_notification_read',
  'mark_all_notifications_read'
)
AND routine_schema = 'public';

-- ============================================================================
-- Check 6: Create a test notification
-- ============================================================================
SELECT create_notification(
  :'test_wallet',
  'system_announcement',
  'Test Notification',
  'This is a test notification to verify the system is working',
  jsonb_build_object('test', true),
  'normal',
  '/wallet/dashboard',
  'View Dashboard'
);

-- ============================================================================
-- Check 7: Verify test notification was created
-- ============================================================================
SELECT 
  '7️⃣ Test Notification Created' as test_name,
  id,
  type,
  title,
  message,
  is_read,
  created_at
FROM wallet_notifications
WHERE wallet_address = :'test_wallet'
  AND title = 'Test Notification'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- Check 8: All notification types in system
-- ============================================================================
SELECT 
  '8️⃣ Notification Types' as test_name,
  type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_read = false) as unread
FROM wallet_notifications
GROUP BY type
ORDER BY count DESC;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- 
-- Check 1: Should show wallet_notifications table exists
-- Check 2: Should show total notifications in system
-- Check 3: Should show notifications for your wallet
-- Check 4: Should list recent notifications
-- Check 5: Should show all 3 functions exist
-- Check 6: Should return a UUID (notification ID)
-- Check 7: Should show the test notification
-- Check 8: Should show breakdown by type
--
-- ============================================================================
-- TROUBLESHOOTING:
-- ============================================================================
--
-- If Check 1 fails:
--   → Run SETUP_NOTIFICATIONS_NOW.sql to create the table
--
-- If Check 3 shows 0 notifications:
--   → No notifications have been created for this wallet yet
--   → Check 6 will create a test notification
--
-- If Check 5 shows missing functions:
--   → Run SETUP_NOTIFICATIONS_NOW.sql to create functions
--
-- If Check 6 fails:
--   → Check the error message
--   → Verify wallet address is correct
--
-- ============================================================================
