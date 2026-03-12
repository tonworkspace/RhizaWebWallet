# 🚀 Quick Start: Referral Rewards System

## ✅ What's Done
- Frontend updated (MiningNodes.tsx, Referral.tsx)
- SQL script created (update_referral_rewards_CLEAN.sql)
- Package commission integration complete
- Welcome bonus updated (150 → 50 RZC)

## 🎯 What You Need to Do

### 1. Run SQL Script (5 min) - REQUIRED
```bash
1. Open Supabase Dashboard → SQL Editor
2. Copy content from: update_referral_rewards_CLEAN.sql
3. Paste and click "Run"
4. Wait for success message
```

### 2. Test It (10 min) - RECOMMENDED
```bash
1. Create two test wallets (A and B)
2. A refers B (B uses A's referral code)
3. B purchases $100 package
4. Check A's RZC balance → should increase by 100 RZC
```

### 3. Optional Tasks (Later)
- Update signup bonus: 25 RZC → 50 RZC
- Setup weekly cron for team sales (1%)

---

## 📊 New Reward Structure

| Type | Amount | When |
|------|--------|------|
| Welcome | $5 (50 RZC) | Activation |
| Signup | $5 (50 RZC) | Referral joins |
| Package | 10% | Referral buys |
| Team Sales | 1% | Weekly |

---

## 🧪 Quick Test

After running SQL:
```sql
-- Check functions exist (should return 3)
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE '%commission%';

-- Check table exists (should return 1)
SELECT table_name FROM information_schema.tables
WHERE table_name = 'team_sales_weekly';
```

---

## 📁 Key Files

- `update_referral_rewards_CLEAN.sql` - Run this in Supabase
- `REFERRAL_REWARDS_READY.md` - Full deployment guide
- `REFERRAL_SYSTEM_IMPLEMENTATION_STATUS.md` - Detailed status

---

## ⚡ That's It!

Run the SQL script and you're done. Package commissions will work automatically!
