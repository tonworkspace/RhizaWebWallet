# TON Staked Field Added to STK Migration

## Summary
Successfully added the "TON Staked" field to the STK migration system, allowing users to report how much TON they have staked alongside their STK tokens.

## Changes Made

### 1. Database Schema (`add_ton_staked_to_stk_migrations.sql`)
- Added `ton_staked` column to `stk_migrations` table
- Type: `DECIMAL(20, 9)` with default value of 0
- Allows tracking of TON tokens staked by users

### 2. Migration Service (`services/migrationService.ts`)
- Updated `StkMigrationRequest` interface to include `ton_staked: number`
- Updated `StkMigrationSubmitData` interface to include `ton_staked: number`
- Modified `submitStkMigrationRequest()` to save `ton_staked` value
- Updated `approveStkMigration()` to include TON staked in transaction metadata

### 3. User Interface (`pages/WalletMigration.tsx`)
- Added `tonStaked` state variable
- Added TON Staked input field in the STK migration form
- Added validation for TON staked amount (must be >= 0)
- Updated form submission to include `ton_staked` value
- Loads existing TON staked value when checking migration status

### 4. Admin Dashboard (`pages/AdminDashboard.tsx`)
- Added TON Staked badge in STK migration list (blue badge)
- Updated STK migration review modal to display TON staked amount
- Shows TON staked in a dedicated card in the modal

## UI Layout

### STK Migration Form
The form now includes (in order):
1. Mainnet Wallet Address (display only)
2. Telegram Username
3. Mobile Number
4. STK Wallet Address
5. NFT Token ID
6. STK Amount
7. **TON Staked** (NEW)
8. Conversion display (StarFi Points → RZC)

### Admin Dashboard - STK Migration List
Each migration request shows:
- Status badge
- Wallet addresses
- Contact info
- **4 badges**: STK Amount, TON Staked, StarFi Points, RZC Equivalent

### Admin Dashboard - Review Modal
Displays in grid format:
- Row 1: STK Amount | TON Staked | StarFi Points
- Row 2: RZC Equivalent (full width)

## Database Migration Required

Run this SQL to add the column:
```sql
ALTER TABLE stk_migrations
ADD COLUMN IF NOT EXISTS ton_staked DECIMAL(20, 9) DEFAULT 0;
```

## Validation Rules
- TON Staked must be a valid number
- TON Staked must be >= 0 (can be 0 if no TON is staked)
- Field is required (user must enter a value, even if 0)

## Next Steps
1. Run the database migration SQL
2. Test the form submission with TON staked values
3. Verify admin dashboard displays TON staked correctly
4. Confirm migration approval includes TON staked in metadata

## Notes
- TON staked is informational and doesn't affect RZC conversion
- RZC conversion is still based on STK amount only (10M STK = 8 RZC)
- TON staked data is stored for record-keeping and future reference
