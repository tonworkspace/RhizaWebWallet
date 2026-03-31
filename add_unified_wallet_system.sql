-- ============================================================================
-- UNIFIED WALLET SYSTEM MIGRATION
-- Integrates secondary multi-chain wallets with main user profiles
-- Enables seamless TON + EVM wallet management for all users
-- ============================================================================

-- ============================================================================
-- STEP 1: Enhance wallet_users table with multi-chain support
-- ============================================================================

ALTER TABLE wallet_users 
ADD COLUMN IF NOT EXISTS secondary_wallet_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS evm_address TEXT,
ADD COLUMN IF NOT EXISTS evm_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS secondary_wallet_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS secondary_wallet_last_used TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS wallet_creation_method TEXT DEFAULT 'standard' CHECK (wallet_creation_method IN ('standard', 'multi_chain', 'imported', 'migrated')),
ADD COLUMN IF NOT EXISTS backup_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS security_level TEXT DEFAULT 'standard' CHECK (security_level IN ('basic', 'standard', 'enhanced', 'premium'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_users_secondary_enabled ON wallet_users(secondary_wallet_enabled);
CREATE INDEX IF NOT EXISTS idx_wallet_users_evm_address ON wallet_users(evm_address);
CREATE INDEX IF NOT EXISTS idx_wallet_users_creation_method ON wallet_users(wallet_creation_method);

-- ============================================================================
-- STEP 2: Create user_wallets table for multiple wallet management
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('primary_ton', 'secondary_multi', 'imported_ton', 'imported_evm')),
  wallet_address TEXT NOT NULL,
  chain_type TEXT NOT NULL CHECK (chain_type IN ('ton', 'evm')),
  is_active BOOLEAN DEFAULT TRUE,
  nickname TEXT,
  balance NUMERIC DEFAULT 0,
  last_balance_update TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, wallet_address, chain_type)
);

-- Indexes for user_wallets
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_type ON user_wallets(wallet_type);
CREATE INDEX IF NOT EXISTS idx_user_wallets_chain ON user_wallets(chain_type);
CREATE INDEX IF NOT EXISTS idx_user_wallets_active ON user_wallets(is_active);
CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(wallet_address);

-- ============================================================================
-- STEP 3: Create secondary wallet transactions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS secondary_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES user_wallets(id) ON DELETE SET NULL,
  chain_type TEXT NOT NULL CHECK (chain_type IN ('evm', 'ton')),
  wallet_address TEXT NOT NULL,
  transaction_hash TEXT,
  amount NUMERIC NOT NULL,
  asset_symbol TEXT NOT NULL DEFAULT 'ETH',
  asset_decimals INTEGER DEFAULT 18,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('send', 'receive', 'swap', 'approve', 'contract_interaction')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled')),
  gas_used NUMERIC,
  gas_price NUMERIC,
  block_number BIGINT,
  confirmation_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

-- Indexes for secondary_wallet_transactions
CREATE INDEX IF NOT EXISTS idx_secondary_tx_user_id ON secondary_wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_secondary_tx_wallet_id ON secondary_wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_secondary_tx_chain ON secondary_wallet_transactions(chain_type);
CREATE INDEX IF NOT EXISTS idx_secondary_tx_status ON secondary_wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_secondary_tx_hash ON secondary_wallet_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_secondary_tx_created_at ON secondary_wallet_transactions(created_at);

-- ============================================================================
-- STEP 4: Create wallet linking and management functions
-- ============================================================================

-- Function to link secondary wallet to existing user
CREATE OR REPLACE FUNCTION link_secondary_wallet_to_user(
  p_user_id UUID,
  p_evm_address TEXT,
  p_ton_address TEXT,
  p_wallet_nickname TEXT DEFAULT 'Multi-Chain Wallet'
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_user_exists BOOLEAN;
  v_evm_wallet_id UUID;
  v_ton_wallet_id UUID;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM wallet_users WHERE id = p_user_id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Check if secondary wallet already enabled
  IF EXISTS(SELECT 1 FROM wallet_users WHERE id = p_user_id AND secondary_wallet_enabled = TRUE) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Secondary wallet already enabled for this user'
    );
  END IF;

  -- Update user profile with secondary wallet info
  UPDATE wallet_users 
  SET 
    secondary_wallet_enabled = TRUE,
    evm_address = p_evm_address,
    secondary_wallet_created_at = NOW(),
    secondary_wallet_last_used = NOW(),
    wallet_creation_method = 'multi_chain'
  WHERE id = p_user_id;

  -- Insert EVM wallet record
  INSERT INTO user_wallets (user_id, wallet_type, wallet_address, chain_type, nickname)
  VALUES (p_user_id, 'secondary_multi', p_evm_address, 'evm', p_wallet_nickname || ' (EVM)')
  RETURNING id INTO v_evm_wallet_id;

  -- Insert TON secondary wallet record
  INSERT INTO user_wallets (user_id, wallet_type, wallet_address, chain_type, nickname)
  VALUES (p_user_id, 'secondary_multi', p_ton_address, 'ton', p_wallet_nickname || ' (TON)')
  RETURNING id INTO v_ton_wallet_id;

  -- Award multi-chain activation bonus (100 RZC)
  UPDATE wallet_users 
  SET rzc_balance = COALESCE(rzc_balance, 0) + 100
  WHERE id = p_user_id;

  -- Record RZC transaction for the bonus
  INSERT INTO wallet_transactions (user_id, wallet_address, type, amount, asset, status, metadata)
  SELECT 
    p_user_id,
    wallet_address,
    'reward',
    '100',
    'RZC',
    'completed',
    jsonb_build_object(
      'reward_type', 'multi_chain_activation',
      'description', 'Multi-chain wallet activation bonus',
      'evm_address', p_evm_address,
      'ton_address', p_ton_address
    )
  FROM wallet_users WHERE id = p_user_id;

  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, data, priority)
  VALUES (
    p_user_id,
    'wallet_linked',
    'Multi-Chain Wallet Activated! 🎉',
    'Your secondary wallet has been linked successfully. You earned 100 RZC bonus!',
    jsonb_build_object(
      'evm_address', p_evm_address,
      'ton_address', p_ton_address,
      'bonus_amount', 100,
      'evm_wallet_id', v_evm_wallet_id,
      'ton_wallet_id', v_ton_wallet_id
    ),
    'high'
  );

  SELECT jsonb_build_object(
    'success', true,
    'message', 'Secondary wallet linked successfully',
    'bonus_awarded', 100,
    'evm_wallet_id', v_evm_wallet_id,
    'ton_wallet_id', v_ton_wallet_id,
    'evm_address', p_evm_address,
    'ton_address', p_ton_address
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unified wallet info for user
CREATE OR REPLACE FUNCTION get_unified_wallet_info(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_info RECORD;
  v_wallets JSON;
  v_primary_wallet JSON;
  v_secondary_wallets JSON;
  v_transaction_count INTEGER;
  v_total_balance_usd NUMERIC;
  v_result JSON;
BEGIN
  -- Get user info
  SELECT 
    id, wallet_address, name, avatar, rzc_balance, role,
    secondary_wallet_enabled, evm_address, evm_balance,
    secondary_wallet_created_at, secondary_wallet_last_used,
    wallet_creation_method, backup_verified, security_level,
    created_at, is_activated
  INTO v_user_info
  FROM wallet_users 
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Get primary wallet info
  SELECT json_build_object(
    'address', v_user_info.wallet_address,
    'chain_type', 'ton',
    'is_activated', v_user_info.is_activated,
    'rzc_balance', COALESCE(v_user_info.rzc_balance, 0)
  ) INTO v_primary_wallet;

  -- Get all linked secondary wallets
  SELECT json_agg(
    json_build_object(
      'id', id,
      'wallet_type', wallet_type,
      'wallet_address', wallet_address,
      'chain_type', chain_type,
      'nickname', nickname,
      'balance', COALESCE(balance, 0),
      'is_active', is_active,
      'last_used', last_used,
      'created_at', created_at,
      'metadata', metadata
    ) ORDER BY created_at DESC
  ) INTO v_secondary_wallets
  FROM user_wallets 
  WHERE user_id = p_user_id AND is_active = TRUE;

  -- Get transaction count across all wallets
  SELECT 
    (SELECT COUNT(*) FROM wallet_transactions WHERE user_id = p_user_id) +
    (SELECT COUNT(*) FROM secondary_wallet_transactions WHERE user_id = p_user_id)
  INTO v_transaction_count;

  -- Calculate estimated total balance in USD (simplified)
  SELECT 
    COALESCE(v_user_info.rzc_balance * 0.12, 0) + -- RZC at $0.12
    COALESCE(v_user_info.evm_balance 