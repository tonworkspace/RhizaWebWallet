-- ============================================================================
-- CHECK NOTIFICATION SYSTEM
-- ============================================================================

-- Step 1: Check if wallet_notifications table exists
SELECT 
  table_name,
  'Table exists' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'wallet_notifications';

-- Step 2: Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'wallet_notifications'
ORDER BY ordinal_position;

-- Step 3: Check if create_notification function exists
SELECT 
  routine_name,
  routine_type,
  'Function exists' as status
FROM information_schema.routines
WHERE routine_name = 'create_notification'
  AND routine_schema = 'public';

-- Step 4: Check existing notifications
SELECT 
  id,
  wallet_address,
  type,
  title,
  message,
  is_read,
  created_at
FROM wallet_notifications
ORDER BY created_at DESC
LIMIT 10;

-- Step 5: Count notifications by type
SELECT 
  type,
  COUNT(*) as count,
  COUNT(CASE WHEN is_read THEN 1 END) as read_count,
  COUNT(CASE WHEN NOT is_read THEN 1 END) as unread_count
FROM wallet_notifications
GROUP BY type
ORDER BY count DESC;

-- ============================================================================
-- CREATE NOTIFICATION FUNCTION (if missing)
-- ============================================================================

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
'Creates a new notification for a user';

-- ============================================================================
-- TEST THE NOTIFICATION SYSTEM
-- ============================================================================

-- Test creating a notification
SELECT create_notification(
  'EQAie1sT4_ng9saBvIZsoOfWwsPqZmL-2BtoOCubI1x4',
  'test',
  'Test Notification',
  'This is a test notification',
  jsonb_build_object('test', true),
  'normal',
  NULL,
  NULL
);

-- Verify it was created
SELECT 
  id,
  wallet_address,
  type,
  title,
  message,
  created_at
FROM wallet_notifications
WHERE type = 'test'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- Step 1: Should show wallet_notifications table exists
-- Step 2: Should show columns: id, wallet_address, type, title, message, etc.
-- Step 3: Should show create_notification function exists (after creation)
-- Step 4: Should show recent notifications (if any)
-- Test: Should create a test notification and return its ID
-- ============================================================================
