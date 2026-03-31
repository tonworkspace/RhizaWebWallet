# WDK AI Integration Guide

**Enhance Your Development with AI-Powered WDK Assistance**

This guide shows you how to connect WDK documentation to AI coding assistants for context-aware code generation, architecture guidance, and debugging help.

---

## Overview

The Wallet Development Kit (WDK) documentation is optimized for AI coding assistants. By connecting your AI tool to WDK docs, you get:

- ✅ Accurate code generation based on latest WDK APIs
- ✅ Architecture guidance for multi-chain wallets
- ✅ Debugging help with WDK-specific issues
- ✅ Up-to-date package references and patterns

---

## Option 1: MCP Server (Recommended for Kiro/Cursor)

The WDK documentation is available as an MCP (Model Context Protocol) server, giving your AI tool searchable access to all modules, API references, quickstarts, and guides.

### MCP Server URL
```
https://docs.wallet.tether.io/~gitbook/mcp
```

### Setup for Kiro

Since you're using Kiro, you can add the WDK docs MCP server to your configuration:

1. **Create/Edit MCP Configuration**

Create or edit `.kiro/settings/mcp.json` in your workspace:

```json
{
  "mcpServers": {
    "wdk-docs": {
      "command": "node",
      "args": ["-e", "require('http').createServer((req,res)=>{res.writeHead(200);res.end('MCP Proxy')}).listen(process.env.PORT||3000)"],
      "env": {
        "MCP_SERVER_URL": "https://docs.wallet.tether.io/~gitbook/mcp"
      },
      "disabled": false,
      "autoApprove": ["search_docs", "get_page", "list_pages"]
    }
  }
}
```

2. **Activate the MCP Server**

Use Kiro's MCP management:
```
Open Command Palette → "MCP: Reconnect Servers"
```

3. **Verify Connection**

Ask Kiro:
```
"Search the WDK documentation for how to initialize a multi-chain wallet"
```

---

## Option 2: Project Rules (Recommended for All Tools)

Project rules give your AI assistant persistent context about WDK conventions, package naming, and common patterns.

### Setup for Kiro

Create `.kiro/steering/wdk-conventions.md`:

```markdown
---
inclusion: auto
---

# WDK Development Rules

## Package Structure
- All WDK packages are published under the `@tetherto` scope on npm
- Core module: `@tetherto/wdk`
- Wallet modules follow the pattern: `@tetherto/wdk-wallet-<chain>`
  - Examples: `@tetherto/wdk-wallet-evm`, `@tetherto/wdk-wallet-btc`, `@tetherto/wdk-wallet-solana`, `@tetherto/wdk-wallet-ton`, `@tetherto/wdk-wallet-tron`
- Specialized wallet modules: 
  - `@tetherto/wdk-wallet-evm-erc4337` (Account Abstraction)
  - `@tetherto/wdk-wallet-ton-gasless` (Gasless TON)
  - `@tetherto/wdk-wallet-tron-gasfree` (Gas-free TRON)
- Protocol modules follow the pattern: `@tetherto/wdk-protocol-<type>-<name>-<chain>`
  - Examples: 
    - `@tetherto/wdk-protocol-swap-velora-evm`
    - `@tetherto/wdk-protocol-bridge-usdt0-evm`
    - `@tetherto/wdk-protocol-lending-aave-evm`

## Platform Notes
- **Node.js/Bare:** Use `@tetherto/wdk` as orchestrator, register wallet modules
- **React Native:** Two options:
  1. Use React Native provider package (provides hooks and managed lifecycle)
  2. Use WDK packages directly in Hermes runtime (same as Node.js)
- **Browser:** Use individual wallet modules directly (no orchestrator needed)

## Architecture Patterns
- WDK is modular - each blockchain and protocol is a separate npm package
- Wallet modules expose:
  - `WalletManager` - Creates and manages wallet accounts
  - `WalletAccount` - Full wallet with read + write methods
  - `WalletAccountReadOnly` - Read-only wallet (no signing)
- `WalletAccount` extends `WalletAccountReadOnly`
- All modules follow: configuration → initialization → usage

## Common Patterns

### Wallet Initialization
```typescript
import WalletManagerEvm from '@tetherto/wdk-wallet-evm';

const manager = new WalletManagerEvm(seedPhrase, {
  provider: 'https://rpc.ankr.com/polygon',
  transferMaxFee: BigInt('10000000000000000') // 0.01 ETH max
});

const account = await manager.getAccount(0);
```

### Transaction Sending
```typescript
// Quote first (estimate fees)
const quote = await account.quoteSendTransaction({
  to: recipientAddress,
  value: amountInWei
});

// Then send
const result = await account.sendTransaction({
  to: recipientAddress,
  value: amountInWei
});
// Returns: { hash: string, fee: bigint }
```

### Error Handling
```typescript
try {
  const result = await account.sendTransaction(tx);
} catch (error) {
  const msg = error?.message || String(error);
  
  if (msg.includes('insufficient funds')) {
    // Handle insufficient balance
  } else if (msg.includes('max fee')) {
    // Handle fee limit exceeded
  } else if (msg.includes('network')) {
    // Handle network errors
  }
}
```

## Security Best Practices
- Always use `transferMaxFee` to prevent runaway gas costs
- Call `dispose()` on managers when done to clear private keys
- Never log seed phrases or private keys
- Use `quoteSendTransaction()` before sending to show fees to users
- Validate addresses before sending transactions

## Documentation
- Official docs: https://docs.wallet.tether.io
- For any WDK question, consult official documentation first
- API references available for every module
- Check AGENTS.md in WDK package repos for additional context

## Current Project Usage
We use WDK for multi-chain wallet support:
- EVM (Polygon): `@tetherto/wdk-wallet-evm`
- TON (W5): `@tetherto/wdk-wallet-ton`
- Bitcoin: `@tetherto/wdk-wallet-btc`

See `services/tetherWdkService.ts` for our implementation.
```

This file will be automatically loaded by Kiro and provide context for all WDK-related questions.

---

## Option 3: Direct Markdown Access (Fallback)

If MCP isn't available, you can fetch WDK documentation directly:

### Available Endpoints

1. **Index of all pages:**
   ```
   https://docs.wallet.tether.io/~gitbook/index.json
   ```

2. **Complete documentation:**
   ```
   https://docs.wallet.tether.io/~gitbook/all.md
   ```

3. **Individual pages:**
   ```
   https://docs.wallet.tether.io/<page-path>.md
   ```

### Usage Example

```typescript
// Fetch specific documentation
const response = await fetch('https://docs.wallet.tether.io/wallet-modules/evm.md');
const markdown = await response.text();

// Use in AI prompt
const prompt = `
Based on this WDK documentation:

${markdown}

How do I send an ERC-20 token transaction?
`;
```

---

## Example Prompts for AI Assistance

### 1. Multi-Chain Wallet Creation

```
Create a TypeScript service that:
1. Uses @tetherto/wdk-wallet-evm for Polygon
2. Uses @tetherto/wdk-wallet-ton for TON
3. Uses @tetherto/wdk-wallet-btc for Bitcoin
4. Initializes all three from a single 12-word mnemonic
5. Provides methods to get addresses and balances for each chain
6. Includes proper error handling and fee guards

Check the WDK documentation for the correct initialization pattern.
```

### 2. Transaction Sending

```
Using @tetherto/wdk-wallet-evm, create a function that:
1. Quotes a transaction first to show fees
2. Validates the recipient address
3. Checks balance including fees
4. Sends the transaction
5. Handles common errors (insufficient funds, network issues, etc.)
6. Returns transaction hash and actual fee paid

Follow WDK best practices for error handling.
```

### 3. Token Transfer

```
How do I send USDT (ERC-20) on Polygon using WDK?
Include:
1. Getting the token balance
2. Quoting the transfer fee
3. Sending the token
4. Error handling

Check the WDK EVM wallet documentation for the correct API.
```

### 4. Debugging

```
I'm getting this error when sending a TON transaction:
"Transaction fee exceeds the safety limit"

My code:
[paste your code]

Check the WDK TON wallet documentation and suggest a fix.
```

---

## Tips for Effective AI-Assisted WDK Development

### 1. Be Specific About the Chain

❌ Bad:
```
"How do I send a transaction with WDK?"
```

✅ Good:
```
"How do I send a transaction on Polygon using @tetherto/wdk-wallet-evm?"
```

### 2. Reference Exact Package Names

❌ Bad:
```
"Use the WDK EVM package"
```

✅ Good:
```
"Use @tetherto/wdk-wallet-evm version 1.0.0-beta.8"
```

### 3. Ask AI to Check Docs First

❌ Bad:
```
"How do I initialize a wallet?"
```

✅ Good:
```
"Check the WDK documentation before answering: How do I initialize a wallet with @tetherto/wdk-wallet-evm?"
```

### 4. Iterate in Steps

❌ Bad:
```
"Build a complete multi-chain wallet app with swap functionality"
```

✅ Good:
```
Step 1: "Create a basic multi-chain wallet service with EVM and TON"
Step 2: "Add balance fetching for both chains"
Step 3: "Add transaction sending with fee estimation"
Step 4: "Add swap protocol integration"
```

### 5. Provide Context

❌ Bad:
```
"Fix this error"
```

✅ Good:
```
"I'm using @tetherto/wdk-wallet-btc on testnet. Getting this error when sending:
[error message]

My configuration:
[paste config]

Check the WDK Bitcoin wallet documentation for the correct setup."
```

---

## Integration with Your Current Project

### Current WDK Usage

Your project already uses WDK in `services/tetherWdkService.ts`:

```typescript
import WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import WalletManagerTon from '@tetherto/wdk-wallet-ton';
import WalletManagerBtc from '@tetherto/wdk-wallet-btc';
```

### Recommended AI Prompts for Your Project

1. **Improve Error Handling:**
```
Review services/tetherWdkService.ts and suggest improvements to error handling based on WDK best practices. Check the WDK documentation for recommended error patterns.
```

2. **Add Fee Estimation:**
```
Add proper fee estimation to all transaction methods in tetherWdkService.ts using WDK's quoteSendTransaction API. Check the documentation for the correct implementation.
```

3. **Optimize Initialization:**
```
Review the initializeManagers method in tetherWdkService.ts. Check WDK documentation and suggest optimizations for faster initialization and better error handling.
```

4. **Add Token Support:**
```
Add ERC-20 token transfer support to tetherWdkService.ts using @tetherto/wdk-wallet-evm. Check the WDK documentation for the getTokenBalance and sendTokenTransaction APIs.
```

---

## Advanced: WDK MCP Toolkit

For AI agents that need wallet access, WDK provides an MCP Toolkit that exposes wallets as tools:

### What It Does

- Lets AI agents check balances
- Send transactions
- Swap tokens
- Interact with DeFi protocols

### Setup

```bash
npm install @tetherto/wdk-mcp-toolkit
```

```typescript
import { createWdkMcpServer } from '@tetherto/wdk-mcp-toolkit';

const server = createWdkMcpServer({
  wallets: {
    evm: evmManager,
    ton: tonManager,
    btc: btcManager
  }
});
```

See: https://docs.wallet.tether.io/mcp-toolkit

---

## Advanced: x402 Protocol Integration

For AI agents that need to pay for resources, WDK supports the x402 protocol for instant USD₮ payments over HTTP.

### What It Does

- AI agents can pay for API calls
- Instant, programmatic payments
- Uses WDK wallets for payment

### Setup

See: https://docs.wallet.tether.io/x402

---

## Troubleshooting

### MCP Server Not Connecting

1. Check MCP configuration path:
   ```
   .kiro/settings/mcp.json
   ```

2. Verify server URL:
   ```
   https://docs.wallet.tether.io/~gitbook/mcp
   ```

3. Reconnect servers:
   ```
   Command Palette → "MCP: Reconnect Servers"
   ```

### AI Not Using Latest WDK APIs

1. Explicitly mention in prompt:
   ```
   "Check the WDK documentation before answering"
   ```

2. Reference specific package version:
   ```
   "@tetherto/wdk-wallet-evm version 1.0.0-beta.8"
   ```

3. Provide documentation link:
   ```
   "See https://docs.wallet.tether.io/wallet-modules/evm"
   ```

### Outdated Code Generation

If AI generates code using old patterns:

1. Add project rules (see Option 2 above)
2. Reference AGENTS.md from WDK repos
3. Explicitly ask to check documentation

---

## Resources

- **WDK Documentation:** https://docs.wallet.tether.io
- **MCP Server:** https://docs.wallet.tether.io/~gitbook/mcp
- **GitHub:** https://github.com/tetherto
- **MCP Toolkit:** https://docs.wallet.tether.io/mcp-toolkit
- **x402 Protocol:** https://docs.wallet.tether.io/x402

---

## Quick Start Checklist

- [ ] Add WDK steering file to `.kiro/steering/wdk-conventions.md`
- [ ] Configure MCP server in `.kiro/settings/mcp.json` (optional)
- [ ] Test AI assistance with example prompt
- [ ] Update existing WDK code with AI suggestions
- [ ] Add WDK documentation links to your README

---

*Last Updated: March 24, 2026*  
*WDK Version: 1.0.0-beta.8*
