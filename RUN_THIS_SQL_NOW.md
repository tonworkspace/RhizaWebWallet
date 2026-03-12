# 🚀 RUN THIS SQL SCRIPT NOW

## Quick Start

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy the entire content of `update_referral_rewards_CLEAN.sql`
4. Paste and click "Run"
5. Wait for success message

---

## What This Script Does

✅ Creates `award_package_purchase_commission()` function
- Awards 10% commission to referrer when their referral buys a package
- Example: User buys $100 package → Referrer gets 100 RZC

✅ Creates `calculate_weekly_team_sales_commissions()` function
- Calculates 1% commission on weekly team sales
- Example: Team makes $1000 in sales → User gets 100 RZC

✅ Creates `payout_weekly_team_sales_commissions()` function
- Pays out the calculated weekly commissions
- Marks commissions as paid to prevent double-payment

✅ Creates `team_sales_weekly` table
- Tracks weekly team sales for each user
- Stores commission amounts and payment status

---

## Expected Output

After running the script, you should see:

```
Setup complete! Functions created successfully.

routine_name                              | routine_type
-----------------------------------------|-------------
award_package_purchase_commission        | FUNCTION
calculate_weekly_team_sales_commissions  | FUNCTION
payout_weekly_team_sales_commissions     | FUNCTION

table_name          | row_count
--------------------|----------
team_sales_weekly   | 0
```

---

## Verification

Run this query to verify everything is set up:

```sql
-- Check functions
SELECT routine_name 
FROM information_schema.routines
WHERE routine_name LIKE '%commission%'
ORDER BY routine_name;

-- Check table
SELECT table_name 
FROM information_schema.tables
WHERE table_name = 'team_sales_weekly';
```

---

## What Happens Next

Once this script runs successfully:

1. ✅ **Package purchases will automatically award 10% commission to referrers**
   - No additional code needed
   - Integrated in `pages/MiningNodes.tsx`
   - Works immediately

2. ⏳ **Weekly team sales need cron job setup**
   - Not urgent, can be done later
   - See `REFERRAL_SYSTEM_IMPLEMENTATION_STATUS.md` for details

3. ⏳ **Signup bonus still needs update**
   - Currently 25 RZC, should be 50 RZC
   - Need to find where it's awarded in database
   - See Task 2 in status document

---

## Testing After Running Script

### Test Package Commission

1. Create two test wallets (User A and User B)
2. User A refers User B (User B signs up with User A's referral code)
3. User B purchases a package (e.g., $100 Bronze Package)
4. Check User A's RZC balance:
   ```sql
   SELECT wallet_address, rzc_balance 
   FROM wallet_users 
   WHERE wallet_address = 'USER_A_ADDRESS';
   ```
5. Check User A's transactions:
   ```sql
   SELECT * FROM rzc_transactions 
   WHERE user_id = (
     SELECT id FROM wallet_users WHERE wallet_address = 'USER_A_ADDRESS'
   )
   ORDER BY created_at DESC;
   ```
6. You should see a `referral_commission` transaction for 100 RZC

---

## Troubleshooting

### Error: "function award_rzc_tokens does not exist"
**Solution**: Run `fix_rzc_system_setup.sql` first, then run this script

### Error: "relation team_sales_weekly already exists"
**Solution**: Script is safe to re-run, it will skip existing objects

### Error: "permission denied"
**Solution**: Make sure you're running as service role or have proper permissions

### No commission awarded after purchase
**Checklist**:
- [ ] SQL script ran successfully
- [ ] Buyer has a referrer (check `referrer_id` in `wallet_users`)
- [ ] Package is not activation-only (must have `pricePoint > 0`)
- [ ] Check browser console for errors
- [ ] Check Supabase logs for function execution errors

---

## Files Reference

- `update_referral_rewards_CLEAN.sql` - The SQL script to run
- `REFERRAL_SYSTEM_IMPLEMENTATION_STATUS.md` - Full implementation status
- `pages/MiningNodes.tsx` - Frontend integration (already done)
- `pages/Referral.tsx` - UI updates (already done)

---

## Support

If you encounter any issues:
1. Check Supabase logs for detailed error messages
2. Verify `award_rzc_tokens()` function exists
3. Check RLS policies on `rzc_transactions` table
4. Review `REFERRAL_SYSTEM_IMPLEMENTATION_STATUS.md` for detailed troubleshooting
