-- ============================================================================
-- Add multi-chain balance persistence columns to wallet_users
-- Run once in Supabase SQL Editor
-- ============================================================================

DO $$
BEGIN
  -- TON (primary V4 wallet)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'ton_balance') THEN
    ALTER TABLE wallet_users ADD COLUMN ton_balance DECIMAL(20, 9) DEFAULT 0;
    RAISE NOTICE '✅ Added ton_balance';
  END IF;

  -- EVM (ETH/MATIC/BNB/AVAX — WDK W5 wallet)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'evm_balance') THEN
    ALTER TABLE wallet_users ADD COLUMN evm_balance DECIMAL(30, 18) DEFAULT 0;
    RAISE NOTICE '✅ Added evm_balance';
  END IF;

  -- BTC
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'btc_balance') THEN
    ALTER TABLE wallet_users ADD COLUMN btc_balance DECIMAL(20, 8) DEFAULT 0;
    RAISE NOTICE '✅ Added btc_balance';
  END IF;

  -- SOL
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'sol_balance') THEN
    ALTER TABLE wallet_users ADD COLUMN sol_balance DECIMAL(20, 9) DEFAULT 0;
    RAISE NOTICE '✅ Added sol_balance';
  END IF;

  -- TRON
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'tron_balance') THEN
    ALTER TABLE wallet_users ADD COLUMN tron_balance DECIMAL(20, 6) DEFAULT 0;
    RAISE NOTICE '✅ Added tron_balance';
  END IF;

  -- USDT (EVM ERC-20)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'usdt_balance') THEN
    ALTER TABLE wallet_users ADD COLUMN usdt_balance DECIMAL(20, 6) DEFAULT 0;
    RAISE NOTICE '✅ Added usdt_balance';
  END IF;

  -- Sync timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'last_balance_sync_at') THEN
    ALTER TABLE wallet_users ADD COLUMN last_balance_sync_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added last_balance_sync_at';
  END IF;
END $$;

-- Indexes for admin queries (e.g. "users with > 0.1 BTC")
CREATE INDEX IF NOT EXISTS idx_wallet_users_ton_balance  ON wallet_users(ton_balance)  WHERE ton_balance  > 0;
CREATE INDEX IF NOT EXISTS idx_wallet_users_btc_balance  ON wallet_users(btc_balance)  WHERE btc_balance  > 0;
CREATE INDEX IF NOT EXISTS idx_wallet_users_evm_balance  ON wallet_users(evm_balance)  WHERE evm_balance  > 0;
CREATE INDEX IF NOT EXISTS idx_wallet_users_sol_balance  ON wallet_users(sol_balance)  WHERE sol_balance  > 0;
CREATE INDEX IF NOT EXISTS idx_wallet_users_tron_balance ON wallet_users(tron_balance) WHERE tron_balance > 0;
CREATE INDEX IF NOT EXISTS idx_wallet_users_usdt_balance ON wallet_users(usdt_balance) WHERE usdt_balance > 0;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'wallet_users'
  AND column_name IN ('ton_balance','evm_balance','btc_balance','sol_balance','tron_balance','usdt_balance','last_balance_sync_at')
ORDER BY column_name;
