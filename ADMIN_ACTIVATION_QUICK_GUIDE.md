# Quick Guide: View User Activations in Admin Panel

## 🎯 Where to Find It

### Step 1: Navigate to Admin Panel
```
URL: http://localhost:5173/admin
```
(Or your production domain + `/admin`)

### Step 2: Scroll Down
You'll see this layout:

```
┌─────────────────────────────────────────────────────────┐
│  Admin Panel                          [Admin Access]    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Total Users] [Activated] [Not Activated] [With Nodes] │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📋 Recent Activations                    [125 total] ▶ │  ← CLICK HERE
│  View payment details and transaction hashes            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Step 3: Click to Expand
The section will expand to show:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📋 Recent Activations                                      [125 total] ▼   │
├─────────────────────────────────────────────────────────────────────────────┤
│  User          │ Wallet      │ Payment      │ Transaction  │ Date          │
├─────────────────────────────────────────────────────────────────────────────┤
│  John Doe      │ UQDck6IU... │ $18.00       │ abc123... 🔗 │ Apr 10, 14:30 │
│  john@mail.com │             │ 7.3469 TON   │              │ ✅ Completed  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Jane Smith    │ EQB2b3Uk... │ $25.00       │ def456... 🔗 │ Apr 10, 12:15 │
│  jane@mail.com │             │ 10.2041 TON  │              │ ✅ Completed  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Bob Wilson    │ kQA1b2c3... │ $0.00        │ Admin        │ Apr 9, 18:45  │
│                │             │ 0.0000 TON   │ activated    │ ✅ Completed  │
└─────────────────────────────────────────────────────────────────────────────┘
                    [← Previous]  Page 1 of 7  [Next →]
```

---

## 🔍 What Each Column Means

### 👤 User
- **Name**: User's display name
- **Email**: Contact email (if provided)

### 💼 Wallet
- **Address**: Truncated TON wallet address
- Format: `UQDck6IU...yEf96` (first 8 + last 6 chars)

### 💰 Payment
- **USD Amount**: Total paid in dollars
- **TON Amount**: Total paid in TON tokens

### 🔗 Transaction
- **Hash**: Click to view on TonScan
- **Admin activated**: Manual activation (no payment)

### 📅 Date
- **Timestamp**: When activation completed
- **Status**: ✅ Completed / 🕐 Pending

---

## 🔗 Verify a Payment

### Click on Transaction Hash
```
abc123... 🔗  ← Click this
```

### Opens TonScan
```
https://tonscan.org/tx/abc123def456...
```

### What You'll See on TonScan
- ✅ **From**: User's wallet address
- ✅ **To**: Your payment wallet (UQDck6IU... or UQB2b3Uk...)
- ✅ **Amount**: Exact TON amount sent
- ✅ **Status**: Success / Failed
- ✅ **Timestamp**: Block time
- ✅ **Comment**: "RhizaCore Package Purchase"

---

## 📱 Mobile View

On mobile, activations show as cards:

```
┌─────────────────────────────────────┐
│  John Doe              ✅ Completed │
│  john@mail.com                      │
│  UQDck6IU...yEf96                   │
├─────────────────────────────────────┤
│  Payment        │ Date              │
│  $18.00         │ Apr 10, 2024      │
│  7.3469 TON     │ 14:30:25          │
├─────────────────────────────────────┤
│  [🔗 View on TonScan]               │
└─────────────────────────────────────┘
```

---

## 🎯 Common Tasks

### Task 1: Check if User Paid
**User says**: "I paid but my wallet isn't activated"

1. Open Admin Panel → Recent Activations
2. Use browser search (Ctrl+F / Cmd+F)
3. Search for last 8 chars of their wallet address
4. If found → Click transaction hash → Verify on TonScan
5. If not found → Check if payment went to wrong address

### Task 2: Verify Payment Amount
**User says**: "I paid $25 but was charged $30"

1. Find their activation in the list
2. Check the **Payment** column
3. Shows both USD and TON amounts
4. Click transaction hash to verify on-chain

### Task 3: Track Daily Revenue
**You want to**: See how much was collected today

1. Open Recent Activations
2. Look at the **Date** column
3. Add up all **Payment** amounts from today
4. Exclude $0.00 entries (admin activations)

### Task 4: Find Admin Activations
**You want to**: See which users were manually activated

1. Open Recent Activations
2. Look for entries with "Admin activated" in Transaction column
3. These show $0.00 payment (no charge)

---

## 🔢 Understanding the Numbers

### Example Activation
```
Payment: $18.00
         7.3469 TON
```

**What this means:**
- User paid **$18.00 USD** worth of TON
- At the time of payment, TON price was **$2.45**
- Calculation: $18.00 ÷ $2.45 = **7.3469 TON**
- This is stored in `wallet_activations` table

### Verify the Math
```sql
SELECT 
  activation_fee_usd,
  activation_fee_ton,
  ton_price_at_activation,
  (activation_fee_usd / ton_price_at_activation) as calculated_ton
FROM wallet_activations
WHERE wallet_address = 'UQDck6IU...';
```

---

## 🚨 Troubleshooting

### "No activations found"
**Possible causes:**
1. No users have activated yet
2. Database connection issue
3. RLS policies blocking access

**Solution:**
- Check Supabase connection
- Verify you have admin role
- Check browser console for errors

### "Transaction hash not showing"
**Possible causes:**
1. Admin-activated user (no payment)
2. Payment detection failed
3. Transaction hash not stored

**Solution:**
- Check if it says "Admin activated"
- Look in `wallet_activations` table directly
- Check `transaction_hash` column

### "Can't click transaction link"
**Possible causes:**
1. Transaction hash is null
2. Link not rendering
3. Browser blocking popup

**Solution:**
- Right-click → Open in new tab
- Copy hash and paste into TonScan manually
- Check browser popup blocker

---

## 📊 SQL Queries for Manual Verification

### Get All Activations
```sql
SELECT 
  wa.wallet_address,
  wu.name,
  wa.activation_fee_usd,
  wa.activation_fee_ton,
  wa.transaction_hash,
  wa.completed_at,
  wa.status
FROM wallet_activations wa
JOIN wallet_users wu ON wa.wallet_address = wu.wallet_address
ORDER BY wa.completed_at DESC
LIMIT 50;
```

### Get Today's Activations
```sql
SELECT 
  COUNT(*) as total_activations,
  SUM(activation_fee_usd) as total_usd,
  SUM(activation_fee_ton) as total_ton
FROM wallet_activations
WHERE DATE(completed_at) = CURRENT_DATE;
```

### Find Specific User
```sql
SELECT *
FROM wallet_activations
WHERE wallet_address ILIKE '%{last_8_chars}%'
ORDER BY completed_at DESC;
```

---

## ✅ Summary

You can now:
- ✅ View all wallet activations in one place
- ✅ See payment amounts in USD and TON
- ✅ Verify transactions on TonScan with one click
- ✅ Track activation timestamps
- ✅ Identify admin vs. paid activations
- ✅ Support users with payment issues
- ✅ Monitor daily revenue

**Location**: Admin Panel → Recent Activations section  
**Access**: Admin role required  
**Data Source**: `wallet_activations` + `wallet_users` tables  
**Updates**: Real-time (refresh page to see new activations)
