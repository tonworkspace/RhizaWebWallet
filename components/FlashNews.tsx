import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Newspaper, ExternalLink, RefreshCw, ChevronRight, BookOpen } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  thumbnail: string | null;
  categories: string[];
  excerpt: string;
  author: string;
}

// ─── BLOG POSTS DATA ────────────────────────────────────────────────────────────
// Update your posts here. You can manually change the title, link, thumbnail image, etc.
export const BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    title: 'Getting Started with RhizaCore: Your Guide to the Multichain Web3 Economy',
    link: 'https://rhizacorenews.medium.com/getting-started-with-rhizacore-your-guide-to-the-multichain-web3-economy-b9628d2787ae',
    pubDate: new Date().toISOString(),
    thumbnail: 'https://miro.medium.com/v2/resize:fit:720/format:webp/1*TQ0jEmrFlkgL4Ms21dJNzA.png',
    categories: ['Announcements', 'Web3'],
    excerpt: 'Here is your official, step-by-step guide on how to become a member of the RhizaCore ecosystem by setting up your secure, non-custodial 12-Phrase Multichain Wallet.',
    author: 'RhizaCore Team'
  },
  {
    id: '2',
    title: 'Two Ways to Win: How the RhizaCore Economy Turns Everyday People into Market Whales',
    link: 'https://rhizacorenews.medium.com/two-ways-to-win-how-the-rhizacore-economy-turns-everyday-people-into-market-whales-c160fc60e351',
    pubDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    thumbnail: 'https://miro.medium.com/v2/resize:fit:720/format:webp/1*-IvOliwO9yecTb2lboadfA.png',
    categories: ['Updates', 'RZC'],
    excerpt: 'Most people are working harder every year just to watch their fiat money lose value to inflation.',
    author: 'Core Devs'
  },
  {
    id: '3',
    title: 'Beyond Gold: Understanding the True Value of the RhizaCore Economy',
    link: 'https://rhizacorenews.medium.com/beyond-gold-understanding-the-true-value-of-the-rhizacore-economy-12787fb746c8',
    pubDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    thumbnail: 'https://miro.medium.com/v2/resize:fit:720/format:webp/1*47xqpRNQqOKt0mQ0_eRYYw.png',
    categories: ['Security', 'Education'],
    excerpt: 'As the RhizaCore ecosystem prepares to integrate with global Tier-1 centralized exchanges, a crucial moment of realization is arriving for early adopters, pre-miners, and seed-stage investors.',
    author: 'RhizaCore Security Team'
  }
];
// ──────────────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  if (!dateStr) return 'recently';
  const safeDateStr = dateStr.includes(' ') ? dateStr.replace(' ', 'T') + 'Z' : dateStr;
  const parsedDate = new Date(safeDateStr);

  if (isNaN(parsedDate.getTime())) {
    return 'recently';
  }

  const seconds = Math.floor((Date.now() - parsedDate.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const FlashNews: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const news = BLOG_POSTS;

  // Auto-rotate every 5s unless hovered
  const startTimer = useCallback((total: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!isHovered) setActiveIndex(i => (i + 1) % total);
    }, 5000);
  }, [isHovered]);

  useEffect(() => {
    if (news.length > 0) startTimer(news.length);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [news.length, startTimer]);

  const goTo = (idx: number) => {
    setActiveIndex(idx);
    startTimer(news.length);
  };

  if (news.length === 0) return null;

  const activeArticle = news[activeIndex];
  const sidelines = news.filter((_, i) => i !== activeIndex).slice(0, 3);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0d1410] shadow-sm">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/80 dark:bg-black/30">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <BookOpen size={11} className="text-slate-500 dark:text-slate-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
            Blog Updates
          </span>
          <span className="text-[8px] font-bold text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-white/10 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
            Latest
          </span>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Featured article */}
        <a
          key={activeIndex}
          href={activeArticle.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group animate-in fade-in duration-300"
        >
          <div className="flex gap-3">
            {/* Thumbnail */}
            {activeArticle.thumbnail ? (
              <div className="flex-shrink-0 w-[72px] h-[60px] rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10">
                <img
                  src={activeArticle.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-[72px] h-[60px] rounded-xl bg-gradient-to-br from-emerald-100 to-cyan-100 dark:from-emerald-500/10 dark:to-cyan-500/10 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-500/10">
                <BookOpen size={18} className="text-emerald-500/50" />
              </div>
            )}

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-1 mb-1">
                <h4 className="flex-1 text-[12px] font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {activeArticle.title}
                </h4>
                <ExternalLink size={9} className="flex-shrink-0 mt-0.5 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors" />
              </div>

              {activeArticle.excerpt && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {activeArticle.excerpt}…
                </p>
              )}

              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {activeArticle.categories.map(cat => (
                  <span key={cat} className="text-[8px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-500/20">
                    {cat}
                  </span>
                ))}
                <span className="text-[9px] text-slate-400 dark:text-slate-600 ml-auto tabular-nums">
                  {timeAgo(activeArticle.pubDate)}
                </span>
              </div>
            </div>
          </div>
        </a>

        {/* Side headline list */}
        {sidelines.length > 0 && (
          <div className="border-t border-slate-100 dark:border-white/[0.05]">
            {sidelines.map(item => {
              const realIdx = news.indexOf(item);
              return (
                <button
                  key={item.id}
                  onClick={() => goTo(realIdx)}
                  className="w-full text-left px-3.5 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group border-b border-slate-50 dark:border-white/[0.03] last:border-0"
                >
                  <ChevronRight size={9} className="flex-shrink-0 text-slate-300 dark:text-slate-700 group-hover:text-emerald-500 transition-colors" />
                  <span className="flex-1 text-[10px] text-slate-600 dark:text-slate-300 line-clamp-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    {item.title}
                  </span>
                  <span className="text-[8.5px] text-slate-400 dark:text-slate-600 flex-shrink-0 tabular-nums">
                    {timeAgo(item.pubDate)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer: dots + link */}
        <div className="flex items-center justify-between px-3.5 py-2 border-t border-slate-100 dark:border-white/[0.05] bg-slate-50/50 dark:bg-black/20">
          <div className="flex items-center gap-1.5">
            {news.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${i === activeIndex
                  ? 'w-4 h-1.5 bg-emerald-500'
                  : 'w-1.5 h-1.5 bg-slate-300 dark:bg-white/10 hover:bg-slate-400 dark:hover:bg-white/20'
                  }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashNews;
