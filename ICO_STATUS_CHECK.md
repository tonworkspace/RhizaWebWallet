# ICO Round Status Check — Quick Diagnostic

## Step 1: Check Current Status

Run this in **Supabase SQL Editor**:

```sql
-- From check_active_round.sql
SELECT 
    round_number,
    round_name,
    price_usd,
    token_cap,
    tokens_sold,
    is_active,
    is_complete,
    CASE 
        WHEN is_active THEN '🟢 ACTIVE'
        WHEN is_complete THEN '✅ COMPLETE'
        ELSE '⏸️ PENDING'
    END AS status
FROM sale_rounds
ORDER BY round_number;
```

---

## Step 2: Interpret Results

### Scenario A: One Round is Active ✅
```
round_number | round_name    | is_active | is_complete | status
-------------|---------------|-----------|-------------|----------
1            | Seed Round    | false     | true        | ✅ COMPLETE
2            | Private Sale  | true      | false       | 🟢 ACTIVE
3            | Pre-Launch    | false     | false       | ⏸️ PENDING
4            | Public Listing| false     | false       | ⏸️ PENDING
```

**Result**: ✅ Everything is working correctly  
**Action**: None needed — your store is operational

---

### Scenario B: No Active Round ❌
```
round_number | round_name    | is_active | is_complete | status
-------------|---------------|-----------|-------------|----------
1            | Seed Round    | false     | true        | ✅ COMPLETE
2            | Private Sale  | false     | false       | ⏸️ PENDING
3            | Pre-Launch    | false     | false       | ⏸️ PENDING
4            | Public Listing| false     | false       | ⏸️ PENDING
```

**Result**: ❌ No active round — store won't work  
**Action**: Activate Round 2 (see fix below)

---

### Scenario C: Multiple Active Rounds ❌
```
round_number | round_name    | is_active | is_complete | status
-------------|---------------|-----------|-------------|----------
1            | Seed Round    | true      | false       | 🟢 ACTIVE
2            | Private Sale  | true      | false       | 🟢 ACTIVE
3            | Pre-Launch    | false     | false       | ⏸️ PENDING
4            | Public Listing| false     | false       | ⏸️ PENDING
```

**Result**: ❌ Multiple active rounds — will cause errors  
**Action**: Deactivate all except one (see fix below)

---

### Scenario D: Active Round is Complete ❌
```
round_number | round_name    | is_active | is_complete | status
-------------|---------------|-----------|-------------|----------
1            | Seed Round    | true      | true        | 🟢 ACTIVE ✅ COMPLETE
2            | Private Sale  | false     | false       | ⏸️ PENDING
3            | Pre-Launch    | false     | false       | ⏸️ PENDING
4            | Public Listing| false     | false       | ⏸️ PENDING
```

**Result**: ❌ Active round is marked complete — conflicting state  
**Action**: Deactivate Round 1, activate Round 2

---

## Step 3: Check What the App Sees

```sql
SELECT get_active_sale_round();
```

**Expected Output** (if working):
```json
{
  "id": "...",
  "round_name": "Private Sale",
  "price_usd": 0.018,
  "token_cap": 1480000,
  "tokens_sold": 0,
  "tokens_remaining": 1480000,
  "progress_pct": 0.00,
  "bonus_tiers": [...],
  "end_date": "2026-12-31T23:59:59+00:00",
  "is_complete": false,
  "next_round_price": 0.025
}
```

**If you get NULL or empty**: No active round exists

---

## Step 4: Fix Issues

### Fix A: No Active Round → Activate Round 2

```sql
-- Close Round 1
UPDATE sale_rounds
SET is_active = false, is_complete = true
WHERE round_number = 1;

-- Activate Round 2
UPDATE sale_rounds
SET is_active = true, is_complete = false, start_date = now()
WHERE round_number = 2;
```

### Fix B: Multiple Active Rounds → Keep Only One

```sql
-- Deactivate all rounds
UPDATE sale_rounds SET is_active = false;

-- Activate only Round 2
UPDATE sale_rounds
SET is_active = true, is_complete = false
WHERE round_number = 2;
```

### Fix C: Active Round is Complete → Move to Next Round

```sql
-- Deactivate Round 1
UPDATE sale_rounds
SET is_active = false, is_complete = true
WHERE round_number = 1;

-- Activate Round 2
UPDATE sale_rounds
SET is_active = true, is_complete = false, start_date = now()
WHERE round_number = 2;
```

---

## Step 5: Verify Fix

After running any fix, verify:

```sql
-- Should show exactly 1 active round
SELECT 
    COUNT(*) FILTER (WHERE is_active = true) AS active_rounds
FROM sale_rounds;
```

**Expected**: `active_rounds = 1`

```sql
-- Should return round details
SELECT get_active_sale_round();
```

**Expected**: JSON object with round details

---

## Step 6: Test in UI

1. **Refresh your store page**
2. **Check the round name** — should show "Private Sale" (or whichever you activated)
3. **Check the price** — should show $0.018 (for Round 2)
4. **Check progress bar** — should show 0% (if Round 2 just started)
5. **Try a test purchase** — should work without errors

---

## Common Issues & Solutions

### Issue: "No active round found"
**Cause**: All rounds have `is_active = false`  
**Fix**: Run Fix A above

### Issue: "Multiple rounds active"
**Cause**: More than one round has `is_active = true`  
**Fix**: Run Fix B above

### Issue: "Round is sold out but still active"
**Cause**: `tokens_sold >= token_cap` but `is_active = true`  
**Fix**: Run Fix C above

### Issue: "get_active_sale_round() returns NULL"
**Cause**: No round matches the query criteria  
**Fix**: Check that one round has `is_active = true AND is_complete = false`

---

## Quick Status Commands

### Check active round count
```sql
SELECT COUNT(*) FROM sale_rounds WHERE is_active = true;
```
**Expected**: 1

### Check which round is active
```sql
SELECT round_number, round_name FROM sale_rounds WHERE is_active = true;
```
**Expected**: One row (e.g., "2 | Private Sale")

### Check for conflicts
```sql
SELECT * FROM sale_rounds WHERE is_active = true AND is_complete = true;
```
**Expected**: Empty (no rows)

---

## Recommended State (After Migration)

```
Round 1: Seed Round
- is_active: false
- is_complete: true
- tokens_sold: 4,820,000
- token_cap: 4,820,000
- Status: ✅ SOLD OUT

Round 2: Private Sale
- is_active: true
- is_complete: false
- tokens_sold: 0
- token_cap: 1,480,000
- Status: 🟢 ACTIVE

Round 3: Pre-Launch
- is_active: false
- is_complete: false
- Status: ⏸️ PENDING

Round 4: Public Listing
- is_active: false
- is_complete: false
- Status: ⏸️ PENDING
```

---

## Files Reference

- **check_active_round.sql** — Diagnostic queries
- **activate_round.sql** — Quick activation scripts
- **fix_ico_rounds_21m_supply_SAFE.sql** — Full migration

---

**Next Step**: Run `check_active_round.sql` and report back what you see!
