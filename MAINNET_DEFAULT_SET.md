# App Set to Mainnet by Default ✅

## Changes Made

All network defaults have been updated from testnet to mainnet across the application.

### Files Updated:

1. **context/WalletContext.tsx** (Line 76)
   - Already set to mainnet ✅
   ```typescript
   const [network, setNetwork] = useState<NetworkType>(() => {
     const saved = localStorage.getItem('rhiza_network');
     return (saved as NetworkType) || 'mainnet'; // Default to mainnet
   });
   ```

2. **services/swapService.ts** (Line 56)
   - Changed from: `private network: 'mainnet' | 'testnet' = 'testnet';`
   - Changed to: `private network: 'mainnet' | 'testnet' = 'mainnet';`

3. **services/tonWalletService.ts** (Line 104)
   - Changed from: `private currentNetwork: NetworkType = 'testnet';`
   - Changed to: `private currentNetwork: NetworkType = 'mainnet';`

## What This Means

### For New Users:
- App starts on **TON Mainnet** by default
- All transactions use real TON and real tokens
- Wallet addresses are mainnet addresses (EQ...)
- Real blockchain interactions

### For Existing Users:
- If they previously selected testnet, their choice is saved in localStorage
- They can still switch between mainnet/testnet in Settings
- Network preference persists across sessions

## Network Switching

Users can still switch networks in two places:

1. **Settings Page** - Full network switcher with details
2. **Layout Dropdown** - Quick network toggle (desktop & mobile)

## Important Notes

⚠️ **Production Ready**:
- App now defaults to mainnet for production use
- All real transactions will use actual TON
- Users should be aware they're using real funds

✅ **Safety Features**:
- Network indicator always visible in UI
- Clear labels showing "Mainnet" or "Testnet"
- Users can switch back to testnet for testing

🔒 **Swap Service**:
- Swap service also defaults to mainnet
- Demo mode is OFF (set `isDemoMode = true` to enable demo)
- Real DEX integrations active

## Testing Checklist

Before deploying to production:

- [ ] Verify new wallets are created on mainnet
- [ ] Check that transactions go to mainnet explorer
- [ ] Confirm swap service uses mainnet DEX
- [ ] Test network switching still works
- [ ] Verify localStorage persists network choice
- [ ] Check all UI shows "Mainnet" by default

## Reverting to Testnet (If Needed)

If you need to switch back to testnet as default:

1. **context/WalletContext.tsx** line 76: Change `'mainnet'` to `'testnet'`
2. **services/swapService.ts** line 56: Change `'mainnet'` to `'testnet'`
3. **services/tonWalletService.ts** line 104: Change `'mainnet'` to `'testnet'`

## Network Configuration

The app uses these endpoints:

**Mainnet**:
- API: `https://tonapi.io`
- Explorer: `https://tonviewer.com`

**Testnet**:
- API: `https://testnet.tonapi.io`
- Explorer: `https://testnet.tonviewer.com`

All configurations are in `constants.ts`.
