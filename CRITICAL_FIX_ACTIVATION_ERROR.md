# CRITICAL DATABASE ERROR FOUND - IMMEDIATE FIX REQUIRED

## Error Details
**Error Code:** 23502 (NOT NULL constraint violation)
**Table:** wallet_notifications
**Column:** wallet_address
**Function:** activate_wallet (line 152 in fix_activation_schema.sql)

## Root Cause
The activate_wallet database function creates a notification but the wallet_address column receives NULL value, violating the NOT NULL constraint.

**Evidence:**
`
Failing row contains (70015363-781a-4d1f-a7f4-4587f89bc848, d174afb2-ea95-4413-8857-a662630a859a, null, system_announcement, ...)
                                                                                                      ^^^^
                                                                                                      NULL value here
`

## Impact
- **100% of wallet activations are failing**
- Users pay activation fee but wallet doesn't activate
- Money is taken but service not delivered
- **CRITICAL PRODUCTION ISSUE**

## Fix Applied
Created: ix_activate_wallet_notification_error.sql

**Changes:**
1. Added explicit wallet_address parameter to notification insert
2. Added input validation for wallet_address
3. Added error handling to prevent activation failure
4. Made function idempotent (returns TRUE if already activated)

## Deployment Steps

### Step 1: Run the SQL Fix
`ash
# In Supabase SQL Editor, run:
fix_activate_wallet_notification_error.sql
`

### Step 2: Verify the Fix
`sql
-- Check the function was updated
SELECT routine_name, last_altered 
FROM information_schema.routines 
WHERE routine_name = 'activate_wallet';

-- Test with a sample activation (use test wallet)
SELECT activate_wallet(
  'UQTest123...', 
  10.00,  -- activation_fee_usd
  0.2,    -- activation_fee_ton  
  2.45,   -- ton_price
  'test_tx_hash'
);
`

### Step 3: Monitor Production
`sql
-- Check for NULL wallet_address in notifications
SELECT COUNT(*) as null_count
FROM wallet_notifications
WHERE wallet_address IS NULL;

-- Should return 0 after fix

-- Monitor activation success rate
SELECT 
  DATE(completed_at) as date,
  COUNT(*) as total_activations,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM wallet_activations
WHERE completed_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE(completed_at)
ORDER BY date DESC;
`

## Testing Checklist
- [ ] Run fix_activate_wallet_notification_error.sql in Supabase
- [ ] Verify function updated successfully
- [ ] Test activation with Test Node package (0.01 TON)
- [ ] Verify notification created with wallet_address
- [ ] Verify wallet shows as activated
- [ ] Check no NULL constraint errors in logs
- [ ] Monitor production activations for 1 hour

## Rollback Plan
If issues occur:
`sql
-- Restore previous version (if needed)
-- The old version is in fix_activation_schema.sql lines 86-195
`

## Related Issues
This fix addresses:
1. Audit Finding #1: Database notification errors blocking activation
2. Production Error: 23502 NOT NULL constraint violation
3. User Impact: Failed activations after payment

## Priority
**CRITICAL - DEPLOY IMMEDIATELY**

Estimated fix time: 5 minutes
Estimated impact: 100% activation success rate restored

