import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Rocket, 
  ShoppingBag, 
  Store, 
  Code, 
  Shield, 
  FileText, 
  HelpCircle,
  Book,
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
  History,
  Zap,
  Gift,
  Crown,
  Layers,
  TrendingUp
} from 'lucide-react';

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

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Wallet',
      items: [
        {
          title: 'Send',
          description: 'Transfer tokens',
          icon: Send,
          path: '/wallet/transfer',
          color: 'from-blue-500 to-indigo-500'
        },
        {
          title: 'Receive',
          description: 'Get address & QR',
          icon: Download,
          path: '/wallet/receive',
          color: 'from-green-500 to-teal-500'
        },
        {
          title: 'History',
          description: 'View transactions',
          icon: History,
          path: '/wallet/history',
          color: 'from-indigo-500 to-purple-500'
        },
        {
          title: 'Multi-Chain',
          description: 'EVM + TON wallet',
          icon: Layers,
          path: '/wallet/multi-chain',
          badge: 'WDK',
          color: 'from-violet-600 to-indigo-600'
        },
        {
          title: 'Migration',
          description: 'Pre-mine to mainnet',
          icon: TrendingUp,
          path: '/wallet/migration',
          badge: 'New',
          color: 'from-violet-500 to-purple-500'
        },
        {
          title: 'Settings',
          description: 'Manage wallet',
          icon: Settings,
          path: '/wallet/settings',
          color: 'from-slate-500 to-gray-500'
        }
      ]
    },
    {
      title: 'Earn & Rewards',
      items: [
        {
          title: 'Node Packages',
          description: 'Purchase & earn',
          icon: Zap,
          path: '/wallet/sales-package',
          badge: 'Earn',
          color: 'from-emerald-500 to-cyan-500'
        },
        {
          title: 'Referral',
          description: 'Invite & earn',
          icon: Gift,
          path: '/wallet/referral',
          badge: 'Hot',
          color: 'from-orange-500 to-red-500'
        },
        {
          title: 'Vanguard',
          description: 'Ambassador program',
          icon: Crown,
          path: '/wallet/vanguard',
          badge: 'New',
          color: 'from-amber-500 to-orange-500'
        }
      ]
    },
    {
      title: 'Ecosystem',
      items: [
        {
          title: 'Launchpad',
          description: 'New token launches',
          icon: Rocket,
          path: '/launchpad',
          badge: 'New',
          color: 'from-purple-500 to-pink-500'
        },
        {
          title: 'Marketplace',
          description: 'Buy & sell assets',
          icon: ShoppingBag,
          path: '/marketplace',
          color: 'from-blue-500 to-cyan-500'
        },
        {
          title: 'Use RZC',
          description: 'Explore use cases',
          icon: Sparkles,
          path: '/use-rzc',
          color: 'from-primary to-secondary'
        }
      ]
    },
    {
      title: 'Tools',
      items: [
        {
          title: 'AI Assistant',
          description: 'Get AI help',
          icon: Bot,
          path: '/wallet/ai-assistant',
          badge: 'Beta',
          color: 'from-pink-500 to-rose-500'
        },
        {
          title: 'Notifications',
          description: 'View alerts',
          icon: Bell,
          path: '/wallet/notifications',
          color: 'from-orange-500 to-amber-500'
        },
        {
          title: 'Activity',
          description: 'Track activity',
          icon: Activity,
          path: '/wallet/activity',
          color: 'from-cyan-500 to-blue-500'
        }
      ]
    },
    {
      title: 'Developers',
      items: [
        {
          title: 'Developer Hub',
          description: 'Build on RhizaCore',
          icon: Code,
          path: '/developers',
          color: 'from-cyan-500 to-blue-500'
        },
        {
          title: 'Merchant API',
          description: 'Accept payments',
          icon: Store,
          path: '/merchant-api',
          color: 'from-indigo-500 to-purple-500'
        },
        {
          title: 'Security Audit',
          description: 'View audit reports',
          icon: Shield,
          path: '/security',
          badge: 'New',
          color: 'from-green-500 to-emerald-500'
        }
      ]
    },
    {
      title: 'Learn',
      items: [
        {
          title: 'Whitepaper',
          description: 'Vision & roadmap',
          icon: Book,
          path: '/whitepaper',
          color: 'from-slate-500 to-gray-500'
        },
        {
          title: 'User Guide',
          description: 'How to use',
          icon: FileText,
          path: '/guide',
          color: 'from-pink-500 to-rose-500'
        },
        {
          title: 'Tutorials',
          description: 'Step-by-step guides',
          icon: Sparkles,
          path: '/tutorials',
          color: 'from-teal-500 to-green-500'
        },
        {
          title: 'Help Center',
          description: 'Get support',
          icon: HelpCircle,
          path: '/help',
          color: 'from-amber-500 to-yellow-500'
        }
      ]
    },
    {
      title: 'Legal & Compliance',
      items: [
        {
          title: 'Privacy Policy',
          description: 'Data protection',
          icon: Lock,
          path: '/privacy',
          color: 'from-gray-500 to-slate-500'
        },
        {
          title: 'Terms of Service',
          description: 'Usage terms',
          icon: FileCheck,
          path: '/terms',
          color: 'from-blue-500 to-indigo-500'
        },
        {
          title: 'Compliance',
          description: 'Regulatory info',
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
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950 dark:text-white">More</h1>
        <p className="text-sm text-gray-700 dark:text-gray-400">
          Explore the RhizaCore ecosystem and resources
        </p>
      </div>

      {/* App Menu Grid */}
      {menuSections.map((section, sectionIdx) => (
        <div key={sectionIdx} className="space-y-3">
          <h2 className="text-[10px] font-black text-slate-400 dark:text-gray-600 uppercase tracking-widest px-2">
            {section.title}
          </h2>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {section.items.map((item, itemIdx) => (
              <Link
                key={itemIdx}
                to={item.path}
                className="group relative flex flex-col items-center justify-center p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/50 dark:hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 aspect-square"
              >
                {/* Badge */}
                {item.badge && (
                  <div className="absolute -top-1 -right-1 z-10">
                    <span className="text-[7px] font-black uppercase tracking-wider bg-primary text-white px-1.5 py-0.5 rounded-full shadow-lg">
                      {item.badge}
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon size={20} className="text-white" strokeWidth={2.5} />
                </div>

                {/* Title */}
                <h3 className="text-[10px] sm:text-xs font-bold text-slate-900 dark:text-white text-center line-clamp-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>

                {/* External Link Indicator */}
                {item.isExternal && (
                  <ExternalLink size={8} className="absolute bottom-2 right-2 text-slate-400 dark:text-gray-600" />
                )}
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
