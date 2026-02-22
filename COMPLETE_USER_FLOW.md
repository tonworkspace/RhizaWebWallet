# Complete User Flow with Supabase Integration

## 🎯 Overview

This document explains how all user scenarios work with Supabase integration, including new users, returning users, and wallet imports.

## 📊 User Scenarios

### Scenario 1: New User Creates Wallet

```
User Journey:
Landing Page → Onboarding → Create Wallet → Set Password → Verify → Dashboard

Supabase Actions:
1. Profile created in wallet_users
2. Referral code generated in wallet_referrals
3. Analytics event: "wallet_created"
```

**Step-by-Step Flow**:

1. **User clicks "Create New Wallet"**
   - Navigates to `/wallet/create`
   - TON generates 24-word mnemonic
   - User sees mnemonic phrase

2. **User sets password**
   - Password validates (8+ chars, uppercase, lowercase, number, special)
   - Password used for local encryption only

3. **User verifies backup**
   - Enters 3 random words from mnemonic
   - Confirms understanding of security

4. **Wallet creation completes**:
   ```typescript
   // Console logs:
   🚀 Starting wallet creation process...
   ✅ Wallet initialized: EQA1B2C3D4E5F6...
   💾 Creating user profile in Supabase...
   ✅ User profile created: uuid-here
   🎫 Generating referral code...
   ✅ Referral code created: 2B3C4D5E
   📊 Analytics event tracked
   ✅ Wallet added to manager
   ✅ Wallet creation complete!
   ```

5. **Supabase Records**:
   - **wallet_users**:
     ```json
     {
       "id": "uuid",
       "wallet_address": "EQA1B2C3...",
       "name": "Rhiza User #2B3C",
       "avatar": "🌱",
       "role": "user",
       "is_active": true,
       "referrer_code": null,
       "created_at": "2026-02-21T..."
     }
     ```
   
   - **wallet_referrals**:
     ```json
     {
       "id": "uuid",
       "user_id": "uuid",
       "referrer_id": null,
       "referral_code": "2B3C4D5E",
       "total_earned": 0,
       "total_referrals": 0,
       "rank": "Core Node",
       "level": 1
     }
     ```
   
   - **wallet_analytics**:
     ```json
     {
       "event_name": "wallet_created",
       "wallet_address": "EQA1B2C3...",
       "properties": {
         "creation_method": "new_wallet",
         "has_referrer": false,
         "network": "testnet"
       }
     }
     ```

6. **User redirected to Dashboard**
   - Profile data loaded in WalletContext
   - Referral data available
   - Balance fetched from blockchain

---

### Scenario 2: User Imports Existing Wallet

```
User Journey:
Landing Page → Onboarding → Import Wallet → Enter Mnemonic → Dashboard

Supabase Actions:
1. Check if profile exists
2. Create profile if new (or load if exists)
3. Generate referral code if new
4. Analytics event: "wallet_imported"
```

**Step-by-Step Flow**:

1. **User clicks "Import Existing Wallet"**
   - Navigates to `/wallet/import`
   - Sees 24 input fields

2. **User enters mnemonic**
   - Can paste all 24 words at once
   - Can type individually
   - Optional: Enter password if wallet was encrypted

3. **User clicks "Authorize Vault Access"**:
   ```typescript
   // Console logs:
   🔐 Starting wallet import process...
   ✅ Wallet initialized: EQA1B2C3D4E5F6...
   💾 Checking for existing profile in Supabase...
   ```

4. **Two possible paths**:

   **Path A: Wallet Never Used Before**
   ```typescript
   📝 Creating new profile in Supabase...
   ✅ User profile created: uuid-here
   🎫 Generating referral code...
   ✅ Referral code created: 2B3C4D5E
   📊 Analytics event tracked
   ✅ Wallet added to manager
   ✅ Wallet import complete!
   ```
   
   **Path B: Wallet Used Before (Has Profile)**
   ```typescript
   ✅ Existing profile found: Rhiza User #2B3C
   📊 Analytics event tracked (existing_profile: true)
   ✅ Wallet added to manager
   ✅ Wallet import complete!
   ```

5. **Supabase Records**:
   - Profile created (if new) or loaded (if exists)
   - Analytics event tracked with `import_method: "mnemonic"`
   - Referral code generated (if new)

6. **User redirected to Dashboard**
   - All profile data loaded
   - Balance fetched from blockchain

---

### Scenario 3: Returning User Logs In

```
User Journey:
Landing Page → Wallet Login → Enter Password → Dashboard

Supabase Actions:
1. Load profile from wallet_users
2. Load referral data from wallet_referrals
3. Analytics event: "wallet_login"
```

**Step-by-Step Flow**:

1. **User opens app**
   - WalletContext checks for stored session
   - If encrypted session exists, shows login screen

2. **User enters password**
   - Password decrypts mnemonic from localStorage
   - Wallet initialized with TON service

3. **Login process**:
   ```typescript
   // Console logs:
   💾 Loading user profile from Supabase...
   ✅ User profile loaded: Rhiza User #2B3C
   ✅ Referral data loaded: 2B3C4D5E
   ```

4. **WalletContext state updated**:
   ```typescript
   {
     address: "EQA1B2C3...",
     isLoggedIn: true,
     userProfile: {
       id: "uuid",
       wallet_address: "EQA1B2C3...",
       name: "Rhiza User #2B3C",
       avatar: "🌱",
       role: "user",
       is_active: true
     },
     referralData: {
       referral_code: "2B3C4D5E",
       total_earned: 0,
       total_referrals: 0,
       rank: "Core Node",
       level: 1
     }
   }
   ```

5. **Supabase Records**:
   - **wallet_analytics**:
     ```json
     {
       "event_name": "wallet_login",
       "wallet_address": "EQA1B2C3...",
       "properties": {
         "network": "testnet"
       }
     }
     ```

6. **User sees Dashboard**
   - Profile name and avatar displayed
   - Referral code available
   - Balance and assets loaded

---

### Scenario 4: User Without Profile (Migration)

```
User Journey:
Existing Wallet → Login → Profile Auto-Created → Dashboard

Supabase Actions:
1. Detect missing profile
2. Create profile automatically
3. Generate referral code
4. Continue login
```

**Step-by-Step Flow**:

1. **User logs in with existing wallet**
   - Wallet was created before Supabase integration
   - No profile exists in database

2. **WalletContext detects missing profile**:
   ```typescript
   // Console logs:
   💾 Loading user profile from Supabase...
   📝 Creating profile for existing wallet...
   ✅ User profile created
   ✅ Referral code created
   ```

3. **Profile auto-created**:
   - Default name: "Rhiza User #XXXX"
   - Default avatar: "🌱"
   - Referral code generated
   - User continues seamlessly

4. **User experience**:
   - No interruption
   - Profile created in background
   - All features work immediately

---

## 🔄 Data Synchronization

### What's Stored Where

#### Browser (localStorage)
```javascript
{
  "rhiza_session": "encrypted_mnemonic_here",
  "rhiza_session_encrypted": "true",
  "rhiza_network": "testnet",
  "rhiza_theme": "dark"
}
```

#### Supabase Database
```javascript
{
  "wallet_users": {
    "wallet_address": "EQA1B2C3...",
    "name": "Rhiza User #2B3C",
    "avatar": "🌱",
    "role": "user"
  },
  "wallet_referrals": {
    "referral_code": "2B3C4D5E",
    "total_earned": 0,
    "rank": "Core Node"
  },
  "wallet_analytics": [
    { "event": "wallet_created" },
    { "event": "wallet_login" }
  ]
}
```

#### TON Blockchain
```javascript
{
  "balance": "0.0000 TON",
  "transactions": [...],
  "jettons": [...],
  "nfts": [...]
}
```

### Data Flow on Login

```
1. User enters password
   ↓
2. Decrypt mnemonic from localStorage
   ↓
3. Initialize TON wallet
   ↓
4. Load profile from Supabase ← NEW!
   ↓
5. Load referral data from Supabase ← NEW!
   ↓
6. Fetch balance from blockchain
   ↓
7. Update WalletContext state
   ↓
8. Render Dashboard with all data
```

---

## 🎨 UI Components with Profile Data

### Dashboard
```typescript
const Dashboard = () => {
  const { userProfile, referralData, balance } = useWallet();
  
  return (
    <div>
      <h1>Welcome, {userProfile?.name}!</h1>
      <p>Avatar: {userProfile?.avatar}</p>
      <p>Balance: {balance} TON</p>
      <p>Referral Code: {referralData?.referral_code}</p>
      <p>Rank: {referralData?.rank}</p>
    </div>
  );
};
```

### Settings Page
```typescript
const Settings = () => {
  const { userProfile, referralData } = useWallet();
  
  return (
    <div>
      <ProfileSection profile={userProfile} />
      <ReferralSection data={referralData} />
      <SecuritySettings />
    </div>
  );
};
```

### Referral Portal
```typescript
const ReferralPortal = () => {
  const { referralData } = useWallet();
  
  return (
    <div>
      <h2>Your Referral Code: {referralData?.referral_code}</h2>
      <p>Total Referrals: {referralData?.total_referrals}</p>
      <p>Total Earned: {referralData?.total_earned} TON</p>
      <p>Current Rank: {referralData?.rank}</p>
    </div>
  );
};
```

---

## 📊 Analytics Events Tracked

### wallet_created
```json
{
  "event_name": "wallet_created",
  "wallet_address": "EQA1B2C3...",
  "properties": {
    "creation_method": "new_wallet",
    "has_referrer": false,
    "network": "testnet",
    "timestamp": "2026-02-21T..."
  }
}
```

### wallet_imported
```json
{
  "event_name": "wallet_imported",
  "wallet_address": "EQA1B2C3...",
  "properties": {
    "import_method": "mnemonic",
    "existing_profile": false,
    "network": "testnet"
  }
}
```

### wallet_login
```json
{
  "event_name": "wallet_login",
  "wallet_address": "EQA1B2C3...",
  "properties": {
    "network": "testnet",
    "timestamp": "2026-02-21T..."
  }
}
```

---

## 🔐 Security Considerations

### What's Never Stored in Supabase
- ❌ Mnemonic phrase (24 words)
- ❌ Private keys
- ❌ User password
- ❌ Encrypted mnemonic

### What's Stored in Supabase
- ✅ Wallet address (public)
- ✅ User profile (name, avatar)
- ✅ Referral code (public)
- ✅ Referral statistics
- ✅ Analytics events

### Encryption Layers
1. **Mnemonic**: AES-256-GCM encrypted with user password
2. **Storage**: Encrypted mnemonic in localStorage
3. **Transport**: HTTPS for all API calls
4. **Database**: RLS policies protect user data

---

## ✅ Testing Checklist

### New Wallet Creation
- [ ] Profile created in Supabase
- [ ] Referral code generated
- [ ] Analytics event tracked
- [ ] Console logs appear
- [ ] User redirected to dashboard
- [ ] Profile data available in UI

### Wallet Import
- [ ] Existing profile detected (if applicable)
- [ ] New profile created (if needed)
- [ ] Referral code generated (if new)
- [ ] Analytics event tracked
- [ ] Console logs appear
- [ ] User redirected to dashboard

### Returning User Login
- [ ] Profile loaded from Supabase
- [ ] Referral data loaded
- [ ] Analytics event tracked
- [ ] Console logs appear
- [ ] Dashboard shows profile data

### Profile Migration
- [ ] Missing profile detected
- [ ] Profile auto-created
- [ ] Referral code generated
- [ ] User continues seamlessly

---

## 🎯 Summary

All user scenarios now integrate with Supabase:

1. **New Users**: Profile and referral code created automatically
2. **Import Users**: Profile created or loaded based on existence
3. **Returning Users**: Profile and referral data loaded on login
4. **Existing Wallets**: Profile auto-created on first login (migration)

Every action is logged with emojis in the console for easy debugging, and all data is properly stored in Supabase for persistence and cross-device sync.

---

**Status**: ✅ Complete
**All Scenarios**: ✅ Covered
**Build**: ✅ Passing
**Ready**: ✅ Yes
