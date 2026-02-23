# Newsletter Schema - Quick Start 🚀

## 30-Second Setup

### 1. Check (5 seconds)
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'wallet_newsletter_subscriptions'
);
```
- `true` → Done! ✅
- `false` → Continue ⬇️

### 2. Add (10 seconds)
Open `add_newsletter_table_only.sql` → Copy → Paste in Supabase SQL Editor → Run

### 3. Verify (5 seconds)
```sql
SELECT COUNT(*) FROM wallet_newsletter_subscriptions;
```
Should return `0` (empty table, ready to use)

### 4. Test (10 seconds)
Go to landing page → Scroll to footer → Enter email → Submit → Check database

---

## What Gets Created

```
wallet_newsletter_subscriptions
├── 9 columns
├── 3 indexes
├── 3 RLS policies
└── Ready to use!
```

---

## Files You Need

### Must Read
📄 `ADD_NEWSLETTER_TO_EXISTING_DB.md` - Step-by-step guide

### Must Run
📄 `check_newsletter_table.sql` - Check if exists
📄 `add_newsletter_table_only.sql` - Add table

### Reference
📄 `COMPLETE_DATABASE_SCHEMA.md` - Full schema
📄 `NEWSLETTER_QUICK_REFERENCE.md` - API reference

---

## Visual Flow

```
┌─────────────────┐
│ Check if exists │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Exists? │
    └────┬────┘
         │
    ┌────▼────────────────┐
    │ Yes → Done! ✅      │
    │ No  → Run migration │
    └────┬────────────────┘
         │
    ┌────▼────────┐
    │ Verify      │
    └────┬────────┘
         │
    ┌────▼────────┐
    │ Test form   │
    └─────────────┘
```

---

## Quick Test

### Subscribe
```javascript
// Browser console on landing page
document.querySelector('input[type="email"]').value = 'test@example.com';
document.querySelector('form').dispatchEvent(new Event('submit', {bubbles: true}));
```

### Verify
```sql
SELECT * FROM wallet_newsletter_subscriptions 
WHERE email = 'test@example.com';
```

---

## Status Checklist

- [ ] Checked if table exists
- [ ] Ran migration (if needed)
- [ ] Verified table created
- [ ] Tested newsletter form
- [ ] Confirmed email saved
- [ ] Checked RLS policies
- [ ] Ready for production! 🎉

---

## One-Liner Commands

### Supabase Dashboard
```
SQL Editor → New Query → Paste migration → Run
```

### Supabase CLI
```bash
supabase db push
```

### Verify
```sql
\dt wallet_newsletter_subscriptions
```

---

## That's It!

The newsletter system is already integrated in your frontend. Just add the database table and you're done! 🚀

**Total time:** ~30 seconds
**Difficulty:** Easy ⭐
**Risk:** None (safe migration)
