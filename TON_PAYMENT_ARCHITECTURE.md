# 🏗️ TON Payment Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│                         (ProjectDetail.tsx)                                  │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 │ User selects payment method
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
        ┌───────────────────┐     ┌───────────────────┐
        │  USDC Payment     │     │  TON Payment      │
        │  (Existing)       │     │  (NEW)            │
        └───────────────────┘     └─────────┬─────────┘
                                            │
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    │                                                │
                    │        TonPresalePayment Component             │
                    │        (components/TonPresalePayment.tsx)      │
                    │                                                │
                    │  • TON amount input                            │
                    │  • Real-time USD conversion                    │
                    │  • Balance checking                            │
                    │  • Validation                                  │
                    │  • Confirmation modal                          │
                    │                                                │
                    └───────────────────────┬────────────────────────┘
                                            │
                                            │ processTonPayment()
                                            │
                    ┌───────────────────────▼────────────────────────┐
                    │                                                │
                    │         Launchpad Service                      │
                    │         (services/launchpadService.ts)         │
                    │                                                │
                    │  1. getTonUsdPrice()                           │
                    │     └─→ CoinGecko API                          │
                    │                                                │
                    │  2. canUserPurchase()                          │
                    │     └─→ Validate min/max/hard cap              │
                    │                                                │
                    │  3. Calculate tokens                           │
                    │     └─→ usdcEquiv × presale_rate               │
                    │                                                │
                    │  4. Send TON transaction                       │
                    │     └─→ Wallet Service                         │
                    │                                                │
                    │  5. createTransaction()                        │
                    │     └─→ Database                               │
                    │                                                │
                    │  6. updateProjectStats()                       │
                    │     └─→ Database                               │
                    │                                                │
                    └───────────┬────────────────────┬───────────────┘
                                │                    │
                                │                    │
                ┌───────────────▼──────┐   ┌─────────▼──────────────┐
                │                      │   │                        │
                │   Wallet Services    │   │   Database (Supabase)  │
                │                      │   │                        │
                │  • tonWalletService  │   │  • presale_transactions│
                │  • tetherWdkService  │   │    - payment_method    │
                │                      │   │    - amount_ton        │
                │  sendTransaction()   │   │    - amount_usdc       │
                │  getBalance()        │   │    - tokens_received   │
                │                      │   │                        │
                │         │            │   │  • launchpad_projects  │
                │         │            │   │    - raised_amount     │
                │         │            │   │    - participant_count │
                │         │            │   │    - presale_wallet    │
                │         │            │   │                        │
                └─────────┼────────────┘   └────────────────────────┘
                          │
                          │ Broadcast transaction
                          │
                ┌─────────▼────────────┐
                │                      │
                │   TON Blockchain     │
                │                      │
                │  • TonCenter V3 API  │
                │  • Transaction hash  │
                │  • Confirmation      │
                │                      │
                └──────────────────────┘
```

---

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           PAYMENT FLOW                                        │
└──────────────────────────────────────────────────────────────────────────────┘

1. USER INPUT
   ┌─────────────────────────────────────────────────────────────┐
   │ User enters: 20 TON                                          │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
2. PRICE FETCHING
   ┌─────────────────────────────────────────────────────────────┐
   │ getTonUsdPrice()                                             │
   │ ├─→ CoinGecko API: $5.50 per TON                            │
   │ └─→ Fallback: $5.50 (if API fails)                          │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
3. CALCULATION
   ┌─────────────────────────────────────────────────────────────┐
   │ USD Equivalent = 20 TON × $5.50 = $110                      │
   │ Tokens = $110 × 50 (presale_rate) = 5,500 tokens            │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
4. VALIDATION
   ┌─────────────────────────────────────────────────────────────┐
   │ ✓ Presale is active (status = 'live')                       │
   │ ✓ Amount >= min_purchase ($10)                              │
   │ ✓ Amount <= max_purchase ($10,000)                          │
   │ ✓ User balance >= 20 TON                                    │
   │ ✓ Won't exceed hard cap ($500,000)                          │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
5. BLOCKCHAIN TRANSACTION
   ┌─────────────────────────────────────────────────────────────┐
   │ walletService.sendTransaction(                              │
   │   to: "UQD...abc" (presale_wallet_address),                │
   │   amount: "20",                                             │
   │   comment: "Presale: TOKEN - 5500 tokens"                   │
   │ )                                                            │
   │                                                              │
   │ Returns: { success: true, txHash: "0x1234..." }             │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
6. DATABASE RECORD
   ┌─────────────────────────────────────────────────────────────┐
   │ INSERT INTO presale_transactions (                          │
   │   project_id: "abc-123",                                    │
   │   user_address: "UQD...xyz",                                │
   │   amount_usdc: 110,                                         │
   │   amount_ton: 20,                                           │
   │   payment_method: "ton",                                    │
   │   tokens_received: 5500,                                    │
   │   tx_hash: "0x1234...",                                     │
   │   status: "pending"                                         │
   │ )                                                            │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
7. PROJECT UPDATE
   ┌─────────────────────────────────────────────────────────────┐
   │ UPDATE launchpad_projects SET                               │
   │   raised_amount = raised_amount + 110,                      │
   │   participant_count = participant_count + 1                 │
   │ WHERE id = "abc-123"                                        │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
8. SUCCESS RESPONSE
   ┌─────────────────────────────────────────────────────────────┐
   │ {                                                            │
   │   success: true,                                            │
   │   txHash: "0x1234...",                                      │
   │   tokensReceived: 5500                                      │
   │ }                                                            │
   └─────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
ProjectDetail.tsx
│
├─ Payment Method Selector
│  ├─ [TON Button] ← Active
│  └─ [USDC Button]
│
├─ TonPresalePayment Component
│  │
│  ├─ Price Display
│  │  └─ "Current Rate: $5.50 USD"
│  │
│  ├─ Balance Display
│  │  └─ "Your TON Balance: 45.2341 TON"
│  │
│  ├─ Amount Input
│  │  ├─ Input field
│  │  ├─ MAX button
│  │  └─ USD equivalent: "≈ $110.00 USD"
│  │
│  ├─ Validation Messages
│  │  └─ Error/Warning display
│  │
│  ├─ Rate Info Card
│  │  ├─ TON Price: $5.50
│  │  ├─ Token Rate: 1 USD = 50 TOKEN
│  │  └─ Network Fee: ~0.01 TON
│  │
│  ├─ Buy Button
│  │  └─ "Buy with TON"
│  │
│  └─ Info Banner
│     └─ "Payment sent directly to project wallet"
│
└─ Confirmation Modal (when triggered)
   │
   ├─ Transaction Summary
   │  ├─ Amount: 20 TON
   │  ├─ USD Value: $110.00
   │  ├─ You receive: 5,500 TOKEN
   │  └─ Network Fee: ~0.01 TON
   │
   ├─ Warning Message
   │  └─ "Transaction cannot be reversed"
   │
   └─ Action Buttons
      ├─ [Cancel]
      └─ [Confirm Payment] ← Triggers processTonPayment()
```

---

## Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAUNCHPAD SERVICE                                    │
│                    (services/launchpadService.ts)                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PUBLIC METHODS (Used by Components)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  getProjects(filters?)                                                       │
│  └─→ Fetch all launchpad projects with optional filtering                   │
│                                                                              │
│  getProject(projectId)                                                       │
│  └─→ Fetch single project details                                           │
│                                                                              │
│  getTonUsdPrice()                                                            │
│  └─→ Fetch current TON/USD price from CoinGecko                             │
│      ├─ Primary: CoinGecko API                                              │
│      └─ Fallback: $5.50 (configurable)                                      │
│                                                                              │
│  canUserPurchase(params)                                                     │
│  └─→ Validate if user can make purchase                                     │
│      ├─ Check presale status                                                │
│      ├─ Check min/max limits                                                │
│      ├─ Check hard cap                                                      │
│      └─ Check user balance                                                  │
│                                                                              │
│  processTonPayment(params) ★ NEW ★                                           │
│  └─→ Complete TON payment flow                                              │
│      ├─ 1. Get project details                                              │
│      ├─ 2. Calculate USD equivalent                                         │
│      ├─ 3. Validate purchase                                                │
│      ├─ 4. Calculate tokens                                                 │
│      ├─ 5. Send TON transaction                                             │
│      ├─ 6. Record in database                                               │
│      └─ 7. Update project stats                                             │
│                                                                              │
│  createTransaction(params)                                                   │
│  └─→ Record transaction in database                                         │
│      └─ Now supports payment_method and amount_ton                          │
│                                                                              │
│  getUserTransactions(userAddress, projectId?)                                │
│  └─→ Fetch user's transaction history                                       │
│                                                                              │
│  subscribeToProject(projectId, callback)                                    │
│  └─→ Real-time updates for project changes                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PRIVATE METHODS (Internal Use)                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  updateProjectStats(projectId, amountUsdc, userAddress) ★ NEW ★             │
│  └─→ Update raised_amount and participant_count                             │
│      ├─ Check if new participant                                            │
│      ├─ Increment raised_amount                                             │
│      └─ Increment participant_count (if new)                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PRESALE_TRANSACTIONS TABLE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  id                  UUID PRIMARY KEY                                        │
│  project_id          UUID → launchpad_projects(id)                          │
│  user_id             UUID → wallet_users(id)                                │
│  user_address        TEXT NOT NULL                                          │
│                                                                              │
│  ┌─ PAYMENT DETAILS ─────────────────────────────────────────────┐          │
│  │  amount_usdc       NUMERIC(20, 2)  ← USD value (always set)   │          │
│  │  amount_ton        NUMERIC(20, 9)  ← TON amount (if TON) ★NEW★│          │
│  │  payment_method    TEXT            ← 'usdc' or 'ton' ★NEW★    │          │
│  └────────────────────────────────────────────────────────────────┘          │
│                                                                              │
│  tokens_received     NUMERIC(30, 9)                                         │
│                                                                              │
│  ┌─ BLOCKCHAIN DATA ─────────────────────────────────────────────┐          │
│  │  tx_hash           TEXT UNIQUE                                 │          │
│  │  block_number      BIGINT                                      │          │
│  │  gas_used          NUMERIC(20, 9)                              │          │
│  │  gas_price         NUMERIC(20, 9)                              │          │
│  └────────────────────────────────────────────────────────────────┘          │
│                                                                              │
│  status              TEXT ('pending', 'confirmed', 'failed')                │
│  error_message       TEXT                                                   │
│                                                                              │
│  created_at          TIMESTAMP                                              │
│  confirmed_at        TIMESTAMP                                              │
│  failed_at           TIMESTAMP                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAUNCHPAD_PROJECTS TABLE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  id                          UUID PRIMARY KEY                                │
│  name                        TEXT                                            │
│  symbol                      TEXT                                            │
│  ...                                                                         │
│                                                                              │
│  ┌─ FINANCIAL ───────────────────────────────────────────────────┐          │
│  │  presale_rate            NUMERIC  ← Tokens per USD             │          │
│  │  soft_cap                NUMERIC  ← Minimum to raise           │          │
│  │  hard_cap                NUMERIC  ← Maximum to raise           │          │
│  │  raised_amount           NUMERIC  ← Current raised (USD)       │          │
│  │  min_purchase            NUMERIC  ← Min buy (USD)              │          │
│  │  max_purchase            NUMERIC  ← Max buy (USD)              │          │
│  └────────────────────────────────────────────────────────────────┘          │
│                                                                              │
│  ┌─ WALLET ADDRESSES ────────────────────────────────────────────┐          │
│  │  presale_contract_address  TEXT  ← Smart contract (EVM)        │          │
│  │  presale_wallet_address    TEXT  ← TON wallet ★NEW★           │          │
│  └────────────────────────────────────────────────────────────────┘          │
│                                                                              │
│  participant_count           INTEGER                                         │
│  status                      TEXT ('live', 'upcoming', 'ended')             │
│  ...                                                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                   LAUNCHPAD_PAYMENT_STATS VIEW ★NEW★                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SELECT                                                                      │
│    project_id,                                                               │
│    payment_method,                                                           │
│    COUNT(*) as transaction_count,                                            │
│    SUM(amount_usdc) as total_usdc,                                           │
│    SUM(amount_ton) as total_ton,                                             │
│    SUM(tokens_received) as total_tokens                                      │
│  FROM presale_transactions                                                   │
│  WHERE status = 'confirmed'                                                  │
│  GROUP BY project_id, payment_method                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INTEGRATION POINTS                                   │
└─────────────────────────────────────────────────────────────────────────────┘

1. WALLET SERVICES
   ┌──────────────────────────────────────────────────────────────┐
   │ tonWalletService                                              │
   │ ├─ sendTransaction(to, amount, comment)                      │
   │ ├─ getBalance()                                              │
   │ └─ isInitialized()                                           │
   │                                                               │
   │ tetherWdkService                                              │
   │ ├─ sendTonTransaction(to, amount, comment)                   │
   │ ├─ getBalances()                                             │
   │ └─ isTonReady()                                              │
   └──────────────────────────────────────────────────────────────┘

2. PRICE ORACLE
   ┌──────────────────────────────────────────────────────────────┐
   │ CoinGecko API                                                 │
   │ └─ GET /simple/price?ids=the-open-network&vs_currencies=usd │
   │                                                               │
   │ Fallback: Hardcoded $5.50 (update regularly)                 │
   └──────────────────────────────────────────────────────────────┘

3. DATABASE (SUPABASE)
   ┌──────────────────────────────────────────────────────────────┐
   │ Tables:                                                       │
   │ ├─ presale_transactions (INSERT, UPDATE)                     │
   │ └─ launchpad_projects (SELECT, UPDATE)                       │
   │                                                               │
   │ Views:                                                        │
   │ └─ launchpad_payment_stats (SELECT)                          │
   │                                                               │
   │ Functions:                                                    │
   │ └─ get_project_progress(project_uuid)                        │
   └──────────────────────────────────────────────────────────────┘

4. BLOCKCHAIN
   ┌──────────────────────────────────────────────────────────────┐
   │ TON Blockchain                                                │
   │ ├─ TonCenter V3 API (broadcast)                              │
   │ ├─ Transaction confirmation                                  │
   │ └─ TonViewer (explorer links)                                │
   └──────────────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ERROR HANDLING                                       │
└─────────────────────────────────────────────────────────────────────────────┘

processTonPayment()
│
├─ Price Fetch Failed
│  └─→ Use fallback price ($5.50)
│      └─→ Continue with payment
│
├─ Validation Failed
│  ├─ Presale not active → "Presale is not active"
│  ├─ Amount < min → "Minimum X TON required"
│  ├─ Amount > max → "Maximum X TON allowed"
│  ├─ Insufficient balance → "Insufficient TON balance"
│  └─ Exceeds hard cap → "Only X TON remaining"
│
├─ Transaction Failed
│  ├─ Wallet not initialized → "Please connect wallet"
│  ├─ User rejected → "Transaction cancelled"
│  ├─ Network error → "Network error, please try again"
│  └─ Insufficient gas → "Insufficient TON for gas fees"
│
├─ Database Record Failed
│  └─→ Transaction succeeded on-chain
│      └─→ Log error, return success with warning
│          └─→ Manual DB record creation may be needed
│
└─ Project Update Failed
   └─→ Transaction and DB record succeeded
       └─→ Log error, return success
           └─→ Stats will be corrected on next update
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                      │
└─────────────────────────────────────────────────────────────────────────────┘

1. INPUT VALIDATION
   ├─ Amount format validation (positive number)
   ├─ Address format validation (TON address)
   ├─ Min/max limits enforcement
   └─ Balance verification

2. PRICE ORACLE SECURITY
   ├─ Primary source: CoinGecko API
   ├─ Fallback price mechanism
   └─ TODO: Multi-source averaging, deviation checks

3. TRANSACTION SECURITY
   ├─ User confirmation required
   ├─ Transaction preview with all details
   ├─ Network fee estimation
   └─ Comment includes project info

4. DATABASE SECURITY
   ├─ RLS policies on presale_transactions
   ├─ User authentication required
   ├─ Transaction hash uniqueness enforced
   └─ Audit trail (created_at, confirmed_at, failed_at)

5. WALLET SECURITY
   ├─ Private keys never exposed
   ├─ Transactions signed locally
   ├─ Wallet service abstraction
   └─ Support for hardware wallets (via WDK)
```

---

This architecture provides a robust, scalable foundation for TON-based presale payments with clear separation of concerns and comprehensive error handling.
