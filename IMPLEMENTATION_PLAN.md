# Implementation Plan - Activate First, Mine Later 🚀

## Overview
Step-by-step plan to implement the new activation flow where users pay $15 to activate wallet first, then optionally upgrade to mining nodes.

---

## 📋 Implementation Steps

### Phase 1: Database Setup ✅ (Already Done)
Your existing schema already supports this:

```sql
-- wallet_users table
is_activated BOOLEAN DEFAULT FALSE
activated_at TIMESTAMP
activation_fee_paid NUMERIC DEFAULT 0

-- wallet_activations table (for audit trail)
wallet_address TEXT
activation_fee_usd NUMERIC
activation_fee_ton NUMERIC
transaction_hash TEXT
```

**Action**: Run `add_wallet_activation_FIXED.sql` if not already done

---

### Phase 2: Create Protocol Wizard Component

**File**: `components/ProtocolActivationWizard.tsx`

**What to do**:
1. Copy the advanced wizard code provided
2. Adapt it for our system:
   - Remove mining tier selection (not needed)
   - Keep 6-step flow (INTRO → SCANNING → COMMITMENT → BROADCASTING → PROVISIONING → SUCCESS)
   - Use $15 USD fixed amount
   - Award 150 RZC on success
   - Call our existing `activateWallet()` function

**Key Changes**:
```typescript
// Constants
const USD_AMOUNT = 15;
const RZC_REWARD = 150;

// In SUCCESS step, show:
- "150 RZC Provisioned"
- Transaction proof
- "Launch Dashboard" button

// On success:
await supabaseService.activateWallet(address, {
  activation_fee_usd: 15,
  activation_fee_ton: tonAmountNeeded,
  ton_price: tonPrice,
  transaction_hash: result.boc
});
```

---

### Phase 3: Update App.tsx

**What to do**:
1. Import new wizard component
2. Replace current `WalletActivationModal` with `ProtocolActivationWizard`
3. Pass required props

**Code Changes**:
```typescript
// Import
import ProtocolActivationWizard from './components/ProtocolActivationWizard';

// Replace modal rendering
{!isLoadingActivation && !walletActivated && isLoggedIn && isWalletMode && showActivationModal && (
  <ProtocolActivationWizard
    userId={userProfile?.id || 0}
    userUsername={userProfile?.name}
    tonAddress={address}
    tonPrice={2.45} // TODO: Get from price API
    showSnackbar={(data) => {
      // TODO: Implement toast notification
      console.log(data);
    }}
    onClose={() => setShowActivationModal(false)}
    onActivationComplete={handleActivationComplete}
  />
)}
```

---

### Phase 4: Add TON Connect Provider

**What to do**:
1. Install TON Connect packages
2. Wrap app with TonConnectUIProvider
3. Configure TON Connect

**Installation**:
```bash
npm install @tonconnect/ui-react @ton/core
```

**App.tsx Changes**:
```typescript
import { TonConnectUIProvider } from '@tonconnect/ui-react';

const App: React.FC = () => {
  return (
    <Router>
      <TonConnectUIProvider manifestUrl="https://your-domain.com/tonconnect-manifest.json">
        <ToastProvider>
          <WalletProvider>
            <AppContent />
          </WalletProvider>
        </ToastProvider>
      </TonConnectUIProvider>
    </Router>
  );
};
```

**Create Manifest** (`public/tonconnect-manifest.json`):
```json
{
  "url": "https://your-domain.com",
  "name": "RhizaCore Wallet",
  "iconUrl": "https://your-domain.com/logo.png",
  "termsOfUseUrl": "https://your-domain.com/terms",
  "privacyPolicyUrl": "https://your-domain.com/privacy"
}
```

---

### Phase 5: Create Database RPC Functions

**File**: `database_functions.sql`

**What to create**:

```sql
-- 1. Get activation status
CREATE OR REPLACE FUNCTION get_wallet_activation_status(p_user_id INTEGER)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'success', true,
    'wallet_activated', wu.is_activated,
    'wallet_activated_at', wu.activated_at,
    'activation_details', (
      SELECT json_build_object(
        'id', wa.id,
        'ton_amount', wa.activation_fee_ton,
        'usd_amount', wa.activation_fee_usd,
        'rzc_awarded', 150, -- Fixed amount
        'transaction_hash', wa.transaction_hash,
        'status', 'completed',
        'created_at', wa.activated_at
      )
      FROM wallet_activations wa
      WHERE wa.wallet_address = wu.wallet_address
      ORDER BY wa.activated_at DESC
      LIMIT 1
    )
  ) INTO v_result
  FROM wallet_users wu
  WHERE wu.id = p_user_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 2. Process activation
CREATE OR REPLACE FUNCTION process_wallet_activation(
  p_user_id INTEGER,
  p_ton_amount NUMERIC,
  p_ton_price NUMERIC,
  p_transaction_hash TEXT,
  p_sender_address TEXT,
  p_receiver_address TEXT
)
RETURNS JSON AS $$
DECLARE
  v_wallet_address TEXT;
  v_already_activated BOOLEAN;
BEGIN
  -- Get wallet address
  SELECT wallet_address, is_activated 
  INTO v_wallet_address, v_already_activated
  FROM wallet_users 
  WHERE id = p_user_id;
  
  -- Check if already activated
  IF v_already_activated THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Wallet already activated'
    );
  END IF;
  
  -- Update wallet_users
  UPDATE wallet_users
  SET 
    is_activated = TRUE,
    activated_at = NOW(),
    activation_fee_paid = 15,
    rzc_balance = rzc_balance + 150 -- Award 150 RZC
  WHERE id = p_user_id;
  
  -- Insert activation record
  INSERT INTO wallet_activations (
    wallet_address,
    activation_fee_usd,
    activation_fee_ton,
    ton_price,
    transaction_hash,
    sender_address,
    receiver_address,
    activated_at
  ) VALUES (
    v_wallet_address,
    15,
    p_ton_amount,
    p_ton_price,
    p_transaction_hash,
    p_sender_address,
    p_receiver_address,
    NOW()
  );
  
  -- Create RZC transaction record
  INSERT INTO wallet_rzc_transactions (
    user_id,
    type,
    amount,
    balance_after,
    description,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    'activation_reward',
    150,
    (SELECT rzc_balance FROM wallet_users WHERE id = p_user_id),
    'Wallet activation genesis grant',
    json_build_object(
      'transaction_hash', p_transaction_hash,
      'activation_fee_usd', 15,
      'activation_fee_ton', p_ton_amount
    ),
    NOW()
  );
  
  RETURN json_build_object(
    'success', true,
    'rzc_awarded', 150
  );
END;
$$ LANGUAGE plpgsql;
```

**Action**: Run this in Supabase SQL Editor

---

### Phase 6: Update Mining Nodes Page

**File**: `pages/MiningNodes.tsx`

**What to do**:
1. Add activation check at page load
2. Redirect if not activated
3. Update messaging to "upgrade"
4. Adjust Standard tier pricing display

**Code Changes**:
```typescript
// Add at top of component
useEffect(() => {
  const checkActivation = async () => {
    if (!address) return;
    
    const data = await supabaseService.checkWalletActivation(address);
    if (!data?.is_activated) {
      navigate('/wallet/dashboard');
      // Show toast notification
      alert('Please activate your wallet first before accessing mining nodes');
    }
  };
  
  checkActivation();
}, [address, navigate]);

// Update header description
<p className="text-sm text-gray-700 dark:text-gray-400 font-semibold">
  Upgrade your wallet with mining nodes to earn passive daily RZC rewards. 
  Choose from Standard, Premium, or VIP tiers.
</p>

// Update Standard tier note
<div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
  Note: Your $15 activation fee is already included in Standard tier pricing
</div>
```

---

### Phase 7: Update Dashboard CTA

**File**: `pages/Dashboard.tsx`

**What to do**:
1. Change messaging from "required" to "upgrade"
2. Add "Optional" badge
3. Emphasize passive income

**Code Changes**:
```typescript
{/* Mining Nodes CTA - Optional Upgrade */}
<div className="relative group">
  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
  <div 
    onClick={() => navigate('/mining-nodes')}
    className="relative p-5 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-500/10 dark:to-pink-500/10 border-2 border-purple-300 dark:border-purple-500/20 cursor-pointer active:scale-[0.98] transition-all hover:border-purple-400 dark:hover:border-purple-400/40 shadow-lg"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Zap size={20} className="text-white" fill="white" />
          </div>
          <div>
            <h3 className="text-base font-black text-purple-900 dark:text-purple-300 leading-tight">
              Upgrade to Mining Nodes
            </h3>
            <span className="text-[9px] font-black uppercase tracking-wider bg-purple-600 text-white px-2 py-0.5 rounded-full">
              Optional Upgrade
            </span>
          </div>
        </div>
        <p className="text-xs text-purple-700 dark:text-purple-400 leading-relaxed mb-3 font-semibold">
          Earn passive daily RZC rewards. Choose from Standard, Premium, or VIP Shareholder tiers with up to 20% monthly revenue share.
        </p>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-800 dark:text-purple-300 bg-white/50 dark:bg-white/10 px-2.5 py-1 rounded-lg">
            <TrendingUp size={12} />
            <span>10-3000 RZC/day</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-800 dark:text-purple-300 bg-white/50 dark:bg-white/10 px-2.5 py-1 rounded-lg">
            <ShieldCheck size={12} />
            <span>$100 - $10,000</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-800 dark:text-purple-300 bg-white/50 dark:bg-white/10 px-2.5 py-1 rounded-lg">
            <Sparkles size={12} />
            <span>Passive Income</span>
          </div>
        </div>
      </div>
      <ExternalLink size={16} className="text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform flex-shrink-0 mt-1" />
    </div>
  </div>
</div>
```

---

### Phase 8: Remove Old Modal

**What to do**:
1. Delete or archive `components/WalletActivationModal.tsx` (the simple one)
2. Keep only the new `ProtocolActivationWizard.tsx`

---

### Phase 9: Testing Checklist

**Test Scenarios**:

1. **New User Flow**
   - [ ] Create new wallet
   - [ ] Login
   - [ ] See lock overlay
   - [ ] Wizard auto-opens
   - [ ] Complete all 6 steps
   - [ ] Pay $15 in TON
   - [ ] Receive 150 RZC
   - [ ] Dashboard unlocks
   - [ ] Can access all features

2. **Mining Nodes Access**
   - [ ] Try to access before activation (should redirect)
   - [ ] Access after activation (should work)
   - [ ] See "upgrade" messaging
   - [ ] Purchase a node
   - [ ] Verify separate from activation

3. **Edge Cases**
   - [ ] Already activated user (should skip wizard)
   - [ ] Wallet not connected (should show connect button)
   - [ ] Payment cancelled (should return to commitment step)
   - [ ] Payment failed (should show error)
   - [ ] Duplicate activation attempt (should prevent)

4. **Mobile Testing**
   - [ ] Wizard displays correctly
   - [ ] All steps work on mobile
   - [ ] Buttons are touch-friendly
   - [ ] Scrolling works properly

5. **Performance**
   - [ ] Wizard loads quickly
   - [ ] Animations are smooth
   - [ ] No lag during steps
   - [ ] Page reload after activation is fast

---

### Phase 10: Configuration

**Environment Variables**:
```env
# .env
VITE_TON_DEPOSIT_ADDRESS=EQxxx...  # Your TON wallet address
VITE_TON_NETWORK=testnet           # or mainnet
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

**Constants** (`constants.ts`):
```typescript
export const CURRENT_TON_NETWORK = {
  DEPOSIT_ADDRESS: import.meta.env.VITE_TON_DEPOSIT_ADDRESS,
  NETWORK: import.meta.env.VITE_TON_NETWORK || 'testnet'
};

export const ACTIVATION_CONFIG = {
  USD_AMOUNT: 15,
  RZC_REWARD: 150,
  FEATURES_UNLOCKED: [
    'Send/Receive',
    'Swap',
    'Referral System',
    'Staking',
    'Marketplace'
  ]
};
```

---

## 📊 Summary of Changes

| Component | Change | Status |
|-----------|--------|--------|
| Database | Add RPC functions | ⏳ To Do |
| ProtocolActivationWizard | Create new component | ⏳ To Do |
| App.tsx | Replace modal with wizard | ⏳ To Do |
| App.tsx | Add TON Connect provider | ⏳ To Do |
| MiningNodes.tsx | Add activation check | ⏳ To Do |
| MiningNodes.tsx | Update messaging | ⏳ To Do |
| Dashboard.tsx | Update CTA to "upgrade" | ⏳ To Do |
| WalletActivationModal.tsx | Delete old modal | ⏳ To Do |
| tonconnect-manifest.json | Create manifest | ⏳ To Do |
| .env | Add TON config | ⏳ To Do |

---

## 🎯 Expected Results

After implementation:

1. **New users** see professional 6-step activation wizard
2. **$15 activation** unlocks basic wallet features
3. **150 RZC** awarded immediately
4. **Mining Nodes** become optional premium upgrade
5. **Better conversion** due to lower entry cost
6. **Clearer value** proposition for each product

---

## 🚀 Ready to Start?

The implementation is straightforward:
1. Create wizard component (copy & adapt)
2. Add database functions (SQL)
3. Update App.tsx (replace modal)
4. Add TON Connect (npm install)
5. Update Mining Nodes (add check)
6. Update Dashboard (change messaging)
7. Test everything

Estimated time: 4-6 hours

Would you like me to start implementing these changes?
