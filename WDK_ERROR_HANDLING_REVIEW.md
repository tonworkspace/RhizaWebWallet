# WDK Error Handling Review & Improvements

**Review of `services/tetherWdkService.ts`**

---

## Executive Summary

**Overall Rating:** Good (7/10)

The service has solid error handling foundations but can be improved with:
1. More specific error types and codes
2. Better retry logic for transient failures
3. Enhanced validation before operations
4. Structured error responses
5. Better balance checking before transactions

---

## Current Strengths ✅

1. **Good error classification** - `wdkErrorMessage()` function categorizes errors well
2. **Timeout protection** - `withTimeout()` prevents UI freezing
3. **Graceful degradation** - Accounts can fail individually without breaking initialization
4. **Dispose pattern** - Properly clears keys on logout
5. **Fee guards** - `transferMaxFee` prevents runaway gas costs

---

## Issues & Improvements

### 1. Missing Balance Validation Before Transactions

**Issue:** Transactions don't check balance + fees before sending

**Current Code:**
```typescript
async sendEvmTransaction(toAddress: string, amount: string) {
  if (!this.evmAccount) {
    return { success: false, error: 'EVM wallet not initialized' };
  }
  try {
    const amountWei = ethers.parseEther(amount);
    const result = await this.evmAccount.sendTransaction({ to: toAddress, value: amountWei });
    return { success: true, txHash: result.hash, fee: formatUnits(result.fee.toString(), 18) };
  } catch (error: any) {
    return { success: false, error: wdkErrorMessage(error, 'EVM') };
  }
}
```

**Problem:** User doesn't know if they have enough balance until transaction fails

**Improved Code:**
```typescript
async sendEvmTransaction(toAddress: string, amount: string): Promise<{ 
  success: boolean; 
  txHash?: string; 
  fee?: string; 
  error?: string;
  errorCode?: string;
}> {
  if (!this.evmAccount) {
    return { 
      success: false, 
      error: 'EVM wallet not initialized',
      errorCode: 'WALLET_NOT_INITIALIZED'
    };
  }
  
  try {
    const amountWei = ethers.parseEther(amount);
    
    // 1. Validate address format
    if (!ethers.isAddress(toAddress)) {
      return {
        success: false,
        error: 'Invalid recipient address format',
        errorCode: 'INVALID_ADDRESS'
      };
    }
    
    // 2. Quote transaction to get fee estimate
    const quote = await this.evmAccount.quoteSendTransaction({ 
      to: toAddress, 
      value: amountWei 
    });
    
    // 3. Check balance
    const balance = await this.evmAccount.getBalance();
    const totalRequired = amountWei + quote.fee;
    
    if (balance < totalRequired) {
      const balanceEth = formatUnits(balance.toString(), 18);
      const requiredEth = formatUnits(totalRequired.toString(), 18);
      const feeEth = formatUnits(quote.fee.toString(), 18);
      
      return {
        success: false,
        error: `Insufficient balance. You have ${balanceEth} ETH but need ${requiredEth} ETH (${amount} + ${feeEth} fee)`,
        errorCode: 'INSUFFICIENT_BALANCE'
      };
    }
    
    // 4. Send transaction
    const result = await this.evmAccount.sendTransaction({ 
      to: toAddress, 
      value: amountWei 
    });
    
    return {
      success: true,
      txHash: result.hash,
      fee: formatUnits(result.fee.toString(), 18)
    };
  } catch (error: any) {
    const errorMsg = wdkErrorMessage(error, 'EVM');
    return { 
      success: false, 
      error: errorMsg,
      errorCode: this.getErrorCode(error)
    };
  }
}

// Helper to extract error codes
private getErrorCode(error: any): string {
  const msg = error?.message || String(error);
  
  if (msg.includes('insufficient funds')) return 'INSUFFICIENT_BALANCE';
  if (msg.includes('max fee')) return 'FEE_TOO_HIGH';
  if (msg.includes('nonce')) return 'NONCE_CONFLICT';
  if (msg.includes('network')) return 'NETWORK_ERROR';
  if (msg.includes('invalid address')) return 'INVALID_ADDRESS';
  if (msg.includes('rejected')) return 'USER_REJECTED';
  
  return 'UNKNOWN_ERROR';
}
```

---

### 2. No Retry Logic for Transient Failures

**Issue:** Network errors fail immediately without retry

**Current Code:**
```typescript
async getBalances() {
  // ...
  try {
    const evmBalanceWei = await this.evmAccount.getBalance();
    evmBalance = formatUnits(evmBalanceWei.toString(), 18);
  } catch(e) { 
    console.error('EVM Balance Error', e); 
  }
  // ...
}
```

**Problem:** Temporary network issues cause permanent failures

**Improved Code:**
```typescript
// Add retry utility
private async withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoff?: boolean;
    retryableErrors?: string[];
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoff = true,
    retryableErrors = ['network', 'timeout', 'fetch', 'ECONNREFUSED']
  } = options;
  
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message || String(error);
      
      // Check if error is retryable
      const isRetryable = retryableErrors.some(pattern => 
        errorMsg.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = backoff ? delayMs * Math.pow(2, attempt) : delayMs;
      console.warn(`[WDK] Retry ${attempt + 1}/${maxRetries} after ${delay}ms:`, errorMsg);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Use in getBalances
async getBalances() {
  if (!this.evmAccount || !this.tonAccount || !this.btcAccount) return null;

  let evmBalance = '0.0000';
  let tonBalance = '0.0000';
  let btcBalance = '0.00000000';

  try {
    const evmBalanceWei = await this.withRetry(
      () => this.evmAccount.getBalance(),
      { maxRetries: 3, delayMs: 1000 }
    );
    evmBalance = formatUnits(evmBalanceWei.toString(), 18);
  } catch(e) { 
    console.error('EVM Balance Error (after retries):', e); 
  }

  try {
    const tonBalanceNano = await this.withRetry(
      () => this.tonAccount.getBalance(),
      { maxRetries: 3, delayMs: 1000 }
    );
    tonBalance = (Number(tonBalanceNano) / 1e9).toFixed(4);
  } catch(e) { 
    console.error('TON Balance Error (after retries):', e); 
  }

  try {
    const btcBalanceSats = await this.withRetry(
      () => this.btcAccount.getBalance(),
      { maxRetries: 2, delayMs: 2000 } // BTC slower, fewer retries
    );
    btcBalance = (Number(btcBalanceSats) / 1e8).toFixed(8);
  } catch(e) { 
    console.error('BTC Balance Error (after retries):', e); 
  }

  return { evmBalance, tonBalance, btcBalance };
}
```

---

### 3. Initialization Errors Not Propagated Properly

**Issue:** Initialization failures are caught but not reported to caller

**Current Code:**
```typescript
this.evmAccount = await withTimeout(this.evmManager.getAccount(0), 10000, 'EVM Account').catch((e: Error) => {
  console.warn('EVM Init Failed:', e);
  return null;
});
```

**Problem:** Caller doesn't know which chains failed to initialize

**Improved Code:**
```typescript
async initializeManagers(seedPhrase: string, walletId?: string, password?: string): Promise<{
  evmAddress: string;
  tonAddress: string;
  btcAddress: string;
  errors?: {
    evm?: string;
    ton?: string;
    btc?: string;
  };
}> {
  // ... setup code ...
  
  const errors: { evm?: string; ton?: string; btc?: string } = {};
  
  try {
    // ── EVM (Polygon / Ethereum) ────────────────────────────────────────────
    this.evmManager = new WalletManagerEvm(seedPhrase, {
      provider: isMainnet ? POLYGON_RPC_MAINNET : POLYGON_RPC_TESTNET,
      transferMaxFee: EVM_MAX_FEE_WEI
    });
    
    try {
      this.evmAccount = await withTimeout(this.evmManager.getAccount(0), 10000, 'EVM Account');
    } catch (e: any) {
      console.warn('EVM Init Failed:', e);
      errors.evm = e.message || 'Failed to initialize EVM account';
      this.evmAccount = null;
    }

    // ── TON (W5) ────────────────────────────────────────────────────────────
    this.tonManager = new WalletManagerTon(seedPhrase, {
      tonClient: {
        url: isMainnet ? TONCENTER_MAINNET_URL : TONCENTER_TESTNET_URL
      },
      transferMaxFee: TON_MAX_FEE_NANO
    });
    
    try {
      this.tonAccount = await withTimeout(this.tonManager.getAccount(0), 10000, 'TON Account');
    } catch (e: any) {
      console.warn('TON Init Failed:', e);
      errors.ton = e.message || 'Failed to initialize TON account';
      this.tonAccount = null;
    }

    // ── BTC ────────────────────────────────────────────────────────────────
    const btcNetwork = isMainnet ? 'bitcoin' : 'testnet';
    let btcClient: any = null;
    
    try {
      const { ElectrumWs } = await import('@tetherto/wdk-wallet-btc');
      btcClient = new ElectrumWs({
        url: isMainnet ? ELECTRUM_WSS_MAINNET : ELECTRUM_WSS_TESTNET
      });
    } catch (wsErr) {
      console.warn('[WDK] ElectrumWs init failed; BTC in address-only mode:', wsErr);
      errors.btc = 'Electrum connection failed - BTC in read-only mode';
    }

    const btcConfig: any = { network: btcNetwork };
    if (btcClient) btcConfig.client = btcClient;

    this.btcManager = new WalletManagerBtc(seedPhrase, btcConfig);
    
    try {
      this.btcAccount = await withTimeout(this.btcManager.getAccount(0), 10000, 'BTC Account');
    } catch (e: any) {
      console.warn('BTC Init Failed:', e);
      errors.btc = errors.btc || (e.message || 'Failed to initialize BTC account');
      this.btcAccount = null;
    }

    return {
      evmAddress: this.evmAccount ? await this.evmAccount.getAddress() : '',
      tonAddress: this.tonAccount ? await this.tonAccount.getAddress() : '',
      btcAddress: this.btcAccount ? await this.btcAccount.getAddress() : '',
      errors: Object.keys(errors).length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('[WDK] Failed to initialize multi-chain managers:', error);
    throw error;
  }
}
```

---

### 4. Missing Input Validation

**Issue:** No validation of input parameters

**Current Code:**
```typescript
async sendTonTransaction(toAddress: string, amount: string, comment?: string) {
  if (!this.tonAccount) {
    return { success: false, error: 'TON wallet not initialized' };
  }
  try {
    const amountNano = BigInt(Math.floor(parseFloat(amount) * 1e9));
    // ...
  }
}
```

**Problem:** Invalid inputs cause cryptic errors

**Improved Code:**
```typescript
async sendTonTransaction(toAddress: string, amount: string, comment?: string): Promise<{ 
  success: boolean; 
  txHash?: string; 
  fee?: string; 
  error?: string;
  errorCode?: string;
}> {
  // 1. Check initialization
  if (!this.tonAccount) {
    return { 
      success: false, 
      error: 'TON wallet not initialized',
      errorCode: 'WALLET_NOT_INITIALIZED'
    };
  }
  
  try {
    // 2. Validate address
    try {
      const { Address } = await import('@ton/core');
      Address.parse(toAddress);
    } catch {
      return {
        success: false,
        error: 'Invalid TON address format',
        errorCode: 'INVALID_ADDRESS'
      };
    }
    
    // 3. Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return {
        success: false,
        error: 'Invalid amount. Must be a positive number',
        errorCode: 'INVALID_AMOUNT'
      };
    }
    
    if (amountNum < 0.001) {
      return {
        success: false,
        error: 'Amount too small. Minimum is 0.001 TON',
        errorCode: 'AMOUNT_TOO_SMALL'
      };
    }
    
    // 4. Validate comment length
    if (comment && comment.length > 100) {
      return {
        success: false,
        error: 'Comment too long. Maximum 100 characters',
        errorCode: 'COMMENT_TOO_LONG'
      };
    }
    
    const amountNano = BigInt(Math.floor(amountNum * 1e9));
    
    // 5. Quote to check fees
    const quote = await this.tonAccount.quoteSendTransaction({
      to: toAddress,
      value: amountNano,
      body: comment || undefined
    });
    
    // 6. Check balance
    const balance = await this.tonAccount.getBalance();
    const totalRequired = amountNano + quote.fee;
    
    if (balance < totalRequired) {
      const balanceTon = (Number(balance) / 1e9).toFixed(4);
      const requiredTon = (Number(totalRequired) / 1e9).toFixed(4);
      const feeTon = (Number(quote.fee) / 1e9).toFixed(6);
      
      return {
        success: false,
        error: `Insufficient balance. You have ${balanceTon} TON but need ${requiredTon} TON (${amount} + ${feeTon} fee)`,
        errorCode: 'INSUFFICIENT_BALANCE'
      };
    }
    
    // 7. Send transaction
    const result = await this.tonAccount.sendTransaction({
      to: toAddress,
      value: amountNano,
      body: comment || undefined
    });
    
    return { 
      success: true, 
      txHash: result.hash, 
      fee: (Number(result.fee) / 1e9).toFixed(6) 
    };
  } catch (error: any) {
    const errorMsg = wdkErrorMessage(error, 'TON');
    return { 
      success: false, 
      error: errorMsg,
      errorCode: this.getErrorCode(error)
    };
  }
}
```

---

### 5. Enhanced Error Message Function

**Current Code:**
```typescript
function wdkErrorMessage(error: any, chain: string): string {
  const msg: string = error?.message || String(error) || 'Unknown error';
  console.error(`[WDK/${chain}] Transaction failed:`, msg);
  // ... pattern matching ...
  return msg;
}
```

**Improved Code:**
```typescript
interface WdkError {
  message: string;
  code: string;
  chain: string;
  originalError?: any;
  retryable: boolean;
}

function parseWdkError(error: any, chain: string): WdkError {
  const msg: string = error?.message || String(error) || 'Unknown error';
  console.error(`[WDK/${chain}] Operation failed:`, msg);

  // Insufficient balance
  if (msg.includes('insufficient funds') || msg.includes('not enough')) {
    return {
      message: `Insufficient ${chain} balance to cover amount + fees.`,
      code: 'INSUFFICIENT_BALANCE',
      chain,
      originalError: error,
      retryable: false
    };
  }
  
  // Fee limit exceeded
  if (msg.includes('max fee') || msg.includes('transferMaxFee')) {
    return {
      message: 'Transaction fee exceeds the safety limit. Try a smaller amount.',
      code: 'FEE_TOO_HIGH',
      chain,
      originalError: error,
      retryable: false
    };
  }
  
  // Dust limit (Bitcoin)
  if (msg.includes('dust') || msg.includes('294')) {
    return {
      message: 'Amount is below the minimum dust limit (294 satoshis).',
      code: 'AMOUNT_TOO_SMALL',
      chain,
      originalError: error,
      retryable: false
    };
  }
  
  // Nonce conflict
  if (msg.includes('nonce') || msg.includes('replacement')) {
    return {
      message: 'Transaction conflict detected. Please wait and try again.',
      code: 'NONCE_CONFLICT',
      chain,
      originalError: error,
      retryable: true
    };
  }
  
  // User rejection
  if (msg.includes('rejected') || msg.includes('denied')) {
    return {
      message: 'Transaction was rejected. Please try again.',
      code: 'USER_REJECTED',
      chain,
      originalError: error,
      retryable: false
    };
  }
  
  // Network errors (retryable)
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
    return {
      message: `Network error on ${chain}. Check your connection and try again.`,
      code: 'NETWORK_ERROR',
      chain,
      originalError: error,
      retryable: true
    };
  }
  
  // Invalid address
  if (msg.includes('invalid address') || msg.includes('bad address')) {
    return {
      message: 'Invalid recipient address. Please double-check and try again.',
      code: 'INVALID_ADDRESS',
      chain,
      originalError: error,
      retryable: false
    };
  }
  
  // Electrum connection (Bitcoin specific)
  if (msg.includes('Electrum') || msg.includes('electrum')) {
    return {
      message: 'BTC network connection unavailable. Try again in a moment.',
      code: 'ELECTRUM_ERROR',
      chain,
      originalError: error,
      retryable: true
    };
  }
  
  // Unknown error
  return {
    message: msg,
    code: 'UNKNOWN_ERROR',
    chain,
    originalError: error,
    retryable: false
  };
}

// Backward compatible wrapper
function wdkErrorMessage(error: any, chain: string): string {
  return parseWdkError(error, chain).message;
}
```

---

## Summary of Improvements

### High Priority (Implement First)

1. ✅ **Add balance + fee validation before transactions**
   - Prevents failed transactions
   - Better user experience
   - Saves gas on failed attempts

2. ✅ **Add input validation**
   - Address format validation
   - Amount validation (positive, minimum)
   - Comment length validation

3. ✅ **Add error codes to responses**
   - Enables better error handling in UI
   - Allows for specific error messages
   - Facilitates error tracking/analytics

### Medium Priority

4. ✅ **Add retry logic for transient failures**
   - Improves reliability
   - Better handling of network issues
   - Exponential backoff prevents hammering

5. ✅ **Improve initialization error reporting**
   - Caller knows which chains failed
   - Can show partial functionality
   - Better debugging

### Low Priority

6. ✅ **Enhanced error parsing**
   - Structured error objects
   - Retryable flag for automatic retries
   - Better error categorization

---

## Implementation Checklist

- [ ] Add `withRetry()` utility method
- [ ] Add `getErrorCode()` helper method
- [ ] Update `sendEvmTransaction()` with validation
- [ ] Update `sendTonTransaction()` with validation
- [ ] Update `sendBtcTransaction()` with validation
- [ ] Update `initializeManagers()` return type
- [ ] Add `parseWdkError()` function
- [ ] Update `getBalances()` with retry logic
- [ ] Add unit tests for error scenarios
- [ ] Update UI to handle error codes

---

*Review completed: March 24, 2026*
