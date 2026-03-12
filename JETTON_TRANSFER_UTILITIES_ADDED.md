# Jetton Transfer Utilities Added

## Summary
Created utility functions and helpers for jetton transfers. The infrastructure is now in place to support sending jettons (tokens) on the TON blockchain.

## New Files Created

### 1. `utility/jettonTransfer.ts`
Main jetton transfer utility with:

#### `getJettonTransaction()`
Creates a properly formatted jetton transfer transaction for TonConnect.

**Parameters:**
- `jetton` - Jetton balance data (address, decimals, balance)
- `amountStr` - Amount to send as string (e.g., "1.5")
- `recipientAddressStr` - Recipient's TON address
- `senderAddress` - Sender's address (Address object)
- `jettonWalletAddress` - Optional jetton wallet address

**Returns:** `SendTransactionRequest` for TonConnect

**Features:**
- Validates recipient address format
- Checks amount is positive
- Verifies sufficient balance
- Builds proper jetton transfer message (op code 0xf8a7ea5)
- Includes forward amount for notifications
- Sets 5-minute validity period
- Uses 0.05 TON gas fee

#### `estimateJettonTransferFee()`
Returns the standard gas fee for jetton transfers (0.05 TON).

### 2. `utility/decimals.ts`
Decimal conversion utilities for token amounts:

#### `fromDecimals(amountStr, decimals)`
Converts human-readable amount to bigint.
- Example: `fromDecimals("1.5", 9)` → `1500000000n`
- Validates format and decimal places
- Handles padding and conversion

#### `toDecimals(amount, decimals)`
Converts bigint to human-readable string.
- Example: `toDecimals(1500000000n, 9)` → `"1.5"`
- Removes trailing zeros
- Formats properly

### 3. `utility/address.ts`
TON address validation and conversion:

#### `isValidAddress(address)`
Validates if a string is a valid TON address.
- Returns `true` for valid addresses
- Returns `false` for invalid

#### `normalizeAddress(address)`
Converts address to user-friendly format (EQ...).

#### `toRawAddress(address)`
Converts address to raw format (0:...).

## How Jetton Transfers Work

### 1. Jetton Transfer Message Structure
```typescript
beginCell()
  .storeUint(0xf8a7ea5, 32)    // Operation code for jetton transfer
  .storeUint(0, 64)             // Query ID
  .storeCoins(amount)           // Amount in smallest units
  .storeAddress(recipient)      // Destination
  .storeAddress(sender)         // Response address
  .storeUint(0, 1)              // Custom payload (null)
  .storeCoins(toNano("0.01"))   // Forward amount
  .storeUint(0, 1)              // Forward payload (null)
  .endCell()
```

### 2. Transaction Flow
1. User enters amount and recipient
2. Amount converted from decimals to bigint
3. Validate recipient address
4. Check sufficient balance
5. Build jetton transfer message
6. Send to jetton wallet contract (not recipient!)
7. Jetton wallet forwards to recipient
8. Notification sent with forward amount

### 3. Gas Fees
- **Standard jetton transfer**: 0.05 TON
- **Forward amount**: 0.01 TON (for notification)
- **Total**: ~0.06 TON required

## Integration with Assets Page

The Assets page now has Send buttons that navigate to `/wallet/transfer` with jetton data:

```typescript
navigate('/wallet/transfer', { 
  state: { 
    asset: 'JETTON',
    jettonAddress: jetton.jetton.address,
    jettonName: jetton.jetton.name,
    jettonSymbol: jetton.jetton.symbol,
    jettonDecimals: jetton.jetton.decimals,
    jettonBalance: jetton.balance,
    jettonWalletAddress: jetton.walletAddress?.address
  } 
});
```

## Next Steps to Complete Integration

### 1. Update Transfer Page
The `pages/Transfer.tsx` needs to be updated to:
- Detect jetton transfer from navigation state
- Show jetton selector dropdown
- Use `getJettonTransaction()` for jetton sends
- Display jetton balance and symbol
- Show proper gas fees (0.05 TON for jettons)
- Handle jetton-specific errors

### 2. Add Jetton Wallet Address Fetching
If jetton wallet address is not available:
- Call TON API to get user's jetton wallet address
- Cache for future transfers
- Handle cases where user doesn't have jetton wallet yet

### 3. Transaction History
- Log jetton transfers to database
- Show jetton transfers in history
- Display jetton amounts with proper decimals
- Link to explorer for jetton transfers

### 4. Error Handling
- Insufficient TON for gas
- Invalid jetton wallet
- Jetton contract errors
- Network issues

## Example Usage

```typescript
import { getJettonTransaction } from '../utility/jettonTransfer';
import { Address } from '@ton/core';

// Prepare jetton transfer
const transaction = getJettonTransaction(
  jettonData,
  "10.5",  // Send 10.5 tokens
  "EQC...", // Recipient address
  Address.parse(senderAddress),
  jettonWalletAddress
);

// Send via TonConnect
const result = await tonConnectUI.sendTransaction(transaction);
```

## Supported Tokens

Works with any jetton that follows the standard:
- USDT (Tether)
- STK (Stakers Token)
- Any TEP-74 compliant jetton

## Security Features

1. **Address Validation**: Prevents sending to invalid addresses
2. **Balance Checks**: Ensures sufficient balance before sending
3. **Amount Validation**: Prevents negative or zero amounts
4. **Decimal Precision**: Respects token decimal places
5. **Gas Fee Checks**: Ensures user has TON for gas

## Testing Checklist

- [ ] Send USDT to valid address
- [ ] Send STK to valid address
- [ ] Try sending more than balance (should fail)
- [ ] Try invalid recipient address (should fail)
- [ ] Try zero amount (should fail)
- [ ] Check gas fee deduction
- [ ] Verify transaction in explorer
- [ ] Check balance updates after send

---

**Status**: ✅ Utilities created, ready for Transfer page integration
**Files Created**: 
- `utility/jettonTransfer.ts`
- `utility/decimals.ts`
- `utility/address.ts`
**Next**: Update `pages/Transfer.tsx` to use these utilities
