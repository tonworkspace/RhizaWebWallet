# ✅ STK Migration - NFT Token ID & Wallet Address Fields Added

## What Changed

Added two new required fields to the STK migration system for better verification:

1. **STK Wallet Address** - The old wallet address that holds the STK tokens
2. **NFT Token ID** - The NFT Token ID associated with the STK wallet

---

## Updated Fields

### Required Information (Now 5 fields)

1. ✅ Telegram Username
2. ✅ Mobile Number
3. ✅ **STK Wallet Address** (NEW)
4. ✅ **NFT Token ID** (NEW)
5. ✅ STK Amount

---

## Files Modified

### Database Schema
- ✅ `create_stk_migrations_table.sql` - Updated with new fields
- ✅ `add_stk_wallet_nft_fields.sql` - Migration script for existing tables

### Service Layer
- ✅ `services/migrationService.ts`
  - Updated `StkMigrationRequest` interface
  - Updated `StkMigrationSubmitData` interface
  - Updated `submitStkMigrationRequest()` method
  - Updated `approveStkMigration()` metadata

### UI Components
- ✅ `pages/WalletMigration.tsx`
  - Added `stkWalletAddress` state
  - Added `nftTokenId` state
  - Added input fields for both
  - Added validation for both fields
  - Updated form submission

---

## Database Update

### For New Installations

Run the updated schema:
```bash
create_stk_migrations_table.sql
```

### For Existing Installations

Run the migration script:
```bash
add_stk_wallet_nft_fields.sql
```

This will:
- Add `stk_wallet_address` column
- Add `nft_token_id` column
- Set NOT NULL constraints (if no existing data)

---

## UI Changes

### New Input Fields

**STK Wallet Address:**
```tsx
<input
  type="text"
  placeholder="UQxxx..."
  className="font-mono"
/>
```
- Monospace font for better readability
- Placeholder shows expected format
- Help text: "Your old wallet address that holds the STK tokens"

**NFT Token ID:**
```tsx
<input
  type="text"
  placeholder="NFT-12345"
/>
```
- Help text: "Your NFT Token ID associated with the STK wallet"

---

## Validation

### Added Checks

```typescript
// STK Wallet Address
if (!stkWalletAddress.trim()) {
  showToast('Please enter your STK wallet address', 'error');
  return;
}

// NFT Token ID
if (!nftTokenId.trim()) {
  showToast('Please enter your NFT Token ID', 'error');
  return;
}
```

---

## Database Schema

### Updated Table Structure

```sql
CREATE TABLE stk_migrations (
    id UUID PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    telegram_username TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    stk_wallet_address TEXT NOT NULL,  -- NEW
    nft_token_id TEXT NOT NULL,        -- NEW
    stk_amount NUMERIC NOT NULL,
    starfi_points NUMERIC NOT NULL,
    rzc_equivalent NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT
);
```

---

## Service Interface

### Updated Types

```typescript
export interface StkMigrationRequest {
  id: string;
  wallet_address: string;
  telegram_username: string;
  mobile_number: string;
  stk_wallet_address: string;  // NEW
  nft_token_id: string;         // NEW
  stk_amount: number;
  starfi_points: number;
  rzc_equivalent: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export interface StkMigrationSubmitData {
  wallet_address: string;
  telegram_username: string;
  mobile_number: string;
  stk_wallet_address: string;  // NEW
  nft_token_id: string;         // NEW
  stk_amount: number;
}
```

---

## Admin Dashboard

### Updated Display

When viewing STK migrations, admins will now see:
- Telegram Username
- Mobile Number
- **STK Wallet Address** (for verification)
- **NFT Token ID** (for verification)
- STK Amount
- RZC Equivalent
- Status

This provides better verification capabilities for the admin team.

---

## Testing

### Test Submission

1. Go to Wallet Migration → STK to StarFi tab
2. Fill in all fields:
   - Telegram: @testuser
   - Mobile: +1234567890
   - **STK Wallet: UQOldWallet123**
   - **NFT Token ID: NFT-12345**
   - STK Amount: 50000000
3. Submit
4. Verify all fields are saved

### Verify in Database

```sql
SELECT 
    telegram_username,
    mobile_number,
    stk_wallet_address,
    nft_token_id,
    stk_amount,
    rzc_equivalent
FROM public.stk_migrations
ORDER BY created_at DESC
LIMIT 1;
```

---

## Migration Steps

### If You Already Created the Table

1. Run the migration script:
```bash
add_stk_wallet_nft_fields.sql
```

2. Verify columns were added:
```sql
\d public.stk_migrations
```

3. Test submission in UI

### If Starting Fresh

1. Run the updated schema:
```bash
create_stk_migrations_table.sql
```

2. Verify table structure
3. Test submission in UI

---

## Benefits

### Better Verification
- Admins can verify the STK wallet address
- NFT Token ID provides additional proof of ownership
- Reduces fraud risk

### Improved Tracking
- Complete audit trail of old wallet details
- Easier to resolve disputes
- Better record keeping

### Enhanced Security
- Multiple verification points
- Cross-reference capability
- Fraud prevention

---

## Status: ✅ COMPLETE

All changes have been implemented and tested:
- ✅ Database schema updated
- ✅ Service layer updated
- ✅ UI components updated
- ✅ Validation added
- ✅ Migration script created
- ✅ Documentation updated

**Created:** 2026-03-06  
**Version:** 1.1.0  
**Fields Added:** stk_wallet_address, nft_token_id
