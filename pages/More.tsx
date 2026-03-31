import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Rocket, 
  ShoppingBag, 
  TrendingUp, 
  Store, 
  Code, 
  Shield, 
  FileText, 
  HelpCircle,
  Book,
  Users,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Lock,
  Globe,
  FileCheck,
  Send,
  Download,
  Bot,
  Bell,
  Activity,
  Settings,
  Wallet,
  History,
  Zap,
  Coins,
  Gift,
  User,
  Copy,
  Check,
  Edit,
  Crown,
  Layers
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';

interface MenuItem {
  title: string;
  description: string;
  icon: any;
  path: string;
  isExternal?: boolean;
  badge?: string;
  color: string;
}

const More: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, referralData, address } = useWallet();
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [copiedAddress, setCopiedAddress] = React.useState(false);

  const handleCopyCode = () => {
    if (referralData?.referral_code) {
      navigator.clipboard.writeText(referralData.referral_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const isValidImageUrl = (url: string | undefined) => {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
  };

  const getUserInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'RZC Utilities',
      items: [
        {
          title: 'Use RZC Everywhere',
          description: 'Explore all RZC use cases',
          icon: Sparkles,
          path: '/use-rzc',
          badge: 'New',
          color: 'from-primary to-secondary'
        },
        {
          title: 'Get RZC',
          description: 'Purchase packages & earn rewards',
          icon: Coins,
          path: '/wallet/sales-package',
          badge: 'Earn',
          color: 'from-emerald-500 to-teal-500'
        },
        {
          title: 'Transfer',
          description: 'Send RZC to anyone',
          icon: Send,
          path: '/wallet/transfer',
          color: 'from-purple-500 to-pink-500'
        },
        {
          title: 'Earn Rewards',
          description: 'Refer friends & earn 50 RZC',
          icon: Gift,
          path: '/wallet/referral',
          badge: 'Hot',
          color: 'from-orange-500 to-red-500'
        }
      ]
    },
    {
      title: 'Wallet Features',
      items: [
        {
          title: 'Send',
          description: 'Transfer tokens to others',
          icon: Send,
          path: '/wallet/transfer',
          color: 'from-blue-500 to-indigo-500'
        },
        {
          title: 'Receive',
          description: 'Get your wallet address & QR',
          icon: Download,
          path: '/wallet/receive',
          color: 'from-green-500 to-teal-500'
        },
        {
          title: 'Wallet Migration',
          description: 'Migrate from pre-mine to mainnet',
          icon: TrendingUp,
          path: '/wallet/migration',
          badge: 'New',
          color: 'from-violet-500 to-purple-500'
        },
        {
          title: 'Multi-Chain Wallet',
          description: 'Manage EVM + TON from one 12-word phrase',
          icon: Layers,
          path: '/wallet/multi-chain',
          badge: 'WDK',
          color: 'from-violet-600 to-indigo-600'
        },
        {
          title: 'History',
          description: 'View transaction history',
          icon: History,
          path: '/wallet/history',
          color: 'from-indigo-500 to-purple-500'
        },
        {
          title: 'Node Packages',
          description: 'Purchase packages & earn rewards',
          icon: Zap,
          path: '/wallet/sales-package',
          badge: 'Earn',
          color: 'from-emerald-500 to-cyan-500'
        },
        {
          title: 'AI Assistant',
          description: 'Get help from AI',
          icon: Bot,
          path: '/wallet/ai-assistant',
          badge: 'Beta',
          color: 'from-pink-500 to-rose-500'
        },
        {
          title: 'Notifications',
          description: 'View your alerts',
          icon: Bell,
          path: '/wallet/notifications',
          color: 'from-orange-500 to-amber-500'
        },
        {
          title: 'Activity Log',
          description: 'Track your wallet activity',
          icon: Activity,
          path: '/wallet/activity',
          color: 'from-cyan-500 to-blue-500'
        },
        {
          title: 'Settings',
          description: 'Manage your wallet',
          icon: Settings,
          path: '/wallet/settings',
          color: 'from-slate-500 to-gray-500'
        }
      ]
    },
    {
      title: 'Ecosystem',
      items: [
        {
          title: 'Launchpad',
          description: 'Discover new token launches',
          icon: Rocket,
          path: '/launchpad',
          badge: 'New',
          color: 'from-purple-500 to-pink-500'
        },
        {
          title: 'Marketplace',
          description: 'Buy & sell digital assets',
          icon: ShoppingBag,
          path: '/marketplace',
          color: 'from-blue-500 to-cyan-500'
        },
        {
          title: 'Staking',
          description: 'Earn rewards on your tokens',
          icon: TrendingUp,
          path: '/staking',
          color: 'from-green-500 to-emerald-500'
        },
        {
          title: 'Referral',
          description: 'Invite friends and earn',
          icon: Users,
          path: '/wallet/referral',
          color: 'from-orange-500 to-red-500'
        }
      ]
    },
    {
      title: 'For Developers',
      items: [
        {
          title: 'Merchant API',
          description: 'Accept crypto payments',
          icon: Store,
          path: '/merchant-api',
          color: 'from-indigo-500 to-purple-500'
        },
        {
          title: 'Developer Hub',
          description: 'Build on RhizaCore',
          icon: Code,
          path: '/developers',
          color: 'from-cyan-500 to-blue-500'
        }
      ]
    },
    {
      title: 'Resources',
      items: [
        {
          title: 'Whitepaper',
          description: 'Read our vision & roadmap',
          icon: Book,
          path: '/whitepaper',
          color: 'from-slate-500 to-gray-500'
        },
        {
          title: 'Help Center',
          description: 'Get support & answers',
          icon: HelpCircle,
          path: '/help',
          color: 'from-amber-500 to-yellow-500'
        },
        {
          title: 'User Guide',
          description: 'Learn how to use RhizaCore',
          icon: Sparkles,
          path: '/guide',
          color: 'from-pink-500 to-rose-500'
        },
        {
          title: 'Tutorials',
          description: 'Step-by-step guides',
          icon: FileText,
          path: '/tutorials',
          color: 'from-teal-500 to-green-500'
        }
      ]
    },
    {
      title: 'Legal & Security',
      items: [
        {
          title: 'Security Audit',
          description: 'View our security reports',
          icon: Shield,
          path: '/security',
          color: 'from-red-500 to-orange-500'
        },
        {
          title: 'Privacy Policy',
          description: 'How we protect your data',
          icon: Lock,
          path: '/privacy',
          color: 'from-gray-500 to-slate-500'
        },
        {
          title: 'Terms of Service',
          description: 'Our terms and conditions',
          icon: FileCheck,
          path: '/terms',
          color: 'from-blue-500 to-indigo-500'
        },
        {
          title: 'Compliance',
          description: 'Regulatory compliance info',
          icon: Globe,
          path: '/compliance',
          color: 'from-violet-500 to-purple-500'
        }
      ]
    }
  ];

  return (
    <div className="space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">More</h1>
        <p className="text-sm text-slate-600 dark:text-gray-400">
          Explore the RhizaCore ecosystem and resources
        </p>
      </div>

      {/* User Profile Card - Compact & Responsive */}
      <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-500/10 dark:to-cyan-500/10 border-2 border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100 dark:bg-emerald-500/10 blur-[50px] rounded-full" />
        
        <div className="relative z-10 space-y-3">
          {/* Profile Header - Compact */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Avatar - Smaller */}
              {isValidImageUrl(userProfile?.avatar) ? (
                <img 
                  src={userProfile.avatar} 
                  alt={userProfile.name || 'User'} 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover ring-2 ring-emerald-200 dark:ring-emerald-500/20 flex-shrink-0"
                />
              ) : userProfile?.avatar ? (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center ring-2 ring-emerald-200 dark:ring-emerald-500/20 flex-shrink-0">
                  <span className="text-xl sm:text-2xl">{userProfile.avatar}</span>
                </div>
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center ring-2 ring-emerald-200 dark:ring-emerald-500/20 flex-shrink-0">
                  <span className="text-white text-base sm:text-lg font-black">{getUserInitials(userProfile?.name)}</span>
                </div>
              )}
              
              {/* Name & Badges - Compact */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                  {userProfile?.name || 'User'}
                </h3>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {userProfile?.is_active ? (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-green-500/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-gray-500/20 text-gray-700 dark:text-gray-400 px-1.5 py-0.5 rounded">
                      Inactive
                    </span>
                  )}
                  {referralData && (
                    <div className="flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                      <Crown size={9} />
                      <span className="hidden sm:inline">{referralData.rank || 'Core Node'}</span>
                      <span className="sm:hidden">Lv{referralData.level || 1}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Edit Button - Compact */}
            <button
              onClick={() => navigate('/wallet/profile')}
              className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            >
              <Edit size={16} className="text-emerald-700 dark:text-emerald-400" />
            </button>
          </div>

          {/* Stats Grid - Compact */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/50 dark:bg-white/5 rounded-lg p-2 border border-emerald-200 dark:border-emerald-500/20">
              <div className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-0.5">
                RZC
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {(userProfile?.rzc_balance || 0).toLocaleString()}
              </div>
            </div>
            
            <div className="bg-white/50 dark:bg-white/5 rounded-lg p-2 border border-emerald-200 dark:border-emerald-500/20">
              <div className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-0.5">
                Refs
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {referralData?.total_referrals || 0}
              </div>
            </div>
            
            <div className="bg-white/50 dark:bg-white/5 rounded-lg p-2 border border-emerald-200 dark:border-emerald-500/20">
              <div className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-0.5">
                Level
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {referralData?.level || 1}
              </div>
            </div>
          </div>

          {/* Referral Code - Compact */}
          {referralData?.referral_code && (
            <div className="bg-white/50 dark:bg-white/5 rounded-lg p-2 border border-emerald-200 dark:border-emerald-500/20">
              <div className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                Referral Code
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white bg-white/50 dark:bg-black/20 px-2 py-1.5 rounded truncate">
                  {referralData.referral_code}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="p-1.5 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded transition-colors flex-shrink-0"
                >
                  {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          {/* Wallet Address - Compact & Collapsible on Mobile */}
          {address && (
            <details className="bg-white/50 dark:bg-white/5 rounded-lg border border-emerald-200 dark:border-emerald-500/20 group">
              <summary className="p-2 cursor-pointer list-none flex items-center justify-between">
                <div className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Wallet Address
                </div>
                <ChevronRight size={12} className="text-emerald-700 dark:text-emerald-400 group-open:rotate-90 transition-transform" />
              </summary>
              <div className="px-2 pb-2">
                <div className="flex items-center gap-2 pt-1">
                  <code className="flex-1 text-[10px] sm:text-xs font-mono font-bold text-slate-900 dark:text-white bg-white/50 dark:bg-black/20 px-2 py-1.5 rounded break-all">
                    {address}
                  </code>
                  <button
                    onClick={handleCopyAddress}
                    className="p-1.5 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded transition-colors flex-shrink-0"
                  >
                    {copiedAddress ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Menu Sections */}
      {menuSections.map((section, sectionIdx) => (
        <div key={sectionIdx} className="space-y-3">
          <h2 className="text-[10px] font-black text-slate-400 dark:text-gray-600 uppercase tracking-widest px-2">
            {section.title}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.items.map((item, itemIdx) => (
              <Link
                key={itemIdx}
                to={item.path}
                className="group relative bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 hover:border-primary/50 dark:hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
              >
                {/* Badge */}
                {item.badge && (
                  <div className="absolute top-3 right-3">
                    <span className="text-[8px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon size={20} className="text-white" strokeWidth={2.5} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      {item.isExternal && (
                        <ExternalLink size={12} className="text-slate-400 dark:text-gray-600" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {item.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight 
                    size={16} 
                    className="text-slate-400 dark:text-gray-600 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" 
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Footer Info */}
      <div className="mt-8 p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Need Help?
            </h3>
            <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
              Visit our Help Center or check out the User Guide for detailed instructions on using RhizaCore.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default More;
