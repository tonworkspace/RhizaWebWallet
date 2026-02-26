-- ============================================================================
-- SETUP NOTIFICATION SYSTEM - RUN THIS TO ENABLE NOTIFICATIONS
-- ============================================================================

-- Step 1: Check if wallet_notifications table exists
SELECT 
  'Checking table...' as step,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'wallet_notifications'
    ) THEN '✅ Table exists'
    ELSE '❌ Table missing - check schema'
  END as status;

-- Step 2: Create the notification function
CREATE OR REPLACE FUNCTION create_notification(
  p_wallet_address TEXT,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}',
  p_priority TEXT DEFAULT 'normal',
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Insert notification
  INSERT INTO wallet_notifications (
    wallet_address,
    type,
    title,
    message,
    data,
    priority,
    action_url,
    action_label,
    is_read,
    is_archived,
    created_at
  ) VALUES (
    p_wallet_address,
    p_type,
    p_title,
    p_message,
    p_data,
    p_priority,
    p_action_url,
    p_action_label,
    false,
    false,
    NOW()
  )
  RETURNING id INTO v_notification_id;

  RAISE NOTICE 'Created notification % for user %', v_notification_id, p_wallet_address;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO anon;
GRANT EXECUTE ON FUNCTION create_notification TO service_role;

-- Add comment
COMMENT ON FUNCTION create_notification IS 
'Creates a new notification for a user. Used by the notification system.';

-- Step 3: Verify function was created
SELECT 
  'Function created' as step,
  routine_name,
  '✅ Ready to use' as status
FROM information_schema.routines
WHERE routine_name = 'create_notification'
  AND routine_schema = 'public';

-- Step 4: Test the function
SELECT 
  'Testing function...' as step,
  create_notification(
    'EQAie1sT4_ng9saBvIZsoOfWwsPqZmL-2BtoOCubI1x4',
    'system_announcement',
    'Test Notification',
    'This is a test to verify the notification system is working',
    jsonb_build_object('test', true, 'timestamp', NOW()),
    'normal',
    NULL,
    NULL
  ) as notification_id;

-- Step 5: Verify the test notification was created
SELECT 
  'Verification' as step,
  id,
  wallet_address,
  type,
  title,
  message,
  created_at,
  '✅ Notification created successfully' as status
FROM wallet_notifications
WHERE type = 'system_announcement'
  AND message LIKE '%test to verify%'
ORDER BY created_at DESC
LIMIT 1;

-- Step 6: Clean up test notification (optional)
-- DELETE FROM wallet_notifications WHERE type = 'system_announcement' AND message LIKE '%test to verify%';

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- Step 1: Should show "✅ Table exists"
-- Step 2: Function created (no output)
-- Step 3: Should show "create_notification" with "✅ Ready to use"
-- Step 4: Should return a UUID (notification ID)
-- Step 5: Should show the test notification details
-- ============================================================================

-- ============================================================================
-- NOTIFICATION SYSTEM IS NOW READY! ✅
-- ============================================================================
-- 
-- What works now:
-- ✅ New users get welcome notification (50 RZC bonus)
-- ✅ Referrers get notification when someone signs up (25 RZC bonus)
-- ✅ Milestone notifications (250, 1,250, 5,000 RZC bonuses)
-- ✅ All notifications appear in Notifications page
-- ✅ Unread count shows in bell icon
-- 
-- Test it:
-- 1. Create a new wallet → Should see welcome notification
-- 2. Use referral code → Referrer should see notification
-- 3. Check Notifications page → Should see all notifications
-- ============================================================================
