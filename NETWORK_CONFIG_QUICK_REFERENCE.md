# TON Network Configuration - Quick Reference

## Import What You Need

```typescript
import { 
  TON_NETWORK,
  NetworkType,
  getNetworkConfig,
  getExplorerUrl,
  getTransactionUrl,
  getMiningContractAddress,
  getApiEndpoint,
  getApiKey,
  getTonApiKey
} from '../constants';
```

---

## Common Use Cases

### 1. Get Current Network Config
```typescript
import { useWallet } from '../context/WalletContext';
import { getNetworkConfig } from '../constants';

const { network } = useWallet();
const config = getNetworkConfig(network);

// Access config properties
config.NAME              // "Mainnet" or "Testnet"
config.API_ENDPOINT      // RPC endpoint URL
config.API_KEY           // TonCenter API key
config.TONAPI_KEY        // TonAPI bearer token
config.EXPLORER_URL      // Block explorer URL
config.CHAIN_ID          // -239 (mainnet) or -3 (testnet)
config.MINING_CONTRACT_ADDRESS  // Mining contract address
config.DEPOSIT_ADDRESS   // Deposit address
```

### 2. Make API Calls
```typescript
import { getApiEndpoint, getApiKey } from '../constants';
import { useWallet } from '../context/WalletContext';

const { network } = useWallet();
const endpoint = getApiEndpoint(network);
const apiKey = getApiKey(network);

const response = await fetch(`${endpoint}?api_key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'getAddressBalance',
    params: { address: walletAddress }
  })
});
```

### 3. Link to Block Explorer
```typescript
import { getExplorerUrl } from '../constants';
import { useWallet } from '../context/WalletContext';

const { network, address } = useWallet();
const explorerUrl = getExplorerUrl(address, network);

// Use in JSX
<a href={explorerUrl} target="_blank" rel="noopener noreferrer">
  View on Explorer
</a>
```

### 4. Link to Transaction
```typescript
import { getTransactionUrl } from '../constants';

const txUrl = getTransactionUrl(transactionHash, network);

<a href={txUrl} target="_blank" rel="noopener noreferrer">
  View Transaction
</a>
```

### 5. Get Mining Contract
```typescript
import { getMiningContractAddress } from '../constants';

const contractAddress = getMiningContractAddress(network);

// Use for contract interactions
await tonWalletService.callContract(contractAddress, 'mine', params);
```

### 6. Switch Networks
```typescript
import { useWallet } from '../context/WalletContext';

const { network, switchNetwork } = useWallet();

// Switch to opposite network
const handleSwitch = async () => {
  const newNetwork = network === 'mainnet' ? 'testnet' : 'mainnet';
  await switchNetwork(newNetwork);
};
```

---

## Network Configurations

### Mainnet
```typescript
TON_NETWORK.MAINNET = {
  NAME: 'Mainnet',
  CHAIN_ID: -239,
  API_ENDPOINT: 'https://toncenter.com/api/v2/jsonRPC',
  API_KEY: '26197ebc36a041a5546d69739da830635ed339c0d8274bdd72027ccbff4f4234',
  EXPLORER_URL: 'https://tonviewer.com',
  MINING_CONTRACT_ADDRESS: 'EQCPMcE76o6NyVM-BGxvc6Qdx3DjvpJAT5ALQ_e9p9p6Qj2f',
  // ... more properties
}
```

### Testnet
```typescript
TON_NETWORK.TESTNET = {
  NAME: 'Testnet',
  CHAIN_ID: -3,
  API_ENDPOINT: 'https://testnet.toncenter.com/api/v2/jsonRPC',
  API_KEY: 'd682d9b65115976e52f63713d6dd59567e47eaaa1dc6067fe8a89d537dd29c2c',
  EXPLORER_URL: 'https://testnet.tonviewer.com',
  MINING_CONTRACT_ADDRESS: 'EQCPMcE76o6NyVM-BGxvc6Qdx3DjvpJAT5ALQ_e9p9p6Qj2f',
  // ... more properties
}
```

---

## Environment Variables

Override defaults in `.env.local`:

```bash
# Mining Contracts
VITE_STARFI_MINING_CONTRACT_MAINNET=EQC...
VITE_STARFI_MINING_CONTRACT_TESTNET=EQC...

# TonAPI Keys (optional)
VITE_TONAPI_KEY_MAINNET=AHZ...
VITE_TONAPI_KEY_TESTNET=AHZ...
```

---

## API Endpoints

### Mainnet Endpoints (in order of priority)
1. `https://toncenter.com/api/v2/jsonRPC` (primary)
2. `https://tonapi.io/v2/jsonRPC`
3. `https://mainnet.tonhubapi.com/jsonRPC`
4. `https://mainnet-v4.tonhubapi.com/jsonRPC`

### Testnet Endpoints (in order of priority)
1. `https://testnet.toncenter.com/api/v2/jsonRPC` (primary)
2. `https://testnet.tonapi.io/v2/jsonRPC`
3. `https://testnet-v4.tonhubapi.com/jsonRPC`
4. `https://testnet.tonhubapi.com/jsonRPC`

---

## Type Definitions

```typescript
export type NetworkType = 'mainnet' | 'testnet';

interface NetworkConfig {
  DEPOSIT_ADDRESS: string;
  MINING_CONTRACT_ADDRESS: string;
  API_KEY: string;
  TONAPI_KEY: string;
  API_ENDPOINTS: string[];
  API_ENDPOINT: string;
  NAME: string;
  EXPLORER_URL: string;
  CHAIN_ID: number;
}
```

---

## Helper Functions Reference

### getNetworkConfig(networkType)
Returns complete network configuration object.

**Parameters:**
- `networkType: NetworkType` - 'mainnet' or 'testnet'

**Returns:** `NetworkConfig`

**Example:**
```typescript
const config = getNetworkConfig('mainnet');
console.log(config.NAME); // "Mainnet"
```

---

### getExplorerUrl(address, networkType)
Returns block explorer URL for an address.

**Parameters:**
- `address: string` - Wallet or contract address
- `networkType: NetworkType` - 'mainnet' or 'testnet'

**Returns:** `string`

**Example:**
```typescript
const url = getExplorerUrl('EQA1...', 'mainnet');
// https://tonviewer.com/EQA1...
```

---

### getTransactionUrl(hash, networkType)
Returns block explorer URL for a transaction.

**Parameters:**
- `hash: string` - Transaction hash
- `networkType: NetworkType` - 'mainnet' or 'testnet'

**Returns:** `string`

**Example:**
```typescript
const url = getTransactionUrl('abc123...', 'testnet');
// https://testnet.tonviewer.com/transaction/abc123...
```

---

### getMiningContractAddress(networkType)
Returns mining contract address for network.

**Parameters:**
- `networkType: NetworkType` - 'mainnet' or 'testnet'

**Returns:** `string`

**Example:**
```typescript
const address = getMiningContractAddress('mainnet');
// EQCPMcE76o6NyVM-BGxvc6Qdx3DjvpJAT5ALQ_e9p9p6Qj2f
```

---

### getApiEndpoint(networkType)
Returns primary RPC endpoint for network.

**Parameters:**
- `networkType: NetworkType` - 'mainnet' or 'testnet'

**Returns:** `string`

**Example:**
```typescript
const endpoint = getApiEndpoint('testnet');
// https://testnet.toncenter.com/api/v2/jsonRPC
```

---

### getApiKey(networkType)
Returns TonCenter API key for network.

**Parameters:**
- `networkType: NetworkType` - 'mainnet' or 'testnet'

**Returns:** `string`

**Example:**
```typescript
const apiKey = getApiKey('mainnet');
// 26197ebc36a041a5546d69739da830635ed339c0d8274bdd72027ccbff4f4234
```

---

### getTonApiKey(networkType)
Returns TonAPI bearer token for network.

**Parameters:**
- `networkType: NetworkType` - 'mainnet' or 'testnet'

**Returns:** `string`

**Example:**
```typescript
const tonApiKey = getTonApiKey('mainnet');
// AHZ25K6GOTNFOVQAAAAGWQBCDALGUCPWSHPKL2KQBMUPYIZ4XTQ6ZKHEEONHPY57RXQWUCI
```

---

## Best Practices

### 1. Always Use Helper Functions
❌ **Don't:**
```typescript
const endpoint = network === 'mainnet' 
  ? 'https://toncenter.com/api/v2/jsonRPC'
  : 'https://testnet.toncenter.com/api/v2/jsonRPC';
```

✅ **Do:**
```typescript
const endpoint = getApiEndpoint(network);
```

### 2. Get Network from Context
❌ **Don't:**
```typescript
const network = 'mainnet'; // Hardcoded
```

✅ **Do:**
```typescript
const { network } = useWallet();
```

### 3. Use Type-Safe Network Type
❌ **Don't:**
```typescript
const network: string = 'mainnet';
```

✅ **Do:**
```typescript
const network: NetworkType = 'mainnet';
```

### 4. Handle Network Switching
❌ **Don't:**
```typescript
localStorage.setItem('network', 'mainnet');
```

✅ **Do:**
```typescript
await switchNetwork('mainnet');
```

---

## Common Patterns

### Pattern 1: Network-Aware Component
```typescript
import { useWallet } from '../context/WalletContext';
import { getNetworkConfig, getExplorerUrl } from '../constants';

const MyComponent = () => {
  const { network, address } = useWallet();
  const config = getNetworkConfig(network);
  const explorerUrl = getExplorerUrl(address, network);
  
  return (
    <div>
      <p>Network: {config.NAME}</p>
      <a href={explorerUrl}>View on Explorer</a>
    </div>
  );
};
```

### Pattern 2: API Call with Network
```typescript
const fetchBalance = async (address: string, network: NetworkType) => {
  const endpoint = getApiEndpoint(network);
  const apiKey = getApiKey(network);
  
  const response = await fetch(`${endpoint}?api_key=${apiKey}`, {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'getAddressBalance',
      params: { address }
    })
  });
  
  return response.json();
};
```

### Pattern 3: Conditional Rendering by Network
```typescript
const { network } = useWallet();

return (
  <div>
    {network === 'testnet' && (
      <div className="warning">
        ⚠️ You're on testnet - transactions use test TON
      </div>
    )}
    {network === 'mainnet' && (
      <div className="info">
        ✅ You're on mainnet - transactions use real TON
      </div>
    )}
  </div>
);
```

---

## Troubleshooting

### Issue: Network not switching
**Solution:** Check that `switchNetwork()` is being awaited:
```typescript
await switchNetwork('mainnet'); // ✅ Correct
switchNetwork('mainnet'); // ❌ Wrong
```

### Issue: Wrong API endpoint
**Solution:** Always use `getApiEndpoint()`:
```typescript
const endpoint = getApiEndpoint(network); // ✅ Correct
const endpoint = TON_NETWORK.MAINNET.API_ENDPOINT; // ❌ Wrong
```

### Issue: Explorer links not working
**Solution:** Pass network type to helper:
```typescript
const url = getExplorerUrl(address, network); // ✅ Correct
const url = `https://tonviewer.com/${address}`; // ❌ Wrong
```

---

## Quick Checklist

When adding network-aware features:

- [ ] Import `NetworkType` from constants
- [ ] Get `network` from `useWallet()`
- [ ] Use helper functions (don't hardcode)
- [ ] Handle both mainnet and testnet
- [ ] Test network switching
- [ ] Add console logging for debugging
- [ ] Handle API errors gracefully
- [ ] Show network indicator in UI

---

**Last Updated:** February 21, 2026  
**Version:** 1.0.0
