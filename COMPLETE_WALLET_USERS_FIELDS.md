# Complete wallet_users Table Fields

## All Fields from Database Schema

Based on the actual `wallet_users` table schema, here are ALL the fields that should be editable in the admin panel:

### ✅ Currently Implemented
- `name` - User display name
- `email` - User email address
- `avatar` - Avatar emoji or URL
- `role` - User role (user, premium, vip, admin, super_admin)
- `is_active` - Account active status
- `is_activated` - Wallet activation status
- `is_premium` - Premium member status
- `activated_at` - Activation timestamp
- `activation_fee_paid` - Fee paid for activation (TON)
- `referrer_code` - Referral code used
- `rzc_balance` - RZC token balance
- `last_squad_claim_at` - Last squad mining claim timestamp
- `total_squad_rewards` - Total rewards from squad mining

### ❌ Missing Fields (Need to Add)

#### Balance Fields
- `ton_balance` - TON balance (numeric(20, 9))
- `evm_balance` - EVM/ETH balance (numeric(30, 18))
- `btc_balance` - Bitcoin balance (numeric(20, 8))
- `sol_balance` - Solana balance (numeric(20, 9))
- `tron_balance` - Tron balance (numeric(20, 6))
- `usdt_balance` - USDT balance (numeric(20, 6))

#### Verification Fields
- `balance_verified` - Balance verification status (boolean)
- `balance_locked` - Balance lock status (boolean, default true)
- `verification_badge_earned_at` - Verification badge timestamp
- `verification_level` - Verification level (unverified, basic, premium, gold)

#### Security/Login Fields
- `failed_login_attempts` - Failed login counter (integer, default 0)
- `locked_until` - Account lock expiry timestamp
- `last_failed_attempt` - Last failed login timestamp
- `last_login_at` - Last successful login timestamp

#### Node/Activation Fields
- `node_activated` - Node activation status (boolean)
- `node_activated_at` - Node activation timestamp
- `total_activation_spent` - Total spent on activations (numeric)

#### Sync Fields
- `last_balance_sync_at` - Last balance synchronization timestamp

### 🔒 System Fields (Not Editable)
- `id` - UUID primary key (auto-generated)
- `auth_user_id` - Supabase auth user ID (system managed)
- `wallet_address` - Immutable wallet identifier
- `created_at` - Record creation timestamp (auto)
- `updated_at` - Last update timestamp (auto-managed by trigger)

## Implementation Checklist

### AdminPanel.tsx Updates Needed

1. **Add to editForm state:**
```typescript
const [editForm, setEditForm] = useState({
  // ... existing fields ...
  
  // Balance fields
  ton_balance: 0,
  evm_balance: 0,
  btc_balance: 0,
  sol_balance: 0,
  tron_balance: 0,
  usdt_balance: 0,
  
  // Verification fields
  balance_verified: false,
  balance_locked: true,
  verification_badge_earned_at: '',
  verification_level: 'unverified',
  
  // Security fields
  last_login_at: '',
  
  // Node fields
  node_activated: false,
  node_activated_at: '',
  total_activation_spent: 0,
  
  // Sync fields
  last_balance_sync_at: ''
});
```

2. **Add to handleEditUser initialization:**
```typescript
const handleEditUser = (user: AdminUser) => {
  setEditForm({
    // ... existing mappings ...
    ton_balance: user.ton_balance || 0,
    evm_balance: user.evm_balance || 0,
    btc_balance: user.btc_balance || 0,
    sol_balance: user.sol_balance || 0,
    tron_balance: user.tron_balance || 0,
    usdt_balance: user.usdt_balance || 0,
    balance_verified: user.balance_verified || false,
    balance_locked: user.balance_locked ?? true,
    verification_badge_earned_at: user.verification_badge_earned_at || '',
    verification_level: user.verification_level || 'unverified',
    last_login_at: user.last_login_at || '',
    node_activated: user.node_activated || false,
    node_activated_at: user.node_activated_at || '',
    total_activation_spent: user.total_activation_spent || 0,
    last_balance_sync_at: user.last_balance_sync_at || ''
  });
};
```

3. **Add UI sections in modal:**

#### Section: Multi-Chain Balances
```tsx
<div className="space-y-3 pt-4 border-t-2">
  <h3>Multi-Chain Balances</h3>
  <div className="grid grid-cols-3 gap-4">
    {/* TON, BTC, ETH/EVM, SOL, TRON, USDT */}
  </div>
</div>
```

#### Section: Verification & Security
```tsx
<div className="space-y-3 pt-4 border-t-2">
  <h3>Verification & Security</h3>
  <div className="grid grid-cols-2 gap-4">
    {/* verification_level dropdown */}
    {/* verification_badge_earned_at timestamp */}
    {/* last_login_at timestamp */}
    {/* last_balance_sync_at timestamp */}
  </div>
  <div className="grid grid-cols-3 gap-3">
    {/* balance_verified checkbox */}
    {/* balance_locked checkbox */}
    {/* node_activated checkbox */}
  </div>
</div>
```

#### Section: Node & Activation
```tsx
<div className="space-y-3 pt-4 border-t-2">
  <h3>Node & Activation</h3>
  <div className="grid grid-cols-2 gap-4">
    {/* total_activation_spent */}
    {/* node_activated_at timestamp */}
  </div>
</div>
```

### adminService.ts Updates Needed

1. **Update AdminUser interface:**
```typescript
export interface AdminUser {
  // ... existing fields ...
  
  // Balance fields
  ton_balance?: number;
  evm_balance?: number;
  btc_balance?: number;
  sol_balance?: number;
  tron_balance?: number;
  usdt_balance?: number;
  
  // Verification fields
  balance_verified?: boolean;
  balance_locked?: boolean;
  verification_badge_earned_at?: string;
  verification_level?: string;
  
  // Security fields
  last_login_at?: string;
  
  // Node fields
  node_activated?: boolean;
  node_activated_at?: string;
  total_activation_spent?: number;
  
  // Sync fields
  last_balance_sync_at?: string;
}
```

2. **Update updateUserAccount method signature:**
```typescript
async updateUserAccount(
  walletAddress: string,
  updates: {
    // ... existing fields ...
    ton_balance?: number;
    evm_balance?: number;
    btc_balance?: number;
    sol_balance?: number;
    tron_balance?: number;
    usdt_balance?: number;
    balance_verified?: boolean;
    balance_locked?: boolean;
    verification_badge_earned_at?: string;
    verification_level?: string;
    last_login_at?: string;
    node_activated?: boolean;
    node_activated_at?: string;
    total_activation_spent?: number;
    last_balance_sync_at?: string;
  },
  adminWallet: string,
  reason: string
)
```

## Field Precision Notes

When implementing number inputs, use appropriate `step` values:

- `rzc_balance`: `step="0.00000001"` (8 decimals)
- `ton_balance`: `step="0.000000001"` (9 decimals)
- `btc_balance`: `step="0.00000001"` (8 decimals)
- `evm_balance`: `step="0.000000000000000001"` (18 decimals)
- `sol_balance`: `step="0.000000001"` (9 decimals)
- `tron_balance`: `step="0.000001"` (6 decimals)
- `usdt_balance`: `step="0.000001"` (6 decimals)
- `activation_fee_paid`: `step="0.0001"` (4 decimals)
- `total_activation_spent`: `step="0.01"` (2 decimals)
- `total_squad_rewards`: `step="0.01"` (2 decimals)

## Security Considerations

### Fields That Should Be Read-Only or Hidden
- `failed_login_attempts` - Managed by security system
- `locked_until` - Managed by security system
- `last_failed_attempt` - Managed by security system

These fields are part of the rate-limiting/security system and should NOT be directly editable to prevent security bypasses.

### Recommended Approach
- Show these fields as **read-only** information
- Provide separate admin actions like "Reset Login Attempts" or "Unlock Account"
- Don't allow direct manipulation of security counters

## UI Organization

Organize the modal into collapsible sections:

1. **Basic Information** (always visible)
   - Name, Email, Avatar, Role, Referrer Code

2. **Multi-Chain Balances** (collapsible)
   - RZC, TON, BTC, ETH/EVM, SOL, TRON, USDT

3. **Activation & Rewards** (collapsible)
   - Activation fees, Squad rewards, Total spent

4. **Verification & Security** (collapsible)
   - Verification level, Balance verification, Security timestamps

5. **Node Management** (collapsible)
   - Node activation status and timestamp

6. **Status Flags** (always visible)
   - Active, Activated, Premium, Verified, Locked, Node Active

7. **Timestamps** (collapsible)
   - All timestamp fields with ISO 8601 format

8. **Audit** (always visible)
   - Reason for update (required)

## Next Steps

1. ✅ Update `editForm` state with all missing fields
2. ✅ Update `handleEditUser` to map all fields
3. ✅ Update `AdminUser` interface in adminService
4. ✅ Update `updateUserAccount` method signature
5. ⏳ Add UI sections for all missing fields
6. ⏳ Test with real data
7. ⏳ Add validation for numeric precision
8. ⏳ Add tooltips/help text for complex fields
9. ⏳ Consider making sections collapsible for better UX

---

**Status:** Partially Implemented
**Remaining:** UI sections for balance fields, verification fields, and node fields
