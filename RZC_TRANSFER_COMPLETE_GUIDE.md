# 🎉 RZC Transfer System - Complete Guide

## ✅ What's Been Created

A complete system for sending and receiving RZC tokens using either wallet addresses or usernames!

### 📁 New Files

1. **setup_rzc_transfer_system.sql** - Database functions
   - `transfer_rzc()` - Send RZC to username or address
   - `get_rzc_transfer_history()` - View transfer history
   - `get_recent_rzc_transfers()` - Recent transfers

2. **services/rzcTransferService.ts** - Frontend service
   - Transfer RZC with validation
   - Get transfer history
   - Validate recipients
   - Format displays

---

## 🚀 Quick Setup (10 minutes)

### Step 1: Run SQL Scripts (5 min)

Run these in order in Supabase SQL Editor:

1. **Username System** (if not done):
   ```sql
   -- Run: setup_username_system_FIXED.sql
   ```

2. **RZC Transfer System**:
   ```sql
   -- Run: setup_rzc_transfer_system.sql
   ```

### Step 2: Verify Setup (2 min)

```sql
-- Check functions exist
SELECT routine_name 
FROM information_schema.routines
WHERE routine_name IN (
  'transfer_rzc',
  'get_rzc_transfer_history',
  'get_recent_rzc_transfers'
);
-- Should return 3 functions
```

---

## 💡 How It Works

### For Users

Users can now send RZC using:
- **@username**: `@john`
- **username**: `john`
- **Wallet address**: `UQx1abc...xyz`

### System Flow

```
User enters: @john + 100 RZC
     ↓
System resolves: @john → UQx1abc...xyz
     ↓
Validates: Balance, recipient exists
     ↓
Transfers: Sender -100 RZC, Recipient +100 RZC
     ↓
Records: 2 transactions (sent + received)
     ↓
Shows: "Sent 100 RZC to @john"
```

---

## 🔧 Frontend Usage

### Example 1: Send RZC

```typescript
import { rzcTransferService } from '../services/rzcTransferService';

// Send to username
const result = await rzcTransferService.transferRZC(
  senderUserId,
  '@john',  // or 'john' or 'UQx1...abc'
  100,
  'Payment for services'
);

if (result.success) {
  console.log('Transfer successful!');
  console.log('New balance:', result.newSenderBalance);
  console.log('Sent to:', result.recipientUsername);
} else {
  console.error('Transfer failed:', result.message);
}
```

### Example 2: Validate Recipient

```typescript
// Before sending, validate recipient
const validation = await rzcTransferService.validateRecipient('@john');

if (validation.valid) {
  console.log('Sending to:', validation.username);
  console.log('Wallet:', validation.walletAddress);
  // Show confirmation with user info
} else {
  console.error('Invalid recipient:', validation.error);
}
```

### Example 3: Get Transfer History

```typescript
// Get last 20 transfers
const history = await rzcTransferService.getTransferHistory(userId, 20);

history.forEach(tx => {
  console.log(
    rzcTransferService.formatTransferDisplay(
      tx.type,
      tx.amount,
      tx.counterpartyUsername,
      tx.counterpartyWallet
    )
  );
});
```

### Example 4: Get Recent Transfers

```typescript
// Get transfers from last 24 hours
const recent = await rzcTransferService.getRecentTransfers(userId, 24);

recent.forEach(tx => {
  console.log(`${tx.amount} RZC - ${tx.timeAgo}`);
});
```

---

## 📊 Database Functions

### 1. Transfer RZC

```sql
SELECT * FROM transfer_rzc(
  'SENDER_USER_ID'::UUID,
  '@john',  -- or wallet address
  100,
  'Optional comment'
);
```

**Returns**:
- `success`: Boolean
- `message`: Status message
- `transaction_id`: UUID of transaction
- `recipient_user_id`: UUID of recipient
- `recipient_username`: Username of recipient
- `new_sender_balance`: Updated sender balance
- `new_recipient_balance`: Updated recipient balance

### 2. Get Transfer History

```sql
SELECT * FROM get_rzc_transfer_history(
  'USER_ID'::UUID,
  50  -- limit
);
```

**Returns**:
- `transaction_id`: UUID
- `amount`: Positive (received) or negative (sent)
- `type`: 'transfer_sent' or 'transfer_received'
- `description`: Human-readable description
- `counterparty_username`: Other party's username
- `counterparty_wallet`: Other party's wallet
- `comment`: Transfer comment
- `created_at`: Timestamp

### 3. Get Recent Transfers

```sql
SELECT * FROM get_recent_rzc_transfers(
  'USER_ID'::UUID,
  24  -- hours
);
```

**Returns**: Same as history + `time_ago` field

---

## 🎨 UI Integration Points

### 1. Transfer Page

Add RZC as a transfer option:

```typescript
// In Transfer.tsx
const [selectedAsset, setSelectedAsset] = useState<'TON' | 'RZC' | 'JETTON'>('TON');

// When RZC selected
if (selectedAsset === 'RZC') {
  // Use rzcTransferService.transferRZC()
  // Show RZC balance
  // Validate recipient with usernameService
}
```

### 2. Transaction History

Show RZC transfers:

```typescript
// In History.tsx
const rzcHistory = await rzcTransferService.getTransferHistory(userId);

// Display with:
rzcHistory.map(tx => (
  <TransactionItem
    type={tx.type}
    amount={tx.amount}
    recipient={tx.counterpartyUsername || tx.counterpartyWallet}
    comment={tx.comment}
    date={tx.createdAt}
  />
))
```

### 3. Dashboard

Show recent RZC activity:

```typescript
// In Dashboard.tsx
const recentRZC = await rzcTransferService.getRecentTransfers(userId, 24);

// Display as activity feed
```

---

## ✅ Features

### Security
- ✅ Atomic transactions (all-or-nothing)
- ✅ Balance validation before transfer
- ✅ Prevents self-transfers
- ✅ Transaction logging for audit
- ✅ User ID validation

### User Experience
- ✅ Send to @username or wallet address
- ✅ Case-insensitive username matching
- ✅ Recipient validation before sending
- ✅ Transfer history with usernames
- ✅ Recent activity tracking
- ✅ Optional comments/memos

### Data Integrity
- ✅ Double-entry bookkeeping (sent + received)
- ✅ Metadata tracking (sender, recipient, comment)
- ✅ Timestamp tracking
- ✅ Transaction linking
- ✅ Balance consistency

---

## 🧪 Testing Checklist

### Database Tests

- [ ] SQL scripts run without errors
- [ ] Functions exist and have correct permissions
- [ ] Can transfer RZC using username
- [ ] Can transfer RZC using wallet address
- [ ] Transfer fails with insufficient balance
- [ ] Transfer fails with invalid recipient
- [ ] Transfer fails for self-transfer
- [ ] Both sender and recipient transactions created
- [ ] Balances update correctly
- [ ] Transfer history shows correct data

### Frontend Tests

- [ ] Can send RZC to @username
- [ ] Can send RZC to wallet address
- [ ] Recipient validation works
- [ ] Shows error for invalid recipient
- [ ] Shows error for insufficient balance
- [ ] Transfer history displays correctly
- [ ] Recent transfers show time ago
- [ ] Balance updates after transfer
- [ ] Confirmation shows recipient info
- [ ] Transaction appears in history

---

## 📋 Integration Steps

### Step 1: Add RZC Option to Transfer Page

```typescript
// Add to asset selector
<option value="RZC">RZC Token</option>

// Show RZC balance
{selectedAsset === 'RZC' && (
  <div>Balance: {rzcBalance} RZC</div>
)}
```

### Step 2: Add Username Input with Validation

```typescript
const [recipient, setRecipient] = useState('');
const [recipientInfo, setRecipientInfo] = useState(null);

// Validate on blur or button click
const handleValidate = async () => {
  const result = await rzcTransferService.validateRecipient(recipient);
  if (result.valid) {
    setRecipientInfo(result);
    // Show: "Sending to @john (UQx1...abc)"
  } else {
    // Show error
  }
};
```

### Step 3: Handle RZC Transfer

```typescript
const handleSendRZC = async () => {
  const result = await rzcTransferService.transferRZC(
    userId,
    recipient,
    amount,
    comment
  );

  if (result.success) {
    showToast('RZC sent successfully!', 'success');
    // Update balance
    // Navigate to history
  } else {
    showToast(result.message, 'error');
  }
};
```

### Step 4: Show RZC in History

```typescript
// Fetch RZC transfers
const rzcTransfers = await rzcTransferService.getTransferHistory(userId);

// Merge with TON/Jetton history
const allTransactions = [
  ...tonTransactions,
  ...rzcTransfers,
  ...jettonTransactions
].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
```

---

## 🔍 Verification Queries

### Check Setup

```sql
-- Verify functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%transfer%rzc%'
OR routine_name LIKE '%rzc%transfer%';

-- Check RZC balance column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'wallet_users'
AND column_name = 'rzc_balance';

-- Check transactions table
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'rzc_transactions';
```

### Test Transfer

```sql
-- Get two user IDs for testing
SELECT id, name, wallet_address, rzc_balance
FROM wallet_users
LIMIT 2;

-- Transfer between them
SELECT * FROM transfer_rzc(
  'USER1_ID'::UUID,
  '@user2name',
  10,
  'Test transfer'
);

-- Check balances updated
SELECT name, rzc_balance
FROM wallet_users
WHERE id IN ('USER1_ID'::UUID, 'USER2_ID'::UUID);

-- Check transactions created
SELECT * FROM rzc_transactions
WHERE user_id IN ('USER1_ID'::UUID, 'USER2_ID'::UUID)
ORDER BY created_at DESC
LIMIT 4;
```

---

## ⚠️ Important Notes

### Transaction Types

- `transfer_sent`: Outgoing transfer (negative amount)
- `transfer_received`: Incoming transfer (positive amount)
- Both transactions created for each transfer

### Balance Display

- Sender sees: `-100 RZC` (sent)
- Recipient sees: `+100 RZC` (received)
- Use `Math.abs(amount)` for display

### Username Resolution

- Case-insensitive: `@John` = `@john`
- @ is optional: `@john` = `john`
- Falls back to wallet address if not username

### Error Handling

Common errors:
- `Insufficient RZC balance`
- `User "username" not found`
- `Recipient wallet not found`
- `Cannot send RZC to yourself`
- `Amount must be greater than 0`

---

## 🚀 Next Steps

1. **Run SQL Scripts** - Set up database functions
2. **Test in SQL** - Verify transfers work
3. **Update Transfer Page** - Add RZC option
4. **Add to History** - Show RZC transfers
5. **Test End-to-End** - Full user flow

---

## 📞 Support

If you encounter issues:

1. **Check SQL ran successfully**
2. **Verify functions exist**
3. **Test transfer in SQL first**
4. **Check user has RZC balance**
5. **Verify recipient exists**
6. **Check transaction logs**

---

## ✅ Summary

You now have a complete RZC transfer system that:
- ✅ Sends RZC using @username or wallet address
- ✅ Validates recipients before sending
- ✅ Tracks transfer history
- ✅ Shows recent activity
- ✅ Prevents errors (insufficient balance, invalid recipient)
- ✅ Maintains data integrity

Ready to integrate into the UI!
