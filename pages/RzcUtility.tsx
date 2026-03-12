import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Wallet,
  Coins,
  Send,
  Download,
  Gift,
  Zap,
  ShoppingBag,
  Users,
  AtSign,
  Store,
  Code,
  Bot,
  Rocket,
  TrendingUp,
  Image,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Home
} from 'lucide-react';

interface UtilityItem {
  icon: any;
  title: string;
  description: string;
  path: string;
  isExternal?: boolean;
  badge?: string;
  color: string;
  features?: string[];
}

const RzcUtility: React.FC = () => {
  const navigate = useNavigate();
  
  const utilities: UtilityItem[] = [
    {
      icon: Wallet,
      title: 'Get a Wallet',
      description: 'Create or import your secure RhizaCore wallet in minutes. Non-custodial, encrypted, and fully under your control.',
      path: '/create-wallet',
      color: 'from-blue-500 to-indigo-500',
      features: ['Multi-wallet support', 'Secure encryption', 'Easy backup']
    },
    {
      icon: Coins,
      title: 'Get RZC Tokens',
      description: 'Purchase mining packages to earn RZC tokens. Get 100 RZC signup bonus plus activation rewards.',
      path: '/wallet/sales-package',
      badge: 'Earn',
      color: 'from-emerald-500 to-teal-500',
      features: ['Signup bonus: 100 RZC', 'Mining packages', 'Activation rewards']
    },
    {
      icon: Send,
      title: 'Transfer Money',
      description: 'Send TON, RZC, and other tokens to anyone, anywhere in the world. Fast, secure, and low-cost.',
      path: '/wallet/transfer',
      color: 'from-purple-500 to-pink-500',
      features: ['Username transfers', 'QR code support', 'Transaction history']
    },
    {
      icon: Download,
      title: 'Receive Payments',
      description: 'Get your wallet address and QR code to receive payments from anyone. Share and get paid instantly.',
      path: '/wallet/receive',
      color: 'from-green-500 to-emerald-500',
      features: ['QR code generation', 'Easy sharing', 'Multiple tokens']
    },
    {
      icon: Gift,
      title: 'Earn Rewards',
      description: 'Refer friends and earn 50 RZC per referral. Build your network across 5 levels and unlock milestone bonuses.',
      path: '/wallet/referral',
      badge: 'Hot',
      color: 'from-orange-500 to-red-500',
      features: ['50 RZC per referral', '5-level system', 'Milestone bonuses']
    },
    {
      icon: Zap,
      title: 'Mining Nodes',
      description: 'Stake in mining packages and earn passive income. Get shareholder NFTs and participate in revenue distribution.',
      path: '/wallet/sales-package',
      color: 'from-yellow-500 to-orange-500',
      features: ['Shareholder NFTs', 'Revenue sharing', 'Squad mining']
    },
    {
      icon: AtSign,
      title: 'Username System',
      description: 'Create easy-to-remember usernames instead of long wallet addresses. Transfer tokens using @username.',
      path: '/wallet/settings',
      badge: 'New',
      color: 'from-cyan-500 to-blue-500',
      features: ['Easy addresses', 'Username transfers', 'Social identity']
    },
    {
      icon: ShoppingBag,
      title: 'Shop & Pay',
      description: 'Use RZC to shop at participating merchants. Fast checkout, low fees, and global acceptance.',
      path: '/marketplace',
      color: 'from-pink-500 to-rose-500',
      features: ['Merchant payments', 'Low fees', 'Global reach']
    },
    {
      icon: Store,
      title: 'Merchant API',
      description: 'Accept RZC payments in your business. Easy integration, instant settlement, and worldwide customers.',
      path: '/merchant-api',
      color: 'from-indigo-500 to-purple-500',
      features: ['Easy integration', 'Instant settlement', 'Developer friendly']
    },
    {
      icon: Code,
      title: 'Developer Hub',
      description: 'Build on RhizaCore with our comprehensive APIs and SDKs. Join the ecosystem and create amazing dApps.',
      path: '/developers',
      color: 'from-slate-500 to-gray-500',
      features: ['Complete APIs', 'SDKs & tools', 'Documentation']
    },
    {
      icon: Rocket,
      title: 'Launchpad',
      description: 'Discover and invest in new token launches. Early access to promising projects in the RhizaCore ecosystem.',
      path: '/launchpad',
      badge: 'Coming',
      color: 'from-violet-500 to-purple-500',
      features: ['Early access', 'Vetted projects', 'Fair launches']
    },
    {
      icon: TrendingUp,
      title: 'Staking Engine',
      description: 'Stake your tokens and earn rewards. Contribute to network security while generating passive income.',
      path: '/staking',
      color: 'from-green-500 to-teal-500',
      features: ['Earn rewards', 'Network security', 'Flexible terms']
    },
    {
      icon: Image,
      title: 'NFT Marketplace',
      description: 'Buy, sell, and trade digital collectibles. Discover unique NFTs and build your collection.',
      path: '/marketplace',
      color: 'from-fuchsia-500 to-pink-500',
      features: ['Buy & sell NFTs', 'Rare collectibles', 'Creator royalties']
    },
    {
      icon: Bot,
      title: 'AI Assistant',
      description: 'Get instant help from our AI-powered assistant. Ask questions, get guidance, and learn about crypto.',
      path: '/wallet/ai-assistant',
      badge: 'Beta',
      color: 'from-rose-500 to-pink-500',
      features: ['24/7 support', 'Smart answers', 'Learning resources']
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Join the RhizaCore community. Connect with other users, share tips, and grow together.',
      path: '/referral',
      color: 'from-amber-500 to-orange-500',
      features: ['Active community', 'Events & rewards', 'Social features']
    }
  ];

  const stats = [
    { label: 'Utility Features', value: '15+', icon: Zap },
    { label: 'Signup Bonus', value: '100 RZC', icon: Gift },
    { label: 'Referral Reward', value: '50 RZC', icon: Users },
    { label: 'Network Levels', value: '5 Tiers', icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors">
      {/* Back/Home Navigation */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-24 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">Back</span>
            </button>
            
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all group"
            >
              <Home size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">Home</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="px-6 lg:px-24 py-16 lg:py-24 border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
              <Sparkles size={14} /> RZC Ecosystem
            </div>
            <h1 className="text-4xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight">
              Use RZC <span className="luxury-gradient-text">Everywhere</span>
            </h1>
            <p className="text-lg lg:text-xl text-slate-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed font-medium">
              From everyday payments to advanced DeFi—RZC powers a complete Web3 ecosystem. 
              Discover all the ways you can use your RhizaCore tokens.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {stats.map((stat, idx) => (
              <div 
                key={idx}
                className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-center hover:border-primary/30 transition-all"
              >
                <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mb-1">
                  {stat.value}
                </h3>
                <p className="text-xs text-slate-600 dark:text-gray-400 font-bold uppercase tracking-wider">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Utilities Grid */}
      <section className="px-6 lg:px-24 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {utilities.map((utility, idx) => (
              <Link
                key={idx}
                to={utility.path}
                className="group relative bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl p-8 hover:border-primary/30 dark:hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
              >
                {/* Badge */}
                {utility.badge && (
                  <div className="absolute top-6 right-6">
                    <span className="text-[8px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                      {utility.badge}
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${utility.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <utility.icon size={28} className="text-white" strokeWidth={2.5} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 group-hover:text-primary transition-colors">
                  {utility.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed mb-4 font-medium">
                  {utility.description}
                </p>

                {/* Features */}
                {utility.features && (
                  <ul className="space-y-2 mb-4">
                    {utility.features.map((feature, featureIdx) => (
                      <li 
                        key={featureIdx}
                        className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-2"
                      >
                        <CheckCircle2 size={14} className="text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Arrow */}
                <div className="flex items-center gap-2 text-primary text-sm font-black uppercase tracking-wider group-hover:gap-3 transition-all">
                  Explore
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>

                {/* External Link Icon */}
                {utility.isExternal && (
                  <ExternalLink 
                    size={16} 
                    className="absolute top-6 right-6 text-slate-400 dark:text-gray-600" 
                  />
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 lg:px-24 py-16 lg:py-24 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl lg:text-5xl font-black text-slate-900 dark:text-white">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-slate-600 dark:text-gray-300 leading-relaxed font-medium">
            Create your wallet in minutes and start using RZC for payments, rewards, and more.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/create-wallet"
              className="w-full sm:w-auto px-10 py-5 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <Wallet size={18} />
              Create Wallet
            </Link>
            <Link 
              to="/whitepaper"
              className="w-full sm:w-auto px-10 py-5 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:border-primary/30 transition-all flex items-center justify-center gap-2"
            >
              Learn More
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="px-6 lg:px-24 py-12 border-t border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-3xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Bot size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
                  Need Help?
                </h3>
                <p className="text-sm text-slate-600 dark:text-gray-300 font-medium">
                  Our AI assistant is here 24/7 to answer your questions and guide you through the ecosystem.
                </p>
              </div>
            </div>
            <Link 
              to="/wallet/ai-assistant"
              className="px-8 py-3 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all whitespace-nowrap"
            >
              Ask AI Assistant
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RzcUtility;
