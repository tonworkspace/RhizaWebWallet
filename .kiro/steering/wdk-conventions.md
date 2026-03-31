---
inclusion: auto
description: WDK (Wallet Development Kit) conventions, architecture patterns, security best practices, and error handling guidelines for multi-chain wallet development using @tetherto packages.
---

# WDK Development Conventions

This file provides context about Wallet Development Kit (WDK) usage in this project.

## Package Structure

All WDK packages are published under `@tetherto` scope:

- **Core:** `@tetherto/wdk`
- **Wallet Modules:** `@tetherto/wdk-wallet-<chain>`
  - `@tetherto/wdk-wallet-evm` (Ethereum, Polygon, etc.)
  - `@tetherto/wdk-wallet-btc` (Bitcoin)
  - `@tetherto/wdk-wallet-ton` (TON)
  - `@tetherto/wdk-wallet-solana` (Solana)
  - `@tetherto/wdk-wallet-tron` (TRON)
- **Specialized Wallets:**
  - `@tetherto/wdk-wallet-evm-erc4337` (Account Abstraction)
  - `@tetherto/wdk-wallet-ton-gasless` (Gasless TON)
- **Protocol Modules:** `@tetherto/wdk-protocol-<type>-<name>-<chain>`

## Current Project Usage

We use WDK for multi-chain wallet support in `services/tetherWdkService.ts`:

```typescript
import WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import WalletManagerTon from '@tetherto/wdk-wallet-ton';
import WalletManagerBtc from '@tetherto/wdk-wallet-btc';
```

### Supported Chains

1. **EVM (Polygon)**
   - Mainnet: `https://rpc.ankr.com/polygon`
   - Testnet: `https://rpc-mumbai.maticvigil.com/`
   - Max fee guard: 0.01 ETH

2. **TON (W5)**
   - Mainnet: `https://toncenter.com/api/v3`
   - Testnet: `https://testnet.toncenter.com/api/v3`
   - Max fee guard: 0.1 TON

3. **Bitcoin**
   - Mainnet: `wss://electrum.blockstream.info:50004`
   - Testnet: `wss://electrum.blockstream.info:60004`
   - Uses ElectrumWs transport (browser-compatible)

## Architecture Patterns

### Wallet Manager Lifecycle

```typescript
// 1. Initialize manager with seed phrase
const manager = new WalletManagerEvm(seedPhrase, config);

// 2. Get account (derivation path index)
const account = await manager.getAccount(0);

// 3. Use account methods
const address = await account.getAddress();
const balance = await account.getBalance();

// 4. Dispose when done (clears private keys)
manager.dispose();
```

### Transaction Pattern

```typescript
// 1. Quote first (estimate fees)
const quote = await account.quoteSendTransaction({
  to: recipientAddress,
  value: amountInWei
});

// 2. Show fees to user
console.log(`Fee: ${quote.fee}`);

// 3. Send transaction
const result = await account.sendTransaction({
  to: recipientAddress,
  value: amountInWei
});

// 4. Result contains hash and actual fee
console.log(`TX: ${result.hash}, Fee: ${result.fee}`);
```

### Error Handling

```typescript
function wdkErrorMessage(error: any, chain: string): string {
  const msg = error?.message || String(error);
  
  if (msg.includes('insufficient funds'))
    return `Insufficient ${chain} balance`;
  if (msg.includes('max fee'))
    return 'Transaction fee exceeds safety limit';
  if (msg.includes('dust'))
    return 'Amount below minimum (294 satoshis)';
  if (msg.includes('network'))
    return 'Network error. Check connection';
  if (msg.includes('invalid address'))
    return 'Invalid recipient address';
    
  return msg;
}
```

## Security Best Practices

### 1. Fee Guards

Always set `transferMaxFee` to prevent runaway gas:

```typescript
const manager = new WalletManagerEvm(seedPhrase, {
  provider: rpcUrl,
  transferMaxFee: BigInt('10000000000000000') // 0.01 ETH
});
```

### 2. Dispose Managers

Call `dispose()` to clear private keys from memory:

```typescript
logout() {
  this.evmManager?.dispose();
  this.tonManager?.dispose();
  this.btcManager?.dispose();
}
```

### 3. Validate Addresses

Always validate addresses before sending:

```typescript
try {
  const addr = Address.parse(recipientAddress);
} catch {
  throw new Error('Invalid address');
}
```

### 4. Quote Before Sending

Always quote transactions to show fees:

```typescript
const quote = await account.quoteSendTransaction(tx);
if (balance < amount + quote.fee) {
  throw new Error('Insufficient balance for amount + fees');
}
```

## Common Issues

### Issue: "Electrum connection failed"

Bitcoin requires ElectrumWs transport for browser:

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

### Issue: "Transaction fee exceeds safety limit"

Increase `transferMaxFee` or reduce transaction amount:

```typescript
const manager = new WalletManagerEvm(seedPhrase, {
  provider: rpcUrl,
  transferMaxFee: BigInt('50000000000000000') // 0.05 ETH
});
```

### Issue: "Initialization timeout"

Use timeout wrapper for slow RPC endpoints:

```typescript
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), ms);
  });
  return Promise.race([promise, timeout]);
};

const account = await withTimeout(
  manager.getAccount(0),
  10000 // 10 seconds
);
```

## Testing

### Unit Tests

```typescript
describe('WDK Service', () => {
  it('should initialize managers', async () => {
    const service = new TetherWdkService();
    const addresses = await service.initializeManagers(testMnemonic);
    
    expect(addresses.evmAddress).toBeTruthy();
    expect(addresses.tonAddress).toBeTruthy();
    expect(addresses.btcAddress).toBeTruthy();
  });
});
```

### Integration Tests

```typescript
it('should send EVM transaction', async () => {
  const result = await service.sendEvmTransaction(
    recipientAddress,
    '0.001' // ETH
  );
  
  expect(result.success).toBe(true);
  expect(result.txHash).toBeTruthy();
});
```

## Documentation

- **Official Docs:** https://docs.wallet.tether.io
- **API Reference:** https://docs.wallet.tether.io/api
- **Quickstarts:** https://docs.wallet.tether.io/quickstart
- **GitHub:** https://github.com/tetherto

## AI Assistant Guidelines

When working with WDK:

1. **Always check documentation first:** https://docs.wallet.tether.io
2. **Use exact package names:** `@tetherto/wdk-wallet-evm` not "WDK EVM"
3. **Reference current versions:** Check package.json for installed versions
4. **Follow security patterns:** Fee guards, dispose(), address validation
5. **Handle errors properly:** Use wdkErrorMessage pattern
6. **Quote before sending:** Always estimate fees first

## Example Prompts

### Good Prompts ✅

```
"Using @tetherto/wdk-wallet-evm, add ERC-20 token transfer support to tetherWdkService.ts. Check the WDK documentation for the correct API."

"Review the error handling in tetherWdkService.ts and suggest improvements based on WDK best practices."

"Add proper fee estimation to sendEvmTransaction using quoteSendTransaction. Check the WDK docs for the correct implementation."
```

### Bad Prompts ❌

```
"Add token support" (too vague)
"Fix the wallet" (no context)
"Use WDK" (no specific package or chain)
```

---

*This file is automatically loaded by Kiro for all WDK-related questions.*
