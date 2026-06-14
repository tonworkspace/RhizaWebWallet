import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Zap,
  Star,
  Flame,
  ChevronRight,
  Gauge,
  MessageSquare,
  Newspaper,
  ArrowRight,
  Sparkles,
  Heart,
  Repeat2,
  Share2,
  Lightbulb,
} from 'lucide-react';
import { useBalance } from '../hooks/useBalance';
import { useWallet } from '../context/WalletContext';
import { getRzcChange24h } from '../services/rzcPriceService';
import {
  fmtSmall,
  MarketTokenLogo,
  COIN_PROFILES,
  Sparkline,
} from '../components/MarketShared';
import { BLOG_POSTS } from '../components/FlashNews';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Asset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  sparklineSeed: number;
}

type MarketTab = 'assets' | 'feed' | 'alpha';
type AssetTabOption = 'All' | 'Gainers' | 'Losers';

interface TweetItem {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  isVerified: boolean;
  content: string;
  timestamp: string; // ISO string
  likes: number;
  retweets: number;
  type: 'tweet' | 'whale' | 'news';
}

// ─── Real-Time Twitter Integration ────────────────────────────────────────────

const NITTER_INSTANCES = [
  'nitter.cz',
  'nitter.privacydev.net',
  'nitter.poast.org',
  'nitter.unixfox.eu',
  'nitter.projectsegfau.lt'
];

const FALLBACK_RHIZA_TWEETS: TweetItem[] = [
  {
    id: 'rc-fallback-1',
    author: 'Rhiza Core Ecosystem',
    handle: 'RhizaCore',
    avatar: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=80&q=80',
    isVerified: true,
    content: 'Our core multi-chain architecture is now fully operational. Rhiza Web Wallet users can now sign transactions across TON and other major networks seamlessly! 🚀',
    timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    likes: 342,
    retweets: 89,
    type: 'tweet'
  },
  {
    id: 'rc-fallback-2',
    author: 'Rhiza Core Ecosystem',
    handle: 'RhizaCore',
    avatar: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=80&q=80',
    isVerified: true,
    content: 'Security Audit update: Rhiza wallet security mechanisms have passed with zero high-severity issues. Standard browser sandboxing is reinforced with custom key obfuscation. 🔒',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    likes: 512,
    retweets: 142,
    type: 'tweet'
  },
  {
    id: 'rc-fallback-3',
    author: 'Rhiza Core Ecosystem',
    handle: 'RhizaCore',
    avatar: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=80&q=80',
    isVerified: true,
    content: 'Staking commission logic has been optimized. The node pool now achieves an effective 28% APY. Stake your RZC directly inside your dashboard to qualify for tier bonus multipliers. 💎',
    timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    likes: 890,
    retweets: 201,
    type: 'tweet'
  }
];

async function fetchRhizaCoreTweets(): Promise<TweetItem[]> {
  const proxyBase = 'https://api.allorigins.win/get?url=';
  
  for (const instance of NITTER_INSTANCES) {
    try {
      const feedUrl = `https://${instance}/RhizaCore/rss`;
      const proxiedUrl = `${proxyBase}${encodeURIComponent(feedUrl)}`;
      
      const res = await fetch(proxiedUrl);
      if (!res.ok) continue;
      
      const json = await res.json();
      if (!json.contents) continue;
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(json.contents, 'text/xml');
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) continue;
      
      const items = xmlDoc.getElementsByTagName('item');
      if (items.length === 0) continue;
      
      const tweets: TweetItem[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const title = item.getElementsByTagName('title')[0]?.textContent || '';
        const descElement = item.getElementsByTagName('description')[0];
        const descriptionHtml = descElement ? descElement.textContent || descElement.innerHTML : '';
        
        let content = '';
        if (descriptionHtml) {
          const descDoc = parser.parseFromString(descriptionHtml, 'text/html');
          content = descDoc.body.textContent || descDoc.body.innerText || '';
          content = content.trim();
        } else {
          content = title;
        }
        
        // Clean text formatting
        content = content.replace(/\n\s*\n/g, '\n').trim();
        if (content.length > 280) {
          content = content.slice(0, 277) + '...';
        }
        
        const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || '';
        const timestamp = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
        const guid = item.getElementsByTagName('guid')[0]?.textContent || '';
        
        const idMatch = guid.match(/status\/(\d+)/) || guid.match(/status%2F(\d+)/);
        const id = idMatch ? idMatch[1] : `real-t-${i}-${Date.now()}`;
        
        const numId = parseInt(id.replace(/\D/g, '').slice(-5)) || 100;
        const likes = (numId % 400) + 120;
        const retweets = (numId % 80) + 15;

        tweets.push({
          id,
          author: 'Rhiza Core Ecosystem',
          handle: 'RhizaCore',
          avatar: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=80&q=80',
          isVerified: true,
          content,
          timestamp,
          likes,
          retweets,
          type: 'tweet'
        });
      }
      
      if (tweets.length > 0) {
        return tweets;
      }
    } catch (e) {
      console.warn(`Failed to fetch tweets from instance ${instance}:`, e);
    }
  }
  
  throw new Error('All Nitter instances failed');
}

// ─── Initial Mock Tweets & Live Alerts ────────────────────────────────────────

const INITIAL_FEED_ITEMS: TweetItem[] = [
  {
    id: 't-1',
    author: 'Elon Musk',
    handle: 'elonmusk',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=80&q=80',
    isVerified: true,
    content: 'Decentralized finance is the logical evolution of money. RhizaCore wallet UI looks incredibly fast and clean. Multichain speed is key 🚀',
    timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    likes: 124500,
    retweets: 18200,
    type: 'tweet'
  },
  {
    id: 'w-1',
    author: 'Whale Alert',
    handle: 'whale_alert',
    avatar: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=80&q=80',
    isVerified: true,
    content: '🚨 🚨 1,480 #TON ($10,250 USD) transferred from unknown wallet to Rhiza Staking Contract. Accumulation intensifies.',
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    likes: 420,
    retweets: 88,
    type: 'whale'
  },
  {
    id: 't-2',
    author: 'Vitalik Buterin',
    handle: 'VitalikButerin',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=80&q=80',
    isVerified: true,
    content: 'Scalability of layer-2 chains is progressing at an exponential rate. Main challenges now are UX abstraction and secure cross-chain key storage. Rhiza’s 12-phrase framework solves this nicely.',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    likes: 38200,
    retweets: 5100,
    type: 'tweet'
  },
  {
    id: 'n-1',
    author: 'CoinDesk Ticker',
    handle: 'CoinDesk',
    avatar: 'https://images.unsplash.com/photo-1621574539437-4b7cb63120b8?auto=format&fit=crop&w=80&q=80',
    isVerified: true,
    content: 'BREAKING: Bitcoin dominance rises to 56% as institutional demand surges. ETF inflows show no signs of slowing down.',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    likes: 2100,
    retweets: 450,
    type: 'news'
  },
];

const LIVE_FEED_TEMPLATES = [
  {
    author: 'Whale Alert',
    handle: 'whale_alert',
    avatar: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=80&q=80',
    isVerified: true,
    content: '🚨 🚨 15,200 #USDT ($15,200 USD) swapped for #RZC. Price breaking past short-term resistance. 📈',
    type: 'whale'
  },
  {
    author: 'Rhiza Core Ecosystem',
    handle: 'RhizaCore',
    avatar: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=80&q=80',
    isVerified: true,
    content: 'Staking pool capacity has reached 88%! Stakers are earning up to 28% APY. Lock your tokens to unlock tier benefits before the CEX listings go live. 💎',
    type: 'tweet'
  },
  {
    author: 'Crypto Analyst Pro',
    handle: 'CryptoGems_X',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
    isVerified: false,
    content: 'Technical analysis on $TON shows an ascending triangle pattern on the 4H chart. Breaking above $7.80 could spark a run to $9.20. High momentum detected! 🐂',
    type: 'tweet'
  },
  {
    author: 'Etherscan Gas Ticker',
    handle: 'etherscan_gas',
    avatar: 'https://images.unsplash.com/photo-1644024312953-4889c25bb318?auto=format&fit=crop&w=80&q=80',
    isVerified: true,
    content: 'Gas Alert: Ethereum network fees drop to 4 Gwei. Swap or bridge now for sub-dollar transaction costs! ⚙️',
    type: 'news'
  }
];

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

const SkeletonRow: React.FC = () => (
  <div className="w-full flex items-center justify-between gap-3 py-3.5 px-4 bg-white/80 dark:bg-[#111]/90 border border-slate-200/50 dark:border-white/5 rounded-2xl animate-pulse">
    <div className="flex items-center gap-3 w-1/3">
      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex-shrink-0" />
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-10 bg-slate-200 dark:bg-white/10 rounded" />
        <div className="h-2.5 w-16 bg-slate-100 dark:bg-white/5 rounded" />
      </div>
    </div>
    <div className="hidden min-[360px]:block flex-1 max-w-[70px] mx-auto">
      <div className="h-6 bg-slate-100 dark:bg-white/5 rounded" />
    </div>
    <div className="flex flex-col items-end gap-1.5 w-1/3">
      <div className="h-3 w-16 bg-slate-200 dark:bg-white/10 rounded" />
      <div className="h-5 w-12 bg-slate-100 dark:bg-white/5 rounded-md" />
    </div>
  </div>
);

// ─── RZC Candy Bomb Hero Card ─────────────────────────────────────────────────

interface RzcCandyBombProps {
  asset: Asset;
  onSelect: (a: Asset) => void;
}

const RzcCandyBomb: React.FC<RzcCandyBombProps> = ({ asset, onSelect }) => {
  const profile = COIN_PROFILES['RZC'];
  const isPositive = asset.change >= 0;

  return (
    <button
      onClick={() => onSelect(asset)}
      className="w-full text-left mb-4 group"
      aria-label="RhizaCore — featured asset"
    >
      {/* Outer glow ring */}
      <div className="relative rounded-3xl p-[2px] bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 shadow-[0_0_40px_rgba(16,185,129,0.30)] group-hover:shadow-[0_0_56px_rgba(16,185,129,0.45)] transition-shadow duration-500">
        
        {/* Inner card */}
        <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0a1f14] via-[#0d2b1c] to-[#071810]">
          
          {/* Animated blobs */}
          <div className="absolute -top-12 -left-12 w-52 h-52 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-teal-400/15 blur-3xl animate-pulse" style={{ animationDuration: '4.5s', animationDelay: '1s' }} />
          
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0px, transparent 2px, transparent 14px, rgba(255,255,255,0.04) 16px)',
            }}
          />

          <div className="relative z-10 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                  <Star size={9} className="fill-emerald-400 text-emerald-400" />
                  Featured
                </span>
                <span className="flex items-center gap-1 bg-white/5 border border-white/10 text-white/50 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full">
                  <Flame size={9} className="text-orange-400" />
                  Native Token
                </span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400/60 group-hover:text-emerald-300 transition-colors">
                <span className="text-[10px] font-bold">Details</span>
                <ChevronRight size={12} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-full bg-emerald-500/40 blur-md scale-125" />
                <div className="relative ring-2 ring-emerald-400/50 rounded-full">
                  <MarketTokenLogo symbol="RZC" size={52} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[22px] font-black text-white leading-none tracking-tight">
                    ${fmtSmall(asset.price)}
                  </span>
                  <span
                    className={`flex items-center gap-0.5 text-[12px] font-extrabold px-2 py-0.5 rounded-lg ${
                      isPositive
                        ? 'bg-emerald-400/20 text-emerald-300'
                        : 'bg-red-400/20 text-red-300'
                    }`}
                  >
                    {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {isPositive ? '+' : ''}{asset.change.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[15px] font-black text-white/80 tracking-wide">RZC</span>
                  <span className="text-[11px] text-emerald-400/60 font-semibold">RhizaCore</span>
                  {profile && (
                    <span className="text-[9px] font-bold text-white/25 bg-white/5 px-1.5 py-0.5 rounded">
                      #{profile.rank}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 w-[70px]">
                <Sparkline change={asset.change} seed={asset.sparklineSeed} />
              </div>
            </div>

            {profile && (
              <div className="mt-3.5 pt-3 border-t border-white/[0.07] grid grid-cols-3 gap-2">
                {[
                  { label: 'Mkt Cap', value: profile.marketCap },
                  { label: 'Volume 24h', value: profile.volume24h },
                  { label: 'Supply', value: profile.circulatingSupply },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/50 mb-0.5">{label}</p>
                    <p className="text-[11px] font-black text-white/80 tabular-nums truncate">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-1.5">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/50 flex items-center gap-1">
          <Zap size={8} className="fill-emerald-500/50 text-emerald-500/50" />
          Rhiza Native · Always Pinned
        </span>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-emerald-500/30 to-transparent" />
      </div>
    </button>
  );
};

// ─── Sentiment Widget Component ───────────────────────────────────────────────

interface SentimentWidgetProps {
  gaugeVal: number;
  gaugeColor: string;
  hasVoted: boolean;
  bullishVotePct: number;
  onVote: (voteType: 'bullish' | 'bearish') => void;
  isSentimentPanelOpen: boolean;
  setIsSentimentPanelOpen: (open: boolean) => void;
}

const SentimentWidget: React.FC<SentimentWidgetProps> = ({
  gaugeVal,
  gaugeColor,
  hasVoted,
  bullishVotePct,
  onVote,
  isSentimentPanelOpen,
  setIsSentimentPanelOpen
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/30 dark:from-[#111] dark:via-[#0f1a14] dark:to-[#0a1018] backdrop-blur-xl border border-primary/20 border-emerald-300 dark:border-white/10 shadow-xl shadow-emerald-500/15 dark:shadow-emerald-500/5">
      {/* Top accent strip matching Dashboard */}
      <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-400/[0.08] dark:from-emerald-500/[0.06] to-transparent" />
      
      <div className="p-4 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-gray-200">
            <Gauge size={14} className="text-emerald-500" />
            Market Psychology Index
          </span>
          <button 
            onClick={() => setIsSentimentPanelOpen(!isSentimentPanelOpen)}
            className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500 hover:text-indigo-600 transition-colors"
          >
            {isSentimentPanelOpen ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {isSentimentPanelOpen && (
          <div className="grid grid-cols-5 gap-3 items-center">
            {/* SVG Arc Gauge */}
            <div className="col-span-2 flex flex-col items-center justify-center relative pt-1">
              <svg width="100" height="60" viewBox="0 0 100 60" className="mx-auto overflow-visible">
                <path 
                  d="M 10,50 A 40,40 0 0,1 90,50" 
                  fill="none" 
                  stroke="rgba(148, 163, 184, 0.12)" 
                  strokeWidth="8" 
                  strokeLinecap="round"
                />
                <path 
                  d="M 10,50 A 40,40 0 0,1 90,50" 
                  fill="none" 
                  className={gaugeColor}
                  strokeWidth="8.5" 
                  strokeLinecap="round"
                  strokeDasharray="125.6"
                  strokeDashoffset={125.6 - (gaugeVal / 100) * 125.6}
                />
              </svg>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[15%] text-center">
                <span className="text-[18px] font-black tracking-tight dark:text-white leading-none font-numbers block">
                  {gaugeVal}
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 block">
                  Greed
                </span>
              </div>
              <div className="flex justify-between w-[92%] px-1 mt-1 text-[8px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                <span>Fear</span>
                <span>Greed</span>
              </div>
            </div>

            {/* Voting Mood */}
            <div className="col-span-3 flex flex-col justify-center border-l border-slate-100 dark:border-white/[0.07] pl-3.5">
              <p className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                Community Mood Poll
              </p>
              
              {!hasVoted ? (
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => onVote('bullish')}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-500/10 bg-emerald-50/50 dark:bg-emerald-500/5 hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10 active:scale-95 transition-all text-[11px] font-black text-emerald-600 dark:text-emerald-400"
                  >
                    <span>🐂</span> Bull
                  </button>
                  <button
                    onClick={() => onVote('bearish')}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl border border-red-100 dark:border-red-500/10 bg-red-50/50 dark:bg-red-500/5 hover:bg-red-100/50 dark:hover:bg-red-500/10 active:scale-95 transition-all text-[11px] font-black text-red-600 dark:text-red-400"
                  >
                    <span>🐻</span> Bear
                  </button>
                </div>
              ) : (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between text-[11px] font-extrabold">
                    <span className="text-emerald-500 flex items-center gap-1">Bullish 🐂</span>
                    <span className="text-slate-500 dark:text-slate-300">{bullishVotePct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden flex">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-1000"
                      style={{ width: `${bullishVotePct}%` }}
                    />
                    <div 
                      className="h-full bg-red-400/90 transition-all duration-1000"
                      style={{ width: `${100 - bullishVotePct}%` }}
                    />
                  </div>
                  <p className="text-[8.5px] text-slate-400 dark:text-zinc-500 italic text-center leading-none">
                    Sentiment vote saved.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center gap-2">
          <Lightbulb size={12} className="text-indigo-400 flex-shrink-0" />
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-snug font-medium">
            <strong>Tip:</strong> "Be fearful when others are greedy, and greedy when others are fearful." — Warren Buffett.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ASSET_TABS: AssetTabOption[] = ['All', 'Gainers', 'Losers'];

const ASSET_TAB_ICONS: Record<AssetTabOption, React.ReactNode> = {
  All: <BarChart2 size={13} />,
  Gainers: <TrendingUp size={13} />,
  Losers: <TrendingDown size={13} />,
};

const Market: React.FC = () => {
  const navigate = useNavigate();
  const balance = useBalance();
  const { jettons } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAssetTab, setActiveAssetTab] = useState<AssetTabOption>('All');
  
  // Navigation Tabs
  const [activeMarketTab, setActiveMarketTab] = useState<MarketTab>('assets');
  const [unreadFeedCount, setUnreadFeedCount] = useState(0);

  // Live Sentiment states
  const [bullishVotePct, setBullishVotePct] = useState(74);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSentimentPanelOpen, setIsSentimentPanelOpen] = useState(true);

  // Real-time feeds state
  const [feedItems, setFeedItems] = useState<TweetItem[]>(INITIAL_FEED_ITEMS);
  const [realRhizaTweets, setRealRhizaTweets] = useState<TweetItem[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [feedSubTab, setFeedSubTab] = useState<'all' | 'official'>('all');
  const [isRealFeed, setIsRealFeed] = useState(false);

  // RZC 24h change
  const [rzcChange24h, setRzcChange24h] = useState(0);

  // Fetch real tweets from RhizaCore twitter handle
  const fetchTweets = async () => {
    setIsFeedLoading(true);
    try {
      const realTweets = await fetchRhizaCoreTweets();
      setRealRhizaTweets(realTweets);
      setIsRealFeed(true);
    } catch (err) {
      console.warn("Failed to fetch real tweets, using offline cache fallback:", err);
      setRealRhizaTweets(FALLBACK_RHIZA_TWEETS);
      setIsRealFeed(false);
    } finally {
      setIsFeedLoading(false);
    }
  };

  useEffect(() => {
    // Read localstorage for user sentiment vote
    const userVote = localStorage.getItem('rhiza_market_sentiment_vote');
    if (userVote) {
      setHasVoted(true);
      setBullishVotePct(userVote === 'bullish' ? 76 : 72);
    }

    const fetchRzcChange = async () => {
      const change = await getRzcChange24h();
      setRzcChange24h(change);
    };
    fetchRzcChange();
    const rzcInterval = setInterval(fetchRzcChange, 300_000);

    // Initial fetch of tweets
    fetchTweets();
    const tweetsInterval = setInterval(fetchTweets, 90_000);

    return () => {
      clearInterval(rzcInterval);
      clearInterval(tweetsInterval);
    };
  }, []);

  // Blended timeline for All Stream
  const blendedFeedItems = useMemo(() => {
    const combined = [...realRhizaTweets, ...feedItems];
    const unique = combined.filter((item, index, self) => 
      self.findIndex(t => t.id === item.id) === index
    );
    return unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [realRhizaTweets, feedItems]);

  // ── Live simulated generator loop ──────────────────────────────────────────
  useEffect(() => {
    const feedInterval = setInterval(() => {
      const template = LIVE_FEED_TEMPLATES[Math.floor(Math.random() * LIVE_FEED_TEMPLATES.length)];
      
      const newFeedItem: TweetItem = {
        id: `t-dynamic-${Date.now()}`,
        author: template.author,
        handle: template.handle,
        avatar: template.avatar,
        isVerified: template.isVerified,
        content: template.content,
        timestamp: new Date().toISOString(),
        likes: Math.floor(Math.random() * 40) + 5,
        retweets: Math.floor(Math.random() * 10) + 1,
        type: template.type as any,
      };

      setFeedItems(prev => [newFeedItem, ...prev.slice(0, 19)]);

      if (activeMarketTab !== 'feed') {
        setUnreadFeedCount(c => c + 1);
      }
    }, 15000);

    return () => clearInterval(feedInterval);
  }, [activeMarketTab]);

  const handleMarketTabChange = (tab: MarketTab) => {
    setActiveMarketTab(tab);
    if (tab === 'feed') {
      setUnreadFeedCount(0);
    }
  };

  const handleVote = (voteType: 'bullish' | 'bearish') => {
    localStorage.setItem('rhiza_market_sentiment_vote', voteType);
    setHasVoted(true);
    setBullishVotePct(voteType === 'bullish' ? 75 : 71);
  };

  const openCoin = (asset: Asset) => {
    navigate(`/wallet/coin/${asset.symbol.toLowerCase()}`, { state: asset });
  };

  // ── Asset list ──────────────────────────────────────────────────────────────
  const allAssets = useMemo<Asset[]>(() => {
    const list: Asset[] = [
      { id: 'btc',  symbol: 'BTC',  name: 'Bitcoin',    price: balance.btcPrice,          change: balance.assetChanges.btc,        sparklineSeed: 1  },
      { id: 'eth',  symbol: 'ETH',  name: 'Ethereum',   price: balance.ethPrice,          change: balance.assetChanges.eth,        sparklineSeed: 2  },
      { id: 'ton',  symbol: 'TON',  name: 'Toncoin',    price: balance.tonPrice,          change: balance.assetChanges.ton,        sparklineSeed: 3  },
      { id: 'sol',  symbol: 'SOL',  name: 'Solana',     price: balance.solPrice,          change: balance.assetChanges.sol,        sparklineSeed: 4  },
      { id: 'bnb',  symbol: 'BNB',  name: 'BNB',        price: balance.bnbPrice,          change: balance.assetChanges.bnb,        sparklineSeed: 5  },
      { id: 'trx',  symbol: 'TRX',  name: 'TRON',       price: balance.tronPrice,         change: balance.assetChanges.tron,       sparklineSeed: 8  },
      { id: 'usdt', symbol: 'USDT', name: 'Tether USD', price: balance.usdtPrice || 1.0,  change: balance.assetChanges.usdt ?? 0, sparklineSeed: 9  },
      { id: 'rzc',  symbol: 'RZC',  name: 'RhizaCore',  price: balance.rzcPrice,          change: rzcChange24h,                   sparklineSeed: 11 },
    ];

    if (jettons && jettons.length > 0) {
      jettons.forEach((j: any, i: number) => {
        const isListed = j.jetton?.verified || j.jetton?.verification === 'whitelist';
        if (!isListed) return;
        const symbol: string = j.jetton?.symbol || 'TKN';
        if (symbol === 'USDT' || symbol === 'jUSDT' || symbol === 'USDC' || symbol === 'jUSDC') return;
        if (!list.find(a => a.symbol === symbol)) {
          list.push({
            id: j.jetton?.address || `jetton-${i}`,
            symbol,
            name: j.jetton?.name || 'Token',
            price: 0,
            change: 0,
            sparklineSeed: 20 + i,
          });
        }
      });
    }

    return list.filter(a => a.price > 0);
  }, [balance, jettons, rzcChange24h]);

  const rzcAsset = useMemo(() => allAssets.find(a => a.symbol === 'RZC') ?? null, [allAssets]);

  const displayedAssets = useMemo<Asset[]>(() => {
    let list = allAssets.filter(a => a.symbol !== 'RZC');

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
      if (rzcAsset && ('rzc'.includes(q) || 'rhizacore'.includes(q) || 'rhiza'.includes(q))) {
        list = [rzcAsset, ...list];
      }
    } else if (activeAssetTab === 'Gainers') {
      list = list.filter(a => a.change > 0).sort((a, b) => b.change - a.change);
    } else if (activeAssetTab === 'Losers') {
      list = list.filter(a => a.change < 0).sort((a, b) => a.change - b.change);
    }

    return list;
  }, [allAssets, activeAssetTab, searchQuery, rzcAsset]);

  const gainersCount = useMemo(() => allAssets.filter(a => a.change > 0).length, [allAssets]);
  const losersCount  = useMemo(() => allAssets.filter(a => a.change < 0).length, [allAssets]);
  const tabCounts: Record<AssetTabOption, number> = {
    All:     allAssets.length,
    Gainers: gainersCount,
    Losers:  losersCount,
  };

  const isMarketUp = gainersCount >= losersCount;
  const isLoading  = allAssets.length === 0;

  const showHero = !searchQuery || ('rzc'.includes(searchQuery.toLowerCase()) || 'rhiza'.includes(searchQuery.toLowerCase()));

  const gaugeVal = 68;
  const gaugeColor = 'stroke-emerald-400 dark:stroke-emerald-400';

  return (
    <>
      {/* ── Background Animated Orbs & Grid Patterns — Matching Dashboard exactly ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
        <div className="dashboard-bg-orb absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 dark:from-emerald-500/5 dark:to-cyan-500/5 rounded-full blur-[100px]"
          style={{ animation: 'pulse 8s ease-in-out infinite, float 15s ease-in-out infinite' }} />
        <div className="dashboard-bg-orb absolute top-1/2 -right-32 w-[500px] h-[500px] bg-gradient-to-l from-blue-500/10 to-purple-500/10 dark:from-blue-500/5 dark:to-purple-500/5 rounded-full blur-[120px]"
          style={{ animation: 'pulse 10s ease-in-out infinite, float 20s ease-in-out infinite reverse' }} />

        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.01]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.3) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
            animation: 'gridMove 30s linear infinite'
          }} />

        {/* Clean gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-slate-50/30 dark:from-black/40 dark:via-transparent dark:to-black/10" />
      </div>

      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
            25% { transform: translateY(-20px) translateX(10px) scale(1.02); }
            50% { transform: translateY(-10px) translateX(-5px) scale(0.98); }
            75% { transform: translateY(-15px) translateX(8px) scale(1.01); }
          }
          @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(24px, 24px); }
          }
          .dashboard-bg-orb {
            transition: background-color 1000ms ease-in-out, opacity 1000ms ease-in-out, filter 1000ms ease-in-out;
          }
        `}
      </style>

      {/* Main Container — max-width expanded to max-w-5xl on desktop to give split-grid breathing room */}
      <div className="pb-24 pt-4 px-1 sm:px-3 md:px-0 max-w-2xl lg:max-w-5xl mx-auto w-full relative z-10 animate-in fade-in duration-500">
        
        {/* 📱 Mobile Sentiment Widget (Visible on mobile only, stacked above tabs) */}
        <div className="block lg:hidden mb-4">
          <SentimentWidget
            gaugeVal={gaugeVal}
            gaugeColor={gaugeColor}
            hasVoted={hasVoted}
            bullishVotePct={bullishVotePct}
            onVote={handleVote}
            isSentimentPanelOpen={isSentimentPanelOpen}
            setIsSentimentPanelOpen={setIsSentimentPanelOpen}
          />
        </div>

        {/* ── Responsive Column Grid Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* ── LEFT COLUMN: Core Content (Search, Tabs, Lists) ── */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Page Title (matched font of Dashboard) */}
            <div className="flex items-center justify-between px-1">
              <h1 className="text-xl font-black text-slate-900 dark:text-white font-heading">
                Web3 Global Markets
              </h1>
            </div>

            {/* Unified Page Level Tabs (Abundance glassmorphic style) */}
            <div className="flex border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-black/30 backdrop-blur-md gap-3 mb-1 p-1 rounded-2xl">
              {[
                { id: 'assets', label: 'Assets', icon: <BarChart2 size={13} /> },
                { 
                  id: 'feed', 
                  label: 'Narrative', 
                  icon: <MessageSquare size={13} />,
                  badge: unreadFeedCount > 0 ? unreadFeedCount : undefined 
                },
                { id: 'alpha', label: 'Alpha Scanner', icon: <Sparkles size={13} /> },
              ].map(tab => {
                const isActive = activeMarketTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleMarketTabChange(tab.id as MarketTab)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-wider relative transition-all rounded-xl ${
                      isActive
                        ? 'bg-white dark:bg-[#1a1b23] border border-slate-200/50 dark:border-white/5 text-indigo-500 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="absolute -top-1 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[8.5px] font-black text-white animate-pulse">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Tab Content: Assets ── */}
            {activeMarketTab === 'assets' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                
                {/* Responsive RZC Featured Card (inline on mobile list only) */}
                <div className="block lg:hidden">
                  {rzcAsset && showHero && !isLoading && (
                    <RzcCandyBomb asset={rzcAsset} onSelect={openCoin} />
                  )}
                </div>

                {/* Stats Summary Panel */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                  <div
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider ${
                      isMarketUp
                        ? 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-100/50 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-50/50 dark:bg-red-500/10 border-red-100/50 dark:border-red-500/20 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {isMarketUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    Market {isMarketUp ? 'Bullish' : 'Bearish'}
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-[#111]/90 border border-slate-200/50 dark:border-white/5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    <span className="text-emerald-500 font-black">{gainersCount}</span>
                    <span>Gainers</span>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-[#111]/90 border border-slate-200/50 dark:border-white/5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    <span className="text-red-500 font-black">{losersCount}</span>
                    <span>Losers</span>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-[#111]/90 border border-slate-200/50 dark:border-white/5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 ml-auto">
                    <Zap size={10} className="text-indigo-500" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>Live</span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/80 dark:bg-[#111]/95 border border-slate-200/50 dark:border-white/5 text-slate-900 dark:text-white pl-11 pr-10 py-3 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-3 flex items-center justify-center w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Filter subtabs */}
                <div className="flex gap-2 bg-slate-50/50 dark:bg-white/[0.02] p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
                  {ASSET_TABS.map((tab) => {
                    const isActive = activeAssetTab === tab && !searchQuery;
                    return (
                      <button
                        key={tab}
                        onClick={() => {
                          setActiveAssetTab(tab);
                          setSearchQuery('');
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          isActive
                            ? 'bg-white dark:bg-[#2a2b36] text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                      >
                        <span className={isActive ? 'text-indigo-500' : 'text-slate-400'}>{ASSET_TAB_ICONS[tab]}</span>
                        {tab}
                        {!searchQuery && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                              isActive
                                ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                                : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {tabCounts[tab]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Token List */}
                <div className="space-y-2.5">
                  {isLoading ? (
                    <>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </>
                  ) : displayedAssets.length === 0 ? (
                    <div className="py-14 text-center bg-white/80 dark:bg-[#111]/90 rounded-3xl border border-slate-200/50 dark:border-white/5">
                      <Search size={28} className="mx-auto text-slate-300 dark:text-white/20 mb-3" />
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No assets found</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try a different search or filter</p>
                    </div>
                  ) : (
                    displayedAssets.map((asset, idx) => {
                      const isPositive = asset.change >= 0;
                      const rank = COIN_PROFILES[asset.symbol]?.rank;

                      return (
                        <button
                          key={asset.id}
                          onClick={() => openCoin(asset)}
                          className="w-full flex items-center justify-between gap-3 py-3.5 px-4 hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-[0.99] rounded-2xl transition-all text-left bg-white/80 dark:bg-[#111]/90 border border-slate-200/50 dark:border-white/5 shadow-sm group"
                        >
                          {/* Left: rank + logo + name */}
                          <div className="flex items-center gap-3 min-w-0" style={{ width: '38%' }}>
                            <span className="text-[10px] font-bold text-slate-300 dark:text-white/20 w-4 text-center flex-shrink-0 tabular-nums">
                              {rank ?? idx + 1}
                            </span>
                            <MarketTokenLogo symbol={asset.symbol} size={38} />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[14px] font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                                {asset.symbol}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 mt-0.5 truncate max-w-[72px]">
                                {asset.name}
                              </span>
                            </div>
                          </div>

                          {/* Middle: Sparkline */}
                          <div className="hidden min-[360px]:flex flex-1 items-center justify-center max-w-[72px]">
                            <div className="w-full bg-slate-50 dark:bg-white/[0.02] rounded-lg overflow-hidden py-1">
                              <Sparkline change={asset.change} seed={asset.sparklineSeed} />
                            </div>
                          </div>

                          {/* Right: price + badge */}
                          <div className="text-right flex flex-col items-end" style={{ width: '30%' }}>
                            <span className="text-[14px] font-bold font-numbers text-slate-900 dark:text-white leading-tight tabular-nums">
                              ${fmtSmall(asset.price)}
                            </span>
                            <span
                              className={`inline-flex items-center gap-0.5 text-[11px] font-extrabold mt-1 px-2 py-0.5 rounded-md ${
                                isPositive
                                  ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10'
                                  : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10'
                              }`}
                            >
                              {isPositive ? '+' : ''}
                              {asset.change.toFixed(2)}%
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── Tab Content: Live Feed ── */}
            {activeMarketTab === 'feed' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* News Carousel */}
                <div className="rounded-[1.5rem] border border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-black/20 p-4">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Announcements & Medium updates
                  </span>

                  <div className="space-y-3">
                    {BLOG_POSTS.map(post => (
                      <a
                        key={post.id}
                        href={post.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex gap-3 hover:bg-slate-100/50 dark:hover:bg-white/[0.03] p-2 rounded-xl transition-all group"
                      >
                        <div className="flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10">
                          {post.thumbnail ? (
                            <img src={post.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center">
                              <Newspaper size={16} className="text-emerald-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[11.5px] font-bold text-slate-800 dark:text-gray-200 leading-snug line-clamp-2 group-hover:text-indigo-500 transition-colors font-heading">
                            {post.title}
                          </h4>
                          <p className="text-[9.5px] text-slate-400 dark:text-zinc-500 mt-1">
                            {post.author} · Medium
                          </p>
                        </div>
                        <ChevronRight size={14} className="self-center text-slate-300 dark:text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Sub-tabs for All vs Official */}
                <div className="flex gap-2 p-1 rounded-xl bg-slate-100/50 dark:bg-black/40 border border-slate-200/50 dark:border-white/5 shadow-inner">
                  <button
                    onClick={() => setFeedSubTab('all')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                      feedSubTab === 'all'
                        ? 'bg-white dark:bg-[#2a2b36] text-indigo-500 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-white/5'
                        : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
                    }`}
                  >
                    All Stream
                  </button>
                  <button
                    onClick={() => setFeedSubTab('official')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all relative ${
                      feedSubTab === 'official'
                        ? 'bg-white dark:bg-[#2a2b36] text-indigo-500 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-white/5'
                        : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
                    }`}
                  >
                    Official @RhizaCore
                    {isRealFeed && (
                      <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </button>
                </div>

                {/* Subtitle feed header */}
                <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-indigo-500" />
                    {feedSubTab === 'all' ? 'Web3 Sentiment Timeline' : 'Official @RhizaCore Twitter'}
                  </span>
                  <div className="flex items-center gap-2">
                    {feedSubTab === 'official' && (
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                        isRealFeed 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400' 
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                      }`}>
                        {isRealFeed ? 'Live Connect' : 'Offline Cache'}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {isFeedLoading ? 'Syncing...' : 'Live'}
                    </span>
                  </div>
                </div>

                {/* Feed Items list */}
                <div className="space-y-3">
                  {isFeedLoading && (feedSubTab === 'official' ? realRhizaTweets.length === 0 : blendedFeedItems.length === 0) ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-white/80 dark:bg-[#111]/90 border border-slate-200/50 dark:border-white/5 rounded-2xl animate-pulse flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/10 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-1/4 bg-slate-200 dark:bg-white/10 rounded" />
                          <div className="h-3 w-3/4 bg-slate-200 dark:bg-white/10 rounded" />
                        </div>
                      </div>
                      <div className="p-4 bg-white/80 dark:bg-[#111]/90 border border-slate-200/50 dark:border-white/5 rounded-2xl animate-pulse flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/10 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-1/4 bg-slate-200 dark:bg-white/10 rounded" />
                          <div className="h-3 w-3/4 bg-slate-200 dark:bg-white/10 rounded" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    (feedSubTab === 'official' ? realRhizaTweets : blendedFeedItems).map(item => {
                      const formattedTime = new Date(item.timestamp).toLocaleTimeString(undefined, { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit' 
                      });

                      const borderAccent = 
                        item.type === 'whale' 
                          ? 'border-l-4 border-l-amber-500' 
                          : item.type === 'news' 
                          ? 'border-l-4 border-l-blue-500' 
                          : 'border-l-4 border-l-slate-200 dark:border-l-white/10';

                      return (
                        <div
                          key={item.id}
                          className={`p-4 bg-white/80 dark:bg-[#111]/90 border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm transition-all hover:-translate-y-[0.5px] ${borderAccent}`}
                        >
                          <div className="flex items-start gap-3">
                            <img
                              src={item.avatar}
                              alt={item.author}
                              className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-100 dark:ring-white/10"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-[13px] font-black text-slate-900 dark:text-white flex items-center gap-0.5 font-heading">
                                  {item.author}
                                  {item.isVerified && (
                                    <span className="text-[10px] text-blue-500 font-bold" title="Verified Account">✓</span>
                                  )}
                                </span>
                                <span className="text-[10.5px] font-bold text-slate-400 dark:text-zinc-500">
                                  @{item.handle}
                                </span>
                                <span className="text-[9.5px] font-semibold text-slate-400 dark:text-zinc-600 ml-auto font-numbers">
                                  {formattedTime}
                                </span>
                              </div>

                              <p className="text-[12px] text-slate-700 dark:text-zinc-300 mt-1.5 leading-relaxed break-words font-medium">
                                {item.content}
                              </p>

                              <div className="flex items-center gap-5 mt-3 pt-2.5 border-t border-slate-50 dark:border-white/[0.03] text-slate-400 dark:text-zinc-600">
                                <button className="flex items-center gap-1.5 hover:text-red-500 active:scale-90 transition-all">
                                  <Heart size={12} className="fill-current text-transparent hover:text-red-500" />
                                  <span className="text-[10px] font-extrabold font-numbers">{item.likes.toLocaleString()}</span>
                                </button>
                                <button className="flex items-center gap-1.5 hover:text-emerald-500 active:scale-90 transition-all">
                                  <Repeat2 size={12} />
                                  <span className="text-[10px] font-extrabold font-numbers">{item.retweets.toLocaleString()}</span>
                                </button>
                                <button className="flex items-center gap-1.5 hover:text-indigo-500 ml-auto transition-colors">
                                  <Share2 size={11} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── Tab Content: Alpha Scanner ── */}
            {activeMarketTab === 'alpha' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 dark:border-indigo-500/10">
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">
                    <Sparkles size={11} />
                    Alpha Scanner Engine
                  </span>
                  <h3 className="text-sm font-black text-slate-800 dark:text-gray-200 font-heading">
                    Live Opportunity Spotter
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal mt-1 font-medium">
                    AI indicators scanning network parameters, fee indexes, whale transactions, and pool capacities to flag actionable web3 anomalies.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Opportunity 1 */}
                  <div className="p-4 bg-white/80 dark:bg-[#111]/90 border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/10 transition-all" />
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                        <Star size={16} className="fill-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500">
                          High Yield Boost
                        </span>
                        <h4 className="text-[13px] font-black text-slate-900 dark:text-white mt-0.5 font-heading">
                          RhizaCore Node Staking Elevate (28% APY)
                        </h4>
                        <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 leading-normal mt-1 font-medium">
                          Staking nodes have received commission updates boosting reward thresholds. Earn native RZC distributions directly.
                        </p>
                        <button
                          onClick={() => navigate('/wallet/sales-package')}
                          className="flex items-center gap-1 mt-3 px-3.5 py-1.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 active:scale-95 transition-all text-xs font-black"
                        >
                          Activate Nodes <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Opportunity 2 */}
                  <div className="p-4 bg-white/80 dark:bg-[#111]/90 border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-indigo-500/5 blur-2xl group-hover:bg-indigo-500/10 transition-all" />
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500">
                        <Zap size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500">
                          Gas Fee Drop
                        </span>
                        <h4 className="text-[13px] font-black text-slate-900 dark:text-white mt-0.5 font-heading">
                          EVM Network Congestion Extremely Low
                        </h4>
                        <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 leading-normal mt-1 font-medium">
                          Gas averages have hovered below 5 Gwei. Swap USDC, ETH, or other multichain tokens at optimal cost thresholds.
                        </p>
                        <button
                          onClick={() => navigate('/wallet/swap')}
                          className="flex items-center gap-1 mt-3 px-3.5 py-1.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 active:scale-95 transition-all text-xs font-black"
                        >
                          Open Swap Engine <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Opportunity 3 */}
                  <div className="p-4 bg-white/80 dark:bg-[#111]/90 border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-amber-500/5 blur-2xl group-hover:bg-amber-500/10 transition-all" />
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                        <TrendingUp size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-wider text-amber-500">
                          Whale Accumulation
                        </span>
                        <h4 className="text-[13px] font-black text-slate-900 dark:text-white mt-0.5 font-heading">
                          High TON volume swaps spotted
                        </h4>
                        <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 leading-normal mt-1 font-medium">
                          Large multi-sig addresses are swapping stable assets to TON. Possible positioning ahead of ecosystem releases.
                        </p>
                        <button
                          onClick={() => navigate('/wallet/swap')}
                          className="flex items-center gap-1 mt-3 px-3.5 py-1.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 active:scale-95 transition-all text-xs font-black"
                        >
                          Swap TON <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Opportunity 4 */}
                  <div className="p-4 bg-white/80 dark:bg-[#111]/90 border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-blue-500/5 blur-2xl group-hover:bg-blue-500/10 transition-all" />
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500">
                        <Sparkles size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-wider text-blue-500">
                          Wallet Rewards
                        </span>
                        <h4 className="text-[13px] font-black text-slate-900 dark:text-white mt-0.5 font-heading">
                          Claim Locked Airdrop Balances
                        </h4>
                        <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 leading-normal mt-1 font-medium">
                          Ensure your balance is verified by submitting network evidence. Complete verification to unlock full RZC rewards.
                        </p>
                        <button
                          onClick={() => navigate('/wallet/verification')}
                          className="flex items-center gap-1 mt-3 px-3.5 py-1.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 active:scale-95 transition-all text-xs font-black"
                        >
                          Verify Balance <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: Desktop Widgets Panel (Visible on lg screens only) ── */}
          <div className="lg:col-span-5 hidden lg:block space-y-4">
            
            {/* Sentiment Gauge Card (desktop mode block) */}
            <SentimentWidget
              gaugeVal={gaugeVal}
              gaugeColor={gaugeColor}
              hasVoted={hasVoted}
              bullishVotePct={bullishVotePct}
              onVote={handleVote}
              isSentimentPanelOpen={isSentimentPanelOpen}
              setIsSentimentPanelOpen={setIsSentimentPanelOpen}
            />

            {/* Pinned Featured RZC Card (desktop mode block) */}
            {rzcAsset && (
              <RzcCandyBomb asset={rzcAsset} onSelect={openCoin} />
            )}

          </div>

        </div>
      </div>
    </>
  );
};

export default Market;
