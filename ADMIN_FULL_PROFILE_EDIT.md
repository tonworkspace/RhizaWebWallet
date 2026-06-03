# Admin Panel - Full Profile Edit Feature

## Overview
Enhanced the admin panel to provide complete control over all `wallet_users` table fields, allowing administrators to edit every aspect of a user's profile.

## Changes Made

### 1. **AdminPanel.tsx** - Enhanced Edit Modal

#### New Editable Fields
The edit form now includes all `wallet_users` fields:

**Basic Information:**
- ✅ Name
- ✅ Email
- ✅ Avatar URL
- ✅ Role (user, premium, vip, admin, super_admin)

**Financial:**
- ✅ RZC Balance
- ✅ Activation Fee Paid (TON)
- ✅ Total Squad Rewards

**Status Flags:**
- ✅ Account Active (is_active)
- ✅ Wallet Activated (is_activated)
- ✅ Premium Member (is_premium)

**Referral:**
- ✅ Referrer Code

**Timestamps:**
- ✅ Activated At (ISO 8601 format)
- ✅ Last Squad Claim At (ISO 8601 format)

#### UI Improvements
- **Two-column grid layout** for better space utilization
- **Organized sections** with visual separators
- **Checkbox toggles** for boolean fields (is_active, is_activated, is_premium)
- **Input validation** with placeholders and format hints
- **Responsive design** - works on mobile and desktop
- **Required reason field** for audit trail

### 2. **adminService.ts** - Enhanced Update Method

#### Updated Interface
```typescript
export interface AdminUser {
  id: string;
  wallet_address: string;
  name: string;
  email?: string;
  avatar?: string;
  role: string;
  is_active: boolean;
  is_activated: boolean;
  is_premium?: boolean;
  activated_at?: string;
  activation_fee_paid?: number;
  rzc_balance: number;
  referrer_code?: string;
  last_squad_claim_at?: string;
  total_squad_rewards?: number;
  transfer_locked?: boolean;
  transfer_lock_reason?: string;
  created_at: string;
  updated_at: string;
}
```

#### Enhanced Update Method
```typescript
async updateUserAccount(
  walletAddress: string,
  updates: {
    name?: string;
    email?: string;
    avatar?: string;
    role?: string;
    is_active?: boolean;
    is_activated?: boolean;
    is_premium?: boolean;
    activated_at?: string;
    activation_fee_paid?: number;
    rzc_balance?: number;
    referrer_code?: string;
    last_squad_claim_at?: string;
    total_squad_rewards?: number;
  },
  adminWallet: string,
  reason: string
): Promise<{ success: boolean; error?: string }>
```

**Features:**
- ✅ Accepts all wallet_users fields
- ✅ Smart update - only includes defined/non-empty values
- ✅ Automatic timestamp update
- ✅ Activity logging for audit trail
- ✅ User notification on profile change
- ✅ Error handling with detailed messages

## Usage

### For Admins

1. **Navigate to Admin Panel** (`/admin`)
2. **Find the user** using search or filters
3. **Click "Edit" button** on any user row
4. **Modify any fields** you need to change
5. **Enter a reason** for the update (required for audit)
6. **Click "Save Changes"**

### Field Guidelines

**Timestamps (ISO 8601 Format):**
```
2024-01-01T00:00:00.000Z
```
- Leave empty if not applicable
- Must be valid ISO 8601 format
- Timezone: UTC (Z suffix)

**RZC Balance:**
- Can be set to any positive number
- Decimal values allowed (e.g., 1234.56)
- Use "Award RZC" button for adding with transaction record

**Activation Status:**
- `is_activated` checkbox controls wallet activation
- `activated_at` should be set when activating
- `activation_fee_paid` records the TON amount paid

**Premium Status:**
- `is_premium` checkbox grants premium benefits
- Premium members earn 5 RZC per squad claim (vs 1 RZC)

## Security Features

✅ **Admin-only access** - Role verification required
✅ **Audit trail** - All changes logged with reason
✅ **User notifications** - Users notified of profile changes
✅ **Activity logging** - Full change history tracked
✅ **Reason required** - Cannot save without explanation

## Database Impact

### Tables Updated
- `wallet_users` - Direct profile updates
- `wallet_notifications` - User notification created
- `wallet_activity_logs` - Activity logged (via notificationService)

### Fields NOT Editable
- `id` - System-generated UUID
- `wallet_address` - Immutable identifier
- `created_at` - Historical record
- `updated_at` - Auto-managed by system

## Testing Checklist

- [ ] Edit user name and email
- [ ] Change user role (user → premium → admin)
- [ ] Toggle activation status
- [ ] Toggle premium status
- [ ] Update RZC balance
- [ ] Set activation timestamp
- [ ] Add referrer code
- [ ] Update squad rewards
- [ ] Verify user receives notification
- [ ] Check activity log entry
- [ ] Test with empty/null values
- [ ] Test with invalid timestamp format
- [ ] Verify mobile responsiveness

## Future Enhancements

### Potential Additions
1. **Bulk edit** - Update multiple users at once
2. **Field history** - Show previous values before change
3. **Undo changes** - Revert recent edits
4. **CSV export** - Export user data
5. **Advanced filters** - Filter by premium, activation date, etc.
6. **Profile preview** - See how profile looks to user
7. **Validation rules** - Prevent invalid data entry
8. **Role permissions** - Different edit rights per admin level

## Notes

- All changes are **immediate** and **permanent**
- Use the **"Award RZC"** button for adding RZC with proper transaction records
- Use the **"Activate"** button for standard activation flow
- Direct profile editing is for **corrections** and **special cases**
- Always provide a **clear reason** for audit compliance

## Related Files

- `pages/AdminPanel.tsx` - Admin UI component
- `services/adminService.ts` - Admin operations service
- `services/supabaseService.ts` - Database operations
- `services/notificationService.ts` - Activity logging

---

**Status:** ✅ Implemented and Ready
**Version:** 1.0.0
**Last Updated:** 2024-01-XX
