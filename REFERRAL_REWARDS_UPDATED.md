# Referral Rewards System Updated

## Changes Made

### 1. Welcome Bonus (Activation)
- **Old**: 150 RZC
- **New**: 50 RZC ($5 at $0.10/RZC)
- **File**: `pages/MiningNodes.tsx`
- **Status**: ✅ Updated

### 2. Signup Referral Bonus
- **Old**: 25 RZC per signup
- **New**: 50 RZC ($5 at $0.10/RZC) per signup
- **Display**: Updated in `pages/Referral.tsx`
- **Status**: ✅ UI Updated (backend needs implementation)

### 3. Package Purchase Commission
- **New**: 10% of package purchase value
- **Example**: User buys $100 package → Referrer gets $10 (100 RZC)
- **Status**: ✅ Database function created, ⏳ Frontend integration needed

### 4. Team Sales Commission
- **New**: 1% of weekly team sales
- **Example**: Team makes $1000 in sales → User gets $10 (100 RZC)
- **Status**: ✅ Database functions created, ⏳ Cron job needed

## Updated Reward Structure

| Reward Type | Amount | Frequency | Status |
|------------|--------|-----------|--------|
| Welcome Bonus | $5 (50 RZC) | One-time | ✅ Active |
| Signup Bonus | $5 (50 RZC) | Per referral | ⏳ Needs backend |
| Package Commission | 10% of value | Per purchase | ⏳ Needs integration |
| Team Sales | 1% of sales | Weekly | ⏳ Needs cron job |

## Files Modified

### Frontend
1. **pages/MiningNodes.tsx**
   - Changed activation-only rzcReward: 150 → 50
   - Updated success message to show "$5 (50 RZC)"
   - Updated feature description

2. **pages/Referral.tsx**
   - Changed "Signup Bonus" from "25 RZC" to "$5 (50 RZC)"
   - Changed "Milestone Bonus" to "Package Commission" (10%)
   - Changed "Rank Upgrade" to "Team Sales Bonus" (1% weekly)

### Backend
3. **update_referral_rewards.sql** (New)
   - Created `award_package_purchase_commission()` function
   - Created `calculate_weekly_team_sales_commissions()` function
   - Created `payout_weekly_team_sales_commissions()` function
   - Created `team_sales_weekly` table

## Implementation Steps

### ✅ Step 1: Run Database Setup
```bash
# Run in Supabase SQL Editor
update_referral_rewards.sql
```

### ⏳ Step 2: Integrate Package Commission
In `pages/MiningNodes.tsx`, after successful purchase, call:
```typescript
// Award 10% commission to referrer
if (profileResult.data.referrer_id) {
  await supabaseService.client.rpc('award_package_purchase_commission', {
    p_buyer_user_id: userId,
    p_package_price_usd: pkg.pricePoint,
    p_package_name: pkg.tierName,
    p_transaction_hash: paymentResult.txHash
  });
}
```

### ⏳ Step 3: Update Signup Bonus Amount
The signup bonus is currently hardcoded somewhere in the backend. Need to find and update from 25 RZC to 50 RZC.

**Search for**: Functions or triggers that award signup bonuses
**Update**: Change amount from 25 to 50

### ⏳ Step 4: Setup Weekly Cron Job
Create a cron job (using Supabase Edge Functions or external service) to run every Monday:

```sql
-- Calculate commissions for previous week
SELECT * FROM calculate_weekly_team_sales_commissions(
  (CURRENT_DATE - INTERVAL '7 days')::DATE,
  CURRENT_DATE::DATE
);

-- Pay out commissions
SELECT * FROM payout_weekly_team_sales_commissions(
  (CURRENT_DATE - INTERVAL '7 days')::DATE
);
```

## Testing Checklist

### Welcome Bonus
- [ ] Create new wallet
- [ ] Activate with $15
- [ ] Verify receives 50 RZC (not 150)
- [ ] Check success message shows "$5 (50 RZC)"

### Signup Bonus
- [ ] User A refers User B
- [ ] User B signs up
- [ ] Verify User A receives 50 RZC (not 25)
- [ ] Check transaction type is 'signup_bonus'

### Package Commission
- [ ] User A refers User B
- [ ] User B purchases $100 package
- [ ] Verify User A receives 100 RZC (10% of $100)
- [ ] Check transaction type is 'referral_commission'

### Team Sales Commission
- [ ] User A has downline (User B, User C)
- [ ] User B and C purchase packages ($500 total)
- [ ] Run weekly calculation
- [ ] Verify User A receives 50 RZC (1% of $500)
- [ ] Check transaction type is 'team_sales_commission'

## Current Referral System Status

### ✅ Working
- Referral tracking (wallet_referrals table)
- Upline/Downline relationships
- RZC transaction recording
- Referral link generation
- Downline display in UI

### ⏳ Needs Implementation
- Signup bonus amount update (25 → 50 RZC)
- Package purchase commission (10%)
- Team sales commission (1% weekly)
- Weekly payout automation

### ❌ Not Working
- None identified (system is functional, just needs new features)

## RZC Price Assumption

All calculations assume:
- **RZC Price**: $0.10 per RZC
- **$5 = 50 RZC**
- **$10 = 100 RZC**
- **$100 = 1000 RZC**

If RZC price changes, update the `v_rzc_price` variable in the database functions.

## Next Steps

1. ✅ Run `update_referral_rewards.sql` in Supabase
2. ⏳ Find and update signup bonus amount (25 → 50)
3. ⏳ Integrate package commission in MiningNodes.tsx
4. ⏳ Setup weekly cron job for team sales
5. ⏳ Test all reward types
6. ⏳ Monitor and adjust RZC price as needed

## Support

If you need help:
1. Check Supabase logs for errors
2. Verify functions exist: `SELECT * FROM pg_proc WHERE proname LIKE '%commission%';`
3. Check transactions: `SELECT * FROM rzc_transactions ORDER BY created_at DESC LIMIT 10;`
4. Verify team sales table: `SELECT * FROM team_sales_weekly;`
