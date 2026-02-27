# Complete Wallet Activation Flow

## 🎯 Overview

When a user purchases a mining node, the wallet activation system automatically unlocks full access to all wallet features. Here's the complete step-by-step flow.

---

## 📋 Step-by-Step Flow

### 1️⃣ Initial State: Wallet Locked

**What User Sees:**
- Lock overlay covering the entire screen
- Message: "Fund your wallet and purchase a mining node to unlock the ecosystem"
- "View Mining Nodes" button
- Wallet balance display with TON amount and USD equivalent
- Network indicator (Mainnet/Testnet)

**What User Can Access:**
- ✅ Mining Nodes page (`/wallet/mining`)
- ✅ Receive page (`/wallet/receive`) - to get wallet address and QR code
- ❌ All other wallet pages (Dashboard, Assets, History, Transfer, Settings, etc.)

**Database State:**
```sql
-- wallet_users table
is_activated = FALSE
activated_at = NULL
activation_fee_paid = 0
```

---

### 2️⃣ User Funds Wallet

**Actions:**
1. User clicks "View Wallet Address" on lock overlay
2. Navigates to Receive page (`/wallet/receive`)
3. Copies wallet address or shows QR code
4. Sends TON to wallet address from external wallet/exchange
5. Balance updates in real-time

**Balance Check:**
- Lock overlay shows current balance
- Low balance warning if < 0.5 TON
- Mining Nodes page checks if balance is sufficient for purchase

---

### 3️⃣ User Navigates to Mining Nodes

**What User Sees:**
- List of mining node tiers (Test Node, Standard, Premium, Elite)
- Each node shows:
  - Price in USD
  - Activation fee
  - Total cost in TON
  - Mining rate (RZC/day)
  - Features and benefits

**Test Node (Testnet Only):**
- Price: $0.00
- Activation Fee: $0.025
- Total: 0.01 TON
- Mining Rate: 1 RZC/day
- Only visible on testnet for testing

**Balance Validation:**
```typescript
const totalCost = node.pricePoint + node.activationFee;
const totalCostTON = totalCost / tonPrice;
const hasEnoughBalance = tonBalance >= totalCostTON;
```

---

### 4️⃣ User Clicks "Purchase Node"

**Purchase Modal Opens:**
- Shows node details
- Displays current wallet balance
- Shows total cost breakdown
- Payment method selection (TON/RZC/Hybrid)
- "Insufficient balance" warning if needed
- "Fund Wallet" button if balance too low

**If Insufficient Balance:**
- Error message: "Insufficient balance. You need X TON but only have Y TON"
- "Fund Wallet" button navigates to Receive page
- User must add more TON before proceeding

---

### 5️⃣ Purchase Processing

**Frontend Flow (`MiningNodes.tsx`):**

```typescript
const handlePurchase = async () => {
  // 1. Validate wallet connected
  if (!address) {
    setError('Wallet not connected');
    return;
  }

  // 2. Check balance
  if (!hasEnoughBalance) {
    setError(`Insufficient balance...`);
    return;
  }

  setProcessing(true);

  try {
    // 3. Process payment (TODO: Implement actual TON payment)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Activate wallet
    const activated = await supabaseService.activateWallet(address, {
      activation_fee_usd: node.activationFee,
      activation_fee_ton: node.activationFee / tonPrice,
      ton_price: tonPrice,
      transaction_hash: `mock_tx_${Date.now()}`
    });

    // 5. Success
    if (activated) {
      alert('🎉 Success! Your wallet is now activated!');
      window.location.reload(); // Refresh to update activation status
    }
  } catch (err) {
    setError(err.message);
  }
};
```

---

### 6️⃣ Database Activation (`activate_wallet` function)

**What Happens in Database:**

```sql
-- 1. Validate wallet exists
SELECT id, is_activated 
FROM wallet_users 
WHERE wallet_address = p_wallet_address;

-- 2. Check not already activated
IF v_already_activated THEN
  RAISE EXCEPTION 'Wallet already activated';
END IF;

-- 3. Update wallet_users
UPDATE wallet_users
SET is_activated = TRUE,
    activated_at = NOW(),
    activation_fee_paid = p_activation_fee_ton,
    updated_at = NOW()
WHERE wallet_address = p_wallet_address;

-- 4. Record activation
INSERT INTO wallet_activations (
  user_id,
  wallet_address,
  activation_fee_usd,
  activation_fee_ton,
  ton_price_at_activation,
  transaction_hash,
  status,
  completed_at
) VALUES (
  v_user_id,
  p_wallet_address,
  p_activation_fee_usd,
  p_activation_fee_ton,
  p_ton_price,
  p_transaction_hash,
  'completed',
  NOW()
);

-- 5. Create notification
INSERT INTO wallet_notifications (
  user_id,
  wallet_address,
  type,
  title,
  message,
  priority
) VALUES (
  v_user_id,
  p_wallet_address,
  'system_announcement',
  'Wallet Activated Successfully!',
  'Welcome to RhizaCore! Your wallet is now fully activated...',
  'high'
);
```

**Database Changes:**
```sql
-- wallet_users
is_activated = TRUE
activated_at = '2026-02-27 01:13:59'
activation_fee_paid = 0.01

-- wallet_activations (new record)
id = uuid
user_id = user's UUID
wallet_address = user's address
activation_fee_usd = 0.025
activation_fee_ton = 0.01
ton_price_at_activation = 2.50
transaction_hash = 'mock_tx_...'
status = 'completed'
completed_at = NOW()

-- wallet_notifications (new record)
type = 'system_announcement'
title = 'Wallet Activated Successfully!'
message = 'Welcome to RhizaCore!...'
priority = 'high'
```

---

### 7️⃣ Page Reload & Activation Check

**After `window.location.reload()`:**

```typescript
// App.tsx - useEffect runs on mount
useEffect(() => {
  const checkActivationStatus = async () => {
    if (!address || !isLoggedIn || !isWalletMode) {
      setWalletActivated(true);
      return;
    }

    try {
      // Call database function
      const data = await supabaseService.checkWalletActivation(address);

      if (data) {
        const isActivated = data.is_activated || false;
        setWalletActivated(isActivated); // ✅ Now TRUE
      }
    } catch (err) {
      console.error('Activation check error:', err);
    }
  };

  checkActivationStatus();
}, [address, isLoggedIn, isWalletMode]);
```

**Database Query:**
```sql
-- check_wallet_activation function
SELECT 
  is_activated,      -- TRUE
  activated_at,      -- '2026-02-27 01:13:59'
  activation_fee_paid -- 0.01
FROM wallet_users
WHERE wallet_address = p_wallet_address;
```

---

### 8️⃣ Lock Overlay Disappears

**Conditional Rendering Logic:**

```typescript
// App.tsx
const allowedPagesWhenLocked = ['/wallet/mining', '/wallet/receive'];
const isOnAllowedPage = allowedPagesWhenLocked.includes(location.pathname);

return (
  <>
    {/* Lock overlay only shows when ALL conditions are true */}
    {!isLoadingActivation &&      // ✅ Not loading
     !walletActivated &&           // ❌ NOW FALSE (activated)
     isLoggedIn &&                 // ✅ User logged in
     isWalletMode &&               // ✅ On wallet route
     !isOnAllowedPage && (         // Depends on page
      <WalletLockOverlay />
    )}
  </>
);
```

**Result:** Lock overlay does NOT render because `walletActivated = TRUE`

---

### 9️⃣ Full Access Granted

**User Can Now Access:**
- ✅ Dashboard (`/wallet/dashboard`)
- ✅ Assets (`/wallet/assets`)
- ✅ History (`/wallet/history`)
- ✅ Transfer (`/wallet/transfer`)
- ✅ Receive (`/wallet/receive`)
- ✅ Referral (`/wallet/referral`)
- ✅ Settings (`/wallet/settings`)
- ✅ AI Assistant (`/wallet/ai-assistant`)
- ✅ Notifications (`/wallet/notifications`)
- ✅ Activity Log (`/wallet/activity`)
- ✅ Mining Nodes (`/wallet/mining`)
- ✅ More (`/wallet/more`)

**User Sees:**
- Full wallet interface
- All navigation tabs enabled
- Complete feature access
- Welcome notification in notifications page

---

## 🔄 State Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    WALLET NOT ACTIVATED                      │
│  is_activated = FALSE                                        │
│  Lock Overlay Visible                                        │
│  Access: Mining Nodes + Receive Only                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ User purchases mining node
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   PURCHASE PROCESSING                        │
│  1. Validate balance                                         │
│  2. Process payment (TODO: Real TON payment)                 │
│  3. Call activateWallet()                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Database function executes
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE ACTIVATION                         │
│  1. Update wallet_users.is_activated = TRUE                  │
│  2. Insert wallet_activations record                         │
│  3. Create notification                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Page reloads
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  ACTIVATION CHECK                            │
│  checkWalletActivation(address)                              │
│  Returns: is_activated = TRUE                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ State updates
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    WALLET ACTIVATED                          │
│  is_activated = TRUE                                         │
│  Lock Overlay Hidden                                         │
│  Access: All Wallet Features                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 User Experience Flow

### Before Activation
```
┌──────────────────────────────────────────────────────┐
│                  LOCK OVERLAY                         │
│                                                       │
│              🔒 RhizaCore Wallet                      │
│                                                       │
│  Your wallet is currently inactive. Fund your         │
│  wallet and purchase a mining node to unlock          │
│  the ecosystem.                                       │
│                                                       │
│  💰 Balance: 0.5 TON ($1.25)                         │
│  🌐 Network: Testnet                                  │
│                                                       │
│  ┌────────────────────────────────────────┐          │
│  │      View Mining Nodes      →          │          │
│  └────────────────────────────────────────┘          │
│                                                       │
│  Step 1: Fund Wallet • Step 2: Purchase Node         │
└──────────────────────────────────────────────────────┘
```

### After Activation
```
┌──────────────────────────────────────────────────────┐
│                    DASHBOARD                          │
│                                                       │
│  Welcome back, User! 👋                               │
│                                                       │
│  💰 Total Balance: $1.25                             │
│  📊 Assets: 2                                         │
│  🎁 RZC Balance: 100 RZC                             │
│                                                       │
│  Recent Activity                                      │
│  • Wallet Activated - Just now                        │
│  • Mining Node Purchased - Just now                   │
│                                                       │
│  [Dashboard] [Assets] [History] [Referral] [More]    │
└──────────────────────────────────────────────────────┘
```

---

## 🔐 Security & Validation

### Balance Validation
- ✅ Checks balance before allowing purchase
- ✅ Prevents purchase if insufficient funds
- ✅ Shows exact amount needed vs available

### Activation Validation
- ✅ Prevents double activation
- ✅ Validates wallet exists in database
- ✅ Records transaction hash for audit trail
- ✅ Creates immutable activation record

### RLS (Row Level Security)
- ✅ Users can only view their own activations
- ✅ Users can only insert their own activations
- ✅ Prevents unauthorized access to activation data

---

## 📊 Database Tables Involved

### 1. `wallet_users`
```sql
-- Columns updated during activation
is_activated BOOLEAN DEFAULT FALSE
activated_at TIMESTAMP
activation_fee_paid DECIMAL(10,4)
updated_at TIMESTAMP
```

### 2. `wallet_activations`
```sql
-- New record created during activation
id UUID PRIMARY KEY
user_id UUID (FK to wallet_users)
wallet_address TEXT
activation_fee_usd DECIMAL(10,2)
activation_fee_ton DECIMAL(10,4)
ton_price_at_activation DECIMAL(10,2)
transaction_hash TEXT
status TEXT ('pending', 'completed', 'failed')
created_at TIMESTAMP
completed_at TIMESTAMP
```

### 3. `wallet_notifications`
```sql
-- Welcome notification created
id UUID PRIMARY KEY
user_id UUID (FK to wallet_users)
wallet_address TEXT
type TEXT ('system_announcement')
title TEXT ('Wallet Activated Successfully!')
message TEXT
priority TEXT ('high')
is_read BOOLEAN DEFAULT FALSE
created_at TIMESTAMP
```

---

## 🚀 Future Enhancements

### Payment Processing
Currently using mock payment. Need to implement:
- Real TON blockchain transaction
- Transaction confirmation
- Payment verification
- Refund handling for failed activations

### Mining Node Activation
After wallet activation, need to:
- Create mining node record in database
- Start mining rewards accumulation
- Track mining statistics
- Enable node management features

### Notification System
- Push notifications for activation
- Email confirmation
- SMS alerts (optional)
- In-app notification center

---

## 🐛 Troubleshooting

### Lock Overlay Still Showing After Purchase
**Cause:** Activation status not updated in frontend state
**Solution:** 
1. Check browser console for errors
2. Verify `checkWalletActivation()` is being called
3. Check database: `SELECT is_activated FROM wallet_users WHERE wallet_address = 'YOUR_ADDRESS'`
4. Try hard refresh (Ctrl+Shift+R)

### Purchase Fails with "Insufficient Balance"
**Cause:** Balance calculation or TON price mismatch
**Solution:**
1. Check actual TON balance in wallet
2. Verify TON price is correct
3. Ensure total cost calculation is accurate
4. Add buffer for gas fees

### Activation Function Fails
**Cause:** Database schema not set up correctly
**Solution:**
1. Run `fix_activation_schema.sql`
2. Verify tables exist
3. Check RLS policies
4. Test function manually in SQL Editor

---

## ✅ Success Indicators

After successful activation, you should see:

1. ✅ Lock overlay disappears
2. ✅ Full navigation menu accessible
3. ✅ Dashboard loads with data
4. ✅ Welcome notification appears
5. ✅ Database shows `is_activated = TRUE`
6. ✅ Activation record in `wallet_activations` table
7. ✅ No console errors

---

## 📝 Summary

The wallet activation flow is a seamless, automated process that:

1. **Guides users** through funding and node purchase
2. **Validates** balance and prevents errors
3. **Activates** wallet automatically upon purchase
4. **Records** all activation data for audit trail
5. **Unlocks** full wallet functionality immediately
6. **Notifies** user of successful activation

The system is designed to be secure, user-friendly, and fully automated with no manual intervention required.
