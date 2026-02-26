import React from 'react';
import { Link } from 'react-router-dom';
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
  Wallet
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
          title: 'AI Assistant',
          description: 'Get help from AI',
          icon: Bot,
          path: '/wallet/ai-assistant',
          badge: 'Beta',
          color: 'from-purple-500 to-pink-500'
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
