import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  BookOpen, 
  HelpCircle, 
  Video, 
  FileText,
  Search,
  Wallet,
  Send,
  Shield,
  Settings as SettingsIcon,
  Zap,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

const Help: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const helpCategories = [
    {
      icon: Wallet,
      title: 'Getting Started',
      description: 'Learn the basics of creating and using your wallet',
      articles: 4,
      color: '#00FF88',
      link: '/guide#getting-started'
    },
    {
      icon: Send,
      title: 'Transactions',
      description: 'Send, receive, and manage your transactions',
      articles: 5,
      color: '#00CCFF',
      link: '/guide#transactions'
    },
    {
      icon: Shield,
      title: 'Security',
      description: 'Keep your wallet and funds safe',
      articles: 5,
      color: '#FF6B6B',
      link: '/guide#security'
    },
    {
      icon: SettingsIcon,
      title: 'Wallet Management',
      description: 'Manage multiple wallets and settings',
      articles: 7,
      color: '#FFD93D',
      link: '/guide#wallet-management'
    }
  ];

  const quickLinks = [
    { title: 'Complete User Guide', icon: BookOpen, link: '/guide', desc: 'Step-by-step guide for all features' },
    { title: 'FAQ', icon: HelpCircle, link: '/faq', desc: 'Quick answers to common questions' },
    { title: 'Video Tutorials', icon: Video, link: '/tutorials', desc: 'Watch and learn visually' },
    { title: 'Whitepaper', icon: FileText, link: '/whitepaper', desc: 'Technical documentation' }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-slate-600 dark:text-gray-400 hover:text-primary transition-colors group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold">Back to Home</span>
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
                <HelpCircle className="text-black" size={24} />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">Help Center</h1>
                <p className="text-slate-600 dark:text-gray-400 font-medium">Find answers and learn how to use RhizaCore</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" size={20} />
              <input
                type="text"
                placeholder="Search for help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-6 py-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 outline-none focus:border-primary/50 transition-all font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        {/* Quick Links */}
        <div className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Quick Access</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((item, idx) => (
              <Link
                key={idx}
                to={item.link}
                className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/30 transition-all group"
              >
                <item.icon className="text-primary mb-4 group-hover:scale-110 transition-transform" size={28} />
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 dark:text-gray-400 font-medium">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Help Categories */}
        <div className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Browse by Category</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {helpCategories.map((category, idx) => (
              <Link
                key={idx}
                to={category.link}
                className="p-8 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <category.icon style={{ color: category.color }} size={28} />
                  </div>
                  <span className="text-xs font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest">
                    {category.articles} Articles
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                  {category.title}
                </h3>
                <p className="text-slate-600 dark:text-gray-400 text-sm font-medium leading-relaxed">
                  {category.description}
                </p>
                <div className="flex items-center gap-2 text-primary text-sm font-bold mt-4 group-hover:gap-3 transition-all">
                  Learn More <ChevronRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Popular Articles */}
        <div className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Popular Articles</h2>
          <div className="space-y-3">
            {[
              { title: 'How do I create my first wallet?', link: '/guide#creating-your-first-wallet' },
              { title: 'What if I lose my 24-word phrase?', link: '/faq#wallet--security' },
              { title: 'How do I send money?', link: '/guide#sending-money' },
              { title: 'How secure is RhizaCore?', link: '/faq#wallet--security' },
              { title: 'How do I add a second wallet?', link: '/guide#managing-multiple-wallets' },
              { title: 'What are the fees?', link: '/faq#transactions--fees' }
            ].map((article, idx) => (
              <Link
                key={idx}
                to={article.link}
                className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/30 transition-all group"
              >
                <span className="text-slate-900 dark:text-white font-bold group-hover:text-primary transition-colors">
                  {article.title}
                </span>
                <ChevronRight className="text-slate-400 dark:text-gray-500 group-hover:text-primary group-hover:translate-x-1 transition-all" size={20} />
              </Link>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center flex-shrink-0">
              <Zap className="text-black" size={32} />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Still Need Help?</h3>
              <p className="text-slate-600 dark:text-gray-300 font-medium mb-6">
                Can't find what you're looking for? Our support team is here to help you 24/7.
              </p>
              <div className="flex flex-wrap gap-4">
                <a 
                  href="mailto:help@rhizacore.xyz"
                  className="px-6 py-3 bg-primary text-black rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all"
                >
                  Email Support
                </a>
                <a 
                  href="https://t.me/rhizacore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                >
                  Join Forum <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
