import React, { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { safeGet } from '../utils/safeAccess';

export const fmtSmall = (n: number) => {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.001) return n.toFixed(4);
  return n.toFixed(6);
};

export const ChangeChip: React.FC<{ value: number; compact?: boolean }> = ({ value, compact }) => {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const abs = Math.abs(value);
  const label = compact ? `${abs.toFixed(2)}%` : `${positive ? '+' : '-'}${abs.toFixed(2)}%`;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold font-numbers ${
        positive ? 'text-emerald-500' : 'text-red-500'
      }`}
    >
      <Icon size={9} strokeWidth={3} />
      {label}
    </span>
  );
};

export const Sparkline: React.FC<{ change: number; seed: number }> = ({ change, seed }) => {
  const isPositive = change >= 0;
  const points: number[] = [];
  const count = 10;

  for (let i = 0; i < count; i++) {
    const trend = isPositive ? (i / count) * 10 : -(i / count) * 10;
    const sineVal = Math.sin((i + seed) * 1.5) * 14;
    const point = 50 - trend + sineVal;
    points.push(Math.max(10, Math.min(90, point)));
  }

  const width = 80;
  const height = 32;
  const strokeColor = isPositive ? '#10b981' : '#ef4444';
  const fillColor = isPositive ? '#10b98120' : '#ef444420';

  const linePath = points
    .map((val, idx) => {
      const x = (idx / (count - 1)) * width;
      const y = (val / 100) * height;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const lastX = width;
  const lastY = (points[count - 1] / 100) * height;
  const areaPath = `${linePath} L ${lastX} ${height} L 0 ${height} Z`;

  return (
    <svg width="60" height="26" viewBox={`0 0 ${width} ${height}`} className="opacity-90 mx-auto">
      <path d={areaPath} fill={fillColor} />
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Live dot at end */}
      <circle cx={lastX} cy={lastY} r="2.5" fill={strokeColor} opacity="0.8" />
    </svg>
  );
};

export const MarketTokenLogo: React.FC<{ symbol: string; size?: number }> = ({ symbol, size = 38 }) => {
  const [imgError, setImgError] = useState(false);
  const s = `${size}px`;

  const logos: Record<string, string> = {
    BTC: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    // TON: using TrustWallet CDN — same source as Dashboard
    TON: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png',
    // RZC: no external image — rendered as branded gradient fallback below
    BNB: 'https://assets.coingecko.com/coins/images/825/large/binance-coin-logo.png',
    SOL: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    MATIC: 'https://assets.coingecko.com/coins/images/4713/large/polygon.png',
    AVAX: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedColors.png',
    TRX: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png',
    USDT: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
    USDC: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
  };

  const logoUrl = safeGet(logos, symbol);

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={symbol}
        style={{ width: s, height: s }}
        className="rounded-full object-cover flex-shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }

  const colorMap: Record<string, string> = {
    RZC: 'from-emerald-500 to-teal-600',
    TON: 'from-blue-500 to-cyan-600',
    BTC: 'from-orange-400 to-amber-500',
    ETH: 'from-indigo-500 to-purple-600',
    BNB: 'from-yellow-400 to-amber-500',
    SOL: 'from-purple-500 to-indigo-600',
    USDT: 'from-teal-500 to-emerald-600',
    USDC: 'from-blue-400 to-blue-600',
    TRX: 'from-rose-500 to-red-600',
  };
  const grad = safeGet(colorMap, symbol) || 'from-slate-400 to-slate-600';

  return (
    <div
      style={{ width: s, height: s }}
      className={`rounded-full bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0`}
    >
      <span className="text-white font-bold" style={{ fontSize: `${size * 0.32}px` }}>
        {symbol.slice(0, 3)}
      </span>
    </div>
  );
};

export const COIN_PROFILES: Record<string, {
  rank: number;
  marketCap: string;
  volume24h: string;
  circulatingSupply: string;
  ath: string;
  description: string;
}> = {
  BTC: {
    rank: 1,
    marketCap: '$1.32T',
    volume24h: '$26.4B',
    circulatingSupply: '19.70M BTC',
    ath: '$73,750.07',
    description: 'Bitcoin is the world\'s first decentralized digital currency. Created in 2009 by the pseudonymous Satoshi Nakamoto, it runs on a global proof-of-work blockchain without central authorities.'
  },
  ETH: {
    rank: 2,
    marketCap: '$458.2B',
    volume24h: '$14.8B',
    circulatingSupply: '120.1M ETH',
    ath: '$4,891.70',
    description: 'Ethereum is a decentralized, open-source blockchain platform featuring smart contract functionality. Ether (ETH) is the native cryptocurrency token of the platform.'
  },
  TON: {
    rank: 12,
    marketCap: '$24.5B',
    volume24h: '$412.5M',
    circulatingSupply: '3.47B TON',
    ath: '$8.28',
    description: 'The Open Network (TON) is a fully decentralized layer-1 blockchain designed by Telegram to onboard billions of users. It features ultra-fast transaction execution and dynamic sharding.'
  },
  RZC: {
    rank: 88,
    marketCap: '$33.0M',
    volume24h: '$1.2M',
    circulatingSupply: '17.0M RZC',
    ath: '$4.25',
    description: 'Rhiza Coin (RZC) is the native utility and governance token of the Rhiza Ecosystem. It powers the secure payment gateways, node validations, and staking yields across Rhiza Web3.'
  },
  BNB: {
    rank: 4,
    marketCap: '$88.4B',
    volume24h: '$1.9B',
    circulatingSupply: '147.5M BNB',
    ath: '$720.67',
    description: 'BNB powers the BNB Chain ecosystem. It is the native token of the Binance Smart Chain (BSC) network, utilized for transaction fees, staking, and token launches.'
  },
  SOL: {
    rank: 5,
    marketCap: '$72.1B',
    volume24h: '$3.5B',
    circulatingSupply: '448.2M SOL',
    ath: '$260.06',
    description: 'Solana is a highly efficient Layer-1 blockchain supporting builder scale. Built with Proof of History (PoH), it yields thousands of transactions per second at sub-penny fees.'
  },
  USDT: {
    rank: 3,
    marketCap: '$112.5B',
    volume24h: '$48.2B',
    circulatingSupply: '112.5B USDT',
    ath: '$1.32',
    description: 'Tether (USDT) is a stablecoin pegged to the US Dollar. Launched in 2014, it is the most widely used stablecoin in the crypto ecosystem, backed 100% by Tether\'s reserves.'
  },
  TRX: {
    rank: 10,
    marketCap: '$18.2B',
    volume24h: '$892M',
    circulatingSupply: '87.4B TRX',
    ath: '$0.231',
    description: 'TRON is a blockchain-based decentralized digital platform with its own cryptocurrency, TRX. Founded by Justin Sun in 2017, TRON aims to build a free, global digital content entertainment system.'
  }
};

export const LargeSparkline: React.FC<{ change: number; seed: number; isPositive: boolean }> = ({ change, seed, isPositive }) => {
  const points: number[] = [];
  const count = 20;

  for (let i = 0; i < count; i++) {
    const trend = isPositive ? (i / count) * 14 : -(i / count) * 14;
    const sineVal = Math.sin((i + seed) * 1.2) * 16;
    const secondSine = Math.sin((i * 2 + seed) * 0.8) * 7;
    const point = 50 - trend + sineVal + secondSine;
    points.push(Math.max(8, Math.min(92, point)));
  }

  const width = 300;
  const height = 90;
  const gradientId = `gradientGlow-${seed}`;

  const pathData = points
    .map((val, idx) => {
      const x = (idx / (count - 1)) * width;
      const y = (val / 100) * height;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const areaData = `${pathData} L ${width} ${height} L 0 ${height} Z`;
  const strokeColor = isPositive ? '#10b981' : '#ef4444';

  // Last point for the live dot
  const lastX = width;
  const lastY = (points[count - 1] / 100) * height;

  return (
    <div className="w-full relative bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] rounded-xl overflow-hidden mt-3 mb-1">
      <svg width="100%" height="90" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.28} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <path d={areaData} fill={`url(#${gradientId})`} />
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Glow line */}
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.12"
        />
      </svg>
      {/* Live dot — rendered outside the preserveAspectRatio SVG for pixel accuracy */}
      <div
        className="absolute right-2 bottom-2 flex items-center gap-1"
        style={{ top: `${(lastY / height) * 100}%`, right: 8, transform: 'translateY(-50%)' }}
      >
        <span
          className="w-2 h-2 rounded-full shadow-lg flex-shrink-0 animate-pulse"
          style={{ background: strokeColor, boxShadow: `0 0 6px 2px ${strokeColor}60` }}
        />
      </div>
      {/* Time axis labels */}
      <div className="absolute bottom-1.5 left-3 right-3 flex justify-between pointer-events-none">
        <span className="text-[9px] font-semibold text-slate-400 dark:text-gray-600">7D ago</span>
        <span className="text-[9px] font-semibold text-slate-400 dark:text-gray-600">Now</span>
      </div>
    </div>
  );
};
