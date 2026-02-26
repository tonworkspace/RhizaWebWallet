# Referral Rewards Updated - Halved ✅

## Changes Applied

All referral rewards have been halved across the system.

---

## New Reward Structure

### Before → After

| Reward Type | Old Amount | New Amount | Change |
|-------------|------------|------------|--------|
| Signup Bonus | 100 RZC | **50 RZC** | -50% |
| Referral Bonus | 50 RZC | **25 RZC** | -50% |
| Milestone (10 refs) | 500 RZC | **250 RZC** | -50% |
| Milestone (50 refs) | 2,500 RZC | **1,250 RZC** | -50% |
| Milestone (100 refs) | 10,000 RZC | **5,000 RZC** | -50% |

---

## New Earnings Calculator

### Per Referral: 25 RZC (was 50 RZC)

### Example Earnings:

| Referrals | Old Total | New Total | Difference |
|-----------|-----------|-----------|------------|
| 1 | 50 RZC | **25 RZC** | -25 RZC |
| 5 | 250 RZC | **125 RZC** | -125 RZC |
| 10 | 1,000 RZC | **500 RZC** | -500 RZC |
| 50 | 5,500 RZC | **2,750 RZC** | -2,750 RZC |
| 100 | 18,000 RZC | **9,000 RZC** | -9,000 RZC |

### Breakdown by Milestone:

**10 Referrals:**
```
Base bonuses:  10 × 25 RZC = 250 RZC
Milestone:     1 × 250 RZC  = 250 RZC
─────────────────────────────────────
TOTAL:                       500 RZC
```

**50 Referrals:**
```
Base bonuses:  50 × 25 RZC   = 1,250 RZC
Milestone (10): 1 × 250 RZC  = 250 RZC
Milestone (50): 1 × 1,250 RZC = 1,250 RZC
──────────────────────────────────────
TOTAL:                        2,750 RZC
```

**100 Referrals:**
```
Base bonuses:   100 × 25 RZC   = 2,500 RZC
Milestone (10):  1 × 250 RZC   = 250 RZC
Milestone (50):  1 × 1,250 RZC = 1,250 RZC
Milestone (100): 1 × 5,000 RZC = 5,000 RZC
───────────────────────────────────────
TOTAL:                          9,000 RZC
```

---

## Files Modified

### 1. `services/rzcRewardService.ts`
**Changes:**
- `SIGNUP_BONUS`: 100 → 50
- `REFERRAL_BONUS`: 50 → 25
- `REFERRAL_MILESTONE_10`: 500 → 250
- `REFERRAL_MILESTONE_50`: 2500 → 1250
- `REFERRAL_MILESTONE_100`: 10000 → 5000

### 2. `services/referralRewardChecker.ts`
**Changes:**
- Updated missing amount calculation: `* 50` → `* 25`
- Updated default amount: `|| 50` → `|| 25`

### 3. `pages/Referral.tsx`
**Changes:**
- Signup bonus display: "50 RZC" → "25 RZC"
- Milestone bonus display: "Up to 10,000 RZC" → "Up to 5,000 RZC"

### 4. `pages/CreateWallet.tsx`
**Changes:**
- Comment updated: "(100 RZC)" → "(50 RZC)"
- Comment updated: "(50 RZC + ...)" → "(25 RZC + ...)"

---

## What Users Will See

### New User Signup:
- **Receives:** 50 RZC signup bonus (was 100 RZC)
- **Referrer gets:** 25 RZC (was 50 RZC)

### Referral Page Display:
- "Signup Bonus: 25 RZC per referral signup"
- "Milestone Bonus: Up to 5,000 RZC at 10, 50, 100 referrals"

### Notifications:
- "You earned 25 RZC" (was 50 RZC)
- Milestone notifications will show new amounts

---

## Value Estimation (If RZC = $0.10)

| Referrals | Old USD Value | New USD Value | Difference |
|-----------|---------------|---------------|------------|
| 1 | $5.00 | **$2.50** | -$2.50 |
| 10 | $100.00 | **$50.00** | -$50.00 |
| 50 | $550.00 | **$275.00** | -$275.00 |
| 100 | $1,800.00 | **$900.00** | -$900.00 |
| 500 | $3,800.00 | **$1,900.00** | -$1,900.00 |

---

## Impact on Existing Users

### For Your Missing 50 RZC:
Since you already have 1 referral under the old system, you should still claim the original 50 RZC (not 25 RZC) because that referral happened before the change.

**Recommendation:** Claim your 50 RZC now using the SQL queries provided earlier, then deploy the new code.

### For Future Referrals:
All new referrals from now on will earn 25 RZC per signup.

---

## SQL Queries Need Updating

If you're using the direct SQL claim method, update the amount:

### Old Query (for your existing referral):
```sql
-- Keep this at 50 RZC since it was earned under old system
SELECT award_rzc_tokens(
  '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'::uuid,
  50,  -- Keep at 50 for existing referral
  'referral_bonus',
  'Referral bonus - retroactive claim',
  jsonb_build_object('referred_user_id', 'ce852b0e-a3cb-468b-9c85-5bb4a23e0f94', 'retroactive', true)
);
```

### New Query (for future manual claims):
```sql
-- Use 25 RZC for new referrals
SELECT award_rzc_tokens(
  'USER_ID'::uuid,
  25,  -- New amount
  'referral_bonus',
  'Referral bonus',
  jsonb_build_object('referred_user_id', 'REFERRED_USER_ID', 'retroactive', true)
);
```

---

## Testing the Changes

### Test 1: Check Service Constants
```javascript
// In browser console
import { RZC_REWARDS } from './services/rzcRewardService';
console.log(RZC_REWARDS);
// Should show: SIGNUP_BONUS: 50, REFERRAL_BONUS: 25
```

### Test 2: New Signup
1. Have someone sign up with your referral code
2. They should receive 50 RZC (not 100)
3. You should receive 25 RZC (not 50)

### Test 3: UI Display
1. Go to Referral page
2. Check "Earning Rewards" section
3. Should show "25 RZC" and "Up to 5,000 RZC"

---

## Rollback Instructions

If you need to revert to original amounts, change in `services/rzcRewardService.ts`:

```typescript
export const RZC_REWARDS = {
  SIGNUP_BONUS: 100,           // Change back from 50
  REFERRAL_BONUS: 50,          // Change back from 25
  REFERRAL_MILESTONE_10: 500,  // Change back from 250
  REFERRAL_MILESTONE_50: 2500, // Change back from 1250
  REFERRAL_MILESTONE_100: 10000, // Change back from 5000
  TRANSACTION_BONUS: 1,
  DAILY_LOGIN: 5
};
```

And update the UI text in `pages/Referral.tsx` accordingly.

---

## Summary

✅ All rewards halved across the system
✅ Code updated in 4 files
✅ UI displays updated
✅ Comments updated
✅ Calculations updated

**New Structure:**
- Signup: 50 RZC (was 100)
- Referral: 25 RZC (was 50)
- Milestones: 250, 1,250, 5,000 RZC (was 500, 2,500, 10,000)

**Action:** Deploy the updated code to apply the new reward structure! 🚀
