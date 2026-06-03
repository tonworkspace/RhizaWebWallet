-- Create wallet_demo_accounts table for persisting demo trading accounts
CREATE TABLE IF NOT EXISTS wallet_demo_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  account_data JSONB NOT NULL DEFAULT '{
    "balances": {"USDT": 100, "RZC": 0, "TON": 20},
    "positions": {
      "RZC": {"amount": 0, "avgEntryUsdt": 0},
      "TON": {"amount": 20, "avgEntryUsdt": 6.5}
    },
    "tradeHistory": []
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallet_demo_accounts_address 
ON wallet_demo_accounts(wallet_address);

-- RLS Policies
ALTER TABLE wallet_demo_accounts ENABLE ROW LEVEL SECURITY;

-- Users can read their own demo account
CREATE POLICY "Users can view own demo account"
ON wallet_demo_accounts
FOR SELECT
USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Users can insert their own demo account
CREATE POLICY "Users can create own demo account"
ON wallet_demo_accounts
FOR INSERT
WITH CHECK (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Users can update their own demo account
CREATE POLICY "Users can update own demo account"
ON wallet_demo_accounts
FOR UPDATE
USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address')
WITH CHECK (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wallet_demo_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_wallet_demo_accounts_updated_at ON wallet_demo_accounts;
CREATE TRIGGER trigger_update_wallet_demo_accounts_updated_at
BEFORE UPDATE ON wallet_demo_accounts
FOR EACH ROW
EXECUTE FUNCTION update_wallet_demo_accounts_updated_at();

COMMENT ON TABLE wallet_demo_accounts IS 'Stores demo trading account data for users to practice trading without real funds';
COMMENT ON COLUMN wallet_demo_accounts.account_data IS 'JSONB containing balances, positions, and trade history';
