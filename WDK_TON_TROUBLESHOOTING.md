# WDK TON Payment Troubleshooting Guide

## Current Error
"TON network is temporarily unavailable. Please try again in a few moments."

## Diagnostic Steps

### Step 1: Check Browser Console
Open browser DevTools (F12) and look for these log messages:

#### Expected Success Logs:
```
[WDK/TON] Initializing with config: {endpoint: "...", hasApiKey: true, network: "mainnet"}
[WDK/TON] Initialized successfully {network: "mainnet", endpoint: "...", hasApiKey: true}
```

#### If You See Init Errors:
```
[WDK/TON] Init failed: ...
[WDK/TON] Full error: {...}
```
**Action**: The WDK failed to initialize. Check the error details.

#### If You See Transaction Errors:
```
[WDK/TON] Transaction error details: {message: "...", status: ..., data: "..."}
```
**Action**: The transaction failed. Check the status code and message.

### Step 2: Identify the Error Type

#### HTTP 404 Error
**Meaning**: API endpoint not found
**Possible Causes**:
- Wrong API URL
- TonCenter API is down
- Network connectivity issue

**Solutions**:
1. Check if https://toncenter.com is accessible
2. Try testnet instead of mainnet
3. Check your internet connection

#### HTTP 405 Error
**Meaning**: Method not allowed
**Possible Causes**:
- Wrong HTTP method
- API endpoint doesn't support the operation
- WDK configuration issue

**Solutions**:
1. Verify WDK version is up to date
2. Check if API key is valid
3. Try without API key (public endpoint)

#### HTTP 500 Error
**Meaning**: TonCenter server error
**Possible Causes**:
- TonCenter API is experiencing issues
- Rate limit exceeded
- Invalid request format

**Solutions**:
1. Wait a few minutes and retry
2. Check TonCenter status
3. Try with a different API key

#### Network/Timeout Error
**Meaning**: Cannot reach TonCenter API
**Possible Causes**:
- Internet connection issue
- Firewall blocking requests
- DNS resolution failure

**Solutions**:
1. Check internet connection
2. Try different network (mobile data vs WiFi)
3. Check if firewall is blocking requests

### Step 3: Test Configuration

#### Test 1: Check WDK Initialization
Look for this log when wallet loads:
```
[WDK/TON] Initialized successfully
```

**If missing**: WDK failed to initialize. Check error logs.

#### Test 2: Check Balance Fetch
Try viewing your TON balance. If it shows correctly, WDK is working.

**If balance shows 0 or error**: WDK cannot communicate with TonCenter.

#### Test 3: Try Manual Payment
Switch to "MANUAL / QR" mode and send payment manually from another wallet.

**If manual works**: Issue is with WDK transaction sending, not the payment address.

### Step 4: Common Fixes

#### Fix 1: Clear Cache and Reload
```bash
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
4. Try payment again
```

#### Fix 2: Try Without API Key
The API key might be invalid or rate-limited.

**To test**: Remove API key from constants.ts temporarily:
```typescript
API_KEY: '' // Empty string to test without key
```

#### Fix 3: Switch to Testnet
Test if the issue is mainnet-specific:
```typescript
// In app, switch network to testnet
// Try a small test payment
```

#### Fix 4: Use Fallback Service
If WDK continues to fail, the app can fall back to `tonWalletService`:

Check in `GlobalPurchaseModal.tsx` around line 379:
```typescript
const useWdk = !tonWalletService.isInitialized() && tetherWdkService.isInitialized();
```

**To force fallback**: Ensure `tonWalletService` is initialized first.

### Step 5: Advanced Debugging

#### Enable Verbose Logging
Add this to browser console:
```javascript
localStorage.setItem('debug', 'wdk:*');
```

#### Check Network Tab
1. Open DevTools → Network tab
2. Filter by "toncenter"
3. Try payment
4. Look for failed requests
5. Check request/response details

#### Inspect Request Details
Look for requests to:
- `https://toncenter.com/api/v3/...`
- Check request headers (should include `x-api-key` if using API key)
- Check response status and body

### Step 6: Verify Configuration

#### Check constants.ts
```typescript
// Mainnet API Key
API_KEY: '509fc324e5a26df719b2e637cad9f34fd7c3576455b707522ce8319d8b450441'

// Testnet API Key  
API_KEY: 'bb31868e5cf6529efb16bcf547beb3c534a28d1e139bd63356fd936c168fe662'
```

#### Check WDK Version
```bash
npm list @tetherto/wdk-wallet-ton
```

Expected: Latest beta version

#### Check TonCenter Endpoints
```typescript
const TONCENTER_MAINNET_URL = 'https://toncenter.com/api/v3';
const TONCENTER_TESTNET_URL = 'https://testnet.toncenter.com/api/v3';
```

## Error Code Reference

| Error | Meaning | Solution |
|-------|---------|----------|
| 404 | Endpoint not found | Check API URL, verify TonCenter is accessible |
| 405 | Method not allowed | Check WDK configuration, try without API key |
| 429 | Rate limit exceeded | Wait and retry, or use different API key |
| 500 | Server error | Wait and retry, TonCenter may be experiencing issues |
| 503 | Service unavailable | TonCenter is down for maintenance |
| Network error | Cannot reach API | Check internet connection, firewall settings |

## Quick Fixes Summary

1. **Clear cache and reload** - Fixes stale configuration
2. **Try without API key** - Tests if API key is the issue
3. **Switch to testnet** - Tests if mainnet-specific issue
4. **Use manual payment** - Bypasses WDK entirely
5. **Check browser console** - Shows detailed error messages
6. **Check network tab** - Shows actual HTTP requests/responses

## When to Use Manual Payment

Use "MANUAL / QR" mode if:
- WDK continues to fail after troubleshooting
- You need to complete payment urgently
- You prefer to use external wallet app
- You want to verify payment address is correct

## Getting Help

If issue persists:

1. **Collect Information**:
   - Browser console logs (full error messages)
   - Network tab screenshots (failed requests)
   - Network type (mainnet/testnet)
   - WDK version
   - Steps to reproduce

2. **Check Status**:
   - TonCenter API status
   - WDK GitHub issues
   - TON network status

3. **Contact Support**:
   - Provide collected information
   - Include transaction details if any
   - Mention troubleshooting steps already tried

## Prevention

To avoid future issues:

1. **Monitor TonCenter Status**: Subscribe to status updates
2. **Use Multiple API Keys**: Rotate keys to avoid rate limits
3. **Implement Fallbacks**: Always have backup payment method
4. **Test Regularly**: Test payments on testnet before mainnet
5. **Keep Updated**: Update WDK to latest version regularly

---

**Last Updated**: 2026-04-11
**Status**: Active troubleshooting for "TON network temporarily unavailable" error
