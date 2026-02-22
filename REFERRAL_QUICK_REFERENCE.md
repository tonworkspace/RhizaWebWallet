# Referral System - Quick Reference

## 🎯 How It Works (Simple Version)

### For Users
1. **Get your code**: Every user gets a unique referral code (e.g., "A1B2C3D4")
2. **Share your link**: `rhizacore.com/#/create-wallet?ref=A1B2C3D4`
3. **Earn rewards**: When referred users make transactions, you earn TON
4. **Level up**: More referrals = higher commission rates

### For Developers
1. **Capture code**: Extract `?ref=CODE` from URL during signup
2. **Link users**: Store referrer relationship in database
3. **Calculate rewards**: On each transaction, credit referrer based on commission tier
4. **Update stats**: Increment counts and totals in real-time

---

## 📊 Commission Rates

| Tier | Referrals | Commission | Bonus |
|------|-----------|------------|-------|
| Bronze | 0-10 | 5% | $10 |
| Silver | 11-50 | 7.5% | $50 |
| Gold | 51-100 | 10% | $150 |
| Platinum | 100+ | 15% | $500 |

---

## 💾 Database Tables

### wallet_users
- Stores basic user info
- `referrer_code`: Who referred THIS user

### wallet_referrals
- Stores referral stats
- `referral_code`: THIS user's code to share
- `referrer_id`: Who referred THIS user
- `total_earned`: Total TON earned
- `total_referrals`: Count of referrals

### wallet_referral_earnings
- Individual earning records
- Links referrer → referred user → transaction
- Tracks amount and commission percentage

---

## 🔧 Implementation Status

### ✅ Working
- Referral code generation
- Database structure
- UI display (code, stats, list)

### ❌ Not Working
- URL parameter capture (`?ref=CODE`)
- Referrer linking during signup
- Reward calculation on transactions
- Automatic count updates

---

## 🚀 Quick Fix (Priority Tasks)

### 1. Capture Referral Code (5 min)
```typescript
// In CreateWallet.tsx
import { useSearchParams } from 'react-router-dom';

const [searchParams] = useSearchParams();
const referralCode = searchParams.get('ref');
```

### 2. Link Referrer (10 min)
```typescript
// When creating profile
if (referralCode) {
  const referrer = await supabaseService.getUserByReferralCode(referralCode);
  if (referrer.success) {
    // Store referrer_code in wallet_users
    // Store referrer_id in wallet_referrals
    // Increment referrer's total_referrals
  }
}
```

### 3. Calculate Rewards (20 min)
```typescript
// After transaction confirmed
const fee = 0.1; // TON
const commission = 0.075; // 7.5% for Silver
const reward = fee * commission; // 0.0075 TON

// Save to wallet_referral_earnings
// Update referrer's total_earned
```

---

## 📝 Example Flow

```
1. Alice gets code: "ALICE123"
2. Alice shares: rhizacore.com/#/create-wallet?ref=ALICE123
3. Bob clicks link and creates wallet
4. Database stores: Bob.referrer_code = "ALICE123"
5. Database stores: Bob.referrer_id = Alice.id
6. Alice.total_referrals += 1
7. Bob makes transaction with 0.1 TON fee
8. Alice.rank = "Bronze" (5% commission)
9. Reward = 0.1 × 5% = 0.005 TON
10. Alice.total_earned += 0.005 TON
11. Record saved in wallet_referral_earnings
```

---

## 🧪 Testing

### Test Signup with Referral
```bash
# 1. Get User A's referral code from database
# 2. Open: http://localhost:5173/#/create-wallet?ref=A1B2C3D4
# 3. Create wallet
# 4. Check database:
#    - wallet_users.referrer_code = "A1B2C3D4"
#    - wallet_referrals.referrer_id = User A's ID
#    - User A's total_referrals = 1
```

### Test Reward Calculation
```bash
# 1. User B (referred by A) makes transaction
# 2. Check database:
#    - wallet_referral_earnings has new row
#    - User A's total_earned increased
#    - Correct commission percentage used
```

---

## 🐛 Common Issues

### Issue: Referral code not captured
**Cause**: Not reading URL parameters
**Fix**: Use `useSearchParams()` hook

### Issue: Referral count stays at 0
**Cause**: Not incrementing on signup
**Fix**: Call `incrementReferralCount()` after profile creation

### Issue: Rewards not calculating
**Cause**: No reward logic in transaction flow
**Fix**: Add `ReferralRewardService.processReferralReward()` call

### Issue: Wrong commission rate
**Cause**: Not checking referrer's rank
**Fix**: Get referrer's rank before calculating reward

---

## 📚 Files to Modify

1. **pages/CreateWallet.tsx**
   - Add URL parameter capture
   - Link new user to referrer
   - Increment referrer's count

2. **services/supabaseService.ts**
   - Add `incrementReferralCount()`
   - Add `recordReferralEarning()`

3. **services/referralRewardService.ts** (NEW)
   - Create reward calculation logic
   - Integrate with transaction sync

4. **services/transactionSync.ts**
   - Call reward service after transaction confirmed

5. **supabase_setup_simple.sql**
   - Add `increment_referral_count()` function

---

## 💡 Pro Tips

1. **Test with real URLs**: Use `?ref=` parameter in browser
2. **Check database directly**: Verify data is being stored
3. **Use console logs**: Track referral flow in browser console
4. **Start simple**: Get signup working before rewards
5. **Test edge cases**: No referrer, invalid code, self-referral

---

## 🎓 Learning Resources

- **REFERRAL_SYSTEM_EXPLAINED.md**: Full technical details
- **REFERRAL_FLOW_DIAGRAM.md**: Visual flow diagrams
- **supabase_setup_simple.sql**: Database schema
- **services/supabaseService.ts**: API methods

---

## ❓ FAQ

**Q: Where do rewards come from?**
A: Platform takes a cut of transaction fees and distributes to referrers

**Q: When are rewards paid?**
A: Currently tracked in database only. Need payout system for actual TON transfer

**Q: Can users refer themselves?**
A: Should add validation to prevent this

**Q: What if referral code is invalid?**
A: Signup continues normally, just no referrer linked

**Q: How to prevent fraud?**
A: Need to add: minimum transaction amounts, holding periods, KYC

---

## 🔗 Related Documentation

- Database Schema: `DATABASE_SCHEMA_OVERVIEW.md`
- Supabase Setup: `SUPABASE_COMPLETE_SETUP.md`
- Testing Guide: `TESTING_GUIDE.md`
- Admin Dashboard: `ADMIN_DASHBOARD_GUIDE.md`
