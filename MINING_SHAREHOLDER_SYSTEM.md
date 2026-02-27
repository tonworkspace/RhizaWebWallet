# RhizaCore Mining & Shareholder Ecosystem Integration

## Overview
Transform RhizaCore from simple mining to a comprehensive Node & Shareholder ecosystem with three tiers: Standard, Premium, and VIP (Shareholders).

---

## 🏗️ Tier Structure

### 🔹 Tier 1: Standard (Entry Miners)
**Price Points:** $100 | $200 | $300 | $400  
**Activation Fee:** $15 (One-time)  
**Target:** Retail miners seeking consistent daily $RZC gains

**Benefits:**
- Base Mining Speed (scaled by price point)
- Daily Liquidated Asset access
- Standard Referral commissions (5% direct, 2% indirect)
- Basic dashboard access

**Mining Rates:**
- $100 Node: 10 RZC/day
- $200 Node: 25 RZC/day
- $300 Node: 40 RZC/day
- $400 Node: 60 RZC/day

---

### 🔸 Tier 2: Premium (Power Miners)
**Price Points:** $500 | $600 | $700 | $1000  
**Activation Fee:** $45  
**Target:** Serious participants aiming for high-yield mining

**Benefits:**
- Advanced Hash Power (2x Standard rates)
- Priority Liquidity (Instant withdrawals)
- Early Access to beta features
- Enhanced Referral commissions (7% direct, 3% indirect)
- Premium support

**Mining Rates:**
- $500 Node: 100 RZC/day
- $600 Node: 130 RZC/day
- $700 Node: 160 RZC/day
- $1000 Node: 250 RZC/day

---

### 💎 Tier 3: VIP (Shareholders)
**Price Points:** $2,000 | $5,000 | $10,000  
**Activation Fee:** $120  
**Target:** Institutional-level backers and ecosystem partners

**Monthly Shareholder Benefits:**
1. **Ecosystem Revenue Share**
   - $2,000 (Silver): 5% of monthly profit pool
   - $5,000 (Gold): 10% of monthly profit pool
   - $10,000 (Platinum): 20% of monthly profit pool

2. **Governance Power**
   - Direct voting rights on project developments
   - Tokenomics proposals
   - Feature prioritization

3. **Exclusive Airdrops**
   - Guaranteed allocation of partner tokens
   - New Rhiza sub-project tokens
   - Special event rewards

4. **Mining Benefits**
   - $2,000: 400 RZC/day + Silver NFT Certificate
   - $5,000: 1,200 RZC/day + Gold NFT Certificate
   - $10,000: 3,000 RZC/day + Platinum NFT Certificate

5. **VIP Perks**
   - Direct access to core development updates
   - Private Telegram/Discord channel
   - Quarterly strategy calls
   - White-glove support

---

## 📊 Revenue Distribution Model

### Monthly Profit Pool Calculation
```
Total Ecosystem Revenue Sources:
1. Transaction fees (0.5% on all transfers)
2. Activation fees (15% allocated to pool)
3. Marketplace commissions (2% on sales)
4. Staking penalties (10% of early withdrawals)

Monthly Pool = Sum of all revenue sources * 30%
Remaining 70% = Operations, Development, Marketing
```

### Shareholder Distribution
```
Silver Share Pool (30% of total shareholder allocation)
Gold Share Pool (35% of total shareholder allocation)
Platinum Share Pool (35% of total shareholder allocation)

Individual Share = Pool Amount / Number of Active Shareholders in Tier
```

---

## 🎨 NFT Shareholder Certificates

### Certificate Metadata
```json
{
  "name": "RhizaCore Platinum Shareholder",
  "description": "Exclusive $10,000 VIP Shareholder Certificate",
  "image": "ipfs://...",
  "attributes": [
    {"trait_type": "Tier", "value": "Platinum"},
    {"trait_type": "Investment", "value": "$10,000"},
    {"trait_type": "Mining Rate", "value": "3000 RZC/day"},
    {"trait_type": "Revenue Share", "value": "20%"},
    {"trait_type": "Governance", "value": "Full Voting Rights"},
    {"trait_type": "Issue Date", "value": "2026-02-26"}
  ]
}
```

### Benefits of NFT Certificates
- Tradeable on TON NFT marketplaces
- Transferable shareholder rights
- Visual proof of investment
- Collectible value
- Secondary market liquidity

---

## 🗄️ Database Schema

### New Tables Required

#### 1. mining_nodes
```sql
CREATE TABLE mining_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('standard', 'premium', 'vip')),
  price_point INTEGER NOT NULL,
  activation_fee DECIMAL(10,2) NOT NULL,
  mining_rate DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  activated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  nft_certificate_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (wallet_address) REFERENCES wallets(address)
);
```

#### 2. shareholder_benefits
```sql
CREATE TABLE shareholder_benefits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID NOT NULL,
  month_year TEXT NOT NULL,
  revenue_share DECIMAL(10,2) DEFAULT 0,
  governance_votes INTEGER DEFAULT 0,
  airdrops_received INTEGER DEFAULT 0,
  distributed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (node_id) REFERENCES mining_nodes(id)
);
```

#### 3. profit_pool
```sql
CREATE TABLE profit_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month_year TEXT NOT NULL UNIQUE,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  shareholder_allocation DECIMAL(12,2) DEFAULT 0,
  silver_pool DECIMAL(10,2) DEFAULT 0,
  gold_pool DECIMAL(10,2) DEFAULT 0,
  platinum_pool DECIMAL(10,2) DEFAULT 0,
  distributed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. governance_proposals
```sql
CREATE TABLE governance_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  proposal_type TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'passed', 'rejected', 'expired')),
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
```

---

## 🎯 Implementation Phases

### Phase 1: Database & Backend (Week 1)
- [ ] Create database tables
- [ ] Build mining node purchase API
- [ ] Implement daily mining rewards distribution
- [ ] Create shareholder benefit calculation system

### Phase 2: UI Components (Week 2)
- [ ] Mining Nodes page with tier selection
- [ ] Purchase flow with TON payment integration
- [ ] Shareholder dashboard
- [ ] Governance voting interface

### Phase 3: NFT Integration (Week 3)
- [ ] NFT minting service for VIP certificates
- [ ] NFT display in wallet
- [ ] Transfer/trade functionality
- [ ] Metadata management

### Phase 4: Revenue Distribution (Week 4)
- [ ] Automated monthly profit pool calculation
- [ ] Shareholder distribution system
- [ ] Notification system for distributions
- [ ] Analytics dashboard

---

## 💰 Pricing Strategy

### Payment Options
1. **TON Payment** (Primary)
   - Real-time price conversion
   - Instant activation
   - 2% discount

2. **RZC Payment** (Alternative)
   - Use accumulated RZC
   - 5% premium
   - Encourages ecosystem usage

3. **Hybrid Payment**
   - 50% TON + 50% RZC
   - Standard pricing
   - Balanced approach

---

## 📱 User Journey

### Standard/Premium Purchase
1. User navigates to "Mining Nodes" page
2. Selects tier and price point
3. Reviews benefits and mining rate
4. Connects wallet and pays activation fee + node price
5. Node activated immediately
6. Daily mining rewards start accumulating

### VIP Shareholder Purchase
1. User selects VIP tier ($2K/$5K/$10K)
2. Reviews comprehensive benefits package
3. Pays activation fee + investment amount
4. NFT certificate minted and sent to wallet
5. Added to shareholder registry
6. Receives welcome package with governance access
7. Monthly benefits start next distribution cycle

---

## 🔐 Security Considerations

1. **Payment Verification**
   - Multi-signature validation
   - Transaction confirmation (3 blocks)
   - Anti-fraud checks

2. **Node Activation**
   - Unique node IDs
   - Duplicate prevention
   - Expiration management

3. **Revenue Distribution**
   - Automated calculations
   - Manual approval for large amounts
   - Audit trail

4. **NFT Security**
   - Immutable metadata
   - Transfer restrictions (optional)
   - Ownership verification

---

## 📈 Marketing Strategy

### Launch Campaign
1. **Pre-Launch (2 weeks)**
   - Teaser announcements
   - Early bird discounts (10% off)
   - Whitelist for VIP tier

2. **Launch Week**
   - Limited-time bonuses
   - Referral rewards doubled
   - Live AMA sessions

3. **Post-Launch**
   - Success stories
   - Monthly shareholder reports
   - Community highlights

---

## 🎁 Promotional Ideas

### Launch Bonuses
- First 100 Standard nodes: +20% mining rate for 30 days
- First 50 Premium nodes: +30% mining rate for 30 days
- First 10 VIP nodes: Lifetime +10% revenue share bonus

### Referral Incentives
- Refer a Standard node: 50 RZC
- Refer a Premium node: 200 RZC
- Refer a VIP node: 1,000 RZC + 1% of their first month revenue share

---

## 📊 Success Metrics

### KPIs to Track
1. Node sales by tier
2. Total value locked (TVL)
3. Active mining nodes
4. Monthly revenue per tier
5. Shareholder satisfaction score
6. Governance participation rate
7. NFT secondary market volume

---

## 🚀 Next Steps

1. **Immediate:** Create database schema and migration
2. **This Week:** Build Mining Nodes purchase page
3. **Next Week:** Implement payment processing
4. **Month 1:** Launch Standard and Premium tiers
5. **Month 2:** Launch VIP tier with NFT certificates
6. **Month 3:** First shareholder revenue distribution

---

Would you like me to start implementing any specific component?
