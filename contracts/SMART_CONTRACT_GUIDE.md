# RhizaCore Smart Contracts Guide

## Overview
Complete smart contract suite for the RhizaCore Mining Nodes & Shareholder system on TON blockchain.

---

## 📋 Contracts

### 1. **MiningNode.fc** - Core Mining Node Contract
Manages individual mining nodes with automated reward calculations.

**Features:**
- Node activation with payment verification
- Daily mining reward calculations
- Automatic expiration handling
- Ownership transfer support
- Real-time reward queries

**Storage:**
- Owner address
- Node ID, tier, price point
- Mining rate, revenue share %
- Activation/expiration timestamps
- Total mined amount
- Current status

**Operations:**
- `OP_ACTIVATE_NODE (0x1)` - Activate node after payment
- `OP_CLAIM_REWARDS (0x2)` - Claim accumulated mining rewards
- `OP_TRANSFER_OWNERSHIP (0x5)` - Transfer node to new owner

**Get Methods:**
- `get_node_id()` - Returns node ID
- `get_tier()` - Returns tier (1=Standard, 2=Premium, 3=VIP)
- `get_mining_rate()` - Returns RZC per day
- `get_total_mined()` - Returns total RZC mined
- `get_status()` - Returns current status
- `get_owner()` - Returns owner address
- `get_revenue_share()` - Returns revenue share %
- `get_pending_rewards()` - Returns (rewards, days_elapsed, current_time)

---

### 2. **ShareholderNFT.fc** - VIP Shareholder Certificate
NFT certificate for VIP tier shareholders following TEP-62 standard.

**Features:**
- Transferable ownership
- Embedded shareholder metadata
- Standard NFT compatibility
- Immutable investment details

**Storage:**
- Index, collection address
- Owner address
- Tier name (Silver/Gold/Platinum)
- Investment amount
- Mining rate, revenue share %
- Issue date, node ID
- Metadata URI

**Operations:**
- `OP_TRANSFER (0x5fcc3d14)` - Transfer NFT ownership
- `OP_GET_STATIC_DATA (0x2fcb26a2)` - Query NFT data
- `OP_GET_ROYALTY_PARAMS (0x693d3950)` - Query royalty info

**Get Methods:**
- `get_index()` - Returns NFT index
- `get_owner()` - Returns current owner
- `get_nft_data()` - Returns full NFT data
- `get_shareholder_details()` - Returns investment details
- `get_tier_name()` - Returns tier name
- `get_investment_amount()` - Returns investment in TON
- `get_revenue_share()` - Returns revenue share %
- `get_mining_rate()` - Returns mining rate
- `get_node_id()` - Returns linked node ID

---

### 3. **RevenueDistributor.fc** - Monthly Revenue Distribution
Handles monthly profit pool calculations and distributions to shareholders.

**Features:**
- Automated pool calculations (30% to shareholders, 70% to operations)
- Tier-based distribution (Silver 30%, Gold 35%, Platinum 35%)
- Individual share calculations
- Batch distribution support
- Excess fund withdrawal

**Storage:**
- Admin address
- Total pool, tier pools (Silver/Gold/Platinum)
- Shareholder counts per tier
- Month/year identifier
- Distribution status

**Operations:**
- `OP_DEPOSIT_REVENUE (0x1)` - Deposit revenue to pool
- `OP_CALCULATE_POOLS (0x2)` - Calculate tier allocations
- `OP_DISTRIBUTE_TO_SHAREHOLDER (0x3)` - Send share to shareholder
- `OP_MARK_DISTRIBUTED (0x4)` - Mark month as distributed
- `OP_WITHDRAW_EXCESS (0x5)` - Withdraw operations allocation

**Get Methods:**
- `get_total_pool()` - Returns total pool amount
- `get_tier_pools()` - Returns (silver, gold, platinum) pools
- `get_shareholder_counts()` - Returns counts per tier
- `get_individual_share(tier)` - Returns share amount for tier
- `is_distributed()` - Returns distribution status
- `get_admin()` - Returns admin address

---

## 🚀 Deployment Guide

### Prerequisites
```bash
# Install TON development tools
npm install -g @ton-community/func-js
npm install -g @ton-community/blueprint

# Or use Docker
docker pull tonlabs/compilers
```

### Step 1: Compile Contracts
```bash
# Compile FunC to Fift
func -o MiningNode.fif -SPA stdlib.fc MiningNode.fc
func -o ShareholderNFT.fif -SPA stdlib.fc ShareholderNFT.fc
func -o RevenueDistributor.fif -SPA stdlib.fc RevenueDistributor.fc

# Compile Fift to BOC
fift -s MiningNode.fif
fift -s ShareholderNFT.fif
fift -s RevenueDistributor.fif
```

### Step 2: Deploy to Testnet
```typescript
import { TonClient, WalletContractV4, internal } from "ton";
import { mnemonicToPrivateKey } from "ton-crypto";

// Initialize client
const client = new TonClient({
  endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
  apiKey: "your-api-key"
});

// Load wallet
const mnemonic = "your mnemonic phrase here";
const key = await mnemonicToPrivateKey(mnemonic.split(" "));
const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });

// Deploy MiningNode
const miningNodeCode = Cell.fromBoc(fs.readFileSync("MiningNode.boc"))[0];
const miningNodeData = beginCell()
  .storeAddress(wallet.address) // owner
  .storeUint(1, 64) // node_id
  .storeUint(1, 8) // tier (Standard)
  .storeCoins(toNano("100")) // price_point
  .storeUint(10, 32) // mining_rate
  .storeUint(0, 8) // revenue_share
  .storeUint(0, 32) // activated_at
  .storeUint(0, 32) // expires_at
  .storeCoins(0) // total_mined
  .storeUint(0, 32) // last_claim
  .storeUint(0, 8) // status (pending)
  .endCell();

const miningNodeContract = contractAddress(0, {
  code: miningNodeCode,
  data: miningNodeData
});

await wallet.sendTransfer({
  seqno: await wallet.getSeqno(),
  secretKey: key.secretKey,
  messages: [internal({
    to: miningNodeContract,
    value: toNano("0.05"),
    init: {
      code: miningNodeCode,
      data: miningNodeData
    }
  })]
});
```

### Step 3: Deploy to Mainnet
Same as testnet but use mainnet endpoint:
```typescript
const client = new TonClient({
  endpoint: "https://toncenter.com/api/v2/jsonRPC",
  apiKey: "your-mainnet-api-key"
});
```

---

## 💻 Integration with Frontend

### 1. Purchase Mining Node
```typescript
import { TonConnectUI } from '@tonconnect/ui-react';

async function purchaseNode(nodeId: number, tier: number, pricePoint: number) {
  const tonConnect = new TonConnectUI();
  
  // Prepare transaction
  const transaction = {
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [
      {
        address: MINING_NODE_CONTRACT_ADDRESS,
        amount: (pricePoint * 1e9).toString(), // Convert to nanotons
        payload: beginCell()
          .storeUint(0x1, 32) // OP_ACTIVATE_NODE
          .storeUint(nodeId, 64)
          .storeUint(tier, 8)
          .endCell()
          .toBoc()
          .toString('base64')
      }
    ]
  };
  
  // Send transaction
  const result = await tonConnect.sendTransaction(transaction);
  return result;
}
```

### 2. Claim Mining Rewards
```typescript
async function claimRewards(nodeContractAddress: string) {
  const tonConnect = new TonConnectUI();
  
  const transaction = {
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [
      {
        address: nodeContractAddress,
        amount: "50000000", // 0.05 TON for gas
        payload: beginCell()
          .storeUint(0x2, 32) // OP_CLAIM_REWARDS
          .endCell()
          .toBoc()
          .toString('base64')
      }
    ]
  };
  
  const result = await tonConnect.sendTransaction(transaction);
  return result;
}
```

### 3. Query Node Status
```typescript
import { Address, TonClient } from 'ton';

async function getNodeStatus(nodeAddress: string) {
  const client = new TonClient({
    endpoint: "https://toncenter.com/api/v2/jsonRPC"
  });
  
  const address = Address.parse(nodeAddress);
  
  // Get node data
  const nodeId = await client.runMethod(address, 'get_node_id');
  const tier = await client.runMethod(address, 'get_tier');
  const miningRate = await client.runMethod(address, 'get_mining_rate');
  const totalMined = await client.runMethod(address, 'get_total_mined');
  const status = await client.runMethod(address, 'get_status');
  const pendingRewards = await client.runMethod(address, 'get_pending_rewards');
  
  return {
    nodeId: nodeId.stack.readNumber(),
    tier: tier.stack.readNumber(),
    miningRate: miningRate.stack.readNumber(),
    totalMined: totalMined.stack.readBigNumber(),
    status: status.stack.readNumber(),
    pendingRewards: {
      amount: pendingRewards.stack.readBigNumber(),
      daysElapsed: pendingRewards.stack.readNumber(),
      timestamp: pendingRewards.stack.readNumber()
    }
  };
}
```

### 4. Mint Shareholder NFT
```typescript
async function mintShareholderNFT(
  tier: string,
  investmentAmount: number,
  miningRate: number,
  revenueShare: number,
  nodeId: number
) {
  // Prepare NFT metadata
  const metadata = {
    name: `RhizaCore ${tier} Shareholder`,
    description: `Exclusive $${investmentAmount} VIP Shareholder Certificate`,
    image: `ipfs://.../${tier.toLowerCase()}-certificate.png`,
    attributes: [
      { trait_type: "Tier", value: tier },
      { trait_type: "Investment", value: `$${investmentAmount}` },
      { trait_type: "Mining Rate", value: `${miningRate} RZC/day` },
      { trait_type: "Revenue Share", value: `${revenueShare}%` },
      { trait_type: "Node ID", value: nodeId.toString() },
      { trait_type: "Issue Date", value: new Date().toISOString() }
    ]
  };
  
  // Upload metadata to IPFS
  const metadataUri = await uploadToIPFS(metadata);
  
  // Deploy NFT contract
  const nftData = beginCell()
    .storeUint(nodeId, 64) // index
    .storeAddress(COLLECTION_ADDRESS)
    .storeAddress(ownerAddress)
    .storeRef(beginCell().storeStringTail(tier).endCell())
    .storeCoins(toNano(investmentAmount))
    .storeUint(miningRate, 32)
    .storeUint(revenueShare, 8)
    .storeUint(Math.floor(Date.now() / 1000), 32)
    .storeUint(nodeId, 64)
    .storeRef(beginCell().storeStringTail(metadataUri).endCell())
    .endCell();
  
  // Deploy NFT
  // ... deployment code
}
```

---

## 🧪 Testing

### Unit Tests
```typescript
import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { toNano } from 'ton-core';

describe('MiningNode', () => {
  let blockchain: Blockchain;
  let miningNode: SandboxContract<MiningNode>;
  
  beforeEach(async () => {
    blockchain = await Blockchain.create();
    miningNode = blockchain.openContract(await MiningNode.fromInit());
  });
  
  it('should activate node with correct payment', async () => {
    const result = await miningNode.send(
      deployer.getSender(),
      { value: toNano('100') },
      { $$type: 'ActivateNode' }
    );
    
    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: miningNode.address,
      success: true
    });
    
    const status = await miningNode.getStatus();
    expect(status).toBe(1); // STATUS_ACTIVE
  });
  
  it('should calculate rewards correctly', async () => {
    // Activate node
    await miningNode.send(
      deployer.getSender(),
      { value: toNano('100') },
      { $$type: 'ActivateNode' }
    );
    
    // Fast forward 1 day
    blockchain.now = blockchain.now + 86400;
    
    // Check pending rewards
    const rewards = await miningNode.getPendingRewards();
    expect(rewards.amount).toBe(10n * 1000000000n); // 10 RZC
  });
});
```

---

## 📊 Gas Costs (Estimated)

| Operation | Gas Cost (TON) |
|-----------|----------------|
| Deploy MiningNode | ~0.05 |
| Activate Node | ~0.02 |
| Claim Rewards | ~0.01 |
| Transfer Node | ~0.015 |
| Deploy NFT | ~0.08 |
| Transfer NFT | ~0.02 |
| Deposit Revenue | ~0.005 |
| Calculate Pools | ~0.01 |
| Distribute Share | ~0.008 |

---

## 🔒 Security Considerations

### 1. Access Control
- All admin functions check sender address
- Node operations verify ownership
- Revenue distribution restricted to admin

### 2. Reentrancy Protection
- No external calls before state updates
- Use `send_raw_message` with mode 1 (pay fees separately)

### 3. Integer Overflow
- FunC handles big integers natively
- All calculations use safe arithmetic

### 4. Expiration Handling
- Nodes check expiration before operations
- VIP nodes have lifetime access (expires_at = 0)

### 5. Payment Verification
- Activation requires exact payment amount
- Insufficient payments rejected with error

---

## 📝 Audit Checklist

- [ ] All error codes properly defined
- [ ] Access control on sensitive functions
- [ ] Integer overflow protection
- [ ] Reentrancy protection
- [ ] Gas optimization
- [ ] Event emission for tracking
- [ ] Proper storage management
- [ ] Edge case handling
- [ ] Testnet deployment successful
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Security audit completed

---

## 🔗 Resources

- [TON Documentation](https://ton.org/docs)
- [FunC Language Guide](https://ton.org/docs/develop/func/overview)
- [TON NFT Standard (TEP-62)](https://github.com/ton-blockchain/TEPs/blob/master/text/0062-nft-standard.md)
- [TON Connect](https://docs.ton.org/develop/dapps/ton-connect/overview)
- [Blueprint Framework](https://github.com/ton-community/blueprint)

---

## 🆘 Support

For contract-related issues:
1. Check error codes in contract source
2. Review transaction logs on TON Explorer
3. Test on testnet first
4. Contact RhizaCore dev team

---

## 📜 License

MIT License - See LICENSE file for details
