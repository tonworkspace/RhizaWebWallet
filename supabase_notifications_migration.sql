-- ============================================
-- RhizaCore Wallet - Notifications System
-- ============================================
-- Version: 1.0
-- Date: February 23, 2026
-- Purpose: Add notification and activity tracking
-- ============================================

-- ============================================
-- 1. CREATE NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES wallet_users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  
  -- Notification details
  type TEXT NOT NULL CHECK (type IN (
    'transaction_received',
    'transaction_sent',
    'transaction_confirmed',
    'transaction_failed',
    'referral_earned',
    'referral_joined',
    'reward_claimed',
    'system_announcement',
    'security_alert',
    'achievement_unlocked'
  )),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Metadata
  data JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  
  -- Priority
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Action
  action_url TEXT,
  action_label TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_wallet_notifications_user ON wallet_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_notifications_address ON wallet_notifications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_notifications_type ON wallet_notifications(type);
CREATE INDEX IF NOT EXISTS idx_wallet_notifications_read ON wallet_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_wallet_notifications_created ON wallet_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_notifications_priority ON wallet_notifications(priority);

-- Enable RLS
ALTER TABLE wallet_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON wallet_notifications FOR SELECT
  USING (true);

CREATE POLICY "Users can update own notifications"
  ON wallet_notifications FOR UPDATE
  USING (true);

CREATE POLICY "System can insert notifications"
  ON wallet_notifications FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 2. CREATE USER ACTIVITY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES wallet_users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  
  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'login',
    'logout',
    'wallet_created',
    'wallet_imported',
    'transaction_sent',
    'transaction_received',
    'profile_updated',
    'settings_changed',
    'referral_code_used',
    'referral_code_shared',
    'reward_claimed',
    'page_viewed',
    'feature_used'
  )),
  
  description TEXT NOT NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Context
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for activity
CREATE INDEX IF NOT EXISTS idx_wallet_user_activity_user ON wallet_user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_user_activity_address ON wallet_user_activity(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_user_activity_type ON wallet_user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_wallet_user_activity_created ON wallet_user_activity(created_at DESC);

-- Enable RLS
ALTER TABLE wallet_user_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity
CREATE POLICY "Users can view own activity"
  ON wallet_user_activity FOR SELECT
  USING (true);

CREATE POLICY "System can insert activity"
  ON wallet_user_activity FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 3. CREATE NOTIFICATION PREFERENCES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES wallet_users(id) ON DELETE CASCADE,
  wallet_address TEXT UNIQUE NOT NULL,
  
  -- Notification settings
  enable_transaction_notifications BOOLEAN NOT NULL DEFAULT true,
  enable_referral_notifications BOOLEAN NOT NULL DEFAULT true,
  enable_reward_notifications BOOLEAN NOT NULL DEFAULT true,
  enable_system_notifications BOOLEAN NOT NULL DEFAULT true,
  enable_security_notifications BOOLEAN NOT NULL DEFAULT true,
  
  -- Delivery preferences
  enable_push_notifications BOOLEAN NOT NULL DEFAULT false,
  enable_email_notifications BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for preferences
CREATE INDEX IF NOT EXISTS idx_wallet_notification_prefs_user ON wallet_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_notification_prefs_address ON wallet_notification_preferences(wallet_address);

-- Enable RLS
ALTER TABLE wallet_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for preferences
CREATE POLICY "Users can view own preferences"
  ON wallet_notification_preferences FOR SELECT
  USING (true);

CREATE POLICY "Users can update own preferences"
  ON wallet_notification_preferences FOR UPDATE
  USING (true);

CREATE POLICY "System can insert preferences"
  ON wallet_notification_preferences FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 4. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_wallet_address TEXT,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_priority TEXT DEFAULT 'normal',
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_notification_id UUID;
  v_preferences RECORD;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM wallet_users
  WHERE wallet_address = p_wallet_address;
  
  -- Check notification preferences
  SELECT * INTO v_preferences
  FROM wallet_notification_preferences
  WHERE wallet_address = p_wallet_address;
  
  -- If no preferences, create default
  IF v_preferences IS NULL THEN
    INSERT INTO wallet_notification_preferences (user_id, wallet_address)
    VALUES (v_user_id, p_wallet_address);
    
    SELECT * INTO v_preferences
    FROM wallet_notification_preferences
    WHERE wallet_address = p_wallet_address;
  END IF;
  
  -- Check if notification type is enabled
  IF (p_type LIKE 'transaction_%' AND NOT v_preferences.enable_transaction_notifications) OR
     (p_type LIKE 'referral_%' AND NOT v_preferences.enable_referral_notifications) OR
     (p_type LIKE 'reward_%' AND NOT v_preferences.enable_reward_notifications) OR
     (p_type = 'system_announcement' AND NOT v_preferences.enable_system_notifications) OR
     (p_type = 'security_alert' AND NOT v_preferences.enable_security_notifications) THEN
    RETURN NULL;
  END IF;
  
  -- Create notification
  INSERT INTO wallet_notifications (
    user_id,
    wallet_address,
    type,
    title,
    message,
    data,
    priority,
    action_url,
    action_label
  ) VALUES (
    v_user_id,
    p_wallet_address,
    p_type,
    p_title,
    p_message,
    p_data,
    p_priority,
    p_action_url,
    p_action_label
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE wallet_notifications
  SET is_read = true, read_at = NOW()
  WHERE id = p_notification_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_wallet_address TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE wallet_notifications
  SET is_read = true, read_at = NOW()
  WHERE wallet_address = p_wallet_address
    AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_wallet_address TEXT,
  p_activity_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_activity_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM wallet_users
  WHERE wallet_address = p_wallet_address;
  
  -- Log activity
  INSERT INTO wallet_user_activity (
    user_id,
    wallet_address,
    activity_type,
    description,
    metadata
  ) VALUES (
    v_user_id,
    p_wallet_address,
    p_activity_type,
    p_description,
    p_metadata
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. CREATE TRIGGERS
-- ============================================

-- Trigger to update notification preferences updated_at
CREATE OR REPLACE FUNCTION update_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wallet_notification_prefs_updated_at
  BEFORE UPDATE ON wallet_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_prefs_updated_at();

-- Trigger to create notification on transaction
CREATE OR REPLACE FUNCTION notify_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify on received transaction
  IF NEW.type = 'receive' AND NEW.status = 'confirmed' THEN
    PERFORM create_notification(
      NEW.wallet_address,
      'transaction_received',
      'Payment Received',
      'You received ' || NEW.amount || ' ' || NEW.asset,
      jsonb_build_object(
        'transaction_id', NEW.id,
        'tx_hash', NEW.tx_hash,
        'amount', NEW.amount,
        'asset', NEW.asset,
        'from_address', NEW.from_address
      ),
      'normal',
      '/wallet/history',
      'View Transaction'
    );
  END IF;
  
  -- Notify on sent transaction confirmation
  IF NEW.type = 'send' AND NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    PERFORM create_notification(
      NEW.wallet_address,
      'transaction_confirmed',
      'Transaction Confirmed',
      'Your transaction of ' || NEW.amount || ' ' || NEW.asset || ' was confirmed',
      jsonb_build_object(
        'transaction_id', NEW.id,
        'tx_hash', NEW.tx_hash,
        'amount', NEW.amount,
        'asset', NEW.asset,
        'to_address', NEW.to_address
      ),
      'normal',
      '/wallet/history',
      'View Transaction'
    );
  END IF;
  
  -- Notify on failed transaction
  IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    PERFORM create_notification(
      NEW.wallet_address,
      'transaction_failed',
      'Transaction Failed',
      'Your transaction of ' || NEW.amount || ' ' || NEW.asset || ' failed',
      jsonb_build_object(
        'transaction_id', NEW.id,
        'amount', NEW.amount,
        'asset', NEW.asset
      ),
      'high',
      '/wallet/history',
      'View Details'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_on_transaction_update
  AFTER UPDATE ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_transaction();

-- Trigger to notify on referral earning
CREATE OR REPLACE FUNCTION notify_on_referral_earning()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_address TEXT;
BEGIN
  -- Get referrer wallet address
  SELECT wallet_address INTO v_referrer_address
  FROM wallet_users
  WHERE id = NEW.referrer_id;
  
  -- Create notification
  PERFORM create_notification(
    v_referrer_address,
    'referral_earned',
    'Referral Reward Earned!',
    'You earned ' || NEW.amount || ' RZC from your referral',
    jsonb_build_object(
      'earning_id', NEW.id,
      'amount', NEW.amount,
      'percentage', NEW.percentage,
      'level', NEW.level
    ),
    'normal',
    '/wallet/referral',
    'View Earnings'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_on_referral_earning_insert
  AFTER INSERT ON wallet_referral_earnings
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_referral_earning();

-- ============================================
-- 6. CREATE VIEWS
-- ============================================

-- View for unread notification count
CREATE OR REPLACE VIEW unread_notification_count AS
SELECT 
  wallet_address,
  COUNT(*) as unread_count
FROM wallet_notifications
WHERE is_read = false
  AND is_archived = false
  AND (expires_at IS NULL OR expires_at > NOW())
GROUP BY wallet_address;

-- View for recent activity
CREATE OR REPLACE VIEW recent_user_activity AS
SELECT 
  ua.*,
  u.name as user_name,
  u.avatar as user_avatar
FROM wallet_user_activity ua
LEFT JOIN wallet_users u ON ua.user_id = u.id
ORDER BY ua.created_at DESC;

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

-- Grant access to authenticated users
GRANT ALL ON wallet_notifications TO authenticated;
GRANT ALL ON wallet_user_activity TO authenticated;
GRANT ALL ON wallet_notification_preferences TO authenticated;

-- Grant access to views
GRANT SELECT ON unread_notification_count TO authenticated;
GRANT SELECT ON recent_user_activity TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify tables
DO $$
BEGIN
  RAISE NOTICE '✅ Notifications system migration complete!';
  RAISE NOTICE '📊 Tables created: wallet_notifications, wallet_user_activity, wallet_notification_preferences';
  RAISE NOTICE '🔧 Functions created: create_notification, mark_notification_read, mark_all_notifications_read, log_user_activity';
  RAISE NOTICE '⚡ Triggers created: notify_on_transaction_update, notify_on_referral_earning_insert';
  RAISE NOTICE '👁️ Views created: unread_notification_count, recent_user_activity';
END $$;
