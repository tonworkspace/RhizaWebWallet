# New Activation Flow - Activate First, Mine Later 🔄

## Overview
**New Strategy**: Users must activate wallet with $15 fee FIRST to unlock basic features. Mining Nodes become an optional premium upgrade afterward.

---

## 🎯 New Flow Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER CREATES WALLET                          │
│                  - is_activated = FALSE                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   USER LOGS IN                                  │
│              - Redirect to Dashboard                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              APP CHECKS ACTIVATION                              │
│              - is_activated = FALSE                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           LOCK OVERLAY + WIZARD AUTO-OPENS                      │
│           (Protocol-style activation wizard)                    │
│                                                                 │
│  Step 1: INTRO                                                 │
│    - Show: $15 activation fee                                  │
│    - Show: 150 RZC genesis grant                               │
│    - Show: Basic features unlocked                             │
│    - Button: "Verify Protocol Integrity"                       │
│                                                                 │
│  Step 2: SCANNING                                              │
│    - Security analysis (1 sec)                                 │
│    - AI insights                                               │
│    - Protocol logs                                             │
│                                                                 │
│  Step 3: COMMITMENT                                            │
│    - Connect TON wallet                                        │
│    - Pay ~6.12 TON ($15)                                       │
│    - Button: "Commit X.XXXX TON"                               │
│                                                                 │
│  Step 4: BROADCASTING                                          │
│    - Send transaction (1.5 sec)                                │
│    - Show tx hash                                              │
│                                                                 │
│  Step 5: PROVISIONING                                          │
│    - Process activation (1.8 sec)                              │
│    - Award 150 RZC                                             │
│    - Update database                                           │
│                                                                 │
│  Step 6: SUCCESS                                               │
│    - Show: "150 RZC Provisioned"                               │
│    - Show: Transaction proof                                   │
│    - Show: Unlocked features                                   │
│    - Button: "Launch Dashboard"                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           WALLET ACTIVATED ✅                                   │
│           - is_activated = TRUE                                 │
│           - activated_at = NOW()                                │
│           - activation_fee_paid = 15                            │
│           - rzc_balance = 150                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           DASHBOARD UNLOCKED                                    │
│           - Full wallet access                                  │
│           - Send/Receive/Swap                                   │
│           - Referral system                                     │
│           - Basic features                                      │
│           - 150 RZC balance                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           MINING NODES (OPTIONAL UPGRADE)                       │
│           - Accessible from Dashboard CTA                       │
│           - Accessible from More page                           │
│           - Requires ADDITIONAL payment                         │
│           - Unlocks passive income                              │
│                                                                 │
│  Standard Tier: $100-$400                                      │
│    - 10-60 RZC/day mining                                      │
│    - $15 activation (already paid)                             │
│                                                                 │
│  Premium Tier: $500-$1K                                        │
│    - 100-250 RZC/day mining                                    │
│    - $45 activation                                            │
│                                                                 │
│  VIP Tier: $2K-$10K                                            │
│    - 400-3000 RZC/day mining                                   │
│    - $120 activation                                           │
│    - Revenue share + NFT                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Key Changes

### Before (Old Flow)
1. User creates wallet
2. Lock overlay shows
3. Modal shows 3 mining tiers
4. User must buy mining node to activate
5. Wallet activates after node purchase

### After (New Flow)
1. User creates wallet
2. Lock overlay shows
3. **Protocol wizard shows** (6 steps)
4. User pays **$15 activation fee**
5. Wallet activates + **150 RZC awarded**
6. Dashboard unlocked
7. Mining Nodes become **optional upgrade**

---

## 💰 Pricing Structure

### Wallet Activation (Required)
- **Cost**: $15 USD (~6.12 TON)
- **Reward**: 150 RZC tokens
- **Unlocks**: Basic wallet features
- **Process**: Protocol wizard (6 steps)

### Mining Nodes (Optional)
- **Standard**: $100-$400 (10-60 RZC/day)
- **Premium**: $500-$1K (100-250 RZC/day)
- **VIP**: $2K-$10K (400-3000 RZC/day + revenue share)
- **Note**: Standard tier activation fee ($15) already paid

---

## 📋 Implementation Plan

### Step 1: Update Database Schema
Keep existing schema but adjust logic:
- `is_activated` = wallet activation status ($15 fee)
- Mining nodes tracked separately in `mining_nodes` table

### Step 2: Replace Current Modal with Wizard
- Remove simple tier selection modal
- Integrate protocol wizard
- Update App.tsx to use wizard

### Step 3: Update Mining Nodes Page
- Remove activation requirement
- Make it accessible only AFTER activation
- Show as premium upgrade
- Adjust pricing (Standard tier already includes $15)

### Step 4: Update Dashboard
- Show Mining Nodes CTA as upgrade
- Emphasize passive income opportunity
- Make it optional, not required

---

## 🎨 User Experience

### New User Journey
1. **Create Wallet** → Account created
2. **Login** → Redirect to dashboard
3. **See Lock Overlay** → "Wallet Inactive"
4. **Protocol Wizard Opens** → 6-step activation
5. **Pay $15** → Connect wallet + send TON
6. **Receive 150 RZC** → Genesis grant
7. **Dashboard Unlocked** → Full access
8. **See Mining CTA** → "Upgrade to earn passive income"
9. **Optional: Buy Node** → Additional investment

### Benefits
- ✅ Lower barrier to entry ($15 vs $100+)
- ✅ Immediate value (150 RZC)
- ✅ Professional onboarding (wizard)
- ✅ Mining becomes upsell
- ✅ Better conversion rate

---

## 🔧 Technical Implementation

### 1. Create Protocol Wizard Component
File: `components/ProtocolActivationWizard.tsx`

Based on the advanced wizard but adapted for our system:
- Remove mining tier selection
- Focus on $15 activation
- Award 150 RZC
- Use existing database schema

### 2. Update App.tsx
Replace current modal with wizard:

```typescript
{!isLoadingActivation && !walletActivated && isLoggedIn && isWalletMode && (
  <ProtocolActivationWizard
    userId={userProfile?.id}
    userUsername={userProfile?.name}
    tonAddress={address}
    tonPrice={tonPrice}
    onClose={() => setShowActivationModal(false)}
    onActivationComplete={handleActivationComplete}
  />
)}
```

### 3. Update Mining Nodes Page
Make it accessible only after activation:

```typescript
// In MiningNodes.tsx
useEffect(() => {
  const checkActivation = async () => {
    if (!address) return;
    
    const data = await supabaseService.checkWalletActivation(address);
    if (!data?.is_activated) {
      navigate('/wallet/dashboard'); // Redirect if not activated
      showSnackbar({
        message: 'Activation Required',
        description: 'Please activate your wallet first',
        type: 'info'
      });
    }
  };
  
  checkActivation();
}, [address]);
```

### 4. Update Dashboard CTA
Change messaging from "Required" to "Upgrade":

```typescript
<div className="...">
  <h3>Upgrade to Mining Nodes</h3>
  <p>Start earning passive income with daily RZC rewards</p>
  <span className="badge">Optional Upgrade</span>
</div>
```

---

## 📊 Comparison

| Aspect | Old Flow | New Flow |
|--------|----------|----------|
| **Entry Cost** | $100-$10K | $15 |
| **Activation** | Buy mining node | Pay activation fee |
| **Reward** | Mining rewards | 150 RZC + mining option |
| **UI** | Simple modal | Protocol wizard |
| **Mining Nodes** | Required | Optional upgrade |
| **Conversion** | Lower (high cost) | Higher (low cost) |
| **Upsell** | None | Mining nodes |
| **User Value** | Immediate mining | Immediate wallet + optional mining |

---

## 🎯 Benefits of New Flow

### 1. Lower Barrier to Entry
- $15 vs $100+ minimum
- More users can afford
- Higher conversion rate

### 2. Better Onboarding
- Professional wizard
- Step-by-step process
- Real-time feedback
- Builds trust

### 3. Immediate Value
- 150 RZC tokens
- Full wallet access
- Can use immediately

### 4. Upsell Opportunity
- Mining nodes as premium
- Users already invested
- Higher lifetime value

### 5. Clearer Value Prop
- Activation = basic access
- Mining = passive income
- Two distinct products

---

## 🚀 Next Steps

1. **Create Protocol Wizard Component**
   - Adapt advanced wizard code
   - Remove mining tier selection
   - Focus on $15 activation
   - Award 150 RZC

2. **Update Database Functions**
   - Create `process_wallet_activation` RPC
   - Create `get_wallet_activation_status` RPC
   - Update activation logic

3. **Integrate Wizard in App.tsx**
   - Replace current modal
   - Add TON Connect provider
   - Handle activation complete

4. **Update Mining Nodes**
   - Add activation check
   - Change messaging to "upgrade"
   - Adjust pricing display

5. **Update Dashboard**
   - Change CTA messaging
   - Show as optional upgrade
   - Emphasize passive income

6. **Testing**
   - Test complete activation flow
   - Test mining nodes access
   - Test error scenarios
   - Test mobile responsiveness

---

## 📝 Summary

The new flow **separates wallet activation from mining nodes**:

**Wallet Activation** ($15):
- Required for basic access
- Professional wizard experience
- 150 RZC genesis grant
- Unlocks all wallet features

**Mining Nodes** ($100-$10K):
- Optional premium upgrade
- Passive income opportunity
- Accessible after activation
- Three tiers to choose from

This creates a **better funnel**:
1. Low-cost entry ($15)
2. Immediate value (150 RZC)
3. Professional onboarding (wizard)
4. Upsell opportunity (mining)
5. Higher conversion rate

Ready to implement?
