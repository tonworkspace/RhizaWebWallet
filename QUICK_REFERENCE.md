# 🚀 Quick Reference - Supabase Integration

**Status:** ✅ COMPLETE AND WORKING

---

## 🎯 Start Development Server

```bash
npm run dev
```

Then open: http://localhost:5173

---

## 📊 Check Supabase Dashboard

URL: https://dksskhnnxfkpgjeiybjk.supabase.co

**Tables to Check:**
- `wallet_users` - User profiles
- `wallet_referrals` - Referral codes
- `wallet_transactions` - Transaction history
- `wallet_analytics` - Event tracking

---

## 🧪 Quick Tests

### 1. Test Connection (Browser Console)
```javascript
console.log('Configured:', supabaseService.isConfigured());
```

### 2. Create Wallet
- Go to `/create-wallet`
- Watch console for success logs
- Check Supabase dashboard for new profile

### 3. Check Dashboard
- Login with wallet
- Should see profile greeting
- Should see avatar and name

### 4. Edit Profile
- Go to Settings
- Click "Edit Profile"
- Change avatar and name
- Save changes

### 5. Check Referral Portal
- Go to Referral Portal
- Should see your referral code
- Should see real statistics

---

## 📝 Key Files

### Services
- `services/supabaseService.ts` - Main Supabase service
- `services/transactionSync.ts` - Transaction sync service

### Pages Updated
- `pages/Dashboard.tsx` - Profile greeting
- `pages/Settings.tsx` - Profile editing
- `pages/ReferralPortal.tsx` - Real referral data

### Context
- `context/WalletContext.tsx` - Auto-sync integration

---

## 🔧 Useful Commands

### Build
```bash
npm run build
```

### Preview Build
```bash
npm run preview
```

### Deploy
```bash
npm run deploy
```

---

## 📊 Supabase Service Methods

### User Profile
```typescript
// Create/update profile
await supabaseService.createOrUpdateProfile({
  wallet_address: address,
  name: 'My Name',
  avatar: '🚀'
});

// Get profile
const result = await supabaseService.getProfile(address);

// Update profile
await supabaseService.updateProfile(address, {
  name: 'New Name',
  avatar: '💎'
});
```

### Transactions
```typescript
// Save transaction
await supabaseService.saveTransaction({
  user_id: userId,
  wallet_address: address,
  type: 'send',
  amount: '1.5',
  asset: 'TON',
  tx_hash: hash,
  status: 'confirmed'
});

// Get transactions
const result = await supabaseService.getTransactions(address, 50);
```

### Referrals
```typescript
// Create referral code
await supabaseService.createReferralCode(userId, address);

// Get referral data
const result = await supabaseService.getReferralData(userId);

// Get referred users
const result = await supabaseService.getReferredUsers(referralCode);
```

### Analytics
```typescript
// Track event
await supabaseService.trackEvent('wallet_created', {
  wallet_address: address,
  network: 'testnet'
});

// Get analytics
const result = await supabaseService.getAnalytics('wallet_created', 100);
```

---

## 🔄 Transaction Sync

### Manual Sync
```typescript
await transactionSyncService.syncTransactions(address, userId);
```

### Auto-sync (Already Running)
- Syncs every 30 seconds automatically
- Started on login
- Stopped on logout

---

## 🎨 Using Data in Components

### Get User Profile
```typescript
import { useWallet } from '../context/WalletContext';

const { userProfile, referralData } = useWallet();

// Use in JSX
<div>{userProfile?.name}</div>
<div>{userProfile?.avatar}</div>
<div>{referralData?.referral_code}</div>
```

### Update Profile
```typescript
import { supabaseService } from '../services/supabaseService';

const handleUpdate = async () => {
  const result = await supabaseService.updateProfile(address, {
    name: newName,
    avatar: newAvatar
  });
  
  if (result.success) {
    showToast('Profile updated!', 'success');
  }
};
```

---

## 🐛 Troubleshooting

### Profile Not Loading
1. Check console for errors
2. Verify Supabase credentials in `.env`
3. Check Supabase dashboard for profile

### Transactions Not Syncing
1. Check console for sync logs
2. Verify wallet has transactions
3. Check Supabase dashboard for transactions

### Referral Code Not Showing
1. Check if profile exists
2. Check if referral data loaded
3. Verify in Supabase dashboard

---

## 📚 Documentation Files

- `SUPABASE_COMPLETE_SETUP.md` - Complete setup guide
- `SETUP_COMPLETE_SUMMARY.md` - Summary of changes
- `SUPABASE_INTEGRATION_STATUS.md` - Integration analysis
- `WALLET_FUNCTIONALITY_ANALYSIS.md` - Feature analysis
- `QUICK_REFERENCE.md` - This file

---

## ✅ What's Working

- ✅ User profile creation
- ✅ User profile loading
- ✅ User profile editing
- ✅ Referral code generation
- ✅ Referral tracking
- ✅ Transaction sync
- ✅ Analytics tracking
- ✅ Real-time subscriptions (ready)
- ✅ Dashboard integration
- ✅ Settings integration
- ✅ Referral portal integration

---

## 🎉 You're All Set!

Run `npm run dev` and start testing your fully integrated wallet!

**Everything is connected and working!** 🚀
