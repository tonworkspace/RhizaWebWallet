# RZC Token System - Quick Reference Card

## 🪙 What is RZC?

**RhizaCore (RZC)** = Community points earned for wallet activity and referrals

**NOT cryptocurrency** - Cannot be withdrawn or traded for TON/USD

## 💰 How to Earn RZC

| Action | RZC Reward | When |
|--------|-----------|------|
| Create Wallet | **100 RZC** | Immediately on signup |
| Refer a Friend | **50 RZC** | When they create wallet |
| 10 Referrals | **500 RZC** | Milestone bonus |
| 50 Referrals | **2,500 RZC** | Milestone bonus |
| 100 Referrals | **10,000 RZC** | Milestone bonus |

## 📍 Where to See RZC Balance

1. **Dashboard** - Profile greeting card (top of page)
2. **Referral Page** - Green badge showing "Community Tokens"

## 🔗 Key Files

### Frontend
- `services/rzcRewardService.ts` - Reward logic
- `services/supabaseService.ts` - Database operations (lines 1160-1282)
- `pages/CreateWallet.tsx` - Signup & referral bonus integration
- `pages/Dashboard.tsx` - RZC balance display
- `pages/Referral.tsx` - RZC balance & referral info

### Database
- `supabase_setup_simple.sql` - Schema & functions
  - Table: `wallet_users` (rzc_balance column)
  - Table: `wallet_rzc_transactions`
  - Function: `award_rzc_tokens()`

## 🎯 Testing Quick Commands

### Check User Balance
```sql
SELECT name, rzc_balance FROM wallet_users WHERE wallet_address = '[ADDRESS]';
```

### Check Recent RZC Transactions
```sql
SELECT type, amount, description, created_at 
FROM wallet_rzc_transactions 
WHERE user_id = '[USER_ID]' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Milestone Bonuses
```sql
SELECT * FROM wallet_rzc_transactions WHERE type = 'milestone_bonus';
```

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| RZC not showing | Check Supabase connection in .env |
| Referral bonus not awarded | Verify referral code in URL: `?ref=CODE` |
| Milestone not triggered | Check referral count matches threshold |
| Balance not updating | Refresh page or check console for errors |

## 📊 RZC Transaction Types

- `signup_bonus` - 100 RZC on wallet creation
- `referral_bonus` - 50 RZC per referral
- `milestone_bonus` - 500/2,500/10,000 RZC at milestones
- `transaction_bonus` - 1 RZC per transaction (future)
- `daily_login` - 5 RZC per day (future)

## 🔄 Referral Flow

```
1. User A creates wallet
   └─> Gets 100 RZC (signup bonus)
   └─> Gets referral code (last 8 chars of address)

2. User A shares link: /#/create-wallet?ref=ABCD1234

3. User B clicks link and creates wallet
   └─> Gets 100 RZC (signup bonus)
   └─> User A gets 50 RZC (referral bonus)
   └─> If User A hits milestone, gets bonus RZC

4. User A checks Referral page
   └─> Sees total RZC balance
   └─> Sees referral count
   └─> Sees next milestone progress
```

## 🎮 Future RZC Utility (Planned)

- **Governance:** 1 RZC = 1 vote on proposals
- **Premium Features:** Unlock advanced analytics
- **Marketplace:** Discounts on products/services
- **Staking Boost:** Higher APY for RZC holders
- **NFT Minting:** Reduced fees with RZC

## 🔐 Security Features

✅ All awards through database function (atomic)
✅ Frontend cannot modify balances directly
✅ Each user can only be referred once
✅ Self-referral prevented
✅ Milestone bonuses cannot be claimed twice

## 📱 UI Display Format

```typescript
// Dashboard
<p className="text-2xl font-black text-[#00FF88]">
  {userProfile.rzc_balance.toLocaleString()}
</p>

// Referral Page
<h3 className="text-4xl font-black text-[#00FF88]">
  {userProfile.rzc_balance.toLocaleString()} RZC
</h3>
```

## 🚀 Quick Test Scenario

1. Create wallet → Check Dashboard (should show 100 RZC)
2. Copy referral link from Referral page
3. Open incognito window → Use referral link
4. Create second wallet → Check first wallet (should show 150 RZC)
5. Repeat 8 more times → 10th referral triggers 500 RZC milestone

## 📞 Need Help?

- Review: `RZC_TOKEN_SYSTEM.md` (full documentation)
- Review: `RZC_TESTING_GUIDE.md` (detailed testing)
- Check: Browser console for error logs
- Verify: Supabase connection and schema

---

**Last Updated:** Task 10 - RZC Token System Implementation Complete
**Build Status:** ✅ Successful (18.98s)
**Database Status:** ✅ Schema ready (run supabase_setup_simple.sql)
