# Smart Contract Reward Distribution System

## Overview
Implement a fully decentralized reward distribution system using TON smart contracts. Users can claim rewards directly from the contract without admin intervention.

---

## 🎯 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER WALLET                          │
│  (Initiates claim transaction)                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Send claim message
                     ▼
┌─────────────────────────────────────────────────────────┐
│              REWARD DISTRIBUTION CONTRACT               │
│  ┌───────────────────────────────────────────────────┐ │
│  │ State:                                            │ │
│  │ - Total pool balance                              │ │
│  │ - User balances mapping                           │ │
│  │ - Claimed amounts mapping                         │ │
│  │ - Admin address                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Functions:                                        │ │
│  │ - claim_rewards()                                 │ │
│  │ - update_balance()                                │ │
│  │ - deposit_funds()                                 │ │
│  │ - get_claimable()                                 │ │
│  └───────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Send TON
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    USER WALLET                          │
│  (Receives reward TON)                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Smart Contract Code (FunC)

### reward_distribution.fc

```func
;; Reward Distribution Contract for RhizaCore Referral System

#include "stdlib.fc";

;; Storage structure
;; storage#_ admin_address:MsgAddress total_pool:Coins = Storage;

;; Error codes
const int error::unauthorized = 100;
const int error::insufficient_balance = 101;
const int error::invalid_amount = 102;
const int error::cooldown_active = 103;

;; Constants
const int min_claim_amount = 100000000; ;; 0.1 TON in nanotons
const int claim_cooldown = 86400; ;; 24 hours in seconds

;; Load data from storage
(slice, int) load_data() inline {
    slice ds = get_data().begin_parse();
    return (
        ds~load_msg_addr(), ;; admin_address
        ds~load_coins()     ;; total_pool
    );
}

;; Save data to storage
() save_data(slice admin_address, int total_pool) impure inline {
    set_data(
        begin_cell()
            .store_slice(admin_address)
            .store_coins(total_pool)
        .end_cell()
    );
}

;; Get user's claimable balance from off-chain database
;; In production, this would be verified through oracle or merkle proof
int get_user_claimable_balance(slice user_address) inline {
    ;; This is a placeholder - in production you would:
    ;; 1. Use an oracle to fetch data from Supabase
    ;; 2. Verify merkle proof of user's balance
    ;; 3. Check signature from trusted backend
    return 0; ;; Replace with actual implementation
}

;; Get user's last claim timestamp
int get_user_last_claim(slice user_address) inline {
    ;; Load from contract storage or use oracle
    return 0; ;; Replace with actual implementation
}

;; Main message receiver
() recv_internal(int my_balance, int msg_value, cell in_msg_full, slice in_msg_body) impure {
    if (in_msg_body.slice_empty?()) { ;; Ignore empty messages
        return ();
    }

    slice cs = in_msg_full.begin_parse();
    int flags = cs~load_uint(4);
    
    if (flags & 1) { ;; Ignore bounced messages
        return ();
    }

    slice sender_address = cs~load_msg_addr();
    
    (slice admin_address, int total_pool) = load_data();
    
    int op = in_msg_body~load_uint(32);
    
    ;; Operation: Claim Rewards (op = 1)
    if (op == 1) {
        ;; Get user's claimable amount
        int claimable = get_user_claimable_balance(sender_address);
        
        ;; Validate minimum amount
        throw_unless(error::invalid_amount, claimable >= min_claim_amount);
        
        ;; Check cooldown
        int last_claim = get_user_last_claim(sender_address);
        int current_time = now();
        throw_unless(error::cooldown_active, (current_time - last_claim) >= claim_cooldown);
        
        ;; Validate contract has sufficient balance
        throw_unless(error::insufficient_balance, my_balance >= claimable);
        
        ;; Send reward to user
        var msg = begin_cell()
            .store_uint(0x18, 6)
            .store_slice(sender_address)
            .store_coins(claimable)
            .store_uint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .store_uint(0, 32) ;; Empty message body
        .end_cell();
        
        send_raw_message(msg, 1); ;; Pay fees separately, revert on error
        
        ;; Update total pool
        total_pool -= claimable;
        save_data(admin_address, total_pool);
        
        return ();
    }
    
    ;; Operation: Deposit Funds (op = 2)
    if (op == 2) {
        ;; Anyone can deposit to increase pool
        total_pool += msg_value;
        save_data(admin_address, total_pool);
        return ();
    }
    
    ;; Operation: Update User Balance (op = 3) - Admin only
    if (op == 3) {
        throw_unless(error::unauthorized, equal_slices(sender_address, admin_address));
        
        slice user_address = in_msg_body~load_msg_addr();
        int new_balance = in_msg_body~load_coins();
        
        ;; Store user balance in contract storage
        ;; Implementation depends on storage structure
        
        return ();
    }
    
    ;; Operation: Withdraw (op = 4) - Admin only
    if (op == 4) {
        throw_unless(error::unauthorized, equal_slices(sender_address, admin_address));
        
        int amount = in_msg_body~load_coins();
        throw_unless(error::insufficient_balance, my_balance >= amount);
        
        var msg = begin_cell()
            .store_uint(0x18, 6)
            .store_slice(admin_address)
            .store_coins(amount)
            .store_uint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
        .end_cell();
        
        send_raw_message(msg, 1);
        
        total_pool -= amount;
        save_data(admin_address, total_pool);
        
        return ();
    }
}

;; Get methods for external queries

;; Get contract balance
int get_balance() method_id {
    return get_balance();
}

;; Get total pool
int get_total_pool() method_id {
    (_, int total_pool) = load_data();
    return total_pool;
}

;; Get admin address
slice get_admin() method_id {
    (slice admin_address, _) = load_data();
    return admin_address;
}
```

---

## 🔧 Frontend Integration

### services/smartContractService.ts

```typescript
import { Address, beginCell, Cell, toNano } from '@ton/core';
import { TonClient } from '@ton/ton';

const CONTRACT_ADDRESS = 'EQ...'; // Your deployed contract address

export class SmartContractRewardService {
  private client: TonClient;
  private contractAddress: Address;

  constructor() {
    this.client = new TonClient({
      endpoint: 'https://toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.VITE_TON_API_KEY
    });
    this.contractAddress = Address.parse(CONTRACT_ADDRESS);
  }

  /**
   * Get user's claimable balance from contract
   */
  async getClaimableBalance(userAddress: string): Promise<number> {
    try {
      // Call get method on contract
      const result = await this.client.runMethod(
        this.contractAddress,
        'get_user_claimable',
        [{ type: 'slice', cell: beginCell().storeAddress(Address.parse(userAddress)).endCell() }]
      );

      const balance = result.stack.readBigNumber();
      return Number(balance) / 1e9; // Convert nanotons to TON
    } catch (error) {
      console.error('Error getting claimable balance:', error);
      return 0;
    }
  }

  /**
   * Claim rewards from smart contract
   */
  async claimRewards(
    userAddress: string,
    tonConnectUI: any // TonConnect UI instance
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      // Build claim message
      const body = beginCell()
        .storeUint(1, 32) // op = 1 (claim)
        .endCell();

      // Send transaction through TonConnect
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
        messages: [
          {
            address: CONTRACT_ADDRESS,
            amount: toNano('0.05').toString(), // Gas fee
            payload: body.toBoc().toString('base64')
          }
        ]
      };

      const result = await tonConnectUI.sendTransaction(transaction);

      return {
        success: true,
        txHash: result.boc
      };
    } catch (error: any) {
      console.error('Claim error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get contract balance
   */
  async getContractBalance(): Promise<number> {
    try {
      const result = await this.client.runMethod(
        this.contractAddress,
        'get_balance'
      );

      const balance = result.stack.readBigNumber();
      return Number(balance) / 1e9;
    } catch (error) {
      console.error('Error getting contract balance:', error);
      return 0;
    }
  }

  /**
   * Deposit funds to contract (admin)
   */
  async depositFunds(
    amount: number,
    tonConnectUI: any
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      const body = beginCell()
        .storeUint(2, 32) // op = 2 (deposit)
        .endCell();

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: CONTRACT_ADDRESS,
            amount: toNano(amount).toString(),
            payload: body.toBoc().toString('base64')
          }
        ]
      };

      const result = await tonConnectUI.sendTransaction(transaction);

      return {
        success: true,
        txHash: result.boc
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const smartContractRewardService = new SmartContractRewardService();
```

---

## 🚀 Deployment Guide

### Step 1: Compile Contract

```bash
# Install FunC compiler
npm install -g @ton-community/func-js

# Compile contract
func -o reward_distribution.fif -SPA reward_distribution.fc

# Generate BOC file
fift -s reward_distribution.fif
```

### Step 2: Deploy Contract

```typescript
// deploy-contract.ts
import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { Address, toNano } from '@ton/core';
import fs from 'fs';

async function deployContract() {
  // Initialize client
  const client = new TonClient({
    endpoint: 'https://toncenter.com/api/v2/jsonRPC'
  });

  // Load deployer wallet
  const mnemonic = process.env.DEPLOYER_MNEMONIC!.split(' ');
  const key = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({
    publicKey: key.publicKey,
    workchain: 0
  });

  // Load compiled contract
  const contractCode = fs.readFileSync('reward_distribution.boc');

  // Create initial data
  const initialData = beginCell()
    .storeAddress(wallet.address) // admin address
    .storeCoins(0) // initial pool = 0
    .endCell();

  // Deploy
  const contract = client.open(wallet);
  await contract.sendTransfer({
    seqno: await contract.getSeqno(),
    secretKey: key.secretKey,
    messages: [
      internal({
        to: Address.parse('...'), // Contract address
        value: toNano('0.05'),
        init: {
          code: Cell.fromBoc(contractCode)[0],
          data: initialData
        },
        body: beginCell().endCell()
      })
    ]
  });

  console.log('Contract deployed!');
}

deployContract();
```

### Step 3: Fund Contract

```typescript
// Fund the contract with initial TON
await smartContractRewardService.depositFunds(
  100, // 100 TON
  tonConnectUI
);
```

---

## 🔄 Integration with Existing System

### Update Referral Page

```typescript
// pages/Referral.tsx
import { smartContractRewardService } from '../services/smartContractService';
import { useTonConnectUI } from '@tonconnect/ui-react';

const Referral: React.FC = () => {
  const [tonConnectUI] = useTonConnectUI();
  const [contractBalance, setContractBalance] = useState(0);

  useEffect(() => {
    loadContractBalance();
  }, []);

  const loadContractBalance = async () => {
    if (!address) return;
    const balance = await smartContractRewardService.getClaimableBalance(address);
    setContractBalance(balance);
  };

  const handleSmartContractClaim = async () => {
    if (!address) return;

    setClaiming(true);
    try {
      const result = await smartContractRewardService.claimRewards(
        address,
        tonConnectUI
      );

      if (result.success) {
        showToast('Rewards claimed successfully!', 'success');
        await loadContractBalance();
      } else {
        showToast(result.error || 'Claim failed', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setClaiming(false);
    }
  };

  return (
    // ... existing UI
    <button onClick={handleSmartContractClaim}>
      CLAIM FROM CONTRACT
    </button>
  );
};
```

---

## 🔐 Security Considerations

### 1. Oracle Integration
**Problem:** Contract needs to know user's claimable balance from off-chain database.

**Solutions:**
- **Merkle Proofs:** Store merkle root on-chain, users provide proof
- **Signed Messages:** Backend signs balance data, contract verifies signature
- **TON Oracle:** Use TON's oracle network for data feeds

### 2. Reentrancy Protection
```func
;; Add reentrancy guard
global int reentrancy_lock;

() claim_rewards() impure {
    throw_if(error::reentrancy, reentrancy_lock);
    reentrancy_lock = true;
    
    ;; ... claim logic ...
    
    reentrancy_lock = false;
}
```

### 3. Access Control
```func
;; Verify admin for sensitive operations
throw_unless(error::unauthorized, equal_slices(sender, admin));
```

### 4. Rate Limiting
```func
;; Enforce cooldown period
int last_claim = get_user_last_claim(user);
throw_unless(error::cooldown, (now() - last_claim) >= cooldown_period);
```

---

## 📊 Merkle Proof Implementation

### Backend: Generate Merkle Tree

```typescript
// services/merkleTreeService.ts
import { MerkleTree } from 'merkletreejs';
import { keccak256 } from 'ethers';

export class MerkleTreeService {
  /**
   * Generate merkle tree from user balances
   */
  static generateTree(userBalances: Map<string, number>): {
    tree: MerkleTree;
    root: string;
    proofs: Map<string, string[]>;
  } {
    // Create leaves
    const leaves = Array.from(userBalances.entries()).map(([address, balance]) => {
      return keccak256(
        Buffer.concat([
          Buffer.from(address),
          Buffer.from(balance.toString())
        ])
      );
    });

    // Build tree
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const root = tree.getHexRoot();

    // Generate proofs for each user
    const proofs = new Map<string, string[]>();
    userBalances.forEach((balance, address) => {
      const leaf = keccak256(
        Buffer.concat([
          Buffer.from(address),
          Buffer.from(balance.toString())
        ])
      );
      const proof = tree.getHexProof(leaf);
      proofs.set(address, proof);
    });

    return { tree, root, proofs };
  }

  /**
   * Update merkle root on contract
   */
  static async updateContractRoot(
    root: string,
    tonConnectUI: any
  ): Promise<boolean> {
    try {
      const body = beginCell()
        .storeUint(5, 32) // op = 5 (update root)
        .storeBuffer(Buffer.from(root, 'hex'))
        .endCell();

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: CONTRACT_ADDRESS,
            amount: toNano('0.05').toString(),
            payload: body.toBoc().toString('base64')
          }
        ]
      };

      await tonConnectUI.sendTransaction(transaction);
      return true;
    } catch (error) {
      console.error('Update root error:', error);
      return false;
    }
  }
}
```

### Contract: Verify Merkle Proof

```func
;; Verify merkle proof
int verify_merkle_proof(
    slice user_address,
    int claimed_amount,
    cell proof,
    int root
) inline {
    ;; Hash user data
    int leaf = hash_user_data(user_address, claimed_amount);
    
    ;; Verify proof
    slice ps = proof.begin_parse();
    int current = leaf;
    
    while (~ ps.slice_empty?()) {
        int sibling = ps~load_uint(256);
        current = min(current, sibling) + max(current, sibling);
        current = cell_hash(begin_cell().store_uint(current, 512).end_cell());
    }
    
    return current == root;
}
```

---

## 🧪 Testing

### Test Contract Locally

```typescript
// test/reward-contract.test.ts
import { Blockchain } from '@ton/sandbox';
import { toNano } from '@ton/core';

describe('Reward Distribution Contract', () => {
  let blockchain: Blockchain;
  let contract: any;

  beforeEach(async () => {
    blockchain = await Blockchain.create();
    contract = blockchain.openContract(/* ... */);
  });

  it('should allow user to claim rewards', async () => {
    // Setup
    const user = await blockchain.treasury('user');
    
    // Claim
    const result = await contract.sendClaim(user.getSender(), {
      value: toNano('0.05')
    });

    expect(result.transactions).toHaveTransaction({
      from: contract.address,
      to: user.address,
      success: true
    });
  });

  it('should enforce minimum claim amount', async () => {
    // Test minimum amount validation
  });

  it('should enforce cooldown period', async () => {
    // Test cooldown validation
  });
});
```

---

## 📈 Advantages of Smart Contract Approach

### Pros
1. **Trustless** - No admin intervention needed
2. **Transparent** - All transactions on-chain
3. **Instant** - Claims processed immediately
4. **Decentralized** - No single point of failure
5. **Auditable** - Anyone can verify contract logic
6. **Scalable** - Handles unlimited users

### Cons
1. **Complex** - Requires smart contract expertise
2. **Gas Costs** - Users pay transaction fees
3. **Immutable** - Hard to update after deployment
4. **Oracle Dependency** - Needs off-chain data integration
5. **Initial Setup** - Requires contract deployment and funding

---

## 💰 Cost Analysis

### Deployment Costs
- Contract deployment: ~0.5 TON
- Initial funding: 100-1000 TON (reward pool)
- Oracle setup: Variable

### Per-Claim Costs
- Gas fee: ~0.01-0.05 TON (paid by user)
- Oracle query: ~0.001 TON (if used)

### Comparison with Manual
- Manual: Admin time + transaction fees
- Smart Contract: One-time setup + user-paid gas

---

## 🚀 Implementation Roadmap

### Phase 1: Basic Contract (2-3 weeks)
- [ ] Write and test FunC contract
- [ ] Deploy to testnet
- [ ] Integrate with frontend
- [ ] Test claim flow

### Phase 2: Oracle Integration (2-3 weeks)
- [ ] Implement merkle tree system
- [ ] Backend generates proofs
- [ ] Contract verifies proofs
- [ ] Update frontend for proof submission

### Phase 3: Production Deployment (1-2 weeks)
- [ ] Security audit
- [ ] Deploy to mainnet
- [ ] Fund contract
- [ ] Monitor and optimize

### Phase 4: Advanced Features (Ongoing)
- [ ] Batch claims
- [ ] Governance
- [ ] Upgradability
- [ ] Analytics dashboard

---

## 📚 Resources

### TON Development
- [TON Docs](https://docs.ton.org/)
- [FunC Documentation](https://docs.ton.org/develop/func/overview)
- [TON SDK](https://github.com/ton-org/ton)
- [Blueprint Framework](https://github.com/ton-org/blueprint)

### Smart Contract Examples
- [TON Examples](https://github.com/ton-blockchain/ton/tree/master/crypto/smartcont)
- [Jetton Standard](https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md)

### Security
- [Smart Contract Security](https://docs.ton.org/develop/smart-contracts/security)
- [Audit Checklist](https://docs.ton.org/develop/smart-contracts/security/audit-checklist)

---

## ✅ Summary

Smart contract implementation provides:
1. Fully decentralized reward distribution
2. Trustless claims without admin
3. Transparent on-chain operations
4. Instant reward processing

**Recommended for:** Projects prioritizing decentralization and transparency
**Not recommended for:** Quick MVP or limited blockchain expertise

**Next Steps:**
1. Learn FunC programming
2. Deploy test contract
3. Integrate with frontend
4. Conduct security audit
5. Deploy to production

---

**Implementation Status:** 📋 Planning Phase
**Complexity:** 🔴 Advanced
**Timeline:** 6-8 weeks
**Cost:** ~1-2 TON + reward pool
