# Admin Panel - User Management System ✅

## Overview
Comprehensive admin panel for managing users, wallet activations, and account details. Provides full control over user accounts for support and administrative purposes.

## Features

### 1. User Management
- View all users with pagination
- Search by wallet address, name, or email
- Filter by activation status and account status
- Real-time statistics dashboard

### 2. Activation Control
- **Manually Activate Users**: Activate wallets without payment
- **Deactivate Users**: Revoke wallet activation
- Reason tracking for all actions
- Automatic notifications to users

### 3. Account Editing
- Update user profile information
- Modify RZC balances
- Change user roles
- Toggle account active status

### 4. RZC Management
- Award RZC tokens to users
- Track all admin awards
- Reason documentation required

## Access Control

### Admin Role Required
```typescript
// Check if user is admin
const isAdmin = await adminService.isAdmin(walletAddress);

// Roles with admin access:
- 'admin'
- 'super_admin'
```

### Setting Admin Role
```sql
-- Grant admin access to a user
UPDATE wallet_users
SET role = 'admin'
WHERE wallet_address = 'USER_WALLET_ADDRESS';

-- Grant super admin access
UPDATE wallet_users
SET role = 'super_admin'
WHERE wallet_address = 'USER_WALLET_ADDRESS';
```

## Admin Panel Features

### Dashboard Statistics
- **Total Users**: Count of all registered users
- **Activated**: Users with activated wallets
- **Not Activated**: Users pending activation
- **Total RZC**: Sum of all user RZC balances

### Search & Filter
```typescript
// Search options
- Wallet address
- User name
- Email address

// Filter options
- All Users
- Activated only
- Not Activated only
- Active accounts
- Inactive accounts
```

### User Actions

#### 1. Activate User
```typescript
// Manually activate a user's wallet
await adminService.activateUser(
  walletAddress,
  adminWallet,
  reason
);
```

**What happens:**
- Sets `is_activated = true`
- Sets `activated_at = NOW()`
- Creates activation record
- Logs activity
- Sends notification to user

**Use cases:**
- Support requests
- Promotional activations
- Testing purposes
- Compensation for issues

#### 2. Deactivate User
```typescript
// Revoke wallet activation
await adminService.deactivateUser(
  walletAddress,
  adminWallet,
  reason
);
```

**What happens:**
- Sets `is_activated = false`
- Logs activity
- Sends security alert to user

**Use cases:**
- Policy violations
- Security concerns
- Account suspension
- Fraud prevention

#### 3. Award RZC
```typescript
// Give RZC tokens to user
await adminService.awardRZCToUser(
  walletAddress,
  amount,
  reason,
  adminWallet
);
```

**What happens:**
- Adds RZC to user balance
- Creates transaction record
- Logs activity
- Sends notification

**Use cases:**
- Compensation
- Promotions
- Bug bounties
- Community rewards

#### 4. Edit Account
```typescript
// Update user account details
await adminService.updateUserAccount(
  walletAddress,
  {
    name: 'New Name',
    email: 'new@email.com',
    role: 'premium',
    is_active: true,
    rzc_balance: 1000
  },
  adminWallet,
  reason
);
```

**What happens:**
- Updates specified fields
- Logs all changes
- Sends notification

**Use cases:**
- Profile corrections
- Role upgrades
- Account recovery
- Data fixes

## API Methods

### AdminService Methods

#### isAdmin()
```typescript
const isAdmin = await adminService.isAdmin(walletAddress);
// Returns: boolean
```

#### getAllUsers()
```typescript
const result = await adminService.getAllUsers({
  limit: 50,
  offset: 0,
  search: 'search term',
  filter: 'activated'
});
// Returns: { success, users, total, error }
```

#### activateUser()
```typescript
const result = await adminService.activateUser(
  userWallet,
  adminWallet,
  'Reason for activation'
);
// Returns: { success, error }
```

#### deactivateUser()
```typescript
const result = await adminService.deactivateUser(
  userWallet,
  adminWallet,
  'Reason for deactivation'
);
// Returns: { success, error }
```

#### updateUserAccount()
```typescript
const result = await adminService.updateUserAccount(
  userWallet,
  { name: 'New Name', email: 'new@email.com' },
  adminWallet,
  'Reason for update'
);
// Returns: { success, error }
```

#### awardRZCToUser()
```typescript
const result = await adminService.awardRZCToUser(
  userWallet,
  150,
  'Welcome bonus',
  adminWallet
);
// Returns: { success, newBalance, error }
```

## Database Schema

### Admin Actions Tracking

All admin actions are logged in `wallet_user_activity`:

```sql
INSERT INTO wallet_user_activity (
  wallet_address,
  activity_type,
  description,
  metadata
) VALUES (
  'user_wallet',
  'wallet_created', -- or 'settings_changed'
  'Wallet manually activated by admin',
  jsonb_build_object(
    'admin_wallet', 'admin_wallet',
    'reason', 'Support request',
    'manual_activation', true
  )
);
```

### Notifications

Users receive notifications for all admin actions:

```sql
INSERT INTO wallet_notifications (
  wallet_address,
  type,
  title,
  message,
  data,
  priority
) VALUES (
  'user_wallet',
  'system_announcement',
  '✅ Wallet Activated',
  'Your wallet has been activated by an administrator.',
  jsonb_build_object(
    'admin_activated', true,
    'reason', 'Support request'
  ),
  'high'
);
```

## Security Features

### 1. Role-Based Access
- Only users with `admin` or `super_admin` role can access
- Access denied page for non-admins
- Automatic role verification on every action

### 2. Audit Trail
- All actions logged with timestamp
- Admin wallet address recorded
- Reason required for all actions
- Full activity history

### 3. User Notifications
- Users notified of all admin actions
- Reason included in notifications
- Priority levels for different actions

### 4. Confirmation Prompts
- Deactivation requires confirmation
- Reason input required
- Amount validation for RZC awards

## Usage Guide

### Accessing Admin Panel

1. **Login as Admin**
   ```
   - Must have admin or super_admin role
   - Navigate to /admin/panel
   ```

2. **View Users**
   ```
   - See all users in paginated table
   - View activation status
   - Check RZC balances
   ```

3. **Search Users**
   ```
   - Enter wallet address, name, or email
   - Results update automatically
   ```

4. **Filter Users**
   ```
   - Select filter from dropdown
   - Options: All, Activated, Not Activated, Active, Inactive
   ```

5. **Activate User**
   ```
   - Click Shield icon
   - Enter reason
   - Confirm action
   ```

6. **Deactivate User**
   ```
   - Click Shield Off icon
   - Enter reason
   - Confirm action
   ```

7. **Award RZC**
   ```
   - Click Gift icon
   - Enter amount
   - Enter reason
   - Confirm action
   ```

8. **Edit User**
   ```
   - Click Edit icon
   - Modify fields
   - Enter reason
   - Save changes
   ```

## Common Use Cases

### Support Scenarios

#### 1. User Can't Activate (Payment Issue)
```
Action: Manually activate user
Reason: "Payment processed but activation failed - Support ticket #123"
Steps:
1. Search for user
2. Click Shield icon
3. Enter reason
4. User receives activation notification
```

#### 2. Fraudulent Account
```
Action: Deactivate user
Reason: "Fraudulent activity detected - Case #456"
Steps:
1. Search for user
2. Click Shield Off icon
3. Enter reason
4. Confirm deactivation
5. User receives security alert
```

#### 3. Compensation for Bug
```
Action: Award RZC
Reason: "Compensation for bug affecting user - Bug #789"
Steps:
1. Search for user
2. Click Gift icon
3. Enter amount (e.g., 50 RZC)
4. Enter reason
5. User receives RZC and notification
```

#### 4. Profile Correction
```
Action: Edit account
Reason: "User requested name change - Support ticket #101"
Steps:
1. Search for user
2. Click Edit icon
3. Update name/email
4. Enter reason
5. Save changes
```

### Promotional Scenarios

#### 1. Early Adopter Bonus
```
Action: Award RZC
Reason: "Early adopter bonus - First 100 users"
Amount: 500 RZC
```

#### 2. Community Event Winner
```
Action: Award RZC
Reason: "Winner of community trading competition"
Amount: 1000 RZC
```

#### 3. Beta Tester Activation
```
Action: Manually activate
Reason: "Beta tester - Free activation"
```

## Monitoring & Reporting

### View Admin Actions
```sql
-- Get all admin actions
SELECT 
  wa.wallet_address,
  wa.activity_type,
  wa.description,
  wa.metadata->>'admin_wallet' as admin_wallet,
  wa.metadata->>'reason' as reason,
  wa.created_at
FROM wallet_user_activity wa
WHERE wa.metadata->>'admin_wallet' IS NOT NULL
ORDER BY wa.created_at DESC;
```

### Count Manual Activations
```sql
-- Count users activated by admin
SELECT COUNT(*) as manual_activations
FROM wallet_activations
WHERE metadata->>'admin_activated' = 'true';
```

### Total RZC Awarded by Admin
```sql
-- Sum of all admin RZC awards
SELECT 
  SUM(amount) as total_awarded,
  COUNT(*) as award_count
FROM wallet_rzc_transactions
WHERE type = 'admin_award';
```

## Best Practices

### 1. Always Provide Reasons
- Document why action was taken
- Include ticket numbers if applicable
- Be specific and clear

### 2. Verify Before Action
- Confirm user identity
- Check account status
- Review history

### 3. Communicate with Users
- Explain actions taken
- Provide support contact
- Follow up if needed

### 4. Document Everything
- Keep records of all actions
- Note any special circumstances
- Track patterns

### 5. Use Appropriate Actions
- Activation: For legitimate users
- Deactivation: For policy violations
- RZC Awards: For compensation/rewards
- Account Edits: For corrections only

## Troubleshooting

### Access Denied
```
Problem: Can't access admin panel
Solution: Check user role in database
SQL: SELECT role FROM wallet_users WHERE wallet_address = 'YOUR_ADDRESS';
```

### Action Failed
```
Problem: Admin action returns error
Solution: Check database logs and permissions
Check: RLS policies, user exists, valid data
```

### User Not Found
```
Problem: Can't find user in search
Solution: Try different search terms
Try: Full wallet address, exact name, email
```

## Related Files

- `services/adminService.ts` - Admin service methods
- `pages/AdminPanel.tsx` - Admin panel UI
- `App.tsx` - Route configuration
- `services/supabaseService.ts` - Database operations
- `services/notificationService.ts` - Notification system

---

**Status**: ✅ Complete
**Date**: February 27, 2026
**Access**: Admin and Super Admin roles only
**Route**: `/admin/panel`
**Features**: Activate, Deactivate, Edit, Award RZC
