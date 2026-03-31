# Wallet Security Audit Report
**RhizaCore Web Wallet - Comprehensive Security Analysis**

Date: March 24, 2026  
Auditor: Kiro AI Security Analysis  
Scope: Complete wallet codebase including cryptography, key management, transaction handling, and authentication

---

## Executive Summary

This audit examined the RhizaCore Web Wallet codebase with focus on security-critical components handling private keys, mnemonics, transactions, and user authentication. The wallet implements a multi-chain architecture supporting TON (24-word), and multi-chain wallets (12-word BIP39) with EVM, TON, and Bitcoin support via Tether WDK.

### Overall Security Rating: **MODERATE RISK** ⚠️

**Critical Issues Found:** 3  
**High-Risk Issues:** 5  
**Medium-Risk Issues:** 8  
**Low-Risk Issues:** 4

---

## Critical Security Issues 🔴

### 1. **Mnemonic Stored in Memory Without Clearing**
**Severity:** CRITICAL  
**Location:** `services/tonWalletService.ts`, `services/tetherWdkService.ts`

**Issue:**
```typescript
// tonWalletService.ts line 107
private mnemonic: string | null = null;

// tetherWdkService.ts line 77
private mnemonic: string | null = null;
```

The mnemonic phrase is stored as a class property and never explicitly cleared from memory. JavaScript doesn't provide memory zeroing, but the mnemonic remains accessible throughout the service lifetime.

**Risk:**
- Memory dumps could expose mnemonics
- XSS attacks could access service instances
- Browser extensions with memory access could steal keys

**Recommendation:**
```typescript
// Implement secure memory handling
private mnemonicBuffer: Uint8Array | null = null;

clearMnemonic() {
  if (this.mnemonicBuffer) {
    // Overwrite with random data before clearing
    crypto.getRandomValues(this.mnemonicBuffer);
    this.mnemonicBuffer.fill(0);
    this.mnemonicBuffer = null;
  }
}
```

### 2. **Device Fingerprinting for Encryption is Weak**
**Severity:** CRITICAL  
**Location:** `services/tonWalletService.ts` lines 72-88

**Issue:**
```typescript
async function generateDeviceKey(): Promise<string> {
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    'rhizacore_v1'
  ].join('|');
  // ... SHA-256 hash
}
```

**Problems:**
- User agent and screen resolution can change (browser updates, window resize)
- Timezone can change when traveling
- No entropy - completely deterministic
- Easily reproducible by attackers who know the user's browser

**Risk:**
- Session encryption can break on legitimate browser updates
- Attacker with same browser/screen can decrypt sessions
- No protection against targeted attacks

**Recommendation:**
```typescript
// Use Web Crypto API to generate and store a persistent device key
async function generateDeviceKey(): Promise<string> {
  let key = localStorage.getItem('rhiza_device_key');
  if (!key) {
    // Generate cryptographically secure random key
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    key = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem('rhiza_device_key', key);
  }
  return key;
}
```

### 3. **No Rate Limiting on Password Attempts (Client-Side Only)**
**Severity:** CRITICAL  
**Location:** `pages/WalletLogin.tsx` lines 18-42

**Issue:**
```typescript
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;
// ... stored in sessionStorage
```

**Problems:**
- Rate limiting is client-side only (sessionStorage)
- Attacker can bypass by:
  - Opening new browser tab
  - Using incognito mode
  - Clearing sessionStorage
  - Using different browser
- No server-side validation

**Risk:**
- Unlimited brute-force attempts on encrypted mnemonics
- With 100,000 PBKDF2 iterations, attacker can try ~1000 passwords/second
- Weak passwords can be cracked in hours

**Recommendation:**
```typescript
// Implement server-side rate limiting via Supabase
// Add failed_login_attempts and locked_until to wallet_users table
const { data, error } = await supabase.rpc('attempt_wallet_login', {
  wallet_id: walletId,
  max_attempts: 5,
  lockout_duration: 300 // 5 minutes
});

if (data.locked) {
  throw new Error(`Account locked until ${data.locked_until}`);
}
```

---

## High-Risk Security Issues 🟠

### 4. **Insufficient PBKDF2 Iterations**
**Severity:** HIGH  
**Location:** `utils/encryption.ts` line 10

**Issue:**
```typescript
const ITERATIONS = 100000; // PBKDF2 iterations
```

**Problem:**
- OWASP recommends 600,000 iterations for PBKDF2-SHA256 (2023)
- 100,000 iterations is outdated (circa 2016 recommendation)
- Modern GPUs can compute 100,000 iterations very quickly

**Risk:**
- Weak passwords vulnerable to brute-force
- GPU-accelerated attacks can try millions of passwords

**Recommendation:**
```typescript
const ITERATIONS = 600000; // OWASP 2023 recommendation
// Or migrate to Argon2id (more resistant to GPU attacks)
```

### 5. **No Mnemonic Validation on Import**
**Severity:** HIGH  
**Location:** `pages/ImportWallet.tsx`

**Issue:**
The import wallet flow doesn't validate BIP39 checksums before attempting to use the mnemonic.

**Risk:**
- Users might import invalid mnemonics
- Typos in mnemonics could lead to wrong wallet addresses
- No warning about invalid checksums

**Recommendation:**
```typescript
import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

// Before using mnemonic
if (!validateMnemonic(words.join(' '), wordlist)) {
  throw new Error('Invalid mnemonic checksum');
}
```

### 6. **Transaction Replay Risk Across Networks**
**Severity:** HIGH  
**Location:** `services/tonWalletService.ts` sendTransaction

**Issue:**
No chain ID validation or network-specific nonce management for multi-network support.

**Risk:**
- Transactions signed on testnet could potentially be replayed on mainnet
- No explicit network binding in transaction data

**Recommendation:**
```typescript
// Add network validation before signing
if (this.currentNetwork !== expectedNetwork) {
  throw new Error('Network mismatch - transaction rejected');
}

// Include network identifier in transaction comment
const networkTag = `[${this.currentNetwork}]`;
const fullComment = comment ? `${networkTag} ${comment}` : networkTag;
```

### 7. **Insufficient Transaction Fee Validation**
**Severity:** HIGH  
**Location:** `services/tonWalletService.ts` lines 285-295

**Issue:**
```typescript
const estimatedFee = 0.01; // Estimated gas fee in TON
if (currentBalance < amountNum + estimatedFee) {
  return { success: false, error: 'Insufficient balance' };
}
```

**Problems:**
- Hardcoded fee estimate (0.01 TON)
- No actual fee calculation before sending
- Network congestion could cause higher fees
- User might lose more TON than expected

**Risk:**
- Transaction failures due to insufficient gas
- Unexpected balance deductions
- Poor user experience

**Recommendation:**
```typescript
// Use actual fee estimation
const feeEstimate = await this.contract.estimateFee({
  seqno,
  messages: [/* ... */]
});

const actualFee = Number(feeEstimate) / 1e9;
if (currentBalance < amountNum + actualFee) {
  return {
    success: false,
    error: `Insufficient balance. Need ${actualFee.toFixed(4)} TON for fees`
  };
}
```

### 8. **XSS Vulnerability in Transaction Comments**
**Severity:** HIGH  
**Location:** `services/tonWalletService.ts` sendTransaction

**Issue:**
User-provided comments are not sanitized before being stored or displayed.

**Risk:**
- Malicious comments could contain XSS payloads
- When transaction history is displayed, scripts could execute
- Potential for phishing attacks via crafted comments

**Recommendation:**
```typescript
// Sanitize comment input
function sanitizeComment(comment: string): string {
  return comment
    .replace(/[<>]/g, '') // Remove HTML tags
    .substring(0, 100) // Limit length
    .trim();
}

const safeComment = comment ? sanitizeComment(comment) : '';
```

---

## Medium-Risk Security Issues 🟡

### 9. **Weak Password Requirements**
**Severity:** MEDIUM  
**Location:** `utils/encryption.ts` lines 115-133

**Issue:**
```typescript
if (password.length < 8) { /* ... */ }
if (!/[A-Z]/.test(password)) { /* ... */ }
// ... basic checks only
```

**Problems:**
- No check for common passwords
- No minimum entropy requirement
- Allows weak passwords like "Password1!"

**Recommendation:**
```typescript
// Add entropy calculation and common password check
import { zxcvbn } from 'zxcvbn'; // password strength estimator

export function validatePassword(password: string) {
  if (password.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters' };
  }
  
  const strength = zxcvbn(password);
  if (strength.score < 3) {
    return { valid: false, message: 'Password is too weak. ' + strength.feedback.warning };
  }
  
  // Check against common passwords
  const commonPasswords = ['password', '12345678', 'qwerty', /* ... */];
  if (commonPasswords.includes(password.toLowerCase())) {
    return { valid: false, message: 'This password is too common' };
  }
  
  return { valid: true, message: 'Password is strong' };
}
```

### 10. **Session Timeout Not Enforced**
**Severity:** MEDIUM  
**Location:** `services/tonWalletService.ts` sessionManager

**Issue:**
Sessions are stored indefinitely with no automatic expiration.

**Risk:**
- Stolen devices remain logged in forever
- No automatic logout after inactivity
- Increased window for attacks

**Recommendation:**
```typescript
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

async restoreSession(password: string) {
  const age = this.getSessionAge();
  if (age && age > SESSION_TIMEOUT) {
    this.clearSession();
    throw new Error('Session expired. Please log in again.');
  }
  // ... rest of restore logic
}
```

### 11. **No Content Security Policy (CSP)**
**Severity:** MEDIUM  
**Location:** `index.html`

**Issue:**
No CSP headers defined to prevent XSS attacks.

**Recommendation:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://tonapi.io https://toncenter.com https://*.supabase.co;
  img-src 'self' data: https:;
  font-src 'self' data:;
">
```

### 12. **Insufficient Input Validation on Addresses**
**Severity:** MEDIUM  
**Location:** `pages/Transfer.tsx`, `services/tonWalletService.ts`

**Issue:**
Address validation relies on `Address.parse()` which throws errors, but doesn't check for:
- Testnet vs mainnet address format
- Bounceable vs non-bounceable flags
- Address checksums

**Recommendation:**
```typescript
function validateTonAddress(address: string, network: NetworkType): boolean {
  try {
    const addr = Address.parse(address);
    
    // Check if address matches current network
    if (network === 'testnet' && addr.workChain !== -1) {
      throw new Error('Invalid testnet address');
    }
    
    // Verify checksum
    const normalized = addr.toString();
    if (normalized !== address) {
      console.warn('Address checksum mismatch');
    }
    
    return true;
  } catch {
    return false;
  }
}
```

### 13. **Wallet Manager Stores All Wallets in Single localStorage Key**
**Severity:** MEDIUM  
**Location:** `utils/walletManager.ts`

**Issue:**
```typescript
const STORAGE_KEY = 'rhiza_wallets';
localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
```

**Problems:**
- All encrypted wallets in one place
- If one wallet is compromised, attacker has access to all encrypted data
- No separation of concerns

**Recommendation:**
```typescript
// Store each wallet separately
static async addWallet(/* ... */) {
  const walletKey = `rhiza_wallet_${walletId}`;
  localStorage.setItem(walletKey, JSON.stringify(wallet));
  
  // Store only metadata in main index
  const index = this.getWalletIndex();
  index.push({ id: walletId, address, name, type });
  localStorage.setItem('rhiza_wallet_index', JSON.stringify(index));
}
```

### 14. **No Backup Verification**
**Severity:** MEDIUM  
**Location:** `pages/CreateWallet.tsx`

**Issue:**
Mnemonic verification only checks 3 random words, not the complete phrase.

**Risk:**
- Users might not have correctly written down all 24 words
- Typos in unverified words lead to wallet loss
- False sense of security

**Recommendation:**
```typescript
// Add optional full phrase verification
const [verificationMode, setVerificationMode] = useState<'quick' | 'full'>('quick');

if (verificationMode === 'full') {
  // Require user to re-enter all 24 words in order
  const allCorrect = mnemonic.every((word, idx) => 
    word === userInputs[idx].trim().toLowerCase()
  );
}
```

### 15. **Insufficient Logging for Security Events**
**Severity:** MEDIUM  
**Location:** Throughout codebase

**Issue:**
No security event logging for:
- Failed login attempts
- Wallet creation/import
- Large transactions
- Network switches
- Password changes

**Recommendation:**
```typescript
// Add security event logging
async function logSecurityEvent(event: {
  type: 'login_failed' | 'wallet_created' | 'large_tx' | 'network_switch';
  walletAddress: string;
  details: any;
}) {
  await supabase.from('security_events').insert({
    event_type: event.type,
    wallet_address: event.walletAddress,
    details: event.details,
    timestamp: new Date().toISOString(),
    user_agent: navigator.userAgent,
    ip_address: await fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(d => d.ip)
  });
}
```

### 16. **No Transaction Signing Confirmation UI**
**Severity:** MEDIUM  
**Location:** `pages/Transfer.tsx`

**Issue:**
Users can confirm transactions without seeing full details of what they're signing.

**Recommendation:**
Add a detailed confirmation screen showing:
- Exact amount in both native units and USD
- Full recipient address with checksum
- Estimated fees
- Network being used
- Transaction data hash
- "I understand this transaction is irreversible" checkbox

---

## Low-Risk Security Issues 🟢

### 17. **Console Logging Sensitive Data**
**Severity:** LOW  
**Location:** Multiple files

**Issue:**
```typescript
console.log(`✅ Wallet initialized: ${this.wallet.address.toString()}`);
console.log(`📝 Current seqno: ${seqno}`);
```

**Risk:**
- Sensitive data visible in browser console
- Could be captured by malicious extensions
- Debugging information leaks

**Recommendation:**
```typescript
// Use conditional logging
const DEBUG = import.meta.env.DEV;

if (DEBUG) {
  console.log(`✅ Wallet initialized: ${this.wallet.address.toString()}`);
}
```

### 18. **No Subresource Integrity (SRI)**
**Severity:** LOW  
**Location:** External dependencies

**Issue:**
No SRI hashes for external resources.

**Recommendation:**
```html
<script src="https://cdn.example.com/lib.js" 
        integrity="sha384-..." 
        crossorigin="anonymous"></script>
```

### 19. **Wallet Names Not Sanitized**
**Severity:** LOW  
**Location:** `utils/walletManager.ts`

**Issue:**
User-provided wallet names are not sanitized.

**Recommendation:**
```typescript
static renameWallet(walletId: string, newName: string): boolean {
  const sanitized = newName
    .replace(/[<>]/g, '')
    .substring(0, 50)
    .trim();
  
  if (!sanitized) return false;
  // ... rest of logic
}
```

### 20. **No Phishing Protection**
**Severity:** LOW  
**Location:** General architecture

**Issue:**
No warnings about phishing sites or address verification.

**Recommendation:**
- Add domain verification on load
- Show security indicators
- Warn users about clipboard hijacking
- Implement address book with verified contacts

---

## Positive Security Practices ✅

The codebase implements several good security practices:

1. **Strong Encryption**: AES-256-GCM with proper IV and salt generation
2. **No Plaintext Storage**: Mnemonics are always encrypted before storage
3. **Password Validation**: Basic strength requirements enforced
4. **Mnemonic Verification**: Users must verify backup before proceeding
5. **Transaction Confirmation**: Two-step process for sending funds
6. **Network Separation**: Mainnet and testnet properly separated
7. **Fee Guards**: Maximum fee limits prevent runaway gas costs (WDK service)
8. **Bounce Protection**: Non-bounceable transfers prevent fund loss
9. **Multi-Wallet Support**: Proper isolation between wallets
10. **Session Encryption**: Sessions are encrypted, not stored in plaintext

---

## Recommendations Priority

### Immediate (Fix within 1 week):
1. Implement server-side rate limiting for login attempts
2. Increase PBKDF2 iterations to 600,000
3. Fix device fingerprinting encryption key generation
4. Add BIP39 mnemonic validation on import
5. Sanitize transaction comments and wallet names

### Short-term (Fix within 1 month):
6. Implement session timeout and auto-logout
7. Add proper transaction fee estimation
8. Implement security event logging
9. Add Content Security Policy headers
10. Improve address validation with network checks

### Medium-term (Fix within 3 months):
11. Implement secure memory clearing for mnemonics
12. Add full mnemonic backup verification option
13. Separate wallet storage (one key per wallet)
14. Add transaction signing confirmation UI
15. Implement phishing protection measures

### Long-term (Consider for future):
16. Migrate to Argon2id for password hashing
17. Implement hardware wallet support
18. Add multi-signature wallet support
19. Implement social recovery mechanisms
20. Add biometric authentication support

---

## Testing Recommendations

1. **Penetration Testing**: Hire external security firm for full audit
2. **Fuzzing**: Test encryption/decryption with malformed inputs
3. **Brute-Force Testing**: Verify rate limiting effectiveness
4. **XSS Testing**: Test all user inputs for script injection
5. **Network Testing**: Verify transaction replay protection
6. **Memory Analysis**: Check for mnemonic leaks in memory dumps
7. **Browser Extension Testing**: Test with malicious extensions installed

---

## Compliance Considerations

- **GDPR**: Ensure user data (addresses, transactions) can be deleted
- **PCI DSS**: Not applicable (no credit card data)
- **SOC 2**: Consider for enterprise customers
- **Bug Bounty**: Launch program to incentivize security research

---

## Conclusion

The RhizaCore Web Wallet demonstrates solid foundational security practices but has several critical vulnerabilities that need immediate attention. The most pressing issues are:

1. Client-side only rate limiting (enables brute-force attacks)
2. Weak device fingerprinting for session encryption
3. Outdated PBKDF2 iteration count
4. Lack of mnemonic validation on import

Addressing these issues will significantly improve the wallet's security posture. The development team should prioritize the "Immediate" recommendations and establish a regular security review process.

**Overall Assessment**: The wallet is functional but requires security hardening before production deployment with real user funds.

---

*End of Security Audit Report*
