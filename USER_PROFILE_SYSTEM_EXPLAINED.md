# User Profile System - Complete Explanation

## 🎯 Overview

The user profile system in RhizaCore manages user identity, preferences, and rewards across the wallet application. It integrates wallet addresses with user data stored in Supabase.

---

## 📊 Database Schema

### `users` Table (Supabase)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT 'Rhiza User',
  avatar TEXT DEFAULT '🌱',
  email TEXT,
  role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  referrer_code TEXT,
  rzc_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Key Fields:
- **wallet_address**: TON blockchain address (unique identifier)
- **name**: User's display name
- **avatar**: Emoji or image URL
- **role**: 'user', 'admin', or 'superadmin'
- **referrer_code**: Code of user who referred them
- **rzc_balance**: RhizaCore token balance for rewards

---

## 🔄 Profile Lifecycle

### 1. Wallet Creation → Profile Creation

**Flow:**
```
User creates wallet → Generates TON address → Profile created in Supabase
```

**Code Path:**
```typescript
// pages/CreateWallet.tsx
const handleCreateWallet = async () => {
  // 1. Generate mnemonic
  const mnemonic = await tonWalletService.generateMnemonic();
  
  // 2. Derive wallet address
  const address = await tonWalletService.getAddressFromMnemonic(mnemonic);
  
  // 3. Create profile in Supabase
  const result = await supabaseService.createOrUpdateProfile({
    wallet_address: address,
    name: 'Rhiza User', // Default name
    avatar: '🌱', // Default avatar
    referrer_code: referralCode || null
  });
  
  // 4. If referred, process referral reward
  if (referralCode) {
    await referralRewardService.processReferral(referralCode, address);
  }
};
```

---

### 2. Profile Setup (Optional Customization)

**Flow:**
```
After wallet creation → ProfileSetup page → User customizes → Saved to Supabase
```

**Code Path:**
```typescript
// pages/ProfileSetup.tsx
const handleFinish = async () => {
  const finalName = name.trim() || 'Rhiza Sovereign';
  const finalAvatar = selectedAvatar; // Emoji from selection
  
  // Update profile in Supabase
  const result = await supabaseService.updateProfile(address, {
    name: finalName,
    avatar: finalAvatar
  });
  
  // Navigate to dashboard
  navigate('/wallet/dashboard');
};
```

**Available Avatars:**
```typescript
const AVATARS = ['🌱', '💎', '🦁', '⚡', '👑', '🦅', '🌊', '🧿'];
```

---

### 3. Profile Loading (Login)

**Flow:**
```
User logs in → Wallet restored → Profile loaded from Supabase → Stored in WalletContext
```

**Code Path:**
```typescript
// context/WalletContext.tsx
const login = async (mnemonic: string[], password?: string) => {
  // 1. Restore wallet from mnemonic
  const success = await tonWalletService.restoreWallet(mnemonic, password);
  
  if (success) {
    const addr = tonWalletService.getAddress();
    setAddress(addr);
    
    // 2. Load profile from Supabase
    const profileResult = await supabaseService.getUserProfile(addr);
    if (profileResult.success && profileResult.data) {
      setUserProfile(profileResult.data);
    }
    
    // 3. Load referral data
    const referralResult = await supabaseService.getReferralData(addr);
    if (referralResult.success && referralResult.data) {
      setReferralData(referralResult.data);
    }
    
    setIsLoggedIn(true);
    return true;
  }
  return false;
};
```

---

## 🎨 Profile Display

### Header (Layout Component)

**Desktop View:**
```
[Avatar] [Name]
         [Address] • [TON Balance]
         [Referral Badge: X Refs]
```

**Mobile View:**
```
[Avatar] [TON Balance]
         [RZC Balance]
```

**Code:**
```typescript
// components/Layout.tsx
<div className="flex items-center gap-2">
  {/* Avatar */}
  {isValidImageUrl(userProfile?.avatar) ? (
    <img src={userProfile.avatar} className="w-7 h-7 rounded-full" />
  ) : userProfile?.avatar ? (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30">
      <span>{userProfile.avatar}</span> {/* Emoji */}
    </div>
  ) : (
    <div className="w-7 h-7 rounded-full">
      <User size={14} /> {/* Default icon */}
    </div>
  )}
  
  {/* User Info */}
  <div>
    <span>{userProfile?.name || 'User'}</span>
    <span>{shortenAddress(address)}</span>
    {referralData && (
      <span>{referralData.total_referrals} Refs</span>
    )}
  </div>
</div>
```

---

## 🔧 Profile Management

### Settings Page

Users can update their profile in `/wallet/settings`:

**Editable Fields:**
- Name
- Avatar (emoji selection)
- Email (optional)
- Network preference
- Theme preference

**Code:**
```typescript
// pages/Settings.tsx
const handleUpdateProfile = async () => {
  const result = await supabaseService.updateProfile(address, {
    name: newName,
    avatar: newAvatar,
    email: newEmail
  });
  
  if (result.success) {
    showToast('Profile updated!', 'success');
    // Refresh profile in context
    await refreshData();
  }
};
```

---

## 💰 RZC Balance Integration

### How RZC Balance Works:

**1. Initial Balance:**
```typescript
// When profile is created
{
  rzc_balance: 0 // Starts at 0
}
```

**2. Earning RZC:**
```typescript
// When someone uses your referral code
await rzcRewardService.creditRZC(referrerAddress, 50); // +50 RZC

// Milestone bonuses
if (totalReferrals === 10) {
  await rzcRewardService.creditRZC(referrerAddress, 500); // +500 RZC
}
```

**3. Displaying RZC:**
```typescript
// In header
<span>{formatBalance(userProfile?.rzc_balance || 0)} RZC</span>

// In referral page
<h2>{userProfile.rzc_balance.toLocaleString()} RZC</h2>
<p>${(userProfile.rzc_balance * 0.10).toFixed(2)} USD</p>
```

---

## 🔗 Profile Data Flow

### Complete Data Flow Diagram:

```
┌─────────────────┐
│  User Creates   │
│     Wallet      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate TON    │
│    Address      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create Profile │
│   in Supabase   │
│  (users table)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ProfileSetup   │
│  (Optional)     │
│  Customize      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Profile Loaded │
│  into Context   │
│  (WalletContext)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Display in UI  │
│  - Header       │
│  - Dashboard    │
│  - Settings     │
└─────────────────┘
```

---

## 📡 API Methods

### supabaseService Methods:

```typescript
// Create or update profile
async createOrUpdateProfile(profile: Partial<UserProfile>): Promise<{
  success: boolean;
  data?: UserProfile;
  error?: string;
}>

// Get user profile by wallet address
async getUserProfile(walletAddress: string): Promise<{
  success: boolean;
  data?: UserProfile;
  error?: string;
}>

// Update specific profile fields
async updateProfile(
  walletAddress: string,
  updates: Partial<Pick<UserProfile, 'name' | 'avatar' | 'email'>>
): Promise<{
  success: boolean;
  data?: UserProfile;
  error?: string;
}>

// Get referral data
async getReferralData(walletAddress: string): Promise<{
  success: boolean;
  data?: ReferralData;
  error?: string;
}>
```

---

## 🎭 Profile Types

### TypeScript Interfaces:

```typescript
// context/WalletContext.tsx
interface UserProfile {
  id: string;
  wallet_address: string;
  name: string;
  avatar: string;
  role: string;
  is_active: boolean;
  referrer_code: string | null;
  rzc_balance: number;
  created_at: string;
  updated_at: string;
}

interface ReferralData {
  id: string;
  user_id: string;
  referrer_id: string | null;
  referral_code: string;
  total_earned: number;
  total_referrals: number;
  rank: string;
  level: number;
  created_at: string;
  updated_at: string;
}

interface WalletState {
  userProfile: UserProfile | null;
  referralData: ReferralData | null;
  // ... other fields
}
```

---

## 🔐 Security & Privacy

### Data Storage:

**Local Storage (Encrypted):**
- Wallet mnemonic (encrypted)
- Password hash
- Session token

**Supabase (Server):**
- Profile data (name, avatar)
- RZC balance
- Referral data
- Transaction history

**NOT Stored:**
- Private keys (derived on-demand from mnemonic)
- Passwords (only hashed)
- Sensitive personal data

---

## 🎯 Profile Use Cases

### 1. Personalization
```typescript
// Welcome message
<span>Welcome, {userProfile?.name?.split(' ')[0] || 'User'}</span>

// Avatar display
<img src={userProfile?.avatar} alt={userProfile?.name} />
```

### 2. Referral System
```typescript
// Check if user was referred
if (userProfile?.referrer_code) {
  // Show referrer info
  // Credit referrer with RZC
}

// Show user's referral stats
<p>{referralData?.total_referrals} people joined using your link</p>
<p>You earned {referralData?.total_earned} RZC</p>
```

### 3. Role-Based Access
```typescript
// Admin features
{userProfile?.role === 'admin' && (
  <Link to="/admin">Admin Dashboard</Link>
)}

// SuperAdmin features
{userProfile?.role === 'superadmin' && (
  <button>Manage All Users</button>
)}
```

### 4. Rewards Display
```typescript
// Show RZC balance
<h2>{userProfile?.rzc_balance} RZC</h2>
<p>≈ ${(userProfile?.rzc_balance * 0.10).toFixed(2)} USD</p>

// Show earning potential
<p>Refer 10 friends = +500 RZC bonus!</p>
```

---

## 🔄 Profile Updates

### Real-time Updates:

**When profile changes:**
```typescript
// After updating in Supabase
await supabaseService.updateProfile(address, updates);

// Refresh context
await refreshData(); // Reloads userProfile and referralData

// UI automatically updates via React state
```

**Automatic refresh triggers:**
- Login
- Profile edit in Settings
- Referral reward earned
- Manual refresh button
- Network switch

---

## 🐛 Common Issues & Solutions

### Issue 1: Profile not loading
**Cause**: Wallet address not in database
**Solution**: 
```typescript
// Auto-create profile on first login
if (!profileResult.data) {
  await supabaseService.createOrUpdateProfile({
    wallet_address: address,
    name: 'Rhiza User',
    avatar: '🌱'
  });
}
```

### Issue 2: Avatar not displaying
**Cause**: Invalid image URL or emoji encoding
**Solution**:
```typescript
// Check if valid URL
const isValidImageUrl = (url: string) => {
  return url.startsWith('http://') || 
         url.startsWith('https://') || 
         url.startsWith('data:');
};

// Fallback to icon
{isValidImageUrl(avatar) ? (
  <img src={avatar} />
) : avatar ? (
  <span>{avatar}</span> // Emoji
) : (
  <User /> // Default icon
)}
```

### Issue 3: RZC balance not updating
**Cause**: Cache or stale data
**Solution**:
```typescript
// Force refresh after reward
await rzcRewardService.creditRZC(address, amount);
await refreshData(); // Reload profile with new balance
```

---

## 📊 Profile Analytics

### Tracked Metrics:
- Total users
- Active users (is_active = true)
- Users by role
- Average RZC balance
- Referral conversion rate
- User retention

### Admin Dashboard:
```typescript
// View all users
const users = await supabaseService.getAllUsers();

// User stats
const stats = {
  total: users.length,
  active: users.filter(u => u.is_active).length,
  avgRZC: users.reduce((sum, u) => sum + u.rzc_balance, 0) / users.length
};
```

---

## 🎉 Summary

**Profile System Features:**
- ✅ Wallet-based authentication (no email required)
- ✅ Customizable name and avatar
- ✅ RZC token balance tracking
- ✅ Referral system integration
- ✅ Role-based access control
- ✅ Real-time updates
- ✅ Mobile-responsive display
- ✅ Secure data storage
- ✅ Admin management tools

**Profile Data Sources:**
1. **Blockchain**: Wallet address, TON balance
2. **Supabase**: Name, avatar, RZC balance, referrals
3. **Local Storage**: Session, preferences

**Profile Display Locations:**
- Header (all pages)
- Dashboard (welcome message)
- Settings (edit form)
- Referral page (stats)
- Admin dashboard (user list)

The profile system seamlessly integrates blockchain identity with traditional user data, providing a personalized experience while maintaining security and privacy.
