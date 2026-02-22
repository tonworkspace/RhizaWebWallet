# Referral System Cheat Sheet

## 🚀 Quick Commands

### Get Referral Link
```
Navigate to: /#/wallet/referral
Copy the link shown
```

### Test Referral Signup
```
Open: http://localhost:5173/#/create-wallet?ref=YOUR_CODE
Create wallet
Check console for logs
```

### Check Database
```sql
-- See all referrals
SELECT * FROM wallet_referrals ORDER BY total_referrals DESC;

-- See all earnings
SELECT * FROM wallet_referral_earnings ORDER BY created_at DESC;

-- Check specific user
SELECT * FROM wallet_referrals WHERE referral_code = 'YOUR_CODE';
```

---

## 📊 Commission Rates

```
0-10 referrals   → 5%   (Core Node)
11-50 referrals  → 7.5% (Silver Node)
51-100 referrals → 10%  (Gold Node)
100+ referrals   → 15%  (Elite Partner)
```

---

## 🔍 Console Logs to Watch

### Signup
```
✅ Looking up referrer with code: [CODE]
✅ Referrer found: [UUID]
✅ Incrementing referrer count...
✅ Referrer stats updated
```

### Transaction
```
✅ Processing referral reward for transaction: [TX]
✅ Commission rate: 5% (Core Node)
✅ Reward amount: 0.005 TON
✅ Referral reward processed
```

---

## 🐛 Quick Fixes

### Code not captured?
```typescript
// Check URL has ?ref= parameter
console.log(window.location.href);
```

### Count not incrementing?
```sql
-- Run this in Supabase
CREATE OR REPLACE FUNCTION increment_referral_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallet_referrals
  SET total_referrals = total_referrals + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
```

### Rewards not calculating?
```typescript
// Check transaction has fee
console.log('Transaction fee:', tx.fee);
// Check user has referrer
console.log('Referrer ID:', userReferral.referrer_id);
```

---

## 📁 Key Files

```
pages/CreateWallet.tsx          → Captures referral code
services/supabaseService.ts     → Database methods
services/referralRewardService.ts → Reward calculation
services/transactionSync.ts     → Processes rewards
pages/Referral.tsx              → Displays stats
```

---

## 🧪 Quick Test

```bash
# 1. Get code
Login → Referral page → Copy code

# 2. Test signup
Open: /#/create-wallet?ref=CODE
Create wallet
Check console

# 3. Test reward
Make transaction
Wait 30 seconds
Check console
Check database
```

---

## 💾 Database Tables

```
wallet_users
  └─ referrer_code (who referred me)

wallet_referrals
  ├─ referral_code (my code)
  ├─ referrer_id (who referred me)
  ├─ total_referrals (count)
  └─ total_earned (TON)

wallet_referral_earnings
  ├─ referrer_id
  ├─ referred_user_id
  ├─ amount
  └─ transaction_id
```

---

## 🎯 Example Flow

```
Alice → Code: ALICE123
Bob clicks: /#/create-wallet?ref=ALICE123
Bob creates wallet
Alice's count: 0 → 1 ✅

Bob sends 50 TON (fee: 0.1 TON)
Alice earns: 0.1 × 5% = 0.005 TON ✅
Alice's total: 0 → 0.005 TON ✅
```

---

## 📞 Need Help?

- **Technical:** See `REFERRAL_SYSTEM_EXPLAINED.md`
- **Testing:** See `REFERRAL_TESTING_CHECKLIST.md`
- **Quick Start:** See `REFERRAL_QUICK_REFERENCE.md`
- **Complete Guide:** See `REFERRAL_SYSTEM_COMPLETE.md`
