# Tier Activation Fees - Correct Implementation ✅

## Overview
The system has two types of activation fees that serve different purposes:
1. **Wallet Activation Fee** ($15 one-time) - Unlocks the wallet
2. **Tier Activation Fees** (Premium: $45, VIP: $120) - Tier-specific fees that are ALWAYS charged

## Fee Structure

### 1. Wallet Activation ($15 - One Time Only)
- **Purpose**: Unlock full wallet access
- **Payment**: Via "Wallet Activation" node ($15)
- **Benefit**: 150 RZC welcome bonus
- **Frequency**: One-time only, never charged again
- **Applies to**: All users, regardless of tier

### 2. Standard Tier (No Tier Fee)
Once wallet is activated, Standard tier nodes have NO additional fees:

| Node | Price | Wallet Activation | Tier Fee | Total |
|------|-------|-------------------|----------|-------|
| Bronze | $100 | $0 (if activated) | $0 | $100 |
| Bronze+ | $200 | $0 (if activated) | $0 | $200 |
| Silver | $300 | $0 (if activated) | $0 | $300 |
| Silver+ | $400 | $0 (if activated) | $0 | $400 |

**Before Wallet Activation:**
- Bronze: $100 + $15 = $115
- After activation: $100 only

### 3. Premium Tier ($45 Tier Fee - ALWAYS Charged)
Premium tier has a $45 tier activation fee that is ALWAYS charged:

| Node | Price | Wallet Activation | Tier Fee | Total |
|------|-------|-------------------|----------|-------|
| Gold | $500 | $0 (if activated) | $45 | $545 |
| Gold+ | $600 | $0 (if activated) | $45 | $645 |
| Platinum | $700 | $0 (if activated) | $45 | $745 |
| Platinum+ | $1000 | $0 (if activated) | $45 | $1045 |

**Important**: The $45 fee is a Premium tier activation, NOT a wallet activation. It's charged every time you purchase a Premium node.

### 4. VIP Tier ($120 Tier Fee - ALWAYS Charged)
VIP tier has a $120 shareholder activation fee that is ALWAYS charged:

| Node | Price | Wallet Activation | Tier Fee | Total |
|------|-------|-------------------|----------|-------|
| Silver Shareholder | $2000 | $0 (if activated) | $120 | $2120 |
| Gold Shareholder | $5000 | $0 (if activated) | $120 | $5120 |
| Platinum Shareholder | $10000 | $0 (if activated) | $120 | $10120 |

**Important**: The $120 fee is a VIP shareholder activation, NOT a wallet activation. It's charged every time you purchase a VIP node.

## Why Different Fees?

### Wallet Activation ($15)
- **Purpose**: Basic access control
- **Prevents**: Spam and abuse
- **Unlocks**: All wallet features
- **One-time**: Never charged again

### Premium Tier Fee ($45)
- **Purpose**: Premium features access
- **Includes**: 
  - 2x-4x mining power
  - Instant withdrawals
  - Early beta access
  - Premium support
  - Enhanced referrals (7% direct, 3% indirect)
- **Per-node**: Charged for each Premium node

### VIP Tier Fee ($120)
- **Purpose**: Shareholder status
- **Includes**:
  - Revenue share (5%-20%)
  - Governance rights
  - Exclusive airdrops
  - NFT certificates
  - White-glove support
  - Private community access
- **Per-node**: Charged for each VIP node

## User Journey Examples

### Example 1: Standard Tier User
```
1. Pay $15 → Wallet Activation
   - Get 150 RZC bonus
   - Wallet unlocked

2. Buy Bronze ($100)
   - Pay: $100 only
   - No additional fees

3. Buy Silver ($300)
   - Pay: $300 only
   - No additional fees
```

### Example 2: Premium Tier User
```
1. Pay $15 → Wallet Activation
   - Get 150 RZC bonus
   - Wallet unlocked

2. Buy Gold ($500)
   - Pay: $500 + $45 = $545
   - $45 is Premium tier fee

3. Buy Gold+ ($600)
   - Pay: $600 + $45 = $645
   - $45 tier fee charged again
```

### Example 3: VIP Tier User
```
1. Pay $15 → Wallet Activation
   - Get 150 RZC bonus
   - Wallet unlocked

2. Buy Silver Shareholder ($2000)
   - Pay: $2000 + $120 = $2120
   - $120 is VIP shareholder fee

3. Buy Gold Shareholder ($5000)
   - Pay: $5000 + $120 = $5120
   - $120 tier fee charged again
```

### Example 4: Mixed Tier User
```
1. Pay $15 → Wallet Activation
   - Wallet unlocked

2. Buy Bronze ($100)
   - Pay: $100 (no tier fee)

3. Buy Gold ($500)
   - Pay: $500 + $45 = $545
   - Premium tier fee applies

4. Buy Silver Shareholder ($2000)
   - Pay: $2000 + $120 = $2120
   - VIP tier fee applies

5. Buy Bronze+ ($200)
   - Pay: $200 (no tier fee)
   - Back to Standard tier
```

## Visual Indicators

### Node Cards

**Standard Tier (Activated):**
```
$100
No activation fee ✓
Wallet activated - Pay node price only
```

**Premium Tier:**
```
$500
+ $45 tier fee
Premium tier includes $45 tier activation fee
```

**VIP Tier:**
```
$2000
+ $120 tier fee
VIP tier includes $120 shareholder activation fee
```

### Purchase Modal

**Standard Tier (Activated):**
```
Node Price:      $100
Activation Fee:  ✓ Wallet Activated
─────────────────────
Total:           $100
```

**Premium Tier:**
```
Node Price:      $500
Premium Tier Fee: $45
─────────────────────
Total:           $545
```

**VIP Tier:**
```
Node Price:      $2000
VIP Tier Fee:    $120
─────────────────────
Total:           $2120
```

## Key Differences

| Aspect | Wallet Activation | Tier Fees |
|--------|------------------|-----------|
| Amount | $15 | $45 (Premium) / $120 (VIP) |
| Frequency | One-time only | Per node purchase |
| Purpose | Unlock wallet | Access tier features |
| Applies to | All users | Premium/VIP only |
| Can be waived | Yes (after first payment) | No (always charged) |
| Bonus | 150 RZC | None |

## Benefits of This Structure

1. **Fair Entry**: $15 wallet activation is affordable
2. **Tier Value**: Higher tiers justify their fees with better features
3. **Flexibility**: Users can mix tiers based on needs
4. **Clear Pricing**: Transparent fee structure
5. **Revenue Model**: Sustainable for platform

## Common Questions

**Q: Why do I pay $45 for each Premium node?**
A: The $45 is a tier activation fee that unlocks Premium features for that specific node. Each Premium node gets enhanced mining power, instant withdrawals, and premium support.

**Q: Why do I pay $120 for each VIP node?**
A: The $120 is a shareholder activation fee. Each VIP node makes you a shareholder with revenue share, governance rights, and exclusive benefits.

**Q: Can I avoid tier fees?**
A: No, tier fees are required for Premium and VIP nodes. However, Standard tier nodes have no tier fees after wallet activation.

**Q: Do I pay wallet activation again?**
A: No, the $15 wallet activation is one-time only. Once paid, you never pay it again.

**Q: What if I buy multiple Premium nodes?**
A: Each Premium node purchase includes the $45 tier fee. If you buy 3 Gold nodes, you pay ($500 + $45) × 3 = $1,635.

## Implementation Details

### Code Structure
```typescript
// Standard Tier - Conditional activation fee
activationFee: isActivated ? 0 : 15

// Premium Tier - Always charged
activationFee: 45

// VIP Tier - Always charged
activationFee: 120
```

### Display Logic
```typescript
// Show appropriate label
{node.tier === 'standard' ? 'activation' : 
 node.tier === 'premium' ? 'tier fee' : 
 'tier fee'}
```

## Related Files

- `pages/MiningNodes.tsx` - Node definitions and pricing
- `NO_REPEAT_ACTIVATION_FEE.md` - Wallet activation logic
- `ACTIVATION_BONUS_IMPLEMENTED.md` - 150 RZC bonus details

---

**Status**: ✅ Correct Implementation
**Date**: February 27, 2026
**Summary**: 
- Wallet activation: $15 one-time
- Standard tier: No tier fees
- Premium tier: $45 tier fee (always)
- VIP tier: $120 tier fee (always)
