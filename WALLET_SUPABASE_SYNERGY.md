# Wallet Creation & Supabase Integration - Complete Flow Explanation

## 🎯 Overview

This document explains how TON wallet creation works in synergy with Supabase to create a complete user management system.

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│                    (CreateWallet.tsx Page)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WALLET CREATION FLOW                          │
│                                                                   │
│  1. User clicks "Create Wallet"                                  │
│  2. Optional: Enters referral code                               │
│  3. Sets password for encryption                                 │
│  4. Confirms password                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TON BLOCKCHAIN LAYER                           │
│                  (tonWalletService.ts)                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │ 1. Generate 24-word mnemonic                     │           │
│  │    - Uses @ton/crypto library                    │           │
│  │    - Cryptographically secure random generation  │           │
│  └──────────────────────────────────────────────────┘           │
│                             │                                     │
│                             ▼                                     │
│  ┌──────────────────────────────────────────────────┐           │
│  │ 2. Derive key pair from mnemonic                 │           │
│  │    - Public key (for wallet address)             │           │
│  │    - Private key (kept in memory only)           │           │
│  └──────────────────────────────────────────────────┘           │
│                             │                                     │
│                             ▼                                     │
│  ┌──────────────────────────────────────────────────┐           │
│  │ 3. Create WalletContractV4                       │           │
│  │    - Generates TON wallet address                │           │
│  │    - Format: EQA1B2C3D4E5F6...                   │           │
│  └──────────────────────────────────────────────────┘           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOCAL STORAGE LAYER                           │
│                   (encryption.ts)                                │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │ 1. Encrypt mnemonic with user password           │           │
│  │    - Uses AES-256-GCM encryption                 │           │
│  │    - Password → PBKDF2 → Encryption key          │           │
│  │    - Adds salt and IV for security               │           │
│  └──────────────────────────────────────────────────┘           │
│                             │                                     │
│                             ▼                                     │
│  ┌──────────────────────────────────────────────────┐           │
│  │ 2. Store encrypted mnemonic in localStorage      │           │
│  │    - Key: 'rhiza_session'                        │           │
│  │    - Value: Encrypted mnemonic string            │           │
│  │    - Flag: 'rhiza_session_encrypted' = true      │           │
│  └──────────────────────────────────────────────────┘           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE LAYER                       │
│                  (supabaseService.ts)                            │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │ 1. Create User Profile (wallet_users table)      │           │
│  │    ┌────────────────────────────────────────┐   │           │
│  │    │ id: UUID (auto-generated)              │   │           │
│  │    │ wallet_address: "EQA1B2C3..."          │   │           │
│  │    │ name: "Rhiza User #2B3C"               │   │           │
│  │    │ avatar: "🌱"                            │   │           │
│  │    │ role: "user"                            │   │           │
│  │    │ is_active: true                         │   │           │
│  │    │ referrer_code: "ABC12345" (if provided)│   │           │
│  │    │ created_at: timestamp                   │   │           │
│  │    └────────────────────────────────────────┘   │           │
│  └──────────────────────────────────────────────────┘           │
│                             │                                     │
│                             ▼                                     │
│  ┌──────────────────────────────────────────────────┐           │
│  │ 2. Generate Referral Code (wallet_referrals)     │           │
│  │    ┌────────────────────────────────────────┐   │           │
│  │    │ id: UUID                                │   │           │
│  │    │ user_id: (from step 1)                  │   │           │
│  │    │ referrer_id: (if referral code used)    │   │           │
│  │    │ referral_code: Last 8 chars of address │   │           │
│  │    │ total_earned: 0                         │   │           │
│  │    │ total_referrals: 0                      │   │           │
│  │    │ rank: "Core Node"                       │   │           │
│  │    │ level: 1                                │   │           │
│  │    └────────────────────────────────────────┘   │           │
│  └──────────────────────────────────────────────────┘           │
│                             │                                     │
│                             ▼                                     │
│  ┌──────────────────────────────────────────────────┐           │
│  │ 3. Track Analytics Event (wallet_analytics)      │           │
│  │    ┌────────────────────────────────────────┐   │           │
│  │    │ event_name: "wallet_created"            │   │           │
│  │    │ properties: {                           │   │           │
│  │    │   wallet_address: "EQA1B2C3..."        │   │           │
│  │    │   has_referrer: true/false              │   │           │
│  │    │   network: "testnet"                    │   │           │
│  │    │ }                                       │   │           │
│  │    └────────────────────────────────────────┘   │           │
│  └──────────────────────────────────────────────────┘           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WALLET CONTEXT STATE                          │
│                  (WalletContext.tsx)                             │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Update React State:                              │           │
│  │  - address: "EQA1B2C3..."                        │           │
│  │  - isLoggedIn: true                              │           │
│  │  - userProfile: { name, avatar, ... }            │           │
│  │  - referralData: { code, rank, ... }             │           │
│  │  - balance: "0.0000" (initial)                   │           │
│  └──────────────────────────────────────────────────┘           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REDIRECT TO DASHBOARD                         │
│                  User can now use wallet!                        │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Detailed Step-by-Step Flow

### Step 1: User Initiates Wallet Creation

**Location**: `pages/CreateWallet.tsx`

```typescript
// User clicks "Create Wallet" button
const handleCreateWallet = async () => {
  // Validate inputs
  if (password !== confirmPassword) {
    toast.error('Passwords do not match');
    return;
  }
  
  // Start creation process
  setIsCreating(true);
  
  // Continue to Step 2...
}
```

**What happens**:
- User interface validates password match
- Optional referral code is captured
- Loading state begins

---

### Step 2: Generate TON Wallet

**Location**: `services/tonWalletService.ts`

```typescript
async generateNewWallet() {
  try {
    // 1. Generate 24-word mnemonic (BIP39 standard)
    const mnemonic = await mnemonicNew(24);
    // Example: ["abandon", "ability", "able", ...]
    
    // 2. Derive cryptographic key pair
    const keyPair = await mnemonicToWalletKey(mnemonic);
    // keyPair.publicKey: Used for wallet address
    // keyPair.secretKey: Used for signing (never stored)
    
    // 3. Create wallet contract
    const wallet = WalletContractV4.create({ 
      workchain: 0,              // Main workchain
      publicKey: keyPair.publicKey 
    });
    
    // 4. Get wallet address
    const address = wallet.address.toString();
    // Example: "EQA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0"
    
    return { 
      success: true, 
      mnemonic,    // 24 words
      address      // TON address
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
```

**What happens**:
- Cryptographically secure random mnemonic generated
- Public/private key pair derived using TON's cryptography
- Wallet contract created (V4 is latest version)
- Unique TON address generated from public key

---

### Step 3: Encrypt and Store Mnemonic Locally

**Location**: `utils/encryption.ts`

```typescript
export async function encryptMnemonic(
  mnemonic: string[], 
  password: string
): Promise<string> {
  // 1. Convert mnemonic array to string
  const mnemonicString = mnemonic.join(' ');
  
  // 2. Generate encryption key from password
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,  // Strong key derivation
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  // 3. Encrypt mnemonic
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    new TextEncoder().encode(mnemonicString)
  );
  
  // 4. Combine salt + iv + encrypted data
  const combined = new Uint8Array(
    salt.length + iv.length + encrypted.byteLength
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  
  // 5. Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}
```

**Then store in localStorage**:
```typescript
localStorage.setItem('rhiza_session', encryptedMnemonic);
localStorage.setItem('rhiza_session_encrypted', 'true');
```

**What happens**:
- Mnemonic encrypted with AES-256-GCM (military-grade)
- Password never stored, only used for encryption
- Salt and IV ensure unique encryption each time
- Encrypted data stored in browser's localStorage
- Can only be decrypted with correct password

---

### Step 4: Create User Profile in Supabase

**Location**: `services/supabaseService.ts`

```typescript
async createOrUpdateProfile(profile: Partial<UserProfile>) {
  if (!this.client) return { success: false, error: 'Not configured' };

  try {
    // Insert or update profile in database
    const { data, error } = await this.client
      .from('wallet_users')
      .upsert({
        wallet_address: profile.wallet_address,
        name: profile.name || `Rhiza User #${profile.wallet_address.slice(-4)}`,
        avatar: profile.avatar || '🌱',
        role: 'user',
        is_active: true,
        referrer_code: profile.referrer_code || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'wallet_address'  // Update if exists
      })
      .select()
      .single();

    if (error) throw error;
    
    console.log('✅ User profile created:', data.id);
    return { success: true, data };
  } catch (error: any) {
    console.error('❌ Profile creation failed:', error);
    return { success: false, error: error.message };
  }
}
```

**What happens**:
- Profile record created in Supabase database
- Wallet address is the unique identifier
- Default name and avatar assigned
- Referral code linked if provided
- Returns user ID for next steps

---

### Step 5: Generate Referral Code

**Location**: `services/supabaseService.ts`

```typescript
async createReferralCode(userId: string, walletAddress: string) {
  if (!this.client) return { success: false, error: 'Not configured' };

  try {
    // Generate referral code from wallet address
    const referralCode = walletAddress.slice(-8).toUpperCase();
    // Example: "2B3C4D5E"
    
    // Create referral record
    const { data, error } = await this.client
      .from('wallet_referrals')
      .upsert({
        user_id: userId,
        referral_code: referralCode,
        total_earned: 0,
        total_referrals: 0,
        rank: 'Core Node',
        level: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id' 
      })
      .select()
      .single();

    if (error) throw error;
    
    console.log('✅ Referral code created:', referralCode);
    return { success: true, data };
  } catch (error: any) {
    console.error('❌ Referral creation failed:', error);
    return { success: false, error: error.message };
  }
}
```

**What happens**:
- Unique referral code generated from wallet address
- Referral record created with initial stats
- User starts at "Core Node" rank
- Code can be shared to earn commissions

---

### Step 6: Link Referrer (If Referral Code Used)

**Location**: `pages/CreateWallet.tsx`

```typescript
// If user entered a referral code during signup
if (referralCodeInput) {
  // 1. Validate referral code exists
  const referrerResult = await supabaseService.getReferralsByCode(
    referralCodeInput
  );
  
  if (referrerResult.success && referrerResult.data.length > 0) {
    // 2. Get referrer's user ID
    const referrerId = referrerResult.data[0].id;
    
    // 3. Update new user's profile with referrer
    await supabaseService.createOrUpdateProfile({
      wallet_address: address,
      referrer_code: referralCodeInput
    });
    
    // 4. Update referrer's stats
    await supabaseService.updateReferralStats(referrerId);
    
    console.log('✅ Referral link established');
  }
}
```

**What happens**:
- Referral code validated against database
- New user linked to referrer
- Referrer's total_referrals count incremented
- Referral relationship tracked for commission calculation

---

### Step 7: Track Analytics Event

**Location**: `services/supabaseService.ts`

```typescript
async trackEvent(eventName: string, properties: Record<string, any>) {
  if (!this.client) return { success: false };

  try {
    const { error } = await this.client
      .from('wallet_analytics')
      .insert({
        user_id: properties.user_id || null,
        wallet_address: properties.wallet_address,
        event_name: eventName,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          screen_size: `${window.innerWidth}x${window.innerHeight}`
        },
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    
    console.log('📊 Event tracked:', eventName);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Event tracking failed:', error);
    return { success: false, error: error.message };
  }
}
```

**Usage**:
```typescript
await supabaseService.trackEvent('wallet_created', {
  wallet_address: address,
  has_referrer: !!referralCodeInput,
  network: 'testnet',
  creation_method: 'new_wallet'
});
```

**What happens**:
- Analytics event recorded in database
- Useful for tracking user behavior
- Helps measure growth and engagement
- Can be used for admin dashboards

---

### Step 8: Update Application State

**Location**: `context/WalletContext.tsx`

```typescript
const login = async (mnemonic: string[], password?: string) => {
  setIsLoading(true);
  
  // 1. Initialize wallet with TON service
  const res = await tonWalletService.initializeWallet(mnemonic, password);
  
  if (res.success && res.address) {
    // 2. Set wallet address
    setAddress(res.address);
    setIsLoggedIn(true);
    
    // 3. Load user profile from Supabase
    const profileResult = await supabaseService.getProfile(res.address);
    
    if (profileResult.success && profileResult.data) {
      setUserProfile(profileResult.data);
      
      // 4. Load referral data
      const referralResult = await supabaseService.getReferralData(
        profileResult.data.id
      );
      if (referralResult.success) {
        setReferralData(referralResult.data);
      }
    }
    
    // 5. Fetch blockchain data
    await refreshData(); // Gets balance, jettons, etc.
    
    setIsLoading(false);
    return true;
  }
  
  setIsLoading(false);
  return false;
};
```

**What happens**:
- React state updated with wallet info
- User profile loaded from Supabase
- Referral data loaded from Supabase
- Blockchain data fetched (balance, tokens)
- UI re-renders with user data

---

### Step 9: Redirect to Dashboard

**Location**: `pages/CreateWallet.tsx`

```typescript
// After successful wallet creation
navigate('/dashboard');
```

**What happens**:
- User redirected to main dashboard
- Dashboard displays:
  - TON balance (from blockchain)
  - User profile (from Supabase)
  - Referral code (from Supabase)
  - Transaction history (from blockchain + Supabase)
  - Assets (jettons, NFTs from blockchain)

---

## 🔐 Security Architecture

### What's Stored Where

#### Browser (localStorage)
```
✅ Encrypted mnemonic (AES-256-GCM)
✅ Encryption flag
✅ Network preference (mainnet/testnet)
✅ Theme preference (dark/light)

❌ NOT STORED:
   - Plain text mnemonic
   - Private keys
   - Password
```

#### Supabase Database
```
✅ Wallet address (public)
✅ User profile (name, avatar)
✅ Referral code (public)
✅ Referral relationships
✅ Transaction history (backup)
✅ Analytics events

❌ NOT STORED:
   - Mnemonic (never!)
   - Private keys (never!)
   - Password (never!)
   - Encrypted mnemonic (never!)
```

#### Memory Only (Never Persisted)
```
⚠️ Private keys (derived from mnemonic)
⚠️ Decrypted mnemonic (during session)
⚠️ User password (used for encryption only)
```

### Security Layers

1. **Encryption Layer**
   - AES-256-GCM encryption
   - PBKDF2 key derivation (100,000 iterations)
   - Unique salt and IV per encryption
   - Password never stored

2. **Database Security**
   - Row Level Security (RLS) enabled
   - Users can only access own data
   - SQL injection prevention
   - Prepared statements

3. **Network Security**
   - HTTPS only
   - Supabase API key authentication
   - Bearer token for API calls
   - CORS protection

4. **Session Security**
   - 15-minute auto-logout
   - Activity-based session refresh
   - Encrypted session storage
   - Secure logout (clears all data)

---

## 🔄 Data Flow Summary

### Wallet Creation Flow
```
User Input → TON Wallet Generation → Local Encryption → Supabase Profile
     ↓              ↓                      ↓                    ↓
Password      24-word mnemonic      Encrypted storage    User record
Referral      TON address           localStorage         Referral code
              Key pair              Session flag         Analytics event
```

### Login Flow
```
User Password → Decrypt Mnemonic → Initialize Wallet → Load Profile
      ↓               ↓                   ↓                  ↓
Entered         From localStorage    TON service        From Supabase
Validated       Decrypted           Key pair derived    Profile data
Correct         24 words            Address verified    Referral data
```

### Transaction Flow
```
User Action → Sign with Private Key → Broadcast to TON → Save to Supabase
     ↓              ↓                       ↓                  ↓
Send TON      Derived from mnemonic    Blockchain         Transaction record
Amount        Never stored             Confirmed          Analytics event
Recipient     In-memory only           TX hash            Referral commission
```

---

## 💡 Key Benefits of This Architecture

### 1. **Security First**
- Mnemonic never leaves device unencrypted
- Private keys never stored anywhere
- Password-based encryption
- Military-grade cryptography

### 2. **User Convenience**
- One-time password setup
- Auto-login on return visits
- Cross-device sync (via Supabase)
- Persistent user profiles

### 3. **Referral System**
- Automatic code generation
- Relationship tracking
- Commission calculation
- Rank progression

### 4. **Analytics & Insights**
- User behavior tracking
- Growth metrics
- Transaction patterns
- Referral performance

### 5. **Scalability**
- Supabase handles millions of users
- Real-time capabilities
- Efficient querying
- Automatic backups

---

## 🎯 Complete Integration Example

Here's how all pieces work together in `CreateWallet.tsx`:

```typescript
const handleCreateWallet = async () => {
  try {
    // 1. Generate TON wallet
    const walletResult = await tonWalletService.generateNewWallet();
    if (!walletResult.success) throw new Error('Wallet generation failed');
    
    const { mnemonic, address } = walletResult;
    
    // 2. Encrypt and store locally
    const encrypted = await encryptMnemonic(mnemonic, password);
    localStorage.setItem('rhiza_session', encrypted);
    localStorage.setItem('rhiza_session_encrypted', 'true');
    
    // 3. Create Supabase profile
    const profileResult = await supabaseService.createOrUpdateProfile({
      wallet_address: address,
      name: `Rhiza User #${address.slice(-4)}`,
      avatar: '🌱',
      referrer_code: referralCodeInput || null
    });
    
    if (!profileResult.success) throw new Error('Profile creation failed');
    
    // 4. Generate referral code
    await supabaseService.createReferralCode(
      profileResult.data.id,
      address
    );
    
    // 5. Track analytics
    await supabaseService.trackEvent('wallet_created', {
      wallet_address: address,
      has_referrer: !!referralCodeInput,
      network: 'testnet'
    });
    
    // 6. Initialize wallet context
    await login(mnemonic, password);
    
    // 7. Show success and redirect
    toast.success('Wallet created successfully!');
    navigate('/dashboard');
    
  } catch (error) {
    console.error('❌ Wallet creation failed:', error);
    toast.error('Failed to create wallet');
  }
};
```

---

## 📚 Summary

The wallet creation and Supabase integration work together to provide:

1. **Secure wallet generation** using TON blockchain standards
2. **Encrypted local storage** for mnemonic protection
3. **Persistent user profiles** in Supabase database
4. **Referral system** with automatic tracking
5. **Analytics** for growth insights
6. **Cross-device sync** capabilities
7. **Real-time updates** via Supabase subscriptions

This architecture ensures maximum security while providing excellent user experience and powerful business features like referrals and analytics.

---

**Next Steps**: Implement this integration by following the code examples in `SUPABASE_QUICK_START.md`
