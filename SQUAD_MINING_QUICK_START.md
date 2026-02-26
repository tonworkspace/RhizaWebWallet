# Squad Mining - Quick Start Guide 🚀

## ✅ Status: READY TO DEPLOY

All TypeScript errors resolved. System fully integrated with referral network.

---

## 🎯 What Is Squad Mining?

Squad mining lets users earn RZC tokens every 8 hours based on their referral network size:
- **2 RZC** per regular squad member
- **5 RZC** per premium squad member
- **Automatic calculation** from existing referral downline

---

## 📋 Installation (3 Steps)

### Step 1: Run Database Migration

Open Supabase SQL Editor and execute:
```
add_squad_mining_system_FIXED.sql
```

This adds:
- New columns to `wallet_users` table
- New `wallet_squad_claims` table
- Database functions for stats and claiming
- Indexes for performance

### Step 2: Verify Installation

Run this in SQL Editor:
```sql
-- Check if columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'wallet_users' 
AND column_name IN ('last_squad_claim_at', 'total_squad_rewards', 'is_premium');

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'wallet_squad_claims'
);

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('claim_squad_rewards', 'get_squad_mining_stats');
```

Expected results:
- 3 columns found
- Table exists: true
- 2 functions found

### Step 3: Test in Browser

1. Open your app
2. Navigate to Referral page
3. Look for "Squad Mining" card
4. Should show:
   - Squad size (your downline count)
   - Potential reward (RZC claimable)
   - Total earned (lifetime)
   - Claim button or countdown timer

---

## 🎮 How It Works

### For Users

1. **Refer friends** using your referral link
2. **Wait 8 hours** after last claim
3. **Click "Claim"** button on Referral page
4. **Receive RZC** instantly to your balance

### Behind the Scenes

```
User clicks "Claim"
    ↓
Check if 8 hours passed
    ↓
Count squad members (downline)
    ↓
Calculate reward (2 or 5 RZC per member)
    ↓
Award RZC tokens
    ↓
Update last claim timestamp
    ↓
Show success notification
```

---

## 💰 Reward Examples

### Example 1: Small Squad
- 5 regular members
- Reward: 5 × 2 = **10 RZC per claim**
- Daily potential: 30 RZC (3 claims)

### Example 2: Medium Squad
- 20 regular members
- Reward: 20 × 2 = **40 RZC per claim**
- Daily potential: 120 RZC (3 claims)

### Example 3: Mixed Squad
- 15 regular members: 15 × 2 = 30 RZC
- 5 premium members: 5 × 5 = 25 RZC
- Total: **55 RZC per claim**
- Daily potential: 165 RZC (3 claims)

### Example 4: Large Premium Squad
- 50 premium members
- Reward: 50 × 5 = **250 RZC per claim**
- Daily potential: 750 RZC (3 claims)

---

## 👑 Premium Members

### What is Premium?

Premium members earn 5 RZC per claim instead of 2 RZC.

### How to Grant Premium Status

```sql
-- Make a user premium
UPDATE wallet_users 
SET is_premium = true 
WHERE wallet_address = '0x...';

-- Or by user ID
UPDATE wallet_users 
SET is_premium = true 
WHERE id = 'user-uuid-here';
```

### Check Premium Status

```sql
-- List all premium members
SELECT wallet_address, name, is_premium, total_squad_rewards
FROM wallet_users
WHERE is_premium = true;
```

---

## 🧪 Testing Guide

### Test 1: View Stats

1. Open Referral page
2. Find "Squad Mining" card
3. Verify it shows:
   - Squad Size: (your downline count)
   - Per Claim: (calculated RZC)
   - Total Earned: 0 (initially)

### Test 2: Check Countdown

If you haven't claimed yet:
- Button should say "Claim X RZC"
- Should be clickable

If you claimed recently:
- Button should show "Next Claim in Xh Xm"
- Should be disabled

### Test 3: Claim Rewards

1. Ensure 8 hours passed since last claim
2. Click "Claim" button
3. Should see:
   - Loading spinner
   - Success message
   - RZC balance increases
   - Button changes to countdown

### Test 4: Verify Database

```sql
-- Check your claim history
SELECT * FROM wallet_squad_claims 
WHERE user_id = 'your-user-id' 
ORDER BY claimed_at DESC;

-- Check RZC transactions
SELECT * FROM wallet_rzc_transactions 
WHERE user_id = 'your-user-id' 
AND description LIKE '%squad mining%';
```

---

## 🔧 Configuration

### Adjust Claim Interval

Default is 8 hours. To change:

```typescript
// In services/squadMiningService.ts
private readonly CLAIM_INTERVAL_HOURS = 8; // Change this
```

### Adjust Reward Amounts

```typescript
// In services/squadMiningService.ts
private readonly REWARD_PER_MEMBER = 2; // Regular members
private readonly PREMIUM_REWARD_PER_MEMBER = 5; // Premium members
```

---

## 📊 Monitoring

### View All Claims

```sql
SELECT 
  u.wallet_address,
  u.name,
  sc.squad_size,
  sc.reward_amount,
  sc.premium_members,
  sc.claimed_at
FROM wallet_squad_claims sc
JOIN wallet_users u ON sc.user_id = u.id
ORDER BY sc.claimed_at DESC
LIMIT 20;
```

### Total RZC Distributed

```sql
SELECT 
  COUNT(*) as total_claims,
  SUM(reward_amount) as total_rzc_distributed,
  AVG(reward_amount) as avg_per_claim,
  AVG(squad_size) as avg_squad_size
FROM wallet_squad_claims;
```

### Top Squad Miners

```sql
SELECT 
  u.wallet_address,
  u.name,
  u.total_squad_rewards,
  COUNT(sc.id) as total_claims,
  (SELECT COUNT(*) FROM wallet_referrals WHERE referrer_id = u.id) as squad_size
FROM wallet_users u
LEFT JOIN wallet_squad_claims sc ON u.id = sc.user_id
WHERE u.total_squad_rewards > 0
GROUP BY u.id, u.wallet_address, u.name, u.total_squad_rewards
ORDER BY u.total_squad_rewards DESC
LIMIT 10;
```

---

## 🐛 Troubleshooting

### "No squad members to claim from"

**Cause:** User has no referrals yet  
**Solution:** Share referral link to build squad

### "Must wait X hours before next claim"

**Cause:** 8-hour cooldown active  
**Solution:** Wait until countdown reaches zero

### Squad size shows 0 but I have referrals

**Cause:** Referral system not properly linked  
**Solution:** Check `wallet_referrals` table:
```sql
SELECT * FROM wallet_referrals WHERE referrer_id = 'your-user-id';
```

### Claim button not working

**Cause:** Multiple possibilities  
**Solution:** Check browser console for errors

### RZC balance not updating

**Cause:** `award_rzc_tokens()` function missing  
**Solution:** Verify function exists:
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'award_rzc_tokens';
```

---

## 🔐 Security Notes

- ✅ 8-hour cooldown enforced at database level
- ✅ Row Level Security (RLS) policies active
- ✅ Unique transaction IDs prevent duplicates
- ✅ User authentication required
- ✅ Input validation on all parameters

---

## 📱 UI Features

### Squad Mining Card

Located on Referral page, shows:
- **Header:** "Squad Mining" with lightning icon
- **Stats Grid:** Squad size, per claim, total earned
- **Countdown:** Live timer until next claim
- **Claim Button:** Green when ready, gray when on cooldown
- **Success Message:** Shows after successful claim

### Visual Indicators

- 🟢 Green button = Ready to claim
- ⏰ Gray button = On cooldown
- ⚡ Lightning icon = Squad mining
- 👑 Crown icon = Premium member
- 🎉 Success animation = Claim successful

---

## 🚀 Performance

### Database Optimizations

- Indexed user_id for fast lookups
- Indexed claimed_at for time queries
- Indexed is_premium for filtering
- Database functions reduce round trips

### Frontend Optimizations

- Countdown updates every 60 seconds (not every second)
- Stats cached until claim
- Fallback to manual calculation if DB function fails
- Graceful error handling

---

## 📈 Growth Strategies

### Encourage Squad Building

1. Show potential earnings in UI
2. Display squad size prominently
3. Highlight premium member benefits
4. Show leaderboard of top earners

### Premium Member Incentives

1. Offer premium status as reward
2. Create premium tiers
3. Show premium badge in UI
4. Exclusive features for premium

### Gamification

1. Squad size milestones
2. Earning streaks
3. Leaderboards
4. Achievement badges

---

## 🎯 Success Metrics

Track these KPIs:
- Total claims per day
- Average squad size
- RZC distributed
- Premium member conversion
- User retention (claim frequency)

---

## ✅ Checklist

Before going live:

- [ ] Database migration completed
- [ ] Functions verified working
- [ ] UI displays correctly
- [ ] Claim button functional
- [ ] Countdown timer accurate
- [ ] RZC balance updates
- [ ] Notifications working
- [ ] Error handling tested
- [ ] Premium status tested
- [ ] Performance acceptable

---

## 🎉 You're Ready!

The squad mining system is fully integrated and ready to use. Users can now:
1. Build their squad through referrals
2. Claim RZC rewards every 8 hours
3. Earn more with premium members
4. Track their earnings over time

**Happy mining! 🚀**
