# BIP39 Import Fix

**Issue:** Missing specifier error when importing wordlist from `@scure/bip39`

**Error Message:**
```
[plugin:vite:import-analysis] Missing "./wordlists/english" specifier in "@scure/bip39" package
```

## Root Cause

The `@scure/bip39` package (v2.0.1) uses ES modules and requires the `.js` extension in the import path for wordlist files.

## Solution

**Before (Incorrect):**
```typescript
import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
```

**After (Correct):**
```typescript
import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
```

## Package Exports

From `@scure/bip39/package.json`:
```json
{
  "exports": {
    ".": "./index.js",
    "./wordlists/english.js": "./wordlists/english.js",
    "./wordlists/french.js": "./wordlists/french.js",
    // ... other wordlists
  }
}
```

The package explicitly exports wordlist files with the `.js` extension, so the import path must include it.

## Files Modified

- `pages/ImportWallet.tsx` - Fixed wordlist import

## Status

✅ **FIXED** - Import now works correctly with Vite's ES module resolution

---

*Fix applied: March 25, 2026*
