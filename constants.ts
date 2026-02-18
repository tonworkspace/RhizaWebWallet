
import { Asset, Transaction, PortfolioData } from './types';

export const COLORS = {
  primary: '#00FF88',
  secondary: '#00CCFF',
  bg: '#050505',
  card: '#0a0a0a',
  border: '#1a1a1a',
};

export const MOCK_ASSETS: Asset[] = [
  {
    id: 'ton',
    symbol: 'TON',
    name: 'The Open Network',
    balance: 1250.45,
    price: 6.82,
    change24h: 4.5,
    icon: '💎',
    color: '#0088CC',
    address: 'EQA1..2B3C'
  },
  {
    id: 'usdt',
    symbol: 'USDT',
    name: 'Tether USD',
    balance: 5400.00,
    price: 1.00,
    change24h: 0.01,
    icon: '💵',
    color: '#26A17B',
    address: 'EQB4..5D6E'
  },
  {
    id: 'not',
    symbol: 'NOT',
    name: 'Notcoin',
    balance: 150000.00,
    price: 0.012,
    change24h: -2.3,
    icon: '🌑',
    color: '#000000',
    address: 'EQC7..8F9G'
  },
  {
    id: 'punk',
    symbol: 'PUNK',
    name: 'TON Punks',
    balance: 5,
    price: 450.00,
    change24h: 12.1,
    icon: '👾',
    color: '#FF00FF',
    address: 'EQD0..1H2I'
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx1',
    type: 'receive',
    asset: 'TON',
    amount: 100,
    timestamp: '2024-05-20T10:30:00Z',
    status: 'confirmed',
    address: 'EQDe...3xY2'
  },
  {
    id: 'tx2',
    type: 'send',
    asset: 'USDT',
    amount: 50,
    timestamp: '2024-05-19T14:45:00Z',
    status: 'confirmed',
    address: 'UQBe...9aZ1'
  },
  {
    id: 'tx3',
    type: 'swap',
    asset: 'NOT',
    amount: 25000,
    timestamp: '2024-05-18T09:15:00Z',
    status: 'pending',
    address: 'EQAs...5vB9'
  }
];

export const MOCK_PORTFOLIO_HISTORY: PortfolioData[] = [
  { time: '01:00', value: 12500 },
  { time: '04:00', value: 12800 },
  { time: '08:00', value: 12400 },
  { time: '12:00', value: 13100 },
  { time: '16:00', value: 13500 },
  { time: '20:00', value: 13200 },
  { time: '24:00', value: 13900 },
];
