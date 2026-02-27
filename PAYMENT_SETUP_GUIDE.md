# Payment Setup Guide

## 🎯 Overview

This guide explains how to configure payment wallet addresses for receiving node purchases and activation payments.

---

## 📋 What Was Implemented

### 1. Test Node Updated
- **Old**: 0.01 TON (mock payment)
- **New**: 1 TON (real payment)
- Only available on testnet
- Real TON blockchain transaction

### 2. Payment Configuration File
- Location: `config/paymentConfig.ts`
- Stores payment wallet addresses for mainnet and testnet
- Includes validation and helper functions

### 3. Real TON Payment Processing
- Integrated with `tonWalletService.sendTransaction()`
- Sends actual TON to configured payment address
- Records transaction hash in database
- Validates payment before activation

---

## ⚙️ Configuration Steps

### Step 1: Update Payment Wallet Addresses

Open `config/paymentConfig.ts` and update the wallet addresses:

```typescript
export const PAYMENT_CONFIG: PaymentConfig = {
  mainnet: {
    // Replace with your actual mainnet payment wallet address
    walletAddress: 'EQD..._YOUR_MAINNET_WALLET_ADDRESS_HERE',
    memo: 'RhizaCore Payment'
  },
  testnet: {
    // Replace with your actual testnet payment wallet address
    walletAddress: 'kQD..._YOUR_TESTNET_WALLET_ADDRESS_HERE',
    memo: 'RhizaCore Test Payment'
  }
};
```

### Step 2: Get Your Payment Wallet Addresses

#### For Testnet:
1. Create a testnet wallet (or use existing)
2. Get the wallet address (starts with `kQ` or `EQ`)
3. Copy the full address
4. Paste into `PAYMENT_CONFIG.testnet.walletAddress`

#### For Mainnet:
1. Create a mainnet wallet (or use existing)
2. Get the wallet address (starts with `EQ`)
3. Copy the full address
4. Paste into `PAYMENT_CONFIG.mainnet.walletAddress`

### Step 3: Verify Configuration

The system automatically validates addresses:

```typescript
// Mainnet addresses must start with 'EQ'
// Testnet addresses must start with 'kQ' or 'EQ'
// Placeholder addresses (containing 'YOUR_' or '...') are rejected
```

---

## 🔧 How It Works

### Payment Flow

```
User clicks "Confirm Purchase"
    ↓
System validates payment configuration
    ↓
Gets payment address for current network
    ↓
Calculates amount in nanotons (1 TON = 1,000,000,000 nanotons)
    ↓
Calls tonWalletService.sendTransaction()
    ↓
User's wallet sends TON to payment address
    ↓
Transaction confirmed on blockchain
    ↓
Transaction hash recorded
    ↓
Wallet activated in database
    ↓
Success message shown
```

### Code Flow

```typescript
// 1. Import payment config
const { getPaymentAddress, validatePaymentConfig, toNano } = await import('../config/paymentConfig');

// 2. Validate configuration
if (!validatePaymentConfig(network)) {
  throw new Error('Payment wallet not configured');
}

// 3. Get payment address
const paymentAddress = getPaymentAddress(network);

// 4. Send payment
const paymentResult = await tonWalletService.sendTransaction(
  paymentAddress,
  toNano(totalCostTON),
  `RhizaCore ${node.tierName} Purchase`
);

// 5. Check result
if (!paymentResult.success || !paymentResult.txHash) {
  throw new Error('Payment failed');
}

// 6. Activate wallet with transaction hash
await supabaseService.activateWallet(address, {
  activation_fee_usd: totalCost,
  activation_fee_ton: totalCostTON,
  ton_price: tonPrice,
  transaction_hash: paymentResult.txHash
});
```

---

## 💰 Pricing Structure

### Test Node (Testnet Only)
- **Price**: 1 TON
- **Purpose**: Testing activation flow
- **Network**: Testnet only
- **Mining**: 1 RZC/day

### Wallet Activation
- **Price**: $15 (converted to TON)
- **Purpose**: Unlock wallet features
- **Network**: Mainnet & Testnet
- **Mining**: None

### Mining Nodes
- **Bronze**: $100 + $15 activation
- **Silver**: $300 + $15 activation
- **Gold**: $500 + $45 activation
- **Platinum**: $700 + $45 activation
- **VIP Shareholders**: $2,000+ + $120 activation

---

## 🔐 Security Considerations

### Payment Address Security
- ✅ Store payment addresses in config file
- ✅ Validate address format before accepting payments
- ✅ Use different addresses for mainnet and testnet
- ✅ Never expose private keys in code
- ✅ Keep payment wallet secure

### Transaction Verification
- ✅ Record transaction hash in database
- ✅ Verify payment on blockchain
- ✅ Check transaction status before activation
- ✅ Handle failed transactions gracefully

### Error Handling
- ✅ Validate configuration before processing
- ✅ Check user balance before sending
- ✅ Handle network errors
- ✅ Provide clear error messages
- ✅ Log all payment attempts

---

## 🧪 Testing

### Test on Testnet First

1. **Configure testnet address**
   ```typescript
   testnet: {
     walletAddress: 'kQYourTestnetAddress...',
     memo: 'RhizaCore Test Payment'
   }
   ```

2. **Get testnet TON**
   - Use TON testnet faucet
   - Get free testnet TON for testing

3. **Test purchase flow**
   - Navigate to Mining Nodes
   - Purchase Test Node (1 TON)
   - Verify payment sent
   - Check transaction on testnet explorer
   - Verify wallet activated

4. **Verify database records**
   ```sql
   SELECT * FROM wallet_activations 
   WHERE wallet_address = 'YOUR_ADDRESS';
   ```

### Test on Mainnet (Production)

1. **Configure mainnet address**
   ```typescript
   mainnet: {
     walletAddress: 'EQYourMainnetAddress...',
     memo: 'RhizaCore Payment'
   }
   ```

2. **Test with small amount first**
   - Purchase $15 activation
   - Verify payment received
   - Check transaction on mainnet explorer

3. **Monitor payments**
   - Check payment wallet regularly
   - Verify all transactions recorded
   - Track activation success rate

---

## 📊 Payment Tracking

### Database Records

**wallet_activations table:**
```sql
id                    UUID
user_id               UUID
wallet_address        TEXT
activation_fee_usd    DECIMAL(10,2)
activation_fee_ton    DECIMAL(10,4)
ton_price_at_activation DECIMAL(10,2)
transaction_hash      TEXT  -- ⭐ Real blockchain transaction
status                TEXT  -- 'pending', 'completed', 'failed'
created_at            TIMESTAMP
completed_at          TIMESTAMP
```

### Query Payment History

```sql
-- Get all payments
SELECT 
  wallet_address,
  activation_fee_ton,
  transaction_hash,
  status,
  created_at
FROM wallet_activations
ORDER BY created_at DESC;

-- Get total revenue
SELECT 
  SUM(activation_fee_ton) as total_ton,
  SUM(activation_fee_usd) as total_usd,
  COUNT(*) as total_activations
FROM wallet_activations
WHERE status = 'completed';

-- Get payments by date
SELECT 
  DATE(created_at) as date,
  COUNT(*) as activations,
  SUM(activation_fee_ton) as ton_received
FROM wallet_activations
WHERE status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🔍 Troubleshooting

### Error: "Payment wallet address not configured"

**Cause**: Payment address not set in config file

**Solution**:
1. Open `config/paymentConfig.ts`
2. Replace placeholder with actual address
3. Ensure address format is correct
4. Restart application

### Error: "Invalid address format"

**Cause**: Address doesn't match network format

**Solution**:
- Mainnet addresses must start with `EQ`
- Testnet addresses must start with `kQ` or `EQ`
- Check for typos in address

### Error: "Payment failed"

**Cause**: Transaction failed on blockchain

**Solution**:
1. Check user has sufficient balance
2. Verify network connection
3. Check payment address is valid
4. Try again with higher gas fee

### Payment sent but wallet not activated

**Cause**: Database activation failed after payment

**Solution**:
1. Check transaction hash in database
2. Verify payment received in payment wallet
3. Manually activate wallet if needed:
   ```sql
   UPDATE wallet_users 
   SET is_activated = TRUE, 
       activated_at = NOW()
   WHERE wallet_address = 'USER_ADDRESS';
   ```

---

## 📝 Best Practices

### 1. Separate Wallets
- Use different wallets for mainnet and testnet
- Don't mix test and production funds
- Keep payment wallet separate from operational wallet

### 2. Regular Monitoring
- Check payment wallet daily
- Verify all transactions recorded
- Monitor for failed payments
- Track activation success rate

### 3. Backup & Security
- Backup payment wallet seed phrase
- Store securely (not in code)
- Use hardware wallet for mainnet
- Enable 2FA where possible

### 4. Transaction Verification
- Always verify transaction on blockchain
- Check transaction status before activation
- Record all transaction hashes
- Keep audit trail

### 5. Error Handling
- Log all payment attempts
- Track failed transactions
- Provide clear error messages
- Offer support for payment issues

---

## 🎯 Next Steps

1. ✅ Update payment addresses in `config/paymentConfig.ts`
2. ✅ Test on testnet with Test Node (1 TON)
3. ✅ Verify payment received in payment wallet
4. ✅ Check transaction on blockchain explorer
5. ✅ Verify wallet activation in database
6. ✅ Test on mainnet with $15 activation
7. ✅ Monitor payments and activations
8. ✅ Set up payment notifications (optional)

---

## 📚 Additional Resources

### TON Blockchain
- [TON Documentation](https://ton.org/docs)
- [TON Testnet Faucet](https://testnet.tonscan.org/faucet)
- [TON Mainnet Explorer](https://tonscan.org)
- [TON Testnet Explorer](https://testnet.tonscan.org)

### Wallet Setup
- [TON Wallet Guide](https://ton.org/wallets)
- [Tonkeeper Wallet](https://tonkeeper.com)
- [TON Crystal Wallet](https://ton.org/wallets)

### Development
- [TON SDK](https://github.com/ton-blockchain/ton)
- [TON API](https://toncenter.com/api/v2/)
- [TON Connect](https://github.com/ton-connect)

---

## ✨ Summary

Payment system is now configured for real TON transactions:

1. **Test Node**: 1 TON (testnet only)
2. **Payment Config**: Separate addresses for mainnet/testnet
3. **Real Payments**: Actual blockchain transactions
4. **Transaction Tracking**: All payments recorded with hash
5. **Validation**: Address format and configuration checks

Configure your payment addresses and start receiving payments!
