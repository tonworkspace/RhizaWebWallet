
export interface Asset {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  price: number;
  change24h: number;
  icon: string;
  color: string;
  address: string;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'stake';
  asset: string;
  amount: number;
  timestamp: string;
  status: 'confirmed' | 'pending' | 'failed';
  address: string;
}

export interface PortfolioData {
  time: string;
  value: number;
}

export interface UserProfile {
  address: string;
  name: string;
  avatar: string;
  totalBalance: number;
}

export interface SalesPackage {
  id: string;
  tier: 'starter' | 'professional' | 'enterprise';
  tierName: string;
  pricePoint: number;
  activationFee: number;
  rzcReward: number;
  directReferralBonus: number;
  teamSalesBonus: number;
  features: string[];
  badge?: string;
  gradient: string;
  icon: any;
}
