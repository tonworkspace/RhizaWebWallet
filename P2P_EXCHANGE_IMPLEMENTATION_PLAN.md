# P2P Exchange Implementation Plan 🔄💱

## Overview: Remitano-Style P2P Exchange

Build a peer-to-peer exchange where users can:
- **Sell**: BTC, USDT (multiple networks) → RZC
- **Buy**: RZC → BTC, USDT
- **Escrow**: Smart contract holds funds until both parties confirm
- **Multi-network**: Support BTC, USDT (ERC-20, TRC-20, BEP-20)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    P2P Exchange Flow                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Seller Posts Offer → Buyer Accepts → Escrow Locks     │
│  → Buyer Pays → Seller Confirms → Escrow Releases      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema

### 1.1 P2P Offers Table


```sql
-- P2P Offers Table
CREATE TABLE p2p_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_wallet TEXT NOT NULL REFERENCES wallets(wallet_address),
  offer_type TEXT NOT NULL CHECK (offer_type IN ('sell', 'buy')),
  
  -- What they're offering
  offer_asset TEXT NOT NULL, -- 'BTC', 'USDT_ERC20', 'USDT_TRC20', 'USDT_BEP20'
  offer_amount DECIMAL(20, 8) NOT NULL,
  
  -- What they want
  want_asset TEXT NOT NULL, -- 'RZC'
  want_amount DECIMAL(20, 2) NOT NULL,
  
  -- Pricing
  price_per_unit DECIMAL(20, 8) NOT NULL,
  min_order_amount DECIMAL(20, 8),
  max_order_amount DECIMAL(20, 8),
  
  -- Payment methods
  payment_methods JSONB, -- ['bank_transfer', 'paypal', 'wise', etc.]
  payment_instructions TEXT,
  
  -- Deposit addresses (for crypto deposits)
  btc_deposit_address TEXT,
  usdt_erc20_deposit_address TEXT,
  usdt_trc20_deposit_address TEXT,
  usdt_bep20_deposit_address TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  available_amount DECIMAL(20, 8) NOT NULL,
  
  -- Limits
  time_limit_minutes INTEGER DEFAULT 30,
  requires_kyc BOOLEAN DEFAULT false,
  min_completion_rate DECIMAL(5, 2) DEFAULT 0,
  
  -- Metadata
  terms_and_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_p2p_offers_seller ON p2p_offers(seller_wallet);
CREATE INDEX idx_p2p_offers_status ON p2p_offers(status);
CREATE INDEX idx_p2p_offers_asset ON p2p_offers(offer_asset, want_asset);
```


### 1.2 P2P Trades Table

```sql
-- P2P Trades (Escrow Transactions)
CREATE TABLE p2p_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID NOT NULL REFERENCES p2p_offers(id),
  
  -- Parties
  seller_wallet TEXT NOT NULL REFERENCES wallets(wallet_address),
  buyer_wallet TEXT NOT NULL REFERENCES wallets(wallet_address),
  
  -- Trade details
  offer_asset TEXT NOT NULL,
  offer_amount DECIMAL(20, 8) NOT NULL,
  want_asset TEXT NOT NULL,
  want_amount DECIMAL(20, 2) NOT NULL,
  price_per_unit DECIMAL(20, 8) NOT NULL,
  
  -- Escrow
  escrow_status TEXT DEFAULT 'pending' CHECK (escrow_status IN (
    'pending',        -- Waiting for seller to deposit
    'escrowed',       -- Funds locked in escrow
    'payment_sent',   -- Buyer claims payment sent
    'completed',      -- Trade completed successfully
    'disputed',       -- Dispute raised
    'cancelled',      -- Trade cancelled
    'refunded'        -- Funds returned to seller
  )),
  
  -- Deposit tracking
  deposit_tx_hash TEXT,
  deposit_confirmed BOOLEAN DEFAULT false,
  deposit_confirmed_at TIMESTAMPTZ,
  
  -- Payment proof
  payment_proof_url TEXT,
  payment_proof_uploaded_at TIMESTAMPTZ,
  
  -- Confirmations
  seller_confirmed BOOLEAN DEFAULT false,
  seller_confirmed_at TIMESTAMPTZ,
  buyer_confirmed BOOLEAN DEFAULT false,
  buyer_confirmed_at TIMESTAMPTZ,
  
  -- Dispute
  dispute_reason TEXT,
  dispute_raised_by TEXT,
  dispute_raised_at TIMESTAMPTZ,
  dispute_resolved_at TIMESTAMPTZ,
  dispute_resolution TEXT,
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  
  -- Chat
  chat_enabled BOOLEAN DEFAULT true,
  
  CONSTRAINT different_parties CHECK (seller_wallet != buyer_wallet)
);

CREATE INDEX idx_p2p_trades_offer ON p2p_trades(offer_id);
CREATE INDEX idx_p2p_trades_seller ON p2p_trades(seller_wallet);
CREATE INDEX idx_p2p_trades_buyer ON p2p_trades(buyer_wallet);
CREATE INDEX idx_p2p_trades_status ON p2p_trades(escrow_status);
```


### 1.3 Crypto Deposits Table

```sql
-- Track crypto deposits (BTC, USDT)
CREATE TABLE crypto_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES p2p_trades(id),
  user_wallet TEXT NOT NULL REFERENCES wallets(wallet_address),
  
  -- Deposit details
  crypto_type TEXT NOT NULL, -- 'BTC', 'USDT_ERC20', 'USDT_TRC20', 'USDT_BEP20'
  deposit_address TEXT NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  
  -- Transaction tracking
  tx_hash TEXT,
  confirmations INTEGER DEFAULT 0,
  required_confirmations INTEGER DEFAULT 3,
  confirmed BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'confirming',
    'confirmed',
    'failed'
  )),
  
  -- Timestamps
  detected_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crypto_deposits_trade ON crypto_deposits(trade_id);
CREATE INDEX idx_crypto_deposits_address ON crypto_deposits(deposit_address);
CREATE INDEX idx_crypto_deposits_tx ON crypto_deposits(tx_hash);
```
