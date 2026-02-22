# Reward Claiming - Quick Summary

## ✅ What Was Implemented

Users can now claim their referral rewards directly from the Referral page!

### Features
1. **View Claimable Balance** - See available rewards to claim
2. **Claim Button** - One-click claim submission
3. **Validation** - Minimum amount (0.1 TON) and cooldown (24 hours)
4. **Claim Tracking** - View pending and completed claims
5. **Status Display** - Real-time claim eligibility status

---

## 🎯 How Users Claim Rewards

```
1. Navigate to Referral page (/#/wallet/referral)
2. See "Available to Claim" amount
3. Click "CLAIM REWARDS" button
4. Claim request submitted (status: pending)
5. Admin/system processes payout (24-48 hours)
6. TON sent to user's wallet
7. Claim status updated to "completed"
```

---

## 💾 Database Changes

### New Table: wallet_reward_claims
```sql
CREATE TABLE wallet_reward_claims (
  id UUID PRIMARY KEY,
  user_id UUID,
  amount NUMERIC(20, 8),
  wallet_address TEXT,
  status TEXT DEFAULT 'pending',
  tx_hash TEXT,
  claimed_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ
);
```

---

## 🔧 New Services

### RewardClaimService
- `canClaim()` - Check eligibility
- `initiateClaimRequest()` - Submit claim
- `getClaimStats()` - Get claim statistics
- `getTimeUntilNextClaim()` - Calculate cooldown

### SupabaseService (3 new methods)
- `getClaimableRewards()` - Calculate claimable amount
- `createRewardClaim()` - Create claim record
- `getClaimHistory()` - Fetch claim history

---

## 🎨 UI Updates

### Referral Page
Added claim section showing:
- Total Earned
- Already Claimed
- Available to Claim
- Claim button with status
- Pending claims indicator
- Cooldown timer

---

## ⚙️ Configuration

```typescript
MIN_CLAIM_AMOUNT = 0.1 TON      // Minimum to claim
CLAIM_COOLDOWN_HOURS = 24       // Hours between claims
```

---

## 🚨 Important Notes

### Payout Processing
Claims are created with status "pending" but **NOT automatically processed**.

You need to implement ONE of these:

#### Option 1: Manual Processing (Simplest)
- Admin views pending claims
- Admin manually sends TON
- Admin updates claim status

#### Option 2: Hot Wallet Automation (Recommended)
- System maintains hot wallet
- Cron job processes claims
- Automatic TON transfer

#### Option 3: Smart Contract (Advanced)
- Deploy reward distribution contract
- Users claim directly from contract
- Fully decentralized

---

## 🧪 Quick Test

```bash
# 1. Check claimable amount
Login → Referral page → See "Available to Claim"

# 2. Try to claim
Click "CLAIM REWARDS" button
Check for success message

# 3. Verify in database
SELECT * FROM wallet_reward_claims 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY claimed_at DESC;
```

---

## 📊 Claim Validation Rules

### Can Claim If:
- ✅ Claimable balance >= 0.1 TON
- ✅ 24 hours passed since last claim
- ✅ User is logged in
- ✅ No pending claims

### Cannot Claim If:
- ❌ Balance < 0.1 TON
- ❌ Claimed within last 24 hours
- ❌ Not logged in
- ❌ System error

---

## 🔒 Security Features

### Implemented
- ✅ Minimum claim amount (prevent spam)
- ✅ Cooldown period (prevent abuse)
- ✅ User authentication required
- ✅ Database validation

### To Add (Production)
- ⚠️ Fraud detection
- ⚠️ Maximum claim limits
- ⚠️ KYC for large amounts
- ⚠️ Hot wallet security

---

## 📁 Files Modified/Created

### Modified (3)
- `services/supabaseService.ts` - Added claim methods
- `pages/Referral.tsx` - Added claim UI
- `supabase_setup_simple.sql` - Added claims table

### Created (2)
- `services/rewardClaimService.ts` - Claim logic
- `REWARD_CLAIMING_SYSTEM.md` - Full documentation

---

## 🚀 Next Steps

### Immediate
1. Run updated SQL script in Supabase
2. Test claim functionality
3. Verify database records

### Short Term
1. Implement payout processing
2. Add admin dashboard for claims
3. Set up notifications

### Long Term
1. Automate with hot wallet
2. Add claim history page
3. Implement smart contract

---

## 💡 Example Scenario

```
Alice has earned 0.5 TON from referrals
Alice has claimed 0.3 TON previously
Alice's claimable balance: 0.2 TON

Alice clicks "CLAIM REWARDS"
→ Claim request created for 0.2 TON
→ Status: "pending"
→ Button disabled for 24 hours

Admin processes claim
→ Sends 0.2 TON to Alice's wallet
→ Updates status to "completed"
→ Records transaction hash

Alice's new stats:
- Total Earned: 0.5 TON
- Already Claimed: 0.5 TON
- Available to Claim: 0 TON
```

---

## 🐛 Common Issues

### "Claim Unavailable" Button
**Reasons:**
- Balance < 0.1 TON
- Claimed within 24 hours
- Not logged in

**Solution:** Check claim reason displayed below button

### Claim Not Showing
**Check:**
- Database record exists?
- Page refreshed?
- User ID correct?

### Wrong Claimable Amount
**Check:**
- Total earned correct?
- All claims counted?
- Database query working?

---

## 📞 Support

- **Full Documentation:** `REWARD_CLAIMING_SYSTEM.md`
- **Referral System:** `REFERRAL_SYSTEM_COMPLETE.md`
- **Testing Guide:** `REFERRAL_TESTING_CHECKLIST.md`

---

## ✅ Build Status

- TypeScript: ✅ No errors
- Vite Build: ✅ Successful (44.27s)
- All Diagnostics: ✅ Clean

---

**Status:** ✅ COMPLETE
**Ready for:** Testing & Payout Implementation
**Production:** Requires payout system
