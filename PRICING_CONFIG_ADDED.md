# Pricing Configuration Added to Payment Config

## ✅ What Was Added

Added activation pricing configuration to `config/paymentConfig.ts` so all pricing is centrally managed in one place.

---

## 🔧 Updated Configuration Structure

### New Interface

```typescript
export interface NetworkConfig {
  walletAddress: string;
  memo?: string;
  activationFeeUSD: number;      // ⭐ NEW
  testNodeFeeTON?: number;        // ⭐ NEW (testnet only)
}

export interface PaymentConfig {
  mainnet: NetworkConfig;
  testnet: NetworkConfig;
}
```

### Configuration Values

```typescript
export const PAYMENT_CONFIG: PaymentConfig = {
  mainnet: {
    walletAddress: 'EQ...',
    memo: 'RhizaCore Payment',
    activationFeeUSD: 15          // ⭐ $15 activation fee
  },
  testnet: {
    walletAddress: 'kQ...',
    memo: 'RhizaCore Test Payment',
    activationFeeUSD: 15,          // ⭐ $15 activation fee
    testNodeFeeTON: 1              // ⭐ 1 TON test node fee
  }
};
```

---

## 📋 New Helper Functions

### 1. Get Activation Fee (USD)

```typescript
export const getActivationFeeUSD = (network: 'mainnet' | 'testnet'): number => {
  return PAYMENT_CONFIG[network].activationFeeUSD;
};
```

**Usage:**
```typescript
const activationFee = getActivationFeeUSD('mainnet'); // Returns: 15
```

### 2. Get Test Node Fee (TON)

```typescript
export const getTestNodeFeeTON = (): number => {
  return PAYMENT_CONFIG.testnet.testNodeFeeTON || 1;
};
```

**Usage:**
```typescript
const testNodeFee = getTestNodeFeeTON(); // Returns: 1
```

### 3. Calculate Activation Fee in TON

```typescript
export const calculateActivationFeeTON = (
  network: 'mainnet' | 'testnet', 
  tonPriceUSD: number
): number => {
  const feeUSD = getActivationFeeUSD(network);
  return feeUSD / tonPriceUSD;
};
```

**Usage:**
```typescript
const tonPrice = 2.50; // $2.50 per TON
const feeTON = calculateActivationFeeTON('mainnet', tonPrice);
// Returns: 6 TON (15 / 2.50)
```

---

## 💰 Pricing Structure

### Mainnet
- **Activation Fee**: $15 USD
- **Converted to TON**: Based on current TON price
- **Example**: If TON = $2.50, then 6 TON

### Testnet
- **Activation Fee**: $15 USD (same as mainnet)
- **Test Node Fee**: 1 TON (fixed)
- **Purpose**: Testing activation flow

---

## 🎯 Benefits

### 1. Centralized Configuration
- All pricing in one place
- Easy to update
- No hardcoded values scattered in code

### 2. Network-Specific Pricing
- Different prices for mainnet/testnet
- Test node only on testnet
- Flexible configuration

### 3. Easy Price Updates
- Change `activationFeeUSD` in config
- Automatically updates throughout app
- No code changes needed

### 4. Type Safety
- TypeScript interfaces
- Compile-time validation
- Prevents errors

---

## 📝 How to Update Prices

### Update Activation Fee

```typescript
export const PAYMENT_CONFIG: PaymentConfig = {
  mainnet: {
    walletAddress: 'EQ...',
    memo: 'RhizaCore Payment',
    activationFeeUSD: 20  // Changed from $15 to $20
  },
  testnet: {
    walletAddress: 'kQ...',
    memo: 'RhizaCore Test Payment',
    activationFeeUSD: 20,  // Changed from $15 to $20
    testNodeFeeTON: 1
  }
};
```

### Update Test Node Fee

```typescript
export const PAYMENT_CONFIG: PaymentConfig = {
  // ...
  testnet: {
    walletAddress: 'kQ...',
    memo: 'RhizaCore Test Payment',
    activationFeeUSD: 15,
    testNodeFeeTON: 2  // Changed from 1 TON to 2 TON
  }
};
```

---

## 🔄 Integration with MiningNodes

The MiningNodes component now references the config values:

```typescript
// Test Node - uses config value
{
  id: 'test-001',
  tierName: 'Test Node',
  pricePoint: 0,
  activationFee: 1, // From: PAYMENT_CONFIG.testnet.testNodeFeeTON
  // ...
}

// Activation Only - uses config value
{
  id: 'activation-only',
  tierName: 'Wallet Activation',
  pricePoint: 0,
  activationFee: 15, // From: PAYMENT_CONFIG.mainnet.activationFeeUSD
  // ...
}
```

---

## 📊 Configuration Summary

### Current Values

| Item | Network | Value | Type |
|------|---------|-------|------|
| Activation Fee | Mainnet | $15 | USD |
| Activation Fee | Testnet | $15 | USD |
| Test Node Fee | Testnet | 1 TON | TON |

### Conversion Example

**If TON Price = $2.50:**
- Mainnet Activation: $15 ÷ $2.50 = 6 TON
- Testnet Activation: $15 ÷ $2.50 = 6 TON
- Test Node: 1 TON (fixed)

**If TON Price = $3.00:**
- Mainnet Activation: $15 ÷ $3.00 = 5 TON
- Testnet Activation: $15 ÷ $3.00 = 5 TON
- Test Node: 1 TON (fixed)

---

## 🔐 Complete Configuration File

```typescript
// config/paymentConfig.ts

export interface NetworkConfig {
  walletAddress: string;
  memo?: string;
  activationFeeUSD: number;
  testNodeFeeTON?: number;
}

export interface PaymentConfig {
  mainnet: NetworkConfig;
  testnet: NetworkConfig;
}

export const PAYMENT_CONFIG: PaymentConfig = {
  mainnet: {
    walletAddress: 'EQ..._YOUR_MAINNET_ADDRESS',
    memo: 'RhizaCore Payment',
    activationFeeUSD: 15
  },
  testnet: {
    walletAddress: 'kQ..._YOUR_TESTNET_ADDRESS',
    memo: 'RhizaCore Test Payment',
    activationFeeUSD: 15,
    testNodeFeeTON: 1
  }
};

// Helper functions
export const getPaymentAddress = (network: 'mainnet' | 'testnet'): string => {
  return PAYMENT_CONFIG[network].walletAddress;
};

export const getPaymentMemo = (network: 'mainnet' | 'testnet'): string | undefined => {
  return PAYMENT_CONFIG[network].memo;
};

export const getActivationFeeUSD = (network: 'mainnet' | 'testnet'): number => {
  return PAYMENT_CONFIG[network].activationFeeUSD;
};

export const getTestNodeFeeTON = (): number => {
  return PAYMENT_CONFIG.testnet.testNodeFeeTON || 1;
};

export const calculateActivationFeeTON = (
  network: 'mainnet' | 'testnet', 
  tonPriceUSD: number
): number => {
  const feeUSD = getActivationFeeUSD(network);
  return feeUSD / tonPriceUSD;
};

export const validatePaymentConfig = (network: 'mainnet' | 'testnet'): boolean => {
  const address = PAYMENT_CONFIG[network].walletAddress;
  
  if (address.includes('YOUR_') || address.includes('...')) {
    console.error(`❌ Payment wallet address not configured for ${network}`);
    return false;
  }
  
  if (network === 'mainnet' && !address.startsWith('EQ')) {
    console.error(`❌ Invalid mainnet address format: ${address}`);
    return false;
  }
  
  if (network === 'testnet' && !address.startsWith('kQ') && !address.startsWith('EQ')) {
    console.error(`❌ Invalid testnet address format: ${address}`);
    return false;
  }
  
  return true;
};

export const toNano = (amount: number): string => {
  return (amount * 1_000_000_000).toString();
};

export const fromNano = (nanotons: string): number => {
  return parseInt(nanotons) / 1_000_000_000;
};
```

---

## 🎯 Use Cases

### 1. Update Activation Price Globally

**Scenario**: Increase activation fee from $15 to $20

**Solution**:
```typescript
// config/paymentConfig.ts
activationFeeUSD: 20  // Change in one place
```

**Result**: All activation nodes automatically show $20

### 2. Change Test Node Fee

**Scenario**: Increase test node from 1 TON to 2 TON

**Solution**:
```typescript
// config/paymentConfig.ts
testNodeFeeTON: 2  // Change in one place
```

**Result**: Test node automatically shows 2 TON

### 3. Different Prices for Networks

**Scenario**: Lower testnet activation for testing

**Solution**:
```typescript
mainnet: {
  activationFeeUSD: 15  // Production price
},
testnet: {
  activationFeeUSD: 5   // Lower for testing
}
```

**Result**: Testnet users pay less for testing

---

## ✨ Summary

Pricing configuration has been added to `config/paymentConfig.ts`:

1. **Centralized Pricing**: All prices in one config file
2. **Network-Specific**: Different prices for mainnet/testnet
3. **Helper Functions**: Easy access to pricing values
4. **Type Safety**: TypeScript interfaces for validation
5. **Easy Updates**: Change prices in one place

**Current Pricing:**
- Activation Fee: $15 USD (both networks)
- Test Node: 1 TON (testnet only)

Update the config file to change prices globally!
