# How to Increase Sale Round Percentage

## Quick Answer

Run this SQL in Supabase to set the progress to any percentage you want:

```sql
-- Set to 50% sold
UPDATE sale_rounds
SET tokens_sold = FLOOR(token_cap * 0.50)
WHERE is_active = true;
```

Then refresh your UI — the progress bar will update automatically!

---

## Step-by-Step Guide

### 1. Open Supabase SQL Editor
- Go to your Supabase dashboard
- Click "SQL Editor" in the left sidebar
- Click "New Query"

### 2. Choose Your Desired Percentage

**For Seed Round (4,820,000 token cap):**

| Percentage | Tokens Sold | SQL Command | Urgency Level |
|------------|-------------|-------------|---------------|
| 10% | 482,000 | `UPDATE sale_rounds SET tokens_sold = 482000 WHERE is_active = true;` | 🟢 Low |
| 25% | 1,205,000 | `UPDATE sale_rounds SET tokens_sold = 1205000 WHERE is_active = true;` | 🟢 Low |
| 50% | 2,410,000 | `UPDATE sale_rounds SET tokens_sold = 2410000 WHERE is_active = true;` | 🟡 Medium |
| 75% | 3,615,000 | `UPDATE sale_rounds SET tokens_sold = 3615000 WHERE is_active = true;` | 🟠 High |
| 90% | 4,338,000 | `UPDATE sale_rounds SET tokens_sold = 4338000 WHERE is_active = true;` | 🔴 Critical |
| 95% | 4,579,000 | `UPDATE sale_rounds SET tokens_sold = 4579000 WHERE is_active = true;` | 🔴 Critical |
| 99% | 4,771,800 | `UPDATE sale_rounds SET tokens_sold = 4771800 WHERE is_active = true;` | 🔴 Extreme |

### 3. Run the SQL

Copy one of the commands above and paste it into the SQL Editor, then click "Run".

### 4. Verify the Change

```sql
SELECT 
    round_name,
    tokens_sold,
    token_cap,
    ROUND((tokens_sold::numeric / token_cap) * 100, 2) AS progress_pct
FROM sale_rounds
WHERE is_active = true;
```

### 5. Refresh Your UI

The Store UI will show the new progress within 2 minutes (auto-refresh), or you can manually refresh the page.

---

## Custom Percentage Formula

If you want a specific percentage (e.g., 67.5%):

```sql
UPDATE sale_rounds
SET tokens_sold = FLOOR(token_cap * 0.675)  -- 67.5%
WHERE is_active = true;
```

Replace `0.675` with your desired percentage as a decimal:
- 10% = `0.10`
- 25% = `0.25`
- 50% = `0.50`
- 75% = `0.75`
- 90% = `0.90`

---

## Add Tokens Incrementally

If you want to add tokens instead of setting a specific amount:

```sql
-- Add 500,000 more tokens to current amount
UPDATE sale_rounds
SET tokens_sold = tokens_sold + 500000
WHERE is_active = true;
```

---

## What Happens in the UI

When you increase the percentage, the UI will show:

1. **Progress Bar** — Animates to new percentage
2. **Tokens Remaining** — Updates to show less available
3. **Urgency Message** — Changes based on percentage:
   - < 50%: "Only X% of seed round left"
   - > 90%: More urgent messaging
   - 100%: "SOLD OUT" banner

4. **Header Bar** — Shows remaining percentage
5. **Why Buy Now** — Updates "Round Closing" message

---

## Recommended Settings for Marketing

### Launch Phase (Week 1)
```sql
UPDATE sale_rounds SET tokens_sold = 482000 WHERE is_active = true;  -- 10%
```
**Message:** "Just launched, plenty of time"

### Growth Phase (Week 2-3)
```sql
UPDATE sale_rounds SET tokens_sold = 2410000 WHERE is_active = true;  -- 50%
```
**Message:** "Half sold, momentum building"

### Urgency Phase (Week 4)
```sql
UPDATE sale_rounds SET tokens_sold = 4338000 WHERE is_active = true;  -- 90%
```
**Message:** "Almost sold out, act now!"

### Final Push (Last Days)
```sql
UPDATE sale_rounds SET tokens_sold = 4771800 WHERE is_active = true;  -- 99%
```
**Message:** "Last chance, only 1% left!"

---

## Important Notes

⚠️ **Constraints:**
- You **cannot** set `tokens_sold` higher than `token_cap`
- The database will reject the update if you try

✅ **Auto-Refresh:**
- The UI fetches new data every 2 minutes
- Users will see the update without manual refresh

🎯 **Psychology:**
- Higher percentage = more urgency = higher conversion
- 80-95% is the "sweet spot" for urgency
- 99% creates extreme FOMO

📊 **Tracking:**
- All purchases via `record_ico_purchase()` will increment `tokens_sold`
- Manual updates won't affect real purchase tracking

---

## Reset to Original

If you need to reset:

```sql
-- Reset to 10% (original)
UPDATE sale_rounds 
SET tokens_sold = 482000, updated_at = now() 
WHERE round_number = 1;
```

---

## Files

- `update_sale_round_progress.sql` — Full SQL script with all options
- `INCREASE_SALE_PROGRESS_GUIDE.md` — This guide

---

## Quick Commands

**Set to 90% (recommended for urgency):**
```sql
UPDATE sale_rounds SET tokens_sold = 4338000 WHERE is_active = true;
```

**Check current progress:**
```sql
SELECT round_name, tokens_sold, token_cap, 
       ROUND((tokens_sold::numeric / token_cap) * 100, 2) AS progress_pct
FROM sale_rounds WHERE is_active = true;
```

**Test what frontend sees:**
```sql
SELECT * FROM get_active_sale_round();
```

That's it! Update the database and watch the urgency increase in your UI. 🚀
