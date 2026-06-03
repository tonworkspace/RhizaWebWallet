# 💎 TON Payment Integration for Rhiza Launchpad

> **Status:** ✅ Production Ready | **Version:** 1.0.0 | **Integration Time:** ~30 minutes

Enable users to participate in token presales using TON cryptocurrency with automatic USD conversion, validation, and tracking.

---

## 🎯 What This Does

Allows users to buy presale tokens with **TON cryptocurrency** instead of USDC:
- 💰 Real-time TON/USD price conversion
- ✅ Automatic validation (min/max/balance/hard cap)
- 🔄 Seamless transaction processing
- 📊 Database tracking and analytics
- 🎨 Beautiful, user-friendly UI

---

## 🚀 Quick Start

### 1. Run Database Migration (5 min)

**⚠️ Important:** If you get a function error, see `TON_PAYMENT_MIGRATION_GUIDE.md`

```bash
# Via Supabase Dashboard → SQL Editor
# Option A: Standard migration
# Paste and run: add_ton_payment_support.sql

# Option B: Safe migration (recommended if you had errors)
# Paste and run: add_ton_payment_support_SAFE.sql
```

**Troubleshooting:** See `TON_PAYMENT_MIGRATION_GUIDE.md` for detailed help

### 2. Configure Project Wallet (2 min)
```sql
UPDATE launchpad_projects 
SET presale_wallet_address = 'UQD...' 
WHERE id = 'your-project-id';
```

### 3. Integrate Component (10 min)
```tsx
import { TonPresalePayment } from '../components/TonPresalePayment';

<TonPresalePayment
  project={project}
  userAddress={walletAddress}
  onSuccess={(txHash, tokens) => showSuccess()}
  onError={(error) => showError(error)}
/>
```

**Done!** 🎉

---

## 📦 What's Included

### Files Created
```
📁 Database
  └─ add_ton_payment_support.sql          ← Migration script

📁 Components
  └─ components/TonPresalePayment.tsx     ← UI component

📁 Services
  └─ services/launchpadService.ts         ← Updated with TON methods

📁 Documentation
  ├─ LAUNCHPAD_TON_PAYMENT_INTEGRATION.md ← Complete guide
  ├─ LAUNCHPAD_INTEGRATION_EXAMPLE.tsx    ← Code examples
  ├─ TON_PAYMENT_ARCHITECTURE.md          ← System design
  ├─ TON_PAYMENT_QUICK_REFERENCE.md       ← Quick reference
  └─ LAUNCHPAD_TON_PAYMENT_COMPLETE.md    ← Summary
```

---

## 🎨 User Experience

### Payment Flow
```
┌─────────────────────────────────────────────────────────┐
│  1. User selects "Pay with TON"                         │
│     ↓                                                    │
│  2. Enters TON amount (e.g., 20 TON)                    │
│     ↓                                                    │
│  3. Sees USD equivalent ($110) and tokens (5,500)       │
│     ↓                                                    │
│  4. Clicks "Buy with TON"                               │
│     ↓                                                    │
│  5. Reviews confirmation modal                          │
│     ↓                                                    │
│  6. Confirms transaction                                │
│     ↓                                                    │
│  7. Transaction sent to blockchain                      │
│     ↓                                                    │
│  8. Success! Tokens allocated                           │
└─────────────────────────────────────────────────────────┘
```

### UI Features
- 💎 Real-time TON balance display
- 💵 Automatic USD conversion
- ✅ Instant validation feedback
- 📊 Transaction preview
- 🎯 One-click MAX button
- ⚡ Network fee estimation
- 🎉 Success confirmation

---

## 🔧 Technical Details

### Database Schema
```sql
-- New columns in presale_transactions
payment_method TEXT DEFAULT 'usdc'  -- 'usdc' or 'ton'
amount_ton NUMERIC(20, 9)           -- TON amount paid

-- New column in launchpad_projects
presale_wallet_address TEXT         -- TON receiving wallet
```

### Key Methods
```typescript
// Process TON payment
launchpadService.processTonPayment({
  projectId, userAddress, amountTon,
  tonUsdPrice, walletService, presaleWalletAddress
})

// Get current TON price
launchpadService.getTonUsdPrice()

// Validate purchase
launchpadService.canUserPurchase({
  projectId, userAddress, amount
})
```

---

## 📊 Example Transaction

```typescript
// User Input
Amount: 20 TON

// Processing
TON Price: $5.50 (from CoinGecko)
USD Equivalent: 20 × 5.50 = $110
Presale Rate: 50 tokens per USD
Tokens: 110 × 50 = 5,500 tokens

// Database Record
{
  amount_usdc: 110,
  amount_ton: 20,
  payment_method: 'ton',
  tokens_received: 5500,
  tx_hash: '0x1234...',
  status: 'pending'
}

// Project Update
raised_amount: +$110
participant_count: +1
```

---

## ✅ Features

### Implemented
- [x] TON payment processing
- [x] Real-time price conversion (TON ↔ USD)
- [x] Purchase validation (min/max/balance/hard cap)
- [x] Transaction recording
- [x] Project statistics updates
- [x] Dual wallet service support
- [x] Confirmation modal
- [x] Error handling
- [x] Success notifications

### Security
- [x] Input validation
- [x] Address validation
- [x] Balance verification
- [x] Min/max enforcement
- [x] Hard cap checking
- [x] User confirmation required
- [x] Database constraints
- [x] RLS policies

---

## 🧪 Testing

### Quick Test
```typescript
// 1. Test price fetching
const { price } = await launchpadService.getTonUsdPrice();
console.log('TON Price:', price);

// 2. Test validation
const { canPurchase } = await launchpadService.canUserPurchase({
  projectId: 'abc-123',
  userAddress: 'UQD...',
  amount: 110
});

// 3. Test payment
const result = await launchpadService.processTonPayment({...});
console.log('Result:', result);
```

### Database Verification
```sql
-- Check transactions
SELECT * FROM presale_transactions 
WHERE payment_method = 'ton';

-- Check statistics
SELECT * FROM launchpad_payment_stats;
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **LAUNCHPAD_TON_PAYMENT_INTEGRATION.md** | Complete technical guide |
| **TON_PAYMENT_QUICK_REFERENCE.md** | Quick reference card |
| **TON_PAYMENT_ARCHITECTURE.md** | System architecture |
| **LAUNCHPAD_INTEGRATION_EXAMPLE.tsx** | Code examples |
| **LAUNCHPAD_TON_PAYMENT_COMPLETE.md** | Implementation summary |

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "TON price not available" | Fallback price used automatically |
| "Presale wallet not configured" | Set `presale_wallet_address` in DB |
| "Transaction sent but DB failed" | Transaction succeeded, manually create record |
| "Insufficient TON balance" | User needs to deposit more TON |

---

## 🚀 Deployment Checklist

### Pre-Deploy
- [ ] Run database migration
- [ ] Configure presale wallets
- [ ] Test on testnet
- [ ] Review security

### Deploy
- [ ] Deploy service updates
- [ ] Deploy new component
- [ ] Update ProjectDetail page
- [ ] Test on staging

### Post-Deploy
- [ ] Monitor transactions
- [ ] Check database records
- [ ] Verify project stats
- [ ] Gather feedback

---

## 📈 Analytics

Track these metrics:
- TON vs USDC payment distribution
- Average transaction size
- Price oracle reliability
- Transaction success rate
- User adoption rate

```sql
-- Payment method distribution
SELECT 
  payment_method,
  COUNT(*) as transactions,
  SUM(amount_usdc) as total_usd
FROM presale_transactions
WHERE status = 'confirmed'
GROUP BY payment_method;
```

---

## 🔄 Future Enhancements

### Phase 2
- [ ] Multi-source price oracle
- [ ] Transaction status polling
- [ ] Email notifications
- [ ] Admin dashboard
- [ ] Refund mechanism

### Phase 3
- [ ] Token vesting tracking
- [ ] Claim interface
- [ ] Staking integration
- [ ] Referral rewards
- [ ] Multi-chain support

---

## 💡 Pro Tips

1. **Test on testnet first** - Always test with testnet TON before mainnet
2. **Monitor first transactions** - Watch the first few transactions closely
3. **Update fallback price** - Keep the fallback TON price current
4. **Cache price data** - Consider Redis for price caching (1-min TTL)
5. **Add analytics** - Track TON vs USDC usage patterns
6. **User education** - Explain TON payment benefits to users

---

## 📞 Support

**Documentation:** See files listed above  
**Issues:** Check troubleshooting section  
**Questions:** Review the complete integration guide

---

## 🎉 Summary

**What:** TON cryptocurrency payment support for launchpad presales  
**Status:** ✅ Production Ready  
**Integration Time:** ~30 minutes  
**Result:** Users can buy presale tokens with TON

---

## 🏁 Get Started

1. **Read:** `LAUNCHPAD_TON_PAYMENT_INTEGRATION.md`
2. **Run:** Database migration
3. **Configure:** Presale wallet addresses
4. **Integrate:** Component in ProjectDetail
5. **Test:** On testnet
6. **Deploy:** To production

**Ready?** Start with the database migration! 🚀

---

**Version:** 1.0.0  
**Last Updated:** 2026-05-14  
**License:** MIT  
**Author:** Rhiza Development Team
