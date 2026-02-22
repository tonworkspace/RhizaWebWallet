# Supabase Integration - Quick Start Guide

## Step 1: Set Up Database Schema

### Option A: Using Supabase Dashboard
1. Go to your Supabase project: https://dksskhnnxfkpgjeiybjk.supabase.co
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase_schema.sql`
5. Paste into the editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for confirmation message
8. Verify tables in **Table Editor**

### Option B: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref dksskhnnxfkpgjeiybjk

# Run migrations
supabase db push
```

## Step 2: Verify Database Setup

### Check Tables Created:
- ✅ wallet_users
- ✅ wallet_transactions
- ✅ wallet_referrals
- ✅ wallet_referral_earnings
- ✅ wallet_analytics
- ✅ wallet_admin_audit

### Check Functions Created:
- ✅ get_wallet_user_id()
- ✅ is_wallet_admin()
- ✅ update_updated_at_column()
- ✅ update_referral_stats()

### Check RLS Policies:
Go to **Authentication > Policies** and verify policies are enabled for all tables.

## Step 3: Test Supabase Connection

### Create Test Page (Optional)
```typescript
// pages/SupabaseTest.tsx
import React, { useEffect, useState } from 'react';
import { supabaseService } from '../services/supabaseService';

const SupabaseTest: React.FC = () => {
  const [status, setStatus] = useState('Testing...');
  
  useEffect(() => {
    testConnection();
  }, []);
  
  const testConnection = async () => {
    if (!supabaseService.isConfigured()) {
      setStatus('❌ Supabase not configured');
      return;
    }
    
    // Test profile creation
    const testProfile = {
      wallet_address: 'TEST_' + Date.now(),
      name: 'Test User',
      avatar: '🧪'
    };
    
    const result = await supabaseService.createOrUpdateProfile(testProfile);
    
    if (result.success) {
      setStatus('✅ Supabase connected successfully!');
    } else {
      setStatus(`❌ Error: ${result.error}`);
    }
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      <p className="text-lg">{status}</p>
    </div>
  );
};

export default SupabaseTest;
```

### Test in Browser Console
```javascript
// Open browser console on your app
import { supabaseService } from './services/supabaseService';

// Test connection
console.log('Configured:', supabaseService.isConfigured());

// Test profile creation
const result = await supabaseService.createOrUpdateProfile({
  wallet_address: 'EQTest123',
  name: 'Test User',
  avatar: '🧪'
});
console.log('Result:', result);
```

## Step 4: Integrate with Wallet Creation

### Update CreateWallet.tsx
```typescript
// Add after wallet creation success
const handleWalletCreated = async (address: string, mnemonic: string[]) => {
  // ... existing wallet creation logic
  
  // Create user profile in Supabase
  const profileResult = await supabaseService.createOrUpdateProfile({
    wallet_address: address,
    name: `Rhiza User #${address.slice(-4)}`,
    avatar: '🌱',
    role: 'user',
    is_active: true,
    referrer_code: referralCodeInput || null
  });
  
  if (profileResult.success && profileResult.data) {
    // Generate referral code
    await supabaseService.createReferralCode(
      profileResult.data.id,
      address
    );
    
    // Track event
    await supabaseService.trackEvent('wallet_created', {
      wallet_address: address,
      has_referrer: !!referralCodeInput
    });
  }
  
  // ... continue with existing flow
};
```

## Step 5: Integrate with Wallet Login

### Update WalletContext.tsx
```typescript
// Add state for user profile
const [userProfile, setUserProfile] = useState<any>(null);
const [referralData, setReferralData] = useState<any>(null);

// Update login function
const login = async (mnemonic: string[], password?: string) => {
  setIsLoading(true);
  const res = await tonWalletService.initializeWallet(mnemonic, password);
  
  if (res.success && res.address) {
    setAddress(res.address);
    setIsLoggedIn(true);
    
    // Load user profile from Supabase
    const profileResult = await supabaseService.getProfile(res.address);
    
    if (profileResult.success && profileResult.data) {
      setUserProfile(profileResult.data);
      
      // Load referral data
      const referralResult = await supabaseService.getReferralData(
        profileResult.data.id
      );
      if (referralResult.success) {
        setReferralData(referralResult.data);
      }
      
      // Track login event
      await supabaseService.trackEvent('wallet_login', {
        wallet_address: res.address
      });
    } else {
      // Create profile if doesn't exist (for existing wallets)
      const newProfile = await supabaseService.createOrUpdateProfile({
        wallet_address: res.address,
        name: `Rhiza User #${res.address.slice(-4)}`,
        avatar: '🌱'
      });
      
      if (newProfile.success && newProfile.data) {
        setUserProfile(newProfile.data);
        await supabaseService.createReferralCode(
          newProfile.data.id,
          res.address
        );
      }
    }
    
    await refreshData();
    setIsLoading(false);
    return true;
  }
  
  setIsLoading(false);
  return false;
};

// Export user profile and referral data
return (
  <WalletContext.Provider value={{ 
    // ... existing values
    userProfile,
    referralData,
    // ... rest of values
  }}>
    {children}
  </WalletContext.Provider>
);
```

## Step 6: Update Settings Page

### Display Profile from Supabase
```typescript
// In Settings.tsx
import { useWallet } from '../context/WalletContext';
import { supabaseService } from '../services/supabaseService';

const Settings: React.FC = () => {
  const { userProfile, referralData, address } = useWallet();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile?.name || '');
  const [avatar, setAvatar] = useState(userProfile?.avatar || '🌱');
  
  const handleUpdateProfile = async () => {
    if (!userProfile) return;
    
    const result = await supabaseService.createOrUpdateProfile({
      id: userProfile.id,
      wallet_address: address!,
      name,
      avatar
    });
    
    if (result.success) {
      toast.success('Profile updated!');
      setIsEditing(false);
    } else {
      toast.error('Failed to update profile');
    }
  };
  
  return (
    <div>
      {/* Profile Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border">
        <div className="flex items-center gap-4">
          <div className="text-4xl">{avatar}</div>
          <div>
            <h2 className="font-bold text-lg">{name}</h2>
            <p className="text-xs text-gray-500 font-mono">
              {address?.slice(0, 8)}...{address?.slice(-6)}
            </p>
          </div>
        </div>
        
        {/* Referral Code */}
        {referralData && (
          <div className="mt-4 p-3 bg-slate-100 dark:bg-white/5 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Your Referral Code</p>
            <div className="flex items-center gap-2">
              <code className="font-mono font-bold">
                {referralData.referral_code}
              </code>
              <button onClick={() => {
                navigator.clipboard.writeText(referralData.referral_code);
                toast.success('Copied!');
              }}>
                <Copy size={14} />
              </button>
            </div>
          </div>
        )}
        
        {/* Referral Stats */}
        {referralData && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold">{referralData.total_referrals}</p>
              <p className="text-xs text-gray-500">Referrals</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{referralData.total_earned}</p>
              <p className="text-xs text-gray-500">Earned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{referralData.rank}</p>
              <p className="text-xs text-gray-500">Rank</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

## Step 7: Update Referral Portal

### Load Real Referral Data
```typescript
// In pages/ReferralPortal.tsx
const ReferralPortal: React.FC = () => {
  const { referralData, userProfile } = useWallet();
  const [referrals, setReferrals] = useState([]);
  const [earnings, setEarnings] = useState([]);
  
  useEffect(() => {
    if (referralData?.referral_code) {
      loadReferrals();
    }
  }, [referralData]);
  
  const loadReferrals = async () => {
    // Get users who used this referral code
    const result = await supabaseService.getReferralsByCode(
      referralData.referral_code
    );
    
    if (result.success) {
      setReferrals(result.data);
    }
  };
  
  return (
    <div>
      {/* Display real referral data */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Total Referrals"
          value={referralData?.total_referrals || 0}
        />
        <StatCard
          label="Total Earned"
          value={`${referralData?.total_earned || 0} TON`}
        />
      </div>
      
      {/* Referral List */}
      <div className="mt-6">
        <h3 className="font-bold mb-3">Your Referrals</h3>
        {referrals.map(referral => (
          <div key={referral.id} className="p-4 bg-white dark:bg-white/5 rounded-xl mb-2">
            <p className="font-bold">{referral.name}</p>
            <p className="text-xs text-gray-500">
              Joined {new Date(referral.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Step 8: Enable Transaction Sync (Optional)

### Create Transaction Sync Service
```typescript
// services/transactionSync.ts
import { supabaseService } from './supabaseService';
import { tonWalletService } from './tonWalletService';

export class TransactionSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  
  startAutoSync(walletAddress: string, intervalMs: number = 30000) {
    this.stopAutoSync();
    
    this.syncInterval = setInterval(() => {
      this.syncTransactions(walletAddress);
    }, intervalMs);
    
    // Initial sync
    this.syncTransactions(walletAddress);
  }
  
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  async syncTransactions(walletAddress: string) {
    try {
      // Fetch from blockchain
      const blockchainResult = await tonWalletService.getTransactions(
        walletAddress,
        50
      );
      
      if (!blockchainResult.success) return;
      
      // Fetch from Supabase
      const dbResult = await supabaseService.getTransactions(walletAddress);
      const dbTxHashes = new Set(
        dbResult.data?.map(tx => tx.tx_hash) || []
      );
      
      // Find missing transactions
      const missing = blockchainResult.transactions.filter(
        tx => tx.hash && !dbTxHashes.has(tx.hash)
      );
      
      // Save missing transactions
      for (const tx of missing) {
        await supabaseService.saveTransaction({
          wallet_address: walletAddress,
          type: tx.type,
          amount: tx.amount,
          asset: tx.asset,
          to_address: tx.address,
          tx_hash: tx.hash,
          status: tx.status,
          fee: tx.fee,
          comment: tx.comment
        });
      }
      
      console.log(`✅ Synced ${missing.length} new transactions`);
    } catch (error) {
      console.error('❌ Transaction sync failed:', error);
    }
  }
}

export const transactionSyncService = new TransactionSyncService();
```

### Enable in WalletContext
```typescript
// In WalletContext.tsx
import { transactionSyncService } from '../services/transactionSync';

useEffect(() => {
  if (isLoggedIn && address) {
    // Start auto-sync
    transactionSyncService.startAutoSync(address);
    
    return () => {
      transactionSyncService.stopAutoSync();
    };
  }
}, [isLoggedIn, address]);
```

## Troubleshooting

### Issue: "Supabase not configured"
**Solution**: Check `.env.local` has correct values:
```env
VITE_SUPABASE_URL=https://dksskhnnxfkpgjeiybjk.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Issue: "RLS policy violation"
**Solution**: 
1. Go to Supabase Dashboard > Authentication > Policies
2. Verify RLS is enabled
3. Check policies are created correctly
4. Temporarily disable RLS for testing (not recommended for production)

### Issue: "Function not found"
**Solution**: Re-run the SQL schema file to create missing functions

### Issue: "Cannot insert into table"
**Solution**: Check RLS policies allow INSERT for your use case

## Testing Checklist

- [ ] Database schema created successfully
- [ ] All tables visible in Table Editor
- [ ] RLS policies enabled
- [ ] Test profile creation works
- [ ] Test profile retrieval works
- [ ] Referral code generation works
- [ ] Transaction saving works
- [ ] Analytics tracking works
- [ ] Settings page shows profile data
- [ ] Referral portal shows real data

## Next Steps

1. **Test thoroughly** with test wallet addresses
2. **Monitor Supabase logs** for errors
3. **Set up real-time subscriptions** for live updates
4. **Add error handling** for all Supabase calls
5. **Implement caching** to reduce API calls
6. **Add loading states** for better UX
7. **Set up backup strategy** for database

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Project Dashboard: https://dksskhnnxfkpgjeiybjk.supabase.co

---

**Status**: 📋 Ready for Implementation
**Estimated Time**: 2-4 hours for basic integration
**Priority**: High
