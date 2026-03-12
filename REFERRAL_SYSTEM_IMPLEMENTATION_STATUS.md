# Referral System Implementation Status

## ✅ COMPLETED

### 1. Welcome Bonus Updated
- **Old**: 150 RZC
- **New**: 50 RZC ($5 at $0.10/RZC)
- **Location**: `pages/MiningNodes.tsx` - activation-only package
- **Status**: ✅ Implemented and working

### 2. Referral UI Updated
- **Location**: `pages/Referral.tsx`
- **Changes**:
  - Signup Bonus: "25 RZC" → "$5 (50 RZC)"
  - Milestone Bonus → Package Commission (10%)
  - Rank Upgrade → Team Sales Bonus (1% weekly)
- **Status**: ✅ UI updated

### 3. Database Functions Created
- **File**: `update_referral_rewards_CLEAN.sql`
- **Functions**:
  - `award_package_purchase_commission()` - Awards 10% commission to referrer
  - `calculate_weekly_team_sales_commissions()` - Calculates 1% weekly team sales
  - `payout_weekly_team_sales_commissions()` - Pays out weekly commissions
- **Table**: `team_sales_weekly` - Tracks weekly team sales
- **Status**: ✅ SQL script ready to run

### 4. Package Commission Integration
- **Location**: `pages/MiningNodes.tsx` - PurchaseModal component
- **Implementation**: After successful package purchase and RZC award, calls `award_package_purchase_commission()`
- **Logic**: Only awards commission for actual package purchases (not activation-only)
- **Status**: ✅ Integrated in frontend

---

## ⏳ PENDING TASKS

### Task 1: Run SQL Script in Supabase
**Priority**: HIGH (Required for commission system to work)

**Action**:
1. Open Supabase SQL Editor
2. Run `update_referral_rewards_CLEAN.sql`
3. Verify functions created:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name IN (
     'award_package_purchase_commission',
     'calculate_weekly_team_sales_commissions',
     'payout_weekly_team_sales_commissions'
   );
   ```
4. Verify table created:
   ```sql
   SELECT * FROM team_sales_weekly LIMIT 1;
   ```

**Expected Result**: 3 functions + 1 table created successfully

---

### Task 2: Update Signup Bonus Amount
**Priority**: MEDIUM (Currently awarding 25 RZC, should be 50 RZC)

**Problem**: When a user signs up with a referral code, their referrer receives 25 RZC. This needs to be updated to 50 RZC.

**Where to Look**:
1. Search for where signup bonuses are awarded
2. Likely in a database trigger or function that runs when a new user is created
3. Could be in `wallet_users` table triggers or in the signup flow

**Search Commands**:
```sql
-- Find triggers on wallet_users table
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'wallet_users';

-- Find functions that award signup bonuses
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%signup%'
  OR routine_definition LIKE '%referral%'
  OR routine_definition LIKE '%25%';
```

**What to Change**:
- Find where `25` RZC is hardcoded for signup bonuses
- Change to `50` RZC
- Update transaction type to ensure it's `'signup_bonus'` or `'referral_bonus'`

---

### Task 3: Setup Weekly Team Sales Cron Job
**Priority**: LOW (Can be done later, not urgent)

**Purpose**: Automatically calculate and pay out 1% weekly team sales commissions every Monday

**Options**:

#### Option A: Supabase Edge Function (Recommended)
1. Create a Supabase Edge Function
2. Schedule it to run every Monday at 00:00 UTC
3. Function code:
   ```typescript
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

   serve(async (req) => {
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL') ?? '',
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
     )

     // Get last Monday
     const today = new Date()
     const lastMonday = new Date(today)
     lastMonday.setDate(today.getDate() - 7)
     
     // Calculate commissions
     const { data: calculated } = await supabase.rpc(
       'calculate_weekly_team_sales_commissions',
       {
         p_week_start: lastMonday.toISOString().split('T')[0],
         p_week_end: today.toISOString().split('T')[0]
       }
     )

     // Pay out commissions
     const { data: paid } = await supabase.rpc(
       'payout_weekly_team_sales_commissions',
       {
         p_week_start: lastMonday.toISOString().split('T')[0]
       }
     )

     return new Response(
       JSON.stringify({ calculated, paid }),
       { headers: { 'Content-Type': 'application/json' } }
     )
   })
   ```

#### Option B: External Cron Service
1. Use a service like Cron-job.org or EasyCron
2. Create an API endpoint in your app that calls the functions
3. Schedule the cron job to hit that endpoint every Monday

#### Option C: Manual Execution (Temporary)
Run manually in Supabase SQL Editor every Monday:
```sql
-- Calculate commissions for last week
SELECT * FROM calculate_weekly_team_sales_commissions(
  (CURRENT_DATE - INTERVAL '7 days')::DATE,
  CURRENT_DATE::DATE
);

-- Pay out commissions
SELECT * FROM payout_weekly_team_sales_commissions(
  (CURRENT_DATE - INTERVAL '7 days')::DATE
);
```

---

## 📊 REWARD STRUCTURE SUMMARY

| Reward Type | Amount | Trigger | Status |
|------------|--------|---------|--------|
| Welcome Bonus | $5 (50 RZC) | Wallet activation | ✅ Working |
| Signup Bonus | $5 (50 RZC) | Referral signs up | ⏳ Needs update (currently 25 RZC) |
| Package Commission | 10% of value | Referral buys package | ✅ Implemented |
| Team Sales | 1% of sales | Weekly calculation | ⏳ Needs cron job |

---

## 🧪 TESTING CHECKLIST

### Test 1: Welcome Bonus (✅ Should work now)
1. Create new wallet
2. Activate with $15 (activation-only package)
3. Check RZC balance: Should be 50 RZC
4. Check transaction: Type should be 'activation_bonus'

### Test 2: Package Commission (✅ Should work after SQL script)
1. User A refers User B
2. User B purchases $100 Bronze Package
3. Check User A's RZC balance: Should increase by 100 RZC
4. Check User A's transactions: Should see 'referral_commission' for 100 RZC
5. Check metadata: Should show buyer, package name, commission details

### Test 3: Signup Bonus (⏳ After Task 2)
1. User A refers User B
2. User B signs up (creates wallet)
3. Check User A's RZC balance: Should increase by 50 RZC
4. Check User A's transactions: Should see 'signup_bonus' or 'referral_bonus' for 50 RZC

### Test 4: Team Sales (⏳ After Task 3)
1. User A has downline (User B, User C)
2. User B purchases $300 package
3. User C purchases $200 package
4. Run weekly calculation (manually or via cron)
5. Check User A's RZC balance: Should increase by 50 RZC (1% of $500)
6. Check `team_sales_weekly` table: Should show record for User A
7. Check User A's transactions: Should see 'team_sales_commission' for 50 RZC

---

## 🔍 VERIFICATION QUERIES

### Check if functions exist
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'award_package_purchase_commission',
  'calculate_weekly_team_sales_commissions',
  'payout_weekly_team_sales_commissions'
)
ORDER BY routine_name;
```

### Check recent RZC transactions
```sql
SELECT 
  rt.created_at,
  wu.wallet_address,
  rt.amount,
  rt.type,
  rt.description
FROM rzc_transactions rt
JOIN wallet_users wu ON rt.user_id = wu.id
ORDER BY rt.created_at DESC
LIMIT 20;
```

### Check team sales records
```sql
SELECT 
  ts.week_start,
  ts.week_end,
  wu.wallet_address,
  ts.team_sales_usd,
  ts.commission_rzc,
  ts.paid,
  ts.paid_at
FROM team_sales_weekly ts
JOIN wallet_users wu ON ts.user_id = wu.id
ORDER BY ts.created_at DESC;
```

### Check user RZC balances
```sql
SELECT 
  wallet_address,
  rzc_balance,
  is_activated,
  referrer_id IS NOT NULL as has_referrer
FROM wallet_users
WHERE rzc_balance > 0
ORDER BY rzc_balance DESC
LIMIT 20;
```

---

## 📝 NOTES

### RZC Price Assumption
- All calculations assume **$0.10 per RZC**
- If RZC price changes, update `v_rzc_price` in database functions:
  - `award_package_purchase_commission()`
  - `calculate_weekly_team_sales_commissions()`

### Commission Logic
- **Package Commission**: Only awarded for actual package purchases (pricePoint > 0)
- **Activation-only**: Does NOT trigger referral commission (it's just activation fee)
- **Test Package**: May or may not trigger commission (currently excluded)

### Error Handling
- If commission award fails, it logs error but doesn't fail the purchase
- User still gets their RZC tokens even if referrer commission fails
- This prevents purchase failures due to referral system issues

---

## 🚀 NEXT IMMEDIATE STEPS

1. **Run SQL Script** (5 minutes)
   - Open Supabase SQL Editor
   - Copy/paste `update_referral_rewards_CLEAN.sql`
   - Execute
   - Verify functions created

2. **Test Package Commission** (10 minutes)
   - Make a test purchase with a referred user
   - Check if referrer receives 10% commission
   - Verify transaction recorded correctly

3. **Find Signup Bonus Code** (15 minutes)
   - Search database for signup bonus logic
   - Update from 25 RZC to 50 RZC
   - Test with new referral signup

4. **Setup Cron Job** (Later, not urgent)
   - Choose cron method (Edge Function recommended)
   - Implement and test
   - Schedule for Monday 00:00 UTC

---

## 📞 SUPPORT

If you encounter issues:

1. **Check Supabase Logs**: Look for function execution errors
2. **Verify Functions Exist**: Run verification queries above
3. **Check RLS Policies**: Ensure policies allow function execution
4. **Test with Service Role**: Use service role key for testing
5. **Check Transaction Records**: Verify transactions are being created

Common issues:
- Function not found: SQL script not run yet
- Permission denied: RLS policy issue
- No commission awarded: Referrer not found or package is activation-only
- Balance not updated: `award_rzc_tokens()` function issue
