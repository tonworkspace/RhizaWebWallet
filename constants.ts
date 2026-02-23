
import { Asset, Transaction, PortfolioData } from './types';

export const COLORS = {
  primary: '#00FF88',
  secondary: '#00CCFF',
  bg: '#020202',
  card: '#0a0a0a',
  border: '#1a1a1a',
};

// TON Network Configuration
export const TON_NETWORK = {
  MAINNET: {
    DEPOSIT_ADDRESS: 'UQDck6IU82sfLqAD1el005JcqzPwC8JSgLfOGsF_IUCyEf96',
    // StarFi Mining Contract Address (Mainnet) - uses env var if available
    MINING_CONTRACT_ADDRESS: import.meta.env.VITE_STARFI_MINING_CONTRACT_MAINNET || 'EQCPMcE76o6NyVM-BGxvc6Qdx3DjvpJAT5ALQ_e9p9p6Qj2f',
    API_KEY: '26197ebc36a041a5546d69739da830635ed339c0d8274bdd72027ccbff4f4234', // TonCenter API Key
    TONAPI_KEY: import.meta.env.VITE_TONAPI_KEY_MAINNET || 'AHZ25K6GOTNFOVQAAAAGWQBCDALGUCPWSHPKL2KQBMUPYIZ4XTQ6ZKHEEONHPY57RXQWUCI', // TonAPI Bearer Token
    // Use multiple endpoints for better reliability
    API_ENDPOINTS: [
      'https://toncenter.com/api/v2/jsonRPC',
      'https://tonapi.io/v2/jsonRPC',
      'https://mainnet.tonhubapi.com/jsonRPC',
      'https://mainnet-v4.tonhubapi.com/jsonRPC'
    ],
    API_ENDPOINT: 'https://toncenter.com/api/v2/jsonRPC', // Primary endpoint
    NAME: 'Mainnet',
    EXPLORER_URL: 'https://tonviewer.com',
    CHAIN_ID: -239
  },
  TESTNET: {
    DEPOSIT_ADDRESS: 'UQDck6IU82sfLqAD1el005JcqzPwC8JSgLfOGsF_IUCyEf96',
    // StarFi Mining Contract Address (Testnet) - DEPLOYED WITH RETROACTIVE REFERRAL!
    MINING_CONTRACT_ADDRESS: import.meta.env.VITE_STARFI_MINING_CONTRACT_TESTNET || 'EQCPMcE76o6NyVM-BGxvc6Qdx3DjvpJAT5ALQ_e9p9p6Qj2f',
    API_KEY: 'd682d9b65115976e52f63713d6dd59567e47eaaa1dc6067fe8a89d537dd29c2c', // TonCenter API Key
    TONAPI_KEY: import.meta.env.VITE_TONAPI_KEY_TESTNET || 'AHZ25K6GOTNFOVQAAAAGWQBCDALGUCPWSHPKL2KQBMUPYIZ4XTQ6ZKHEEONHPY57RXQWUCI', // TonAPI Bearer Token
    // Use multiple endpoints for better reliability - ordered by reliability
    API_ENDPOINTS: [
      'https://testnet.toncenter.com/api/v2/jsonRPC',
      'https://testnet.tonapi.io/v2/jsonRPC',
      'https://testnet-v4.tonhubapi.com/jsonRPC',
      'https://testnet.tonhubapi.com/jsonRPC'
    ],
    API_ENDPOINT: 'https://testnet.toncenter.com/api/v2/jsonRPC', // Primary endpoint
    NAME: 'Testnet',
    EXPLORER_URL: 'https://testnet.tonviewer.com',
    CHAIN_ID: -3
  }
};

// Network type for UI display
export type NetworkType = 'mainnet' | 'testnet';

// Helper functions
export const getNetworkConfig = (networkType: NetworkType) => {
  return networkType === 'mainnet' ? TON_NETWORK.MAINNET : TON_NETWORK.TESTNET;
};

export const getExplorerUrl = (address: string, networkType: NetworkType) => {
  const network = getNetworkConfig(networkType);
  return `${network.EXPLORER_URL}/${address}`;
};

export const getTransactionUrl = (hash: string, networkType: NetworkType) => {
  const network = getNetworkConfig(networkType);
  return `${network.EXPLORER_URL}/transaction/${hash}`;
};

// Mining contract helpers
export const getMiningContractAddress = (networkType: NetworkType) => {
  const network = getNetworkConfig(networkType);
  return network.MINING_CONTRACT_ADDRESS;
};

// API endpoint helpers
export const getApiEndpoint = (networkType: NetworkType) => {
  const network = getNetworkConfig(networkType);
  return network.API_ENDPOINT;
};

export const getApiKey = (networkType: NetworkType) => {
  const network = getNetworkConfig(networkType);
  return network.API_KEY;
};

export const getTonApiKey = (networkType: NetworkType) => {
  const network = getNetworkConfig(networkType);
  return network.TONAPI_KEY;
};

export const RHIZA_BUSINESS_MODEL = [
  { 
    title: "Store Payments", 
    metric: "0.1% Fee", 
    desc: "Stores pay a tiny fee when customers buy things. Much cheaper than credit cards (which charge 2-3%).",
    technical: "Frictionless payment rail for global commerce with institutional-grade settlement infrastructure."
  },
  { 
    title: "Safe Storage", 
    metric: "Bank-Level Security", 
    desc: "Your money is protected like a bank vault, but you're the only one with the key.",
    technical: "Enterprise-grade custody solutions with multi-signature architecture and cold storage protocols."
  },
  { 
    title: "Instant Trading", 
    metric: "Always Available", 
    desc: "Swap your $RZC for other coins anytime, anywhere. Like exchanging dollars for euros, but instant.",
    technical: "Automated market maker with deep liquidity pools enabling cross-border settlements and arbitrage."
  }
];

export const RHIZA_OPPORTUNITIES = [
  {
    tag: "Early Access",
    title: "Be First in Line",
    desc: "Get early access to new projects before everyone else. Like getting concert tickets before they go on sale.",
    technical: "Priority allocation for token launches and IDOs on the TON ecosystem launchpad.",
    icon: "rocket"
  },
  {
    tag: "Earn Money",
    title: "Get Paid While You Sleep",
    desc: "Lock up your $RZC and earn extra coins every day. Like interest from a savings account, but better.",
    technical: "Stake RZC to earn yield from protocol transaction fees and liquidity mining rewards.",
    icon: "trending-up"
  },
  {
    tag: "Have a Say",
    title: "Vote on Big Decisions",
    desc: "Help decide how we spend $100 million to grow RhizaCore. Your voice matters.",
    technical: "Governance rights over treasury allocation, protocol upgrades, and ecosystem fund deployment.",
    icon: "users"
  }
];

export const RHIZA_TOKENOMICS = [
  { 
    label: "Community Mining Pool", 
    percentage: 60, 
    color: "#00FF88", 
    description: "Distributed through Proof of Activity mining, airdrops, staking rewards, and governance incentives. Locked until Phase 2 activation." 
  },
  { 
    label: "Development & Infrastructure", 
    percentage: 20, 
    color: "#00CCFF", 
    description: "Security audits, Telegram Mini App maintenance, multi-chain integration, and marketing operations." 
  },
  { 
    label: "Strategic Liquidity (SLER)", 
    percentage: 20, 
    color: "#ffffff", 
    description: "Team compensation (4-year vesting + 1-year cliff), Initial Liquidity Provision, and CEX listings. Multi-sig controlled." 
  }
];

export const RHIZA_UTILITIES = [
  { 
    title: "Merchant Payments", 
    desc: "Accept $RZC payments from customers worldwide. Instant settlement with 0.1% fees—10x cheaper than credit cards.",
    technical: "Payment gateway API with instant settlement, multi-currency support, and automated reconciliation for merchants.",
    icon: "shopping-bag"
  },
  { 
    title: "P2P Marketplace", 
    desc: "Buy and sell goods directly with other users. Escrow protection ensures safe transactions for both parties.",
    technical: "Decentralized marketplace with smart contract escrow, dispute resolution, and reputation system.",
    icon: "store"
  },
  { 
    title: "Daily Transactions", 
    desc: "Send money to anyone instantly for everyday purchases. Pay bills, split costs, or send to family—all with near-zero fees.",
    technical: "High-throughput payment infrastructure supporting micro-transactions with sub-second finality on TON.",
    icon: "zap"
  },
  { 
    title: "Staking & Rewards", 
    desc: "Stake your $RZC to earn passive income and boost your mining rate. Earn while you hold.",
    technical: "Staking pools with dynamic APY, mining rate multipliers, and automated reward distribution.",
    icon: "trending-up"
  },
  { 
    title: "Cross-Chain Swaps", 
    desc: "Swap $RZC for other cryptocurrencies instantly. Access liquidity across multiple blockchains.",
    technical: "DEX aggregator with cross-chain bridge integration for ETH, BSC, and TON ecosystem tokens.",
    icon: "repeat"
  },
  { 
    title: "NFT Marketplace", 
    desc: "Trade digital collectibles and assets using $RZC. Create, buy, and sell NFTs with low fees.",
    technical: "NFT marketplace with lazy minting, royalty automation, and $RZC as primary settlement currency.",
    icon: "image"
  },
  { 
    title: "DAO Governance", 
    desc: "Vote on protocol upgrades, treasury allocation, and ecosystem decisions. Your tokens, your voice.",
    technical: "On-chain governance with proposal creation, voting mechanisms, and timelock execution.",
    icon: "users"
  },
  { 
    title: "DeFi Integration", 
    desc: "Access lending, borrowing, and yield farming. Maximize your returns with DeFi protocols.",
    technical: "Integration with TON DeFi ecosystem including lending protocols, liquidity pools, and yield aggregators.",
    icon: "layers"
  }
];

export const MOCK_ASSETS: Asset[] = [
  {
    id: 'rzc',
    symbol: 'RZC',
    name: 'RhizaCore Token',
    balance: 50000.00,
    price: 0.15,
    change24h: 8.4,
    icon: '⚡',
    color: '#00FF88',
    address: 'EQR1..9X0Z'
  },
  {
    id: 'ton',
    symbol: 'TON',
    name: 'The Open Network',
    balance: 850.20,
    price: 6.82,
    change24h: 2.1,
    icon: '💎',
    color: '#0088CC',
    address: 'EQA1..2B3C'
  },
  {
    id: 'usdt',
    symbol: 'USDT',
    name: 'Tether USD',
    balance: 1200.00,
    price: 1.00,
    change24h: 0.01,
    icon: '💵',
    color: '#26A17B',
    address: 'EQB4..5D6E'
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx1',
    type: 'receive',
    asset: 'RZC',
    amount: 500,
    timestamp: '2024-05-20T10:30:00Z',
    status: 'confirmed',
    address: 'RhizaMarket_Store_01'
  },
  {
    id: 'tx2',
    type: 'send',
    asset: 'RZC',
    amount: 120,
    timestamp: '2024-05-19T14:45:00Z',
    status: 'confirmed',
    address: 'Coffee_Shop_TON'
  }
];

export const MOCK_PORTFOLIO_HISTORY: PortfolioData[] = [
  { time: '01:00', value: 10000 },
  { time: '04:00', value: 10500 },
  { time: '08:00', value: 10200 },
  { time: '12:00', value: 11500 },
  { time: '16:00', value: 12000 },
  { time: '20:00', value: 11800 },
  { time: '24:00', value: 12500 },
];

// Official RhizaCore Social Links
export const SOCIAL_LINKS = [
  {
    name: 'Telegram News',
    url: 'https://t.me/RhizaCoreNews',
    icon: 'telegram',
    label: 'News Channel'
  },
  {
    name: 'Telegram Discussion',
    url: 'https://t.me/RhizaCore',
    icon: 'telegram',
    label: 'Community'
  },
  {
    name: 'Facebook',
    url: 'https://facebook.com/RhizaCore',
    icon: 'facebook',
    label: 'Facebook'
  }
];
