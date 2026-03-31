# WDK Quick Reference Card

**Fast lookup for common WDK patterns and APIs**

---

## 🚀 Quick Start

### Install Packages

```bash
npm install @tetherto/wdk-wallet-evm
npm install @tetherto/wdk-wallet-ton
npm install @tetherto/wdk-wallet-btc
```

### Initialize Wallet

```typescript
import WalletManagerEvm from '@tetherto/wdk-wallet-evm';

const manager = new WalletManagerEvm(seedPhrase, {
  provider: 'https://rpc.ankr.com/polygon',
  transferMaxFee: BigInt('10000000000000000') // 0.01 ETH
});

const account = await manager.getAccount(0);
```

---

## 📦 Package Names

| Chain | Package | Import |
|-------|---------|--------|
| EVM | `@tetherto/wdk-wallet-evm` | `WalletManagerEvm` |
| TON | `@tetherto/wdk-wallet-ton` | `WalletManagerTon` |
| Bitcoin | `@tetherto/wdk-wallet-btc` | `WalletManagerBtc` |
| Solana | `@tetherto/wdk-wallet-solana` | `WalletManagerSolana` |
| TRON | `@tetherto/wdk-wallet-tron` | `WalletManagerTron` |

---

## 🔑 Common Methods

### Get Address

```typescript
const address = await account.getAddress();
```

### Get Balance

```typescript
const balance = await account.getBalance();
// Returns: bigint (in smallest unit: wei, satoshi, nanoton)
```

### Get Token Balance

```typescript
// ERC-20
const balance = await account.getTokenBalance(tokenAddress);

// TON Jetton
const balance = await account.getTokenBalance(jettonMasterAddress);
```

### Quote Transaction (Estimate Fees)

```typescript
const quote = await account.quoteSendTransaction({
  to: recipientAddress,
  value: amountInWei
});
// Returns: { fee: bigint }
```

### Send Transaction

```typescript
const result = await account.sendTransaction({
  to: recipientAddress,
  value: amountInWei
});
// Returns: { hash: string, fee: bigint }
```

### Get Transaction Receipt

```typescript
const receipt = await account.getTransactionReceipt(txHash);
```

### Dispose (Clear Keys)

```typescript
manager.dispose();
```

---

## ⚙️ Configuration

### EVM (Ethereum, Polygon, etc.)

```typescript
const manager = new WalletManagerEvm(seedPhrase, {
  provider: 'https://rpc.ankr.com/polygon',
  transferMaxFee: BigInt('10000000000000000') // 0.01 ETH
});
```

### TON

```typescript
const manager = new WalletManagerTon(seedPhrase, {
  tonClient: {
    url: 'https://toncenter.com/api/v3'
  },
  transferMaxFee: BigInt('100000000') // 0.1 TON
});
```

### Bitcoin

```typescript
import { ElectrumWs } from '@tetherto/wdk-wallet-btc';

const btcClient = new ElectrumWs({
  url: 'wss://electrum.blockstream.info:50004'
});

const manager = new WalletManagerBtc(seedPhrase, {
  network: 'bitcoin',
  client: btcClient
});
```

---

## 🛡️ Security Patterns

### 1. Fee Guards

```typescript
transferMaxFee: BigInt('10000000000000000') // Prevent runaway gas
```

### 2. Dispose Managers

```typescript
logout() {
  this.evmManager?.dispose();
  this.tonManager?.dispose();
  this.btcManager?.dispose();
}
```

### 3. Validate Addresses

```typescript
try {
  const addr = Address.parse(recipientAddress);
} catch {
  throw new Error('Invalid address');
}
```

### 4. Check Balance + Fees

```typescript
const quote = await account.quoteSendTransaction(tx);
if (balance < amount + quote.fee) {
  throw new Error('Insufficient balance');
}
```

---

## ❌ Error Handling

### Common Error Patterns

```typescript
try {
  const result = await account.sendTransaction(tx);
} catch (error) {
  const msg = error?.message || String(error);
  
  if (msg.includes('insufficient funds'))
    return 'Insufficient balance';
  if (msg.includes('max fee'))
    return 'Fee exceeds limit';
  if (msg.includes('dust'))
    return 'Amount too small (min 294 sats)';
  if (msg.includes('network'))
    return 'Network error';
  if (msg.includes('invalid address'))
    return 'Invalid address';
    
  return msg;
}
```

---

## 🔄 Transaction Flow

```typescript
// 1. Quote (estimate fees)
const quote = await account.quoteSendTransaction({
  to: recipientAddress,
  value: amount
});

// 2. Check balance
const balance = await account.getBalance();
if (balance < amount + quote.fee) {
  throw new Error('Insufficient balance');
}

// 3. Send
const result = await account.sendTransaction({
  to: recipientAddress,
  value: amount
});

// 4. Get receipt (optional)
const receipt = await account.getTransactionReceipt(result.hash);
```

---

## 🪙 Token Operations

### ERC-20 Transfer

```typescript
// Get token balance
const balance = await account.getTokenBalance(tokenAddress);

// Quote token transfer
const quote = await account.quoteSendTokenTransaction({
  token: tokenAddress,
  to: recipientAddress,
  value: tokenAmount
});

// Send token
const result = await account.sendTokenTransaction({
  token: tokenAddress,
  to: recipientAddress,
  value: tokenAmount
});
```

### TON Jetton Transfer

```typescript
// Get jetton balance
const balance = await account.getTokenBalance(jettonMasterAddress);

// Send jetton
const result = await account.sendTokenTransaction({
  token: jettonMasterAddress,
  to: recipientAddress,
  value: jettonAmount
});
```

---

## 🔍 Account Info

### Get Transfers (History)

```typescript
// Bitcoin
const transfers = await account.getTransfers({
  direction: 'all', // 'in', 'out', or 'all'
  limit: 20
});
```

### Get Nonce (EVM)

```typescript
const nonce = await account.getNonce();
```

---

## 🌐 Network Endpoints

### Mainnet

| Chain | RPC/API Endpoint |
|-------|------------------|
| Polygon | `https://rpc.ankr.com/polygon` |
| TON | `https://toncenter.com/api/v3` |
| Bitcoin | `wss://electrum.blockstream.info:50004` |

### Testnet

| Chain | RPC/API Endpoint |
|-------|------------------|
| Mumbai | `https://rpc-mumbai.maticvigil.com/` |
| TON | `https://testnet.toncenter.com/api/v3` |
| Bitcoin | `wss://electrum.blockstream.info:60004` |

---

## 💡 Pro Tips

### 1. Timeout Wrapper

```typescript
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), ms);
  });
  return Promise.race([promise, timeout]);
};

const account = await withTimeout(manager.getAccount(0), 10000);
```

### 2. Retry Logic

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 3. Format Units

```typescript
import { formatUnits } from 'ethers';

// Wei to ETH
const eth = formatUnits(balanceWei, 18);

// Satoshi to BTC
const btc = (Number(balanceSats) / 1e8).toFixed(8);

// Nanoton to TON
const ton = (Number(balanceNano) / 1e9).toFixed(4);
```

---

## 📚 Resources

- **Documentation:** https://docs.wallet.tether.io
- **API Reference:** https://docs.wallet.tether.io/api
- **GitHub:** https://github.com/tetherto
- **Support:** https://discord.gg/tether

---

## 🤖 AI Assistant Prompts

### Good Prompts ✅

```
"Using @tetherto/wdk-wallet-evm, add ERC-20 token transfer with fee estimation"

"Review error handling in WDK service and suggest improvements based on best practices"

"Add Bitcoin transaction support using @tetherto/wdk-wallet-btc with ElectrumWs"
```

### Bad Prompts ❌

```
"Add wallet support" (too vague)
"Fix transactions" (no context)
"Use WDK" (no specific package)
```

---

## 📋 Checklist

Before deploying WDK integration:

- [ ] Set `transferMaxFee` for all chains
- [ ] Implement `dispose()` on logout
- [ ] Validate addresses before sending
- [ ] Quote transactions before sending
- [ ] Handle common errors gracefully
- [ ] Add timeout wrappers for slow RPCs
- [ ] Test on testnet first
- [ ] Never log seed phrases or private keys
- [ ] Use environment variables for RPC URLs
- [ ] Implement retry logic for network errors

---

*Quick reference for WDK v1.0.0-beta.8*  
*Last updated: March 24, 2026*
