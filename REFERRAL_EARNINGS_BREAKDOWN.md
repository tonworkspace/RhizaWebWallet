# Referral Earnings Breakdown 💰

## Current Reward Structure

### Per Referral Earnings

```
┌─────────────────────────────────────────────────────────────┐
│  REFERRAL BONUS: 50 RZC per successful signup              │
│  (Awarded to referrer when someone uses their code)         │
└─────────────────────────────────────────────────────────────┘
```

---

## Complete Reward System

### 1. Signup Bonus (For New Users)
**Amount:** 100 RZC  
**Who gets it:** The person who creates a new wallet  
**When:** Immediately upon wallet creation  
**Code:** `services/rzcRewardService.ts` line 10

```typescript
SIGNUP_BONUS: 100  // Initial bonus on wallet creation
```

### 2. Referral Bonus (For Referrers)
**Amount:** 50 RZC per referral  
**Who gets it:** The person whose referral code was used  
**When:** When someone signs up using their code  
**Code:** `services/rzcRewardService.ts` line 11

```typescript
REFERRAL_BONUS: 50  // Bonus for each successful referral
```

### 3. Milestone Bonuses (For Referrers)
**Who gets it:** Referrers when they reach certain thresholds  
**When:** Automatically when milestone is reached  
**Code:** `services/rzcRewardService.ts` lines 12-14

| Milestone | Reward | Total Earned (with base bonuses) |
|-----------|--------|----------------------------------|
| 10 referrals | +500 RZC | 1,000 RZC (10×50 + 500) |
| 50 referrals | +2,500 RZC | 6,000 RZC (50×50 + 500 + 2,500) |
| 100 referrals | +10,000 RZC | 18,500 RZC (100×50 + 500 + 2,500 + 10,000) |

```typescript
REFERRAL_MILESTONE_10: 500    // Bonus at 10 referrals
REFERRAL_MILESTONE_50: 2500   // Bonus at 50 referrals
REFERRAL_MILESTONE_100: 10000 // Bonus at 100 referrals
```

### 4. Transaction Bonus (Future Feature)
**Amount:** 1 RZC per transaction  
**Who gets it:** User making the transaction  
**Status:** Coded but not implemented yet  
**Code:** `services/rzcRewardService.ts` line 15

```typescript
TRANSACTION_BONUS: 1  // Small bonus per transaction
```

### 5. Daily Login Bonus (Future Feature)
**Amount:** 5 RZC per day  
**Who gets it:** User who logs in  
**Limit:** Once per day  
**Status:** Coded but not implemented yet  
**Code:** `services/rzcRewardService.ts` line 16

```typescript
DAILY_LOGIN: 5  // Daily login bonus
```

---

## Earnings Calculator

### Example 1: Small Network (10 Referrals)
```
Base referral bonuses:  10 × 50 RZC  = 500 RZC
Milestone bonus (10):   1 × 500 RZC  = 500 RZC
─────────────────────────────────────────────
TOTAL EARNINGS:                      1,000 RZC
```

### Example 2: Medium Network (50 Referrals)
```
Base referral bonuses:  50 × 50 RZC   = 2,500 RZC
Milestone bonus (10):   1 × 500 RZC   = 500 RZC
Milestone bonus (50):   1 × 2,500 RZC = 2,500 RZC
──────────────────────────────────────────────
TOTAL EARNINGS:                       5,500 RZC
```

### Example 3: Large Network (100 Referrals)
```
Base referral bonuses:  100 × 50 RZC   = 5,000 RZC
Milestone bonus (10):   1 × 500 RZC    = 500 RZC
Milestone bonus (50):   1 × 2,500 RZC  = 2,500 RZC
Milestone bonus (100):  1 × 10,000 RZC = 10,000 RZC
───────────────────────────────────────────────
TOTAL EARNINGS:                        18,000 RZC
```

### Example 4: Super Network (500 Referrals)
```
Base referral bonuses:  500 × 50 RZC   = 25,000 RZC
Milestone bonus (10):   1 × 500 RZC    = 500 RZC
Milestone bonus (50):   1 × 2,500 RZC  = 2,500 RZC
Milestone bonus (100):  1 × 10,000 RZC = 10,000 RZC
────────────────────────────────────────────────
TOTAL EARNINGS:                         38,000 RZC
```

---

## Earnings Per Referral Breakdown

| Referral # | Base Bonus | Milestone Bonus | Total This Referral | Cumulative Total |
|------------|------------|-----------------|---------------------|------------------|
| 1 | 50 RZC | - | 50 RZC | 50 RZC |
| 2 | 50 RZC | - | 50 RZC | 100 RZC |
| 5 | 50 RZC | - | 50 RZC | 250 RZC |
| 10 | 50 RZC | +500 RZC 🎉 | 550 RZC | 1,000 RZC |
| 11 | 50 RZC | - | 50 RZC | 1,050 RZC |
| 25 | 50 RZC | - | 50 RZC | 1,750 RZC |
| 50 | 50 RZC | +2,500 RZC 🎉 | 2,550 RZC | 5,500 RZC |
| 51 | 50 RZC | - | 50 RZC | 5,550 RZC |
| 100 | 50 RZC | +10,000 RZC 🎉 | 10,050 RZC | 18,000 RZC |

---

## What Your Referred Users Get

When someone signs up using your referral code:

**They receive:**
- 100 RZC signup bonus (immediately)
- Their own referral code to share
- Ability to earn from their referrals

**You receive:**
- 50 RZC referral bonus (immediately)
- Potential milestone bonuses
- Notification about the signup

---

## Value Estimation (If RZC = $0.10)

| Referrals | RZC Earned | USD Value |
|-----------|------------|-----------|
| 1 | 50 | $5.00 |
| 5 | 250 | $25.00 |
| 10 | 1,000 | $100.00 |
| 25 | 1,750 | $175.00 |
| 50 | 5,500 | $550.00 |
| 100 | 18,000 | $1,800.00 |
| 500 | 38,000 | $3,800.00 |
| 1,000 | 63,000 | $6,300.00 |

---

## How Rewards Are Awarded

### Automatic Process:
1. User signs up with your referral code
2. System creates their profile
3. System awards them 100 RZC signup bonus
4. System awards you 50 RZC referral bonus
5. System checks if you hit a milestone
6. If milestone reached, awards bonus RZC
7. Both users get notifications

### Code Flow:
```
CreateWallet.tsx (signup)
    ↓
Award signup bonus (100 RZC) → New user
    ↓
Award referral bonus (50 RZC) → You
    ↓
Check milestone → If reached, award bonus → You
    ↓
Send notifications → Both users
```

---

## Current Implementation Status

| Feature | Status | Working |
|---------|--------|---------|
| Signup Bonus (100 RZC) | ✅ Coded | ⏳ Needs DB function |
| Referral Bonus (50 RZC) | ✅ Coded | ⏳ Needs DB function |
| Milestone Bonuses | ✅ Coded | ⏳ Needs DB function |
| Transaction Bonus | ✅ Coded | ❌ Not implemented |
| Daily Login Bonus | ✅ Coded | ❌ Not implemented |

**To enable:** Create the `award_rzc_tokens` database function (see `CREATE_AWARD_FUNCTION_NOW.sql`)

---

## Changing Reward Amounts

If you want to change the reward amounts, edit `services/rzcRewardService.ts`:

```typescript
export const RZC_REWARDS = {
  SIGNUP_BONUS: 100,           // Change this
  REFERRAL_BONUS: 50,          // Change this
  REFERRAL_MILESTONE_10: 500,  // Change this
  REFERRAL_MILESTONE_50: 2500, // Change this
  REFERRAL_MILESTONE_100: 10000, // Change this
  TRANSACTION_BONUS: 1,
  DAILY_LOGIN: 5
};
```

---

## Summary

**Per Referral:** 50 RZC (base)

**With Milestones:**
- 10 refs: Average 100 RZC per referral
- 50 refs: Average 110 RZC per referral
- 100 refs: Average 180 RZC per referral

**New User Gets:** 100 RZC signup bonus

**Total Value Created Per Signup:** 150 RZC (100 to new user + 50 to referrer)

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────┐
│  ANSWER: Users earn 50 RZC per referral                    │
│  Plus milestone bonuses at 10, 50, and 100 referrals       │
└─────────────────────────────────────────────────────────────┘
```

**Base Rate:** 50 RZC per successful referral  
**Milestone Bonuses:** +500, +2,500, +10,000 RZC  
**New User Bonus:** 100 RZC (they get this, not you)  
**Your Earnings:** 50 RZC per referral + milestone bonuses
