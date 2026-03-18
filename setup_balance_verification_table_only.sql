-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔐 BALANCE VERIFICATION TABLE SETUP (TABLE ONLY)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Creates only the table and indexes if they don't exist

-- ─── Balance Verification Requests Table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS balance_verification_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  
  -- User submitted information
  telegram_username TEXT NOT NULL,
  old_wallet_address TEXT NOT NULL, -- Wallet used before migration
  claimed_balance DECIMAL(20,2) NOT NULL, -- What user claims their balance should be
  screenshot_url TEXT, -- URL to uploaded screenshot of telegram wallet balance
  additional_notes TEXT,
  
  -- System information
  current_balance DECIMAL(20,2) NOT NULL, -- Current RZC balance in system
  discrepancy_amount DECIMAL(20,2) GENERATED ALWAYS AS (claimed_balance - current_balance) STORED,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'resolved')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Admin workflow
  reviewed_by UUID REFERENCES wallet_users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  resolution_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT unique_user_pending_request UNIQUE (user_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- ─── Indexes for Performance ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_balance_verification_status ON balance_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_balance_verification_user ON balance_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_verification_created ON balance_verification_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_verification_priority ON balance_verification_requests(priority, status);

-- ─── Enable RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE balance_verification_requests ENABLE ROW LEVEL SECURITY;

-- ─── Storage Bucket Setup ────────────────────────────────────────────────────────

-- Create storage bucket for verification documents (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-documents', 'verification-documents', true)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ BALANCE VERIFICATION TABLE CREATED
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  'Balance verification table created successfully!' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'balance_verification_requests') as table_created;