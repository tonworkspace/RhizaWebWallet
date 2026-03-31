# Encryption Migration Guide

**Automatic Migration from 100k to 600k PBKDF2 Iterations**

---

## Overview

We've upgraded the wallet encryption from 100,000 to 600,000 PBKDF2 iterations (OWASP 2023 standard) while maintaining **full backward compatibility**. Old wallets will continue to work and will be automatically migrated on first login.

---

## How It Works

### Version Detection

Encrypted data now includes a version byte:
- **Version 1 (Legacy):** No version byte, 100,000 iterations
- **Version 2 (New):** Version byte = 2, 600,000 iterations

### Automatic Migration

When a user logs in with a legacy wallet:

1. **Detection:** System detects Version 1 format
2. **Decryption:** Decrypts using 100,000 iterations (works normally)
3. **Migration:** Automatically re-encrypts with 600,000 iterations
4. **Storage:** Saves new encrypted data (Version 2)
5. **Notification:** Logs migration success

**User Experience:**
- ✅ No action required from users
- ✅ Login works exactly as before
- ✅ Slightly slower first login (~500ms extra)
- ✅ Subsequent logins use new format (faster)

---

## Technical Details

### Encryption Format

**Version 1 (Legacy):**
```
[salt (16 bytes)][iv (12 bytes)][encrypted data]
```

**Version 2 (New):**
```
[version (1 byte)][salt (16 bytes)][iv (12 bytes)][encrypted data]
```

### Code Example

```typescript
// Encryption (always uses new format)
const encrypted = await encryptMnemonic(mnemonic, password);
// Result: Version 2 format with 600k iterations

// Decryption (auto-detects version)
const mnemonic = await decryptMnemonic(encrypted, password);
// Works with both Version 1 and Version 2

// Check if migration needed
const needsUpgrade = needsMigration(encrypted);
// Returns true for Version 1, false for Version 2

// Manual migration (usually automatic)
const result = await migrateEncryption(encrypted, password);
// Decrypts with old format, re-encrypts with new format
```

---

## Migration Scenarios

### Scenario 1: Existing User Logs In

**Before:**
- Wallet encrypted with 100k iterations (Version 1)
- User enters password

**Process:**
1. System detects Version 1 format
2. Decrypts with 100k iterations ✅
3. Logs: "🔄 Legacy wallet detected (100k iterations). Will auto-migrate on next save."
4. Re-encrypts with 600k iterations
5. Saves new encrypted data
6. Logs: "✅ Wallet migrated successfully"

**After:**
- Wallet now encrypted with 600k iterations (Version 2)
- Future logins use new format

**Time Impact:**
- First login: ~600ms (decrypt 100k + encrypt 600k)
- Subsequent logins: ~600ms (decrypt 600k only)

---

### Scenario 2: New User Creates Wallet

**Process:**
1. User creates new wallet
2. System encrypts with 600k iterations (Version 2)
3. Saves encrypted data

**Result:**
- Wallet immediately uses new format
- No migration needed

---

### Scenario 3: User Has Multiple Wallets

**Process:**
1. User logs into Wallet A (Version 1) → Auto-migrates to Version 2
2. User switches to Wallet B (Version 1) → Auto-migrates to Version 2
3. User switches to Wallet C (Version 2) → No migration needed

**Result:**
- All wallets gradually migrate to Version 2
- Each wallet migrates on first access

---

### Scenario 4: Session Restore

**Process:**
1. User has active session (Version 1)
2. Page refresh triggers session restore
3. System detects Version 1 format
4. Decrypts with 100k iterations
5. Auto-migrates to Version 2
6. Saves new session data

**Result:**
- Session upgraded to Version 2
- Future restores use new format

---

## Migration Locations

Migration happens automatically in these places:

### 1. Wallet Manager (`utils/walletManager.ts`)

```typescript
static async getWalletMnemonic(walletId: string, password: string) {
  // ... get wallet ...
  
  // Check if migration needed
  const needsUpgrade = needsMigration(wallet.encryptedMnemonic);
  
  // Decrypt (works with both formats)
  const mnemonic = await decryptMnemonic(wallet.encryptedMnemonic, password);
  
  // Auto-migrate if needed
  if (needsUpgrade) {
    const migrationResult = await migrateEncryption(wallet.encryptedMnemonic, password);
    if (migrationResult.success) {
      wallet.encryptedMnemonic = migrationResult.newEncryptedData;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
    }
  }
  
  return { success: true, mnemonic, migrated: needsUpgrade };
}
```

### 2. Session Manager (`services/tonWalletService.ts`)

```typescript
restoreSession: async (password: string) => {
  const encrypted = localStorage.getItem('rhiza_session');
  
  // Check if migration needed
  const needsUpgrade = needsMigration(encrypted);
  
  // Decrypt
  const mnemonic = await decryptMnemonic(encrypted, password);
  
  // Auto-migrate
  if (needsUpgrade) {
    const migrationResult = await migrateEncryption(encrypted, password);
    if (migrationResult.success) {
      localStorage.setItem('rhiza_session', migrationResult.newEncryptedData);
    }
  }
  
  return mnemonic;
}
```

### 3. Secondary Wallet (`services/tetherWdkService.ts`)

```typescript
async getStoredWallet(password?: string) {
  const stored = localStorage.getItem(SECONDARY_WALLET_KEY);
  
  // Check if migration needed
  const needsUpgrade = needsMigration(stored);
  
  // Decrypt
  const decrypted = await decryptMnemonic(stored, password);
  
  // Auto-migrate
  if (needsUpgrade) {
    const migrationResult = await migrateEncryption(stored, password);
    if (migrationResult.success) {
      localStorage.setItem(SECONDARY_WALLET_KEY, migrationResult.newEncryptedData);
    }
  }
  
  return decrypted.join(' ');
}
```

---

## Testing Migration

### Test Case 1: Legacy Wallet Login

```typescript
// Setup: Create legacy wallet (Version 1)
const legacyEncrypted = createLegacyEncryption(mnemonic, password);
localStorage.setItem('rhiza_wallets', JSON.stringify([{
  id: 'test_wallet',
  encryptedMnemonic: legacyEncrypted,
  // ... other fields
}]));

// Test: Login with legacy wallet
const result = await WalletManager.getWalletMnemonic('test_wallet', password);

// Verify
expect(result.success).toBe(true);
expect(result.migrated).toBe(true);
expect(result.mnemonic).toEqual(mnemonic);

// Verify storage updated
const wallets = JSON.parse(localStorage.getItem('rhiza_wallets'));
const wallet = wallets.find(w => w.id === 'test_wallet');
expect(needsMigration(wallet.encryptedMnemonic)).toBe(false);
```

### Test Case 2: New Wallet (No Migration)

```typescript
// Setup: Create new wallet (Version 2)
await WalletManager.addWallet(mnemonic, password, address);

// Test: Login
const result = await WalletManager.getWalletMnemonic(walletId, password);

// Verify
expect(result.success).toBe(true);
expect(result.migrated).toBe(false); // No migration needed
```

### Test Case 3: Wrong Password

```typescript
// Setup: Legacy wallet
const legacyEncrypted = createLegacyEncryption(mnemonic, password);

// Test: Wrong password
const result = await decryptMnemonic(legacyEncrypted, 'wrong_password');

// Verify
expect(result).toThrow('Failed to decrypt mnemonic');
```

---

## Performance Impact

### Encryption Performance

| Operation | Version 1 | Version 2 | Difference |
|-----------|-----------|-----------|------------|
| Encrypt | ~100ms | ~600ms | +500ms |
| Decrypt | ~100ms | ~600ms | +500ms |

### Migration Performance

| Scenario | Time | Operations |
|----------|------|------------|
| First login (legacy) | ~700ms | Decrypt (100ms) + Encrypt (600ms) |
| Subsequent logins | ~600ms | Decrypt (600ms) only |
| New wallet creation | ~600ms | Encrypt (600ms) only |

**Note:** Times are approximate and vary by device CPU.

---

## Monitoring Migration

### Console Logs

**Legacy wallet detected:**
```
🔄 Legacy wallet detected (100k iterations). Will auto-migrate on next save.
```

**Migration in progress:**
```
🔄 Migrating wallet encryption to 600k iterations...
🔄 Auto-migrating wallet to new encryption format...
```

**Migration success:**
```
✅ Wallet encryption migrated successfully
✅ Wallet migrated successfully
```

**Migration failure (non-critical):**
```
⚠️ Migration failed, but wallet still accessible: [error]
```

### Analytics Events (Optional)

You can add analytics to track migration:

```typescript
// In migrateEncryption function
if (needsMigration(encryptedData)) {
  analytics.track('wallet_migration_started', {
    timestamp: Date.now()
  });
  
  // ... migration logic ...
  
  if (success) {
    analytics.track('wallet_migration_completed', {
      timestamp: Date.now(),
      duration: Date.now() - startTime
    });
  }
}
```

---

## Rollback Plan

If issues arise, you can rollback by reverting the encryption changes:

### Step 1: Revert Code

```bash
git revert <commit-hash>
```

### Step 2: Users with Migrated Wallets

Users who already migrated will need to:
1. Export their wallet (mnemonic phrase)
2. Delete the wallet
3. Re-import with the old version

**Note:** This is why we keep backward compatibility - to avoid this scenario!

---

## FAQ

### Q: Will old users lose access to their wallets?
**A:** No. The system automatically detects and decrypts legacy wallets, then migrates them seamlessly.

### Q: What if migration fails?
**A:** The wallet remains accessible with the old format. Migration is attempted again on next login.

### Q: Can I force migration for all wallets?
**A:** Migration happens automatically on first access. You can't force it without user passwords.

### Q: How do I know if my wallet is migrated?
**A:** Check the console logs. You'll see "✅ Wallet migrated successfully" on first login after the update.

### Q: Does this affect wallet addresses?
**A:** No. Only the encryption changes. The mnemonic and derived addresses remain identical.

### Q: What about exported backups?
**A:** Exported mnemonics are plaintext and unaffected. Re-importing will use the new encryption format.

### Q: Can I downgrade to the old version?
**A:** Yes, but wallets migrated to Version 2 won't work with old code. Keep backups before upgrading.

---

## Security Considerations

### Why 600,000 Iterations?

- **OWASP 2023 Recommendation:** Current standard for PBKDF2-SHA256
- **Brute-Force Protection:** 6x more expensive to crack than 100k
- **GPU Resistance:** Significantly increases time for GPU-accelerated attacks
- **Future-Proof:** Aligns with current security best practices

### Migration Security

- **No Plaintext Storage:** Mnemonic never stored unencrypted during migration
- **Atomic Updates:** Migration either succeeds completely or fails safely
- **Password Required:** Migration only happens with correct password
- **Backward Compatible:** Old format still works if migration fails

---

## Support

For issues or questions:
- Review: `WALLET_SECURITY_AUDIT_REPORT.md`
- Implementation: `utils/encryption.ts`
- Status: `SECURITY_AUDIT_STATUS.md`

---

*Last Updated: March 24, 2026*  
*Migration Version: 1.0*
