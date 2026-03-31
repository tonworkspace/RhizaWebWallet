# Secure Secret Manager - Developer Guide

Quick reference for using the new secure secret management system.

---

## Overview

The `SecureSecretManager` provides secure storage and memory management for sensitive data like mnemonics and private keys. It addresses critical security vulnerabilities by:

- ✅ Storing secrets in encrypted form (localStorage)
- ✅ Caching in secure memory with auto-expiration (5 minutes)
- ✅ Overwriting memory with random data before clearing
- ✅ Automatic cleanup on page unload
- ✅ Per-wallet isolation

---

## Basic Usage

### Import

```typescript
import { secureSecretManager } from './services/secureSecretManager';
```

### Store a Mnemonic

```typescript
const walletId = 'wallet_abc123';
const mnemonic = ['word1', 'word2', /* ... */, 'word24'];
const password = 'UserPassword123!';

const result = await secureSecretManager.storeMnemonic(
  walletId,
  mnemonic,
  password
);

if (result.success) {
  console.log('Mnemonic stored securely');
} else {
  console.error('Failed to store:', result.error);
}
```

### Retrieve a Mnemonic

```typescript
const result = await secureSecretManager.getMnemonic(
  walletId,
  password
);

if (result.success && result.mnemonic) {
  // Use mnemonic
  const words = result.mnemonic;
  
  // Mnemonic is now cached in secure memory for 5 minutes
} else {
  console.error('Failed to retrieve:', result.error);
}
```

### Clear from Memory (Keep in Storage)

```typescript
// Clear from memory but keep encrypted copy in localStorage
secureSecretManager.clearMemory(walletId);
```

### Delete Completely

```typescript
// Remove from both memory and storage
secureSecretManager.deleteSecret(walletId);
```

---

## Integration Examples

### TON Wallet Service

```typescript
// In tonWalletService.ts
async initializeWallet(mnemonic: string[], password?: string, walletId?: string) {
  // ... initialize wallet ...
  
  const effectiveWalletId = walletId || `wallet_${address.slice(0, 8)}`;
  this.currentWalletId = effectiveWalletId;
  
  // Store in secure manager
  if (password) {
    await secureSecretManager.storeMnemonic(
      effectiveWalletId,
      mnemonic,
      password
    );
  }
  
  return { success: true, address };
}

logout() {
  // Clear from memory
  if (this.currentWalletId) {
    secureSecretManager.clearMemory(this.currentWalletId);
  }
  
  // Overwrite keypair
  if (this.keyPair?.secretKey) {
    crypto.getRandomValues(this.keyPair.secretKey);
  }
  
  this.keyPair = null;
  this.wallet = null;
  this.contract = null;
  this.currentWalletId = null;
}
```

### Multi-Chain WDK Service

```typescript
// In tetherWdkService.ts
async initializeManagers(seedPhrase: string, walletId?: string, password?: string) {
  const effectiveWalletId = walletId || `multichain_${Date.now()}`;
  this.currentWalletId = effectiveWalletId;
  
  // Store in secure manager
  if (password) {
    const mnemonicArray = seedPhrase.split(' ');
    await secureSecretManager.storeMnemonic(
      effectiveWalletId,
      mnemonicArray,
      password
    );
  }
  
  // Initialize managers (seedPhrase NOT stored in class)
  this.evmManager = new WalletManagerEvm(seedPhrase, config);
  // ... etc
  
  // seedPhrase will be garbage collected after this function
}

logout() {
  if (this.currentWalletId) {
    secureSecretManager.clearMemory(this.currentWalletId);
  }
  
  // Dispose WDK managers
  this.evmManager?.dispose();
  this.tonManager?.dispose();
  this.btcManager?.dispose();
  
  // Clear references
  this.evmManager = null;
  this.tonManager = null;
  this.btcManager = null;
  this.currentWalletId = null;
}
```

---

## Advanced Features

### Check if Secret Exists

```typescript
if (secureSecretManager.hasMnemonic(walletId)) {
  console.log('Mnemonic exists for this wallet');
}
```

### Get Metadata Without Decrypting

```typescript
const metadata = secureSecretManager.getMetadata(walletId);
if (metadata) {
  console.log('Created:', new Date(metadata.createdAt));
  console.log('Last accessed:', new Date(metadata.lastAccessed));
  console.log('Type:', metadata.type);
}
```

### Update Password

```typescript
const result = await secureSecretManager.updatePassword(
  walletId,
  oldPassword,
  newPassword
);

if (result.success) {
  console.log('Password updated successfully');
}
```

### Clear All Secrets

```typescript
// Clear all from memory only
secureSecretManager.clearAllMemory();

// Clear all from memory AND storage
secureSecretManager.clearAllSecrets();
```

---

## Security Features

### 1. Automatic Memory Clearing

Secrets are automatically cleared from memory after 5 minutes of inactivity:

```typescript
// Stored at 10:00:00
secureSecretManager.storeMnemonic(walletId, mnemonic, password);

// Still in memory at 10:04:59
const result = await secureSecretManager.getMnemonic(walletId, password);
// ✅ Retrieved from memory cache (fast)

// Automatically cleared at 10:05:00
// Next access will decrypt from storage (slower but secure)
```

### 2. Touch to Reset Timer

When you retrieve a secret, the auto-clear timer resets:

```typescript
// 10:00:00 - Store secret
secureSecretManager.storeMnemonic(walletId, mnemonic, password);

// 10:04:00 - Access secret (timer resets)
await secureSecretManager.getMnemonic(walletId, password);

// 10:08:59 - Still in memory (5 min from last access)
// 10:09:00 - Cleared (5 min after 10:04:00)
```

### 3. Secure Overwriting

Before clearing, memory is overwritten with random data:

```typescript
// Internal implementation
clear(key: string): void {
  const buffer = this.secrets.get(key);
  if (buffer) {
    // Overwrite with random data
    crypto.getRandomValues(buffer);
    // Then zero out
    buffer.fill(0);
    // Finally delete reference
    this.secrets.delete(key);
  }
}
```

### 4. Page Unload Protection

All secrets are automatically cleared when the page unloads:

```typescript
// Automatically registered in constructor
window.addEventListener('beforeunload', () => {
  this.clearAllSecrets();
});
```

---

## Best Practices

### ✅ DO

1. **Always provide a password when storing**
   ```typescript
   await secureSecretManager.storeMnemonic(walletId, mnemonic, password);
   ```

2. **Clear memory on logout**
   ```typescript
   logout() {
     secureSecretManager.clearMemory(this.currentWalletId);
     // ... other cleanup
   }
   ```

3. **Use unique wallet IDs**
   ```typescript
   const walletId = `wallet_${address}_${Date.now()}`;
   ```

4. **Handle errors gracefully**
   ```typescript
   const result = await secureSecretManager.getMnemonic(walletId, password);
   if (!result.success) {
     // Show user-friendly error
     showToast(result.error || 'Failed to access wallet', 'error');
   }
   ```

### ❌ DON'T

1. **Don't store mnemonics in component state**
   ```typescript
   // ❌ BAD
   const [mnemonic, setMnemonic] = useState<string[]>([]);
   
   // ✅ GOOD - retrieve only when needed
   const getMnemonicWhenNeeded = async () => {
     const result = await secureSecretManager.getMnemonic(walletId, password);
     return result.mnemonic;
   };
   ```

2. **Don't keep mnemonics in memory longer than necessary**
   ```typescript
   // ❌ BAD
   class MyService {
     private mnemonic: string[] = [];
   }
   
   // ✅ GOOD - use secure secret manager
   class MyService {
     private currentWalletId: string | null = null;
   }
   ```

3. **Don't log sensitive data**
   ```typescript
   // ❌ BAD
   console.log('Mnemonic:', mnemonic);
   
   // ✅ GOOD
   console.log('Mnemonic loaded successfully');
   ```

4. **Don't skip password validation**
   ```typescript
   // ❌ BAD
   await secureSecretManager.storeMnemonic(walletId, mnemonic, weakPassword);
   
   // ✅ GOOD
   const validation = validatePassword(password);
   if (!validation.valid) {
     throw new Error(validation.message);
   }
   await secureSecretManager.storeMnemonic(walletId, mnemonic, password);
   ```

---

## Performance Considerations

### Memory Cache Benefits

First access (cold):
```typescript
// Decrypts from localStorage (600,000 PBKDF2 iterations)
const result = await secureSecretManager.getMnemonic(walletId, password);
// Takes ~600ms
```

Subsequent accesses (warm):
```typescript
// Retrieved from memory cache
const result = await secureSecretManager.getMnemonic(walletId, password);
// Takes ~1ms (600x faster!)
```

### When to Clear Memory

Clear memory when:
- ✅ User logs out
- ✅ User switches wallets
- ✅ User locks the app
- ✅ Sensitive operation completes

Don't clear memory when:
- ❌ User navigates between pages
- ❌ User performs multiple transactions
- ❌ User views wallet details

---

## Migration from Old System

### Before (Insecure)

```typescript
class TonWalletService {
  private mnemonic: string | null = null;
  
  async initializeWallet(mnemonic: string[]) {
    this.mnemonic = mnemonic.join(' '); // ❌ Stored indefinitely
    // ...
  }
  
  logout() {
    this.mnemonic = null; // ❌ Not securely cleared
  }
}
```

### After (Secure)

```typescript
class TonWalletService {
  private currentWalletId: string | null = null;
  
  async initializeWallet(mnemonic: string[], password: string, walletId: string) {
    this.currentWalletId = walletId;
    
    // ✅ Stored securely
    await secureSecretManager.storeMnemonic(walletId, mnemonic, password);
    
    // Use mnemonic for initialization
    // It will be garbage collected after this function
  }
  
  logout() {
    // ✅ Securely cleared
    if (this.currentWalletId) {
      secureSecretManager.clearMemory(this.currentWalletId);
    }
    this.currentWalletId = null;
  }
}
```

---

## Troubleshooting

### "Secret not found" Error

```typescript
// Check if secret exists
if (!secureSecretManager.hasMnemonic(walletId)) {
  console.error('No secret stored for this wallet');
  // Prompt user to import wallet
}
```

### "Invalid password" Error

```typescript
const result = await secureSecretManager.getMnemonic(walletId, password);
if (!result.success && result.error?.includes('password')) {
  // Show password retry UI
  showPasswordPrompt();
}
```

### Memory Not Clearing

```typescript
// Force clear if needed
secureSecretManager.clearMemory(walletId);

// Or clear all
secureSecretManager.clearAllMemory();
```

---

## Testing

### Unit Test Example

```typescript
describe('SecureSecretManager', () => {
  it('should store and retrieve mnemonic', async () => {
    const walletId = 'test_wallet';
    const mnemonic = ['word1', 'word2', /* ... */];
    const password = 'TestPassword123!';
    
    // Store
    const storeResult = await secureSecretManager.storeMnemonic(
      walletId,
      mnemonic,
      password
    );
    expect(storeResult.success).toBe(true);
    
    // Retrieve
    const getResult = await secureSecretManager.getMnemonic(
      walletId,
      password
    );
    expect(getResult.success).toBe(true);
    expect(getResult.mnemonic).toEqual(mnemonic);
    
    // Cleanup
    secureSecretManager.deleteSecret(walletId);
  });
});
```

---

## API Reference

### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `storeMnemonic` | `walletId, mnemonic[], password` | `Promise<{success, error?}>` | Store mnemonic securely |
| `getMnemonic` | `walletId, password` | `Promise<{success, mnemonic?, error?}>` | Retrieve mnemonic |
| `hasMnemonic` | `walletId` | `boolean` | Check if exists |
| `clearMemory` | `walletId` | `void` | Clear from memory only |
| `deleteSecret` | `walletId` | `void` | Delete completely |
| `clearAllMemory` | - | `void` | Clear all from memory |
| `clearAllSecrets` | - | `void` | Delete all secrets |
| `getMetadata` | `walletId` | `SecretMetadata \| null` | Get metadata |
| `updatePassword` | `walletId, oldPassword, newPassword` | `Promise<{success, error?}>` | Change password |

---

## Support

For questions or issues:
- Review: `WALLET_SECURITY_AUDIT_REPORT.md`
- Implementation: `services/secureSecretManager.ts`
- Improvements: `SECURITY_IMPROVEMENTS_IMPLEMENTED.md`

---

*Last Updated: March 24, 2026*
