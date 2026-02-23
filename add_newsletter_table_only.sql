-- ============================================================================
-- Add Newsletter Table to Existing Database
-- ============================================================================
-- Run this ONLY if the newsletter table doesn't exist yet
-- This is a standalone migration that won't affect your existing tables

-- Enable UUID extension (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CREATE NEWSLETTER TABLE
-- ============================================================================

-- TABLE: wallet_newsletter_subscriptions
CREATE TABLE IF NOT EXISTS wallet_newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  source TEXT DEFAULT 'landing_page',
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON wallet_newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON wallet_newsletter_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribed_at ON wallet_newsletter_subscriptions(subscribed_at DESC);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE wallet_newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Policy: Allow anyone to subscribe (insert)
CREATE POLICY "Anyone can subscribe to newsletter"
  ON wallet_newsletter_subscriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only admins can view subscriptions
CREATE POLICY "Only admins can view newsletter subscriptions"
  ON wallet_newsletter_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wallet_users
      WHERE wallet_users.auth_user_id = auth.uid()
      AND wallet_users.role = 'admin'
    )
  );

-- Policy: Only admins can update subscriptions
CREATE POLICY "Only admins can update newsletter subscriptions"
  ON wallet_newsletter_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wallet_users
      WHERE wallet_users.auth_user_id = auth.uid()
      AND wallet_users.role = 'admin'
    )
  );

-- ============================================================================
-- ADD TABLE COMMENT
-- ============================================================================

COMMENT ON TABLE wallet_newsletter_subscriptions IS 'Stores newsletter email subscriptions from landing page';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this to verify the table was created successfully
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'wallet_newsletter_subscriptions') as column_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'wallet_newsletter_subscriptions') as index_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'wallet_newsletter_subscriptions') as policy_count
FROM information_schema.tables 
WHERE table_name = 'wallet_newsletter_subscriptions';

-- Expected result:
-- table_name: wallet_newsletter_subscriptions
-- column_count: 9
-- index_count: 4 (3 custom + 1 primary key)
-- policy_count: 3
