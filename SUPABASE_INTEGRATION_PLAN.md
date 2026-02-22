# Supabase Integration Plan for Wallet & Referral System

## Overview
This document outlines the complete Supabase integration strategy for user profiles, wallet management, and referral system in RhizaCore Wallet.

## Current Status

### ✅ Already Configured
1. **Supabase Client**: Initialized in `services/supabaseService.ts`
2. **Environment Variables**: Set in `.env.local`
   - `VITE_SUPABASE_URL`: https://dksskhnnxfkpgjeiybjk.supabase.co
   - `VITE_SUPABASE_ANON_KEY`: Configured
3. **Database Types**: Defined in `types/database.types.ts`
4. **Basic Services**: User profiles, transactions, referrals, analytics

### 📋 Database Schema (Already Defined)

#### Tables:
1. **wallet_users** - User profiles
2. **wallet_transactions** - Transaction history
3. **wallet_referrals** - Referral system data
4. **wallet_analytics** - Event tracking
5. **wallet_admin_audit** - Admin actions log

## Integration Strategy

### Phase 1: User Profile Management

#### When to Create/Update Profile:
1. **On Wallet Creation** (`pages/CreateWallet.tsx`)
   - Create profile with wallet address
   - Generate referral code
   - Set default name (e.g., "Rhiza User #1234")
   - Track creation event

2. **On Wallet Import** (`pages/ImportWallet.tsx`)
   - Check if profile exists
   - Create if new, update if existing
   - Generate referral code if missing

3. **On Login** (`context/WalletContext.tsx`)
   - Fetch user profile
   - Load referral data
   - Update last login timestamp

#### Profile Data Structure:
```typescript
interface UserProfile {
  id: string;                    // UUID
  wallet_address: string;        // Primary identifier
  name: string;                  // Display name
  avatar: string;                // Avatar emoji or URL
  email: string | null;          // Optional
  role: string;                  // 'user' | 'admin'
  is_active: boolean;            // Account status
  referrer_code: string | null;  // Who referred this user
  created_at: string;
  updated_at: string;
}
```

### Phase 2: Referral System Integration

#### Referral Flow:
1. **Generate Referral Code**
   - Use last 8 characters of wallet address
   - Format: Uppercase (e.g., "2B3C4D5E")
   - Store in `wallet_referrals` table

2. **Apply Referral Code**
   - During wallet creation/import
   - Validate code exists
   - Link user to referrer
   - Track referral event

3. **Track Referral Earnings**
   - Monitor referred user transactions
   - Calculate commission (e.g., 5% of fees)
   - Update `total_earned` in referrals table
   - Update rank based on earnings

#### Referral Ranks:
```typescript
const REFERRAL_RANKS = {
  'Core Node': { min: 0, max: 100 },
  'Growth Node': { min: 100, max: 500 },
  'Power Node': { min: 500, max: 2000 },
  'Master Node': { min: 2000, max: Infinity }
};
```

#### Referral Data Structure:
```typescript
interface ReferralData {
  id: string;
  user_id: string;              // User's profile ID
  referrer_id: string | null;   // Who referred them
  referral_code: string;        // Their unique code
  total_earned: number;         // Total commission earned
  rank: string;                 // Current rank
  level: number;                // Referral level (1-5)
  created_at: string;
  updated_at: string;
}
```

### Phase 3: Transaction Sync

#### When to Sync Transactions:
1. **After Sending TON**
   - Save to Supabase after blockchain confirmation
   - Include tx_hash, amount, recipient

2. **After Receiving TON**
   - Detect via blockchain polling
   - Save to Supabase with sender info

3. **Periodic Sync**
   - Fetch from blockchain every 30 seconds
   - Compare with Supabase records
   - Add missing transactions

#### Transaction Data Structure:
```typescript
interface Transaction {
  id: string;
  user_id: string;
  wallet_address: string;
  type: 'send' | 'receive' | 'swap' | 'stake';
  amount: string;
  asset: string;
  to_address: string | null;
  from_address: string | null;
  tx_hash: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  metadata: Json | null;        // Additional data
  created_at: string;
}
```

### Phase 4: Settings Page Integration

#### Profile Management:
1. **Display Current Profile**
   - Name, avatar, wallet address
   - Referral code with copy button
   - Total referrals count
   - Current rank

2. **Edit Profile**
   - Update name
   - Change avatar (emoji picker)
   - Add/update email (optional)

3. **Referral Stats**
   - Total referrals
   - Total earned
   - Current rank
   - Next rank progress

#### Settings to Add:
```typescript
// In Settings.tsx
- Profile section with Supabase data
- Referral code display
- Referral stats summary
- Link to full referral portal
```

## Implementation Steps

### Step 1: Enhance WalletContext with Supabase

```typescript
// Add to WalletContext.tsx
interface WalletState {
  // ... existing fields
  userId: string | null;
  userProfile: UserProfile | null;
  referralData: ReferralData | null;
  loadUserProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}
```

### Step 2: Create Profile on Wallet Creation

```typescript
// In CreateWallet.tsx after wallet creation
const createUserProfile = async (walletAddress: string) => {
  const profile = {
    wallet_address: walletAddress,
    name: `Rhiza User #${walletAddress.slice(-4)}`,
    avatar: '🌱',
    role: 'user',
    is_active: true,
    referrer_code: referralCode || null
  };
  
  const result = await supabaseService.createOrUpdateProfile(profile);
  if (result.success) {
    await supabaseService.createReferralCode(result.data.id, walletAddress);
  }
};
```

### Step 3: Load Profile on Login

```typescript
// In WalletContext.tsx login function
const login = async (mnemonic: string[], password?: string) => {
  // ... existing login logic
  
  if (res.success && res.address) {
    // Load user profile
    const profileResult = await supabaseService.getProfile(res.address);
    if (profileResult.success && profileResult.data) {
      setUserProfile(profileResult.data);
      
      // Load referral data
      const referralResult = await supabaseService.getReferralData(profileResult.data.id);
      if (referralResult.success) {
        setReferralData(referralResult.data);
      }
    } else {
      // Create profile if doesn't exist
      await createUserProfile(res.address);
    }
  }
};
```

### Step 4: Sync Transactions

```typescript
// Create new service: services/transactionSync.ts
export class TransactionSyncService {
  async syncTransaction(tx: Transaction) {
    // Save to Supabase
    const result = await supabaseService.saveTransaction({
      wallet_address: tx.address,
      type: tx.type,
      amount: tx.amount,
      asset: tx.asset,
      to_address: tx.address,
      tx_hash: tx.hash,
      status: tx.status
    });
    
    return result;
  }
  
  async syncAllTransactions(walletAddress: string) {
    // Fetch from blockchain
    const blockchainTxs = await tonWalletService.getTransactions(walletAddress);
    
    // Fetch from Supabase
    const dbTxs = await supabaseService.getTransactions(walletAddress);
    
    // Find missing transactions
    const missing = blockchainTxs.filter(btx => 
      !dbTxs.data?.some(dtx => dtx.tx_hash === btx.hash)
    );
    
    // Save missing transactions
    for (const tx of missing) {
      await this.syncTransaction(tx);
    }
  }
}
```

### Step 5: Update Settings Page

```typescript
// In Settings.tsx
const Settings: React.FC = () => {
  const { userProfile, referralData, updateProfile } = useWallet();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Display profile data from Supabase
  // Show referral code and stats
  // Allow profile editing
};
```

### Step 6: Enhance Referral Portal

```typescript
// In pages/ReferralPortal.tsx
const ReferralPortal: React.FC = () => {
  const { referralData, userProfile } = useWallet();
  const [referrals, setReferrals] = useState([]);
  
  useEffect(() => {
    if (referralData?.referral_code) {
      loadReferrals();
    }
  }, [referralData]);
  
  const loadReferrals = async () => {
    const result = await supabaseService.getReferralsByCode(
      referralData.referral_code
    );
    if (result.success) {
      setReferrals(result.data);
    }
  };
};
```

## Security Considerations

### 1. Row Level Security (RLS)
Enable RLS on all tables:
```sql
-- Users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON wallet_users FOR SELECT
  USING (wallet_address = current_setting('app.wallet_address'));

CREATE POLICY "Users can update own profile"
  ON wallet_users FOR UPDATE
  USING (wallet_address = current_setting('app.wallet_address'));

-- Users can only view their own transactions
CREATE POLICY "Users can view own transactions"
  ON wallet_transactions FOR SELECT
  USING (wallet_address = current_setting('app.wallet_address'));

-- Users can view their referral data
CREATE POLICY "Users can view own referrals"
  ON wallet_referrals FOR SELECT
  USING (user_id = get_wallet_user_id());
```

### 2. Data Validation
- Validate wallet addresses before saving
- Sanitize user inputs (name, email)
- Verify transaction hashes
- Rate limit API calls

### 3. Privacy
- Don't store sensitive data (mnemonics, private keys)
- Hash email addresses if stored
- Allow users to delete their data
- Comply with GDPR/privacy laws

## Analytics & Tracking

### Events to Track:
1. **Wallet Events**
   - wallet_created
   - wallet_imported
   - wallet_login
   - wallet_logout

2. **Transaction Events**
   - transaction_sent
   - transaction_received
   - transaction_failed

3. **Referral Events**
   - referral_code_generated
   - referral_code_used
   - referral_earned

4. **User Actions**
   - profile_updated
   - settings_changed
   - network_switched

### Implementation:
```typescript
// Track event helper
const trackEvent = async (eventName: string, properties: any) => {
  await supabaseService.trackEvent(eventName, {
    wallet_address: address,
    network,
    timestamp: new Date().toISOString(),
    ...properties
  });
};
```

## Real-time Features

### 1. Transaction Notifications
```typescript
// Subscribe to new transactions
const subscription = supabaseService.subscribeToTransactions(
  walletAddress,
  (payload) => {
    // Show notification
    toast.success(`New transaction: ${payload.new.amount} TON`);
    // Refresh balance
    refreshData();
  }
);
```

### 2. Referral Notifications
```typescript
// Subscribe to new referrals
const subscription = supabase
  .channel(`referrals:${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'wallet_users',
    filter: `referrer_code=eq.${referralCode}`
  }, (payload) => {
    toast.success('New referral joined!');
  })
  .subscribe();
```

## Testing Checklist

### Profile Management:
- [ ] Create profile on wallet creation
- [ ] Load profile on login
- [ ] Update profile in settings
- [ ] Display profile data correctly
- [ ] Handle missing profiles gracefully

### Referral System:
- [ ] Generate referral code
- [ ] Apply referral code during signup
- [ ] Track referral relationships
- [ ] Calculate earnings correctly
- [ ] Update ranks based on earnings
- [ ] Display referral stats

### Transaction Sync:
- [ ] Save transactions to Supabase
- [ ] Sync missing transactions
- [ ] Handle duplicate transactions
- [ ] Update transaction status
- [ ] Display synced transactions

### Security:
- [ ] RLS policies working
- [ ] Users can only access own data
- [ ] Input validation working
- [ ] No sensitive data stored
- [ ] Rate limiting in place

## Migration Path

### For Existing Users:
1. **Detect Existing Wallet**
   - Check if profile exists in Supabase
   - If not, create profile on next login

2. **Backfill Data**
   - Sync historical transactions
   - Generate referral code
   - Set default profile values

3. **Gradual Rollout**
   - Phase 1: Profile creation only
   - Phase 2: Add referral system
   - Phase 3: Enable transaction sync
   - Phase 4: Add real-time features

## Performance Optimization

### 1. Caching
- Cache user profile in WalletContext
- Cache referral data for 5 minutes
- Use localStorage for offline access

### 2. Batch Operations
- Batch transaction syncs
- Bulk insert missing transactions
- Aggregate referral stats

### 3. Lazy Loading
- Load referral list on demand
- Paginate transaction history
- Defer analytics tracking

## Next Steps

1. **Immediate** (Phase 1):
   - Integrate profile creation in CreateWallet
   - Load profile in WalletContext
   - Display profile in Settings

2. **Short-term** (Phase 2):
   - Implement referral code generation
   - Add referral tracking
   - Update ReferralPortal with real data

3. **Medium-term** (Phase 3):
   - Add transaction sync service
   - Implement periodic sync
   - Add transaction notifications

4. **Long-term** (Phase 4):
   - Add real-time subscriptions
   - Implement advanced analytics
   - Add social features

---

**Status**: 📋 Planning Complete - Ready for Implementation
**Priority**: High
**Estimated Time**: 2-3 days for full implementation
**Dependencies**: Supabase database tables must be created first
