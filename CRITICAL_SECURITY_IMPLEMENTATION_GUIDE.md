# Critical Security Features - Implementation Guide

**Priority**: CRITICAL  
**Timeline**: 2 weeks  
**Effort**: 7-9 days (1 developer)

---

## Quick Start: Top 3 Critical Features

### 1. Withdrawal Whitelist (Day 1-3)
### 2. Fund Password (Day 4-6)
### 3. Anti-Phishing Code (Day 7-8)

---

## Feature 1: Withdrawal Whitelist

### Database Migration

```sql
-- File: add_withdrawal_whitelist.sql

-- Whitelist addresses table
create table if not exists withdrawal_whitelist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references wallet_users(id) on delete cascade,
  wallet_address text not null,
  label text not null,
  chain text not null check (chain in ('TON', 'EVM', 'BTC', 'SOL', 'TRON', 'USDT')),
  network text, -- 'mainnet', 'testnet', 'ethereum', 'polygon', etc.
  added_at timestamptz not null default now(),
  verified_at timestamptz, -- null = pending 24h security delay
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Whitelist settings table
create table if not exists withdrawal_whitelist_settings (
  user_id uuid primary key references wallet_users(id) on delete cascade,
  whitelist_enabled boolean not null default false,
  require_2fa boolean not null default true,
  security_delay_hours integer not null default 24,
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_whitelist_user on withdrawal_whitelist(user_id);
create index idx_whitelist_address on withdrawal_whitelist(wallet_address);
create index idx_whitelist_verified on withdrawal_whitelist(verified_at) where verified_at is not null;

-- RLS Policies
alter table withdrawal_whitelist enable row level security;
alter table withdrawal_whitelist_settings enable row level security;

create policy "Users can view their own whitelist"
  on withdrawal_whitelist for select
  using (user_id = (select id from wallet_users where auth_user_id = auth.uid() limit 1));

create policy "Users can add to their whitelist"
  on withdrawal_whitelist for insert
  with check (user_id = (select id from wallet_users where auth_user_id = auth.uid() limit 1));

create policy "Users can update their whitelist"
  on withdrawal_whitelist for update
  using (user_id = (select id from wallet_users where auth_user_id = auth.uid() limit 1));

create policy "Users can delete from their whitelist"
  on withdrawal_whitelist for delete
  using (user_id = (select id from wallet_users where auth_user_id = auth.uid() limit 1));

create policy "Users can view their whitelist settings"
  on withdrawal_whitelist_settings for select
  using (user_id = (select id from wallet_users where auth_user_id = auth.uid() limit 1));

create policy "Users can update their whitelist settings"
  on withdrawal_whitelist_settings for all
  using (user_id = (select id from wallet_users where auth_user_id = auth.uid() limit 1));
```

### Service Layer

```typescript
// File: services/withdrawalWhitelistService.ts

import { supabaseService } from './supabaseService';
import { twoFactorService } from './twoFactorService';

interface WhitelistAddress {
  id: string;
  user_id: string;
  wallet_address: string;
  label: string;
  chain: 'TON' | 'EVM' | 'BTC' | 'SOL' | 'TRON' | 'USDT';
  network?: string;
  added_at: string;
  verified_at: string | null;
  is_active: boolean;
}

interface WhitelistSettings {
  user_id: string;
  whitelist_enabled: boolean;
  require_2fa: boolean;
  security_delay_hours: number;
}

class WithdrawalWhitelistService {
  /**
   * Get user's whitelist settings
   */
  async getSettings(userId: string): Promise<WhitelistSettings | null> {
    const client = supabaseService.getClient();
    if (!client) return null;

    const { data, error } = await client
      .from('withdrawal_whitelist_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Whitelist] Error fetching settings:', error);
      return null;
    }

    // Create default settings if none exist
    if (!data) {
      const { data: newSettings } = await client
        .from('withdrawal_whitelist_settings')
        .insert({ user_id: userId })
        .select()
        .single();
      return newSettings;
    }

    return data;
  }

  /**
   * Toggle whitelist mode (requires 2FA)
   */
  async toggleWhitelist(params: {
    userId: string;
    enabled: boolean;
    twoFACode: string;
    walletAddress: string;
    walletPassword: string;
  }): Promise<{ success: boolean; error?: string }> {
    // Verify 2FA
    const twoFAStatus = await twoFactorService.get2FAStatus(params.walletAddress);
    if (twoFAStatus.enabled && twoFAStatus.encryptedSecret) {
      const secret = await twoFactorService.decryptSecret(
        twoFAStatus.encryptedSecret,
        params.walletPassword
      );
      if (!secret) {
        return { success: false, error: '2FA verification failed' };
      }
      const valid = await twoFactorService.verifyCode(secret, params.twoFACode);
      if (!valid) {
        return { success: false, error: 'Invalid 2FA code' };
      }
    }

    const client = supabaseService.getClient();
    if (!client) return { success: false, error: 'Database not available' };

    const { error } = await client
      .from('withdrawal_whitelist_settings')
      .upsert({
        user_id: params.userId,
        whitelist_enabled: params.enabled,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('[Whitelist] Error toggling whitelist:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Add address to whitelist (24h security delay)
   */
  async addAddress(params: {
    userId: string;
    address: string;
    label: string;
    chain: string;
    network?: string;
    twoFACode: string;
    walletAddress: string;
    walletPassword: string;
  }): Promise<{ success: boolean; pendingUntil?: string; error?: string }> {
    // Verify 2FA
    const twoFAStatus = await twoFactorService.get2FAStatus(params.walletAddress);
    if (twoFAStatus.enabled && twoFAStatus.encryptedSecret) {
      const secret = await twoFactorService.decryptSecret(
        twoFAStatus.encryptedSecret,
        params.walletPassword
      );
      if (!secret) {
        return { success: false, error: '2FA verification failed' };
      }
      const valid = await twoFactorService.verifyCode(secret, params.twoFACode);
      if (!valid) {
        return { success: false, error: 'Invalid 2FA code' };
      }
    }

    const client = supabaseService.getClient();
    if (!client) return { success: false, error: 'Database not available' };

    // Check if address already exists
    const { data: existing } = await client
      .from('withdrawal_whitelist')
      .select('id, verified_at')
      .eq('user_id', params.userId)
      .eq('wallet_address', params.address)
      .eq('chain', params.chain)
      .maybeSingle();

    if (existing) {
      if (existing.verified_at) {
        return { success: false, error: 'Address already whitelisted' };
      } else {
        return {
          success: true,
          pendingUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
      }
    }

    // Add new address (pending verification)
    const { error } = await client
      .from('withdrawal_whitelist')
      .insert({
        user_id: params.userId,
        wallet_address: params.address,
        label: params.label,
        chain: params.chain,
        network: params.network,
        verified_at: null // Will be set after 24h
      });

    if (error) {
      console.error('[Whitelist] Error adding address:', error);
      return { success: false, error: error.message };
    }

    const pendingUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return { success: true, pendingUntil };
  }

  /**
   * Get all whitelisted addresses
   */
  async getAddresses(userId: string): Promise<WhitelistAddress[]> {
    const client = supabaseService.getClient();
    if (!client) return [];

    const { data, error } = await client
      .from('withdrawal_whitelist')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Whitelist] Error fetching addresses:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Check if withdrawal to address is allowed
   */
  async isWithdrawalAllowed(params: {
    userId: string;
    toAddress: string;
    chain: string;
  }): Promise<{ allowed: boolean; reason?: string }> {
    const client = supabaseService.getClient();
    if (!client) return { allowed: true }; // Fail open if DB unavailable

    // Check if whitelist is enabled
    const settings = await this.getSettings(params.userId);
    if (!settings || !settings.whitelist_enabled) {
      return { allowed: true }; // Whitelist disabled
    }

    // Check if address is whitelisted and verified
    const { data } = await client
      .from('withdrawal_whitelist')
      .select('verified_at')
      .eq('user_id', params.userId)
      .eq('wallet_address', params.toAddress)
      .eq('chain', params.chain)
      .eq('is_active', true)
      .maybeSingle();

    if (!data) {
      return {
        allowed: false,
        reason: 'Address not in whitelist. Add it in Settings → Withdrawal Security.'
      };
    }

    if (!data.verified_at) {
      return {
        allowed: false,
        reason: 'Address pending 24-hour security verification.'
      };
    }

    const verifiedTime = new Date(data.verified_at).getTime();
    const now = Date.now();
    const hoursSinceVerified = (now - verifiedTime) / (1000 * 60 * 60);

    if (hoursSinceVerified < 24) {
      const hoursRemaining = Math.ceil(24 - hoursSinceVerified);
      return {
        allowed: false,
        reason: `Address will be verified in ${hoursRemaining} hours.`
      };
    }

    return { allowed: true };
  }

  /**
   * Remove address from whitelist
   */
  async removeAddress(params: {
    userId: string;
    addressId: string;
    twoFACode: string;
    walletAddress: string;
    walletPassword: string;
  }): Promise<{ success: boolean; error?: string }> {
    // Verify 2FA
    const twoFAStatus = await twoFactorService.get2FAStatus(params.walletAddress);
    if (twoFAStatus.enabled && twoFAStatus.encryptedSecret) {
      const secret = await twoFactorService.decryptSecret(
        twoFAStatus.encryptedSecret,
        params.walletPassword
      );
      if (!secret) {
        return { success: false, error: '2FA verification failed' };
      }
      const valid = await twoFactorService.verifyCode(secret, params.twoFACode);
      if (!valid) {
        return { success: false, error: 'Invalid 2FA code' };
      }
    }

    const client = supabaseService.getClient();
    if (!client) return { success: false, error: 'Database not available' };

    const { error } = await client
      .from('withdrawal_whitelist')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', params.addressId)
      .eq('user_id', params.userId);

    if (error) {
      console.error('[Whitelist] Error removing address:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }
}

export const withdrawalWhitelistService = new WithdrawalWhitelistService();
```

### UI Component

```typescript
// File: pages/WithdrawalSecurity.tsx

import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Clock, Check, AlertCircle } from 'lucide-react';
import { withdrawalWhitelistService } from '../services/withdrawalWhitelistService';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';

const WithdrawalSecurity: React.FC = () => {
  const { userProfile, address } = useWallet();
  const { showToast } = useToast();
  
  const [settings, setSettings] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userProfile?.id]);

  const loadData = async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    const [settingsData, addressesData] = await Promise.all([
      withdrawalWhitelistService.getSettings(userProfile.id),
      withdrawalWhitelistService.getAddresses(userProfile.id)
    ]);
    setSettings(settingsData);
    setAddresses(addressesData);
    setLoading(false);
  };

  const toggleWhitelist = async () => {
    // Show 2FA modal, then call withdrawalWhitelistService.toggleWhitelist
    // Implementation details...
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Withdrawal Security</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Restrict withdrawals to approved addresses only
        </p>
      </div>

      {/* Whitelist Toggle */}
      <div className="bg-white dark:bg-[#0a0a0a] border-2 border-gray-200 dark:border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
              <Shield size={24} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold">Withdrawal Whitelist</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {settings?.whitelist_enabled ? 'Active' : 'Disabled'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleWhitelist}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              settings?.whitelist_enabled
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {settings?.whitelist_enabled ? 'Disable' : 'Enable'}
          </button>
        </div>

        {settings?.whitelist_enabled && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <p className="font-bold mb-1">Whitelist Active</p>
                <p>You can only withdraw to addresses in your whitelist. New addresses require 24-hour verification.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Whitelisted Addresses */}
      {settings?.whitelist_enabled && (
        <div className="bg-white dark:bg-[#0a0a0a] border-2 border-gray-200 dark:border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Whitelisted Addresses</h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all"
            >
              <Plus size={16} /> Add Address
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No whitelisted addresses yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map(addr => (
                <div key={addr.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">{addr.label}</span>
                      {addr.verified_at ? (
                        <Check size={14} className="text-emerald-500" />
                      ) : (
                        <Clock size={14} className="text-amber-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                      {addr.wallet_address.slice(0, 10)}...{addr.wallet_address.slice(-8)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {addr.chain} {addr.network && `· ${addr.network}`}
                    </p>
                  </div>
                  <button
                    onClick={() => {/* Remove address */}}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WithdrawalSecurity;
```

### Integration in Transfer Page

```typescript
// File: pages/Transfer.tsx (add before sending)

// Check whitelist before sending
const checkWhitelist = async () => {
  if (!userProfile?.id) return true;
  
  const result = await withdrawalWhitelistService.isWithdrawalAllowed({
    userId: userProfile.id,
    toAddress: recipientAddress,
    chain: selectedAsset
  });
  
  if (!result.allowed) {
    showToast(result.reason || 'Withdrawal not allowed', 'error');
    return false;
  }
  
  return true;
};

// In handleSend function:
const whitelistOk = await checkWhitelist();
if (!whitelistOk) return;
```

---

## Feature 2: Fund Password

### Database Migration

```sql
-- File: add_fund_password.sql

create table if not exists fund_passwords (
  user_id uuid primary key references wallet_users(id) on delete cascade,
  password_hash text not null, -- bcrypt hash
  salt text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fund_passwords enable row level security;

create policy "Users can manage their own fund password"
  on fund_passwords for all
  using (user_id = (select id from wallet_users where auth_user_id = auth.uid() limit 1));
```

### Service Layer

```typescript
// File: services/fundPasswordService.ts

import bcrypt from 'bcryptjs';
import { supabaseService } from './supabaseService';

class FundPasswordService {
  /**
   * Set fund password (first time)
   */
  async setFundPassword(params: {
    userId: string;
    fundPassword: string; // 6-digit PIN
  }): Promise<{ success: boolean; error?: string }> {
    // Validate PIN format
    if (!/^\d{6}$/.test(params.fundPassword)) {
      return { success: false, error: 'Fund password must be 6 digits' };
    }

    const client = supabaseService.getClient();
    if (!client) return { success: false, error: 'Database not available' };

    // Generate salt and hash
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(params.fundPassword, salt);

    const { error } = await client
      .from('fund_passwords')
      .upsert({
        user_id: params.userId,
        password_hash: hash,
        salt,
        failed_attempts: 0,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('[FundPassword] Error setting password:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Verify fund password
   */
  async verifyFundPassword(
    userId: string,
    fundPassword: string
  ): Promise<{ valid: boolean; attemptsRemaining?: number; lockedUntil?: string }> {
    const client = supabaseService.getClient();
    if (!client) return { valid: false };

    const { data, error } = await client
      .from('fund_passwords')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return { valid: false };
    }

    // Check if locked
    if (data.locked_until) {
      const lockedUntil = new Date(data.locked_until);
      if (lockedUntil > new Date()) {
        return { valid: false, lockedUntil: data.locked_until };
      }
    }

    // Verify password
    const valid = await bcrypt.compare(fundPassword, data.password_hash);

    if (valid) {
      // Reset failed attempts
      await client
        .from('fund_passwords')
        .update({ failed_attempts: 0, locked_until: null })
        .eq('user_id', userId);
      return { valid: true };
    } else {
      // Increment failed attempts
      const newAttempts = data.failed_attempts + 1;
      const maxAttempts = 5;
      
      if (newAttempts >= maxAttempts) {
        // Lock for 5 minutes
        const lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
        await client
          .from('fund_passwords')
          .update({
            failed_attempts: newAttempts,
            locked_until: lockedUntil.toISOString()
          })
          .eq('user_id', userId);
        return { valid: false, lockedUntil: lockedUntil.toISOString() };
      } else {
        await client
          .from('fund_passwords')
          .update({ failed_attempts: newAttempts })
          .eq('user_id', userId);
        return { valid: false, attemptsRemaining: maxAttempts - newAttempts };
      }
    }
  }

  /**
   * Check if fund password is set
   */
  async hasFundPassword(userId: string): Promise<boolean> {
    const client = supabaseService.getClient();
    if (!client) return false;

    const { data } = await client
      .from('fund_passwords')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    return !!data;
  }
}

export const fundPasswordService = new FundPasswordService();
```

---

## Feature 3: Anti-Phishing Code

### Database Migration

```sql
-- File: add_anti_phishing_code.sql

create table if not exists anti_phishing_codes (
  user_id uuid primary key references wallet_users(id) on delete cascade,
  code text not null check (length(code) between 4 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table anti_phishing_codes enable row level security;

create policy "Users can manage their own anti-phishing code"
  on anti_phishing_codes for all
  using (user_id = (select id from wallet_users where auth_user_id = auth.uid() limit 1));
```

### Service Layer

```typescript
// File: services/antiPhishingService.ts

import { supabaseService } from './supabaseService';

class AntiPhishingService {
  /**
   * Set anti-phishing code
   */
  async setCode(params: {
    userId: string;
    code: string;
  }): Promise<{ success: boolean; error?: string }> {
    // Validate code
    if (params.code.length < 4 || params.code.length > 10) {
      return { success: false, error: 'Code must be 4-10 characters' };
    }

    const client = supabaseService.getClient();
    if (!client) return { success: false, error: 'Database not available' };

    const { error } = await client
      .from('anti_phishing_codes')
      .upsert({
        user_id: params.userId,
        code: params.code.toUpperCase(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('[AntiPhishing] Error setting code:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Get user's anti-phishing code
   */
  async getCode(userId: string): Promise<string | null> {
    const client = supabaseService.getClient();
    if (!client) return null;

    const { data, error } = await client
      .from('anti_phishing_codes')
      .select('code')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data.code;
  }
}

export const antiPhishingService = new AntiPhishingService();
```

---

## Testing Checklist

### Withdrawal Whitelist
- [ ] Enable whitelist mode with 2FA
- [ ] Add address (should be pending for 24h)
- [ ] Try to withdraw to non-whitelisted address (should fail)
- [ ] Try to withdraw to pending address (should fail)
- [ ] Wait 24h and withdraw to verified address (should succeed)
- [ ] Remove address from whitelist
- [ ] Disable whitelist mode

### Fund Password
- [ ] Set fund password (6 digits)
- [ ] Verify correct password (should succeed)
- [ ] Verify wrong password (should fail, show attempts remaining)
- [ ] Fail 5 times (should lock for 5 minutes)
- [ ] Try during lockout (should show countdown)
- [ ] Change fund password with 2FA

### Anti-Phishing Code
- [ ] Set anti-phishing code
- [ ] Receive email with code displayed
- [ ] Verify code matches in email
- [ ] Change code
- [ ] Verify new code in next email

---

## Next Steps

1. **Review** this implementation guide
2. **Run** database migrations
3. **Implement** services layer
4. **Build** UI components
5. **Test** thoroughly
6. **Deploy** to production

**Estimated Timeline**: 7-9 days for all 3 features

---

**Document Version**: 1.0  
**Last Updated**: May 2, 2026
