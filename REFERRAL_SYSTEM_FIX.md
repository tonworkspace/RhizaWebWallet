# Referral System Issues & Fixes 🔧

## Issues Identified

### 1. **Downline Not Showing Users** ❌
**Problem:** The `getDownline()` function queries `wallet_referrals` table with `referrer_id`, but when users sign up, their `referrer_id` is stored in the `wallet_referrals` table correctly. However, the query might be failing due to the join structure.

**Root Cause:** The query joins `wallet_users` but the relationship might not be properly established.

### 2. **Referral Rewards Not Being Distributed** ❌
**Problem:** The `awardReferralBonus()` function is called in `CreateWallet.tsx`, but there might be issues with:
- The referrer lookup process
- The RZC token awarding mechanism
- The database transaction flow

### 3. **Referral Code Lookup Issue** ⚠️
**Problem:** In `CreateWallet.tsx` line 147, the code looks up the referrer using:
```typescript
const referrerResult = await supabaseService.getUserByReferralCode(referralCode);
if (referrerResult.success && referrerResult.data) {
  referrerId = referrerResult.data.user_id;
}
```

But `getUserByReferralCode()` returns a `ReferralData` object from the `wallet_referrals` table, which should work correctly.

---

## Detailed Analysis

### Flow Analysis

#### Current Signup Flow:
1. User visits: `/#/join?ref=ABC123`
2. `CreateWallet` extracts `ref` parameter
3. Looks up referrer by code in `wallet_referrals` table
4. Creates new user profile
5. Awards signup bonus (100 RZC) to new user ✅
6. Creates referral code for new user
7. Increments referrer's count
8. Awards referral bonus (50 RZC) to referrer ❓

#### Where It Breaks:

**Issue #1: Downline Query**
```typescript
// Current query in getDownline()
const { data: downlineData, error } = await this.client
  .from('wallet_referrals')
  .select(`
    user_id,
    total_referrals,
    wallet_users!inner (
      id,
      wallet_address,
      name,
      avatar,
      email,
      role,
      is_active,
      referrer_code,
      rzc_balance,
      created_at,
      updated_at
    )
  `)
  .eq('referrer_id', userId)
  .order('created_at', { ascending: false });
```

**Problem:** The join syntax `wallet_users!inner` requires a foreign key relationship. If the FK isn't properly set up, this fails silently.

**Issue #2: RZC Balance Not Updating**
The `awardRZCTokens()` function might not be updating the user's `rzc_balance` in the `wallet_users` table.

---

## Solutions

### Fix #1: Update getDownline() Query

**File:** `services/supabaseService.ts`

**Current Code (Line 1340):**
```typescript
async getDownline(userId: string): Promise<{
  success: boolean;
  data?: Array<UserProfile & { total_referrals?: number; rzc_earned?: number }>;
  error?: string;
}> {
  // ... existing code
  const { data: downlineData, error } = await this.client
    .from('wallet_referrals')
    .select(`
      user_id,
      total_referrals,
      wallet_users!inner (...)
    `)
    .eq('referrer_id', userId)
```

**Fixed Code:**
```typescript
async getDownline(userId: string): Promise<{
  success: boolean;
  data?: Array<UserProfile & { total_referrals?: number; rzc_earned?: number }>;
  error?: string;
}> {
  if (!this.client) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    console.log('🔍 Fetching downline for user:', userId);

    // Get all referral records where this user is the referrer
    const { data: referralData, error: refError } = await this.client
      .from('wallet_referrals')
      .select('user_id, total_referrals, created_at')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (refError) throw refError;

    if (!referralData || referralData.length === 0) {
      console.log('ℹ️ No downline members found');
      return { success: true, data: [] };
    }

    // Get user details for each downline member
    const userIds = referralData.map(r => r.user_id);
    const { data: userData, error: userError } = await this.client
      .from('wallet_users')
      .select('*')
      .in('id', userIds);

    if (userError) throw userError;

    // Combine the data
    const transformedData = referralData.map((ref: any) => {
      const user = userData?.find((u: any) => u.id === ref.user_id);
      return {
        ...user,
        total_referrals: ref.total_referrals,
        rzc_earned: (user?.rzc_balance || 0) - 100 // Subtract signup bonus
      };
    }).filter(item => item.id); // Remove any null entries

    console.log(`✅ Found ${transformedData.length} downline members`);
    return { success: true, data: transformedData };
  } catch (error: any) {
    console.error('❌ Get downline error:', error);
    return { success: false, error: error.message };
  }
}
```

### Fix #2: Verify awardRZCTokens() Updates Balance

**File:** `services/supabaseService.ts`

Need to check if `awardRZCTokens()` properly updates the `wallet_users.rzc_balance` field.

**Expected Implementation:**
```typescript
async awardRZCTokens(
  userId: string,
  amount: number,
  type: string,
  description: string,
  metadata?: any
): Promise<{ success: boolean; error?: string }> {
  if (!this.client) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // 1. Get current balance
    const { data: userData, error: userError } = await this.client
      .from('wallet_users')
      .select('rzc_balance')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const currentBalance = userData?.rzc_balance || 0;
    const newBalance = currentBalance + amount;

    // 2. Update user balance
    const { error: updateError } = await this.client
      .from('wallet_users')
      .update({ rzc_balance: newBalance })
      .eq('id', userId);

    if (updateError) throw updateError;

    // 3. Record transaction
    const { error: txError } = await this.client
      .from('wallet_rzc_transactions')
      .insert({
        user_id: userId,
        type: type,
        amount: amount,
        balance_after: newBalance,
        source: description,
        metadata: metadata || {}
      });

    if (txError) throw txError;

    console.log(`✅ Awarded ${amount} RZC to user ${userId}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Award RZC tokens error:', error);
    return { success: false, error: error.message };
  }
}
```

### Fix #3: Add Debug Logging

**File:** `pages/CreateWallet.tsx`

Add more detailed logging to track the referral flow:

**Around Line 145-200:**
```typescript
// Look up referrer if referral code provided
let referrerId: string | null = null;
if (referralCode) {
  console.log('🔍 Looking up referrer with code:', referralCode);
  const referrerResult = await supabaseService.getUserByReferralCode(referralCode);
  console.log('📊 Referrer lookup result:', referrerResult);
  
  if (referrerResult.success && referrerResult.data) {
    referrerId = referrerResult.data.user_id;
    console.log('✅ Referrer found:', referrerId);
    console.log('📋 Referrer data:', referrerResult.data);
  } else {
    console.warn('⚠️ Referral code not found:', referralCode);
    console.warn('⚠️ Error:', referrerResult.error);
  }
}
```

### Fix #4: Verify Database Foreign Keys

**Check if the foreign key relationship exists:**

```sql
-- Check foreign key constraints
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'wallet_referrals' 
  AND tc.constraint_type = 'FOREIGN KEY';
```

**If missing, add the foreign key:**

```sql
-- Add foreign key from wallet_referrals.user_id to wallet_users.id
ALTER TABLE wallet_referrals
ADD CONSTRAINT fk_wallet_referrals_user
FOREIGN KEY (user_id) REFERENCES wallet_users(id) ON DELETE CASCADE;

-- Add foreign key from wallet_referrals.referrer_id to wallet_users.id
ALTER TABLE wallet_referrals
ADD CONSTRAINT fk_wallet_referrals_referrer
FOREIGN KEY (referrer_id) REFERENCES wallet_users(id) ON DELETE SET NULL;
```

---

## Testing Checklist

### Test Scenario 1: New User Signup with Referral Code
1. ✅ User A creates wallet → Gets referral code `ABC123`
2. ✅ User B visits `/#/join?ref=ABC123`
3. ✅ User B completes signup
4. ✅ Check User B gets 100 RZC signup bonus
5. ✅ Check User A gets 50 RZC referral bonus
6. ✅ Check User A's `total_referrals` increments to 1
7. ✅ Check User B appears in User A's downline

### Test Scenario 2: Downline Display
1. ✅ User A refers 3 users (B, C, D)
2. ✅ Navigate to Referral page
3. ✅ Check all 3 users appear in downline section
4. ✅ Check user details are correct (name, avatar, RZC balance)
5. ✅ Check "Active" status is displayed correctly

### Test Scenario 3: Milestone Bonuses
1. ✅ User A refers 10 users
2. ✅ Check User A receives 500 RZC milestone bonus
3. ✅ Check notification is sent to User A

---

## Quick Diagnostic Queries

### Check Referral Relationships
```sql
SELECT 
  u.name as user_name,
  u.wallet_address,
  r.referral_code,
  r.referrer_id,
  r.total_referrals,
  r.total_earned,
  ref_user.name as referrer_name
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.user_id
LEFT JOIN wallet_users ref_user ON r.referrer_id = ref_user.id
ORDER BY u.created_at DESC
LIMIT 20;
```

### Check RZC Balances
```sql
SELECT 
  u.name,
  u.wallet_address,
  u.rzc_balance,
  COUNT(t.id) as transaction_count,
  SUM(CASE WHEN t.type = 'referral_bonus' THEN t.amount ELSE 0 END) as referral_earnings
FROM wallet_users u
LEFT JOIN wallet_rzc_transactions t ON u.id = t.user_id
GROUP BY u.id, u.name, u.wallet_address, u.rzc_balance
ORDER BY u.rzc_balance DESC;
```

### Check Downline for Specific User
```sql
-- Replace 'USER_ID_HERE' with actual user ID
SELECT 
  u.name,
  u.wallet_address,
  u.rzc_balance,
  u.is_active,
  r.total_referrals,
  r.created_at as joined_at
FROM wallet_referrals r
JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = 'USER_ID_HERE'
ORDER BY r.created_at DESC;
```

---

## Implementation Priority

1. **HIGH PRIORITY** - Fix `getDownline()` query (Fix #1)
2. **HIGH PRIORITY** - Verify `awardRZCTokens()` implementation (Fix #2)
3. **MEDIUM PRIORITY** - Add debug logging (Fix #3)
4. **MEDIUM PRIORITY** - Verify database foreign keys (Fix #4)
5. **LOW PRIORITY** - Add error handling and user feedback

---

## Next Steps

1. Apply Fix #1 to `services/supabaseService.ts`
2. Check if `awardRZCTokens()` exists and verify implementation
3. Test with a new user signup
4. Check database for proper data
5. Verify downline display on Referral page

Would you like me to apply these fixes now?
