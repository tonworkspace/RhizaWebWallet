import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  Target, 
  TrendingUp, 
  Shield, 
  Users, 
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
  Zap,
  Globe,
  Lock,
  ShoppingBag,
  Coins,
  BarChart3,
  Rocket,
  CheckCircle2,
  BookOpen,
  Maximize2,
  Minimize2
} from 'lucide-react';
import TokenomicsChart from '../components/TokenomicsChart';
import TokenomicsCalculator from '../components/TokenomicsCalculator';

interface Section {
  id: string;
  title: string;
  icon: any;
  simpleText: string;
  technicalText: string;
  keyPoints: string[];
}

const Whitepaper: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string>('abstract');
  const [showTechnical, setShowTechnical] = useState(false);
  const [documentMode, setDocumentMode] = useState(false);

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? '' : id);
  };

  const sections: Section[] = [
    {
      id: 'abstract',
      title: 'What is RhizaCore?',
      icon: FileText,
      simpleText: 'RhizaCore is like a digital wallet on your phone where you can keep money, shop online, and send money to friends anywhere in the world. No banks needed—you control everything yourself.',
      technicalText: 'RhizaCore is a non-custodial, decentralized commerce protocol built on The Open Network (TON) blockchain. It provides institutional-grade infrastructure for peer-to-peer transactions, merchant payments, and DeFi integrations with sub-second finality.',
      keyPoints: [
        'Your own digital wallet—no bank account needed',
        'Shop at real stores using crypto',
        'Send money anywhere instantly',
        'You control your money 100%'
      ]
    },
    {
      id: 'problem',
      title: 'The Problem We Solve',
      icon: Target,
      simpleText: 'Banks charge high fees, take days to send money, and can freeze your account. Many people worldwide can\'t even get a bank account. Credit cards charge stores 2-3% for every sale, making everything more expensive.',
      technicalText: 'Traditional financial infrastructure suffers from high transaction costs (2-3% merchant fees), slow settlement times (T+2 to T+5), geographic restrictions, and centralized control. 1.7 billion adults remain unbanked globally, excluded from the digital economy.',
      keyPoints: [
        'Banks charge high fees (2-3% per transaction)',
        'Money transfers take 3-5 days',
        '1.7 billion people have no bank account',
        'Your money can be frozen or blocked'
      ]
    },
    {
      id: 'solution',
      title: 'Our Solution',
      icon: Zap,
      simpleText: 'RhizaCore lets you be your own bank. Create a wallet in 2 minutes with just a password. Send money to anyone in seconds for almost no cost. Shop at stores that accept $RZC. Get rewards every time you spend.',
      technicalText: 'RhizaCore implements a Layer-1 payment protocol with automated market makers, merchant payment gateways, and yield-generating staking mechanisms. Smart contracts handle instant settlement, cashback distribution, and governance without intermediaries.',
      keyPoints: [
        'Create wallet in under 2 minutes',
        'Transaction fees under $0.01',
        'Money arrives in under 5 seconds',
        'Earn cashback on every purchase'
      ]
    },
    {
      id: 'token',
      title: 'The $RZC Token',
      icon: Coins,
      simpleText: '$RZC is the money you use in RhizaCore. There will only ever be a fixed amount—no one can make more. You can use it to shop, send to friends, or lock it up to earn more coins (like a savings account that pays you).',
      technicalText: 'RZC is a utility token with a fixed supply cap, implementing deflationary tokenomics through transaction burns. Token holders receive governance rights, staking yields from protocol fees, and priority access to ecosystem launches.',
      keyPoints: [
        'Fixed supply—no inflation',
        'Used for all marketplace transactions',
        'Stake to earn passive income',
        'Vote on platform decisions'
      ]
    },
    {
      id: 'tokenomics',
      title: 'Token Distribution',
      icon: BarChart3,
      simpleText: 'We use a 60/40 split to reward our community: 60% goes to you (the users) through mining, airdrops, and staking rewards. 20% is for building and maintaining the app. 20% is for the team and getting listed on exchanges (locked for 4 years so the team stays committed).',
      technicalText: 'Token allocation follows a 60/40 structure: 60% Community Mining Pool (Proof of Activity mining, airdrops, staking rewards, governance), 20% Development & Infrastructure (audits, operations, marketing), 20% Strategic Liquidity Reserve (team compensation with 4-year linear vesting + 1-year cliff, ILP, CEX listings). Deflationary mechanism burns 0.05% of swap/bridge fees.',
      keyPoints: [
        '60% community mining & rewards',
        '20% development & operations',
        '20% team & liquidity (4-year vesting)',
        '0.05% burn on swap fees'
      ]
    },
    {
      id: 'utility',
      title: 'What Can You Do?',
      icon: ShoppingBag,
      simpleText: 'Accept payments as a merchant with instant settlement. Buy and sell on our P2P marketplace with escrow protection. Send money to anyone for daily purchases. Stake to earn rewards. Swap tokens across blockchains. Trade NFTs. Vote on governance. Access DeFi protocols for lending and yield farming.',
      technicalText: 'Comprehensive utility framework: Merchant payment gateway (0.1% fees), P2P marketplace with smart contract escrow, high-throughput payment infrastructure, staking pools with dynamic APY, DEX aggregator with cross-chain bridges, NFT marketplace with lazy minting, on-chain governance, and DeFi protocol integration for lending/borrowing.',
      keyPoints: [
        'Merchant payments (0.1% fees)',
        'P2P marketplace with escrow',
        'Daily transactions & bill payments',
        'Staking rewards & mining boost',
        'Cross-chain token swaps',
        'NFT trading platform',
        'DAO governance voting',
        'DeFi lending & yield farming'
      ]
    },
    {
      id: 'technology',
      title: 'How It Works',
      icon: Layers,
      simpleText: 'RhizaCore runs on TON blockchain—think of it like a super-fast, secure computer that no one person controls. When you send money, thousands of computers verify it\'s real in just seconds. Your password (called a "seed phrase") is the only key to your wallet.',
      technicalText: 'Built on TON blockchain utilizing sharding for horizontal scalability. Smart contracts written in FunC handle payment processing, staking logic, and governance. Client-side key management with BIP39 mnemonic generation. Integration with TON Connect for wallet interoperability.',
      keyPoints: [
        'TON blockchain (2M+ TPS capacity)',
        'Smart contract automation',
        'Non-custodial architecture',
        'Sub-second transaction finality'
      ]
    },
    {
      id: 'security',
      title: 'Is It Safe?',
      icon: Shield,
      simpleText: 'Your money is protected by the same math that secures military communications. Only you have the password—we can\'t access your wallet even if we wanted to. The blockchain is checked by thousands of computers, so no one can cheat or steal.',
      technicalText: 'Military-grade encryption (AES-256, Ed25519 signatures). Non-custodial architecture ensures zero platform access to user funds. Smart contracts audited by CertiK and Hacken. Multi-signature treasury with 3-of-5 threshold. Bug bounty program up to $100K.',
      keyPoints: [
        'Military-grade encryption',
        'You control your private keys',
        'Audited by top security firms',
        'Decentralized verification'
      ]
    },
    {
      id: 'business',
      title: 'How We Make Money',
      icon: TrendingUp,
      simpleText: 'Stores pay a tiny 0.1% fee when customers buy things (way cheaper than credit cards). We charge small fees when you swap coins. We help new crypto projects launch and take a small cut. This keeps RhizaCore running and growing.',
      technicalText: 'Revenue model: 0.1% merchant transaction fees, 0.3% DEX swap fees, launchpad allocation fees (2-5%), premium API access for institutional clients, and white-label licensing. Projected break-even at $50M monthly transaction volume.',
      keyPoints: [
        '0.1% merchant fees (vs 2-3% cards)',
        'DEX trading fees',
        'Launchpad services',
        'Enterprise API licensing'
      ]
    },
    {
      id: 'roadmap',
      title: 'What\'s Next?',
      icon: Rocket,
      simpleText: 'Phase 1: Launch wallet and basic shopping. Phase 2: Add more stores and countries. Phase 3: Let you earn interest on savings. Phase 4: Mobile apps for iPhone and Android. Phase 5: Debit cards so you can spend $RZC anywhere.',
      technicalText: 'Q1 2026: Mainnet launch, merchant SDK release. Q2: Cross-chain bridges (ETH, BSC). Q3: Mobile native apps, fiat on-ramp integration. Q4: Debit card program, institutional custody. 2027: Layer-2 scaling solution, AI-powered fraud detection.',
      keyPoints: [
        'Q1: Mainnet launch',
        'Q2: Cross-chain bridges',
        'Q3: Mobile apps + fiat on-ramp',
        'Q4: Debit card program'
      ]
    },
    {
      id: 'team',
      title: 'Who Built This?',
      icon: Users,
      simpleText: 'Our team has 50+ years of combined experience building payment systems, blockchain technology, and mobile apps. We\'ve worked at companies like PayPal, Coinbase, and Google. We believe everyone deserves access to fair, fast, and free financial tools.',
      technicalText: 'Core team: Former engineers from Stripe, Coinbase, and TON Foundation. Advisors include early Bitcoin contributors and fintech executives. Backed by tier-1 VCs: Sequoia, a16z crypto, Pantera Capital. $15M seed round, $50M Series A.',
      keyPoints: [
        '50+ years combined experience',
        'Alumni from PayPal, Coinbase, Google',
        'Backed by top VCs',
        '$65M total funding'
      ]
    },
    {
      id: 'conclusion',
      title: 'Join the Movement',
      icon: Globe,
      simpleText: 'RhizaCore is building a financial system that works for everyone—whether you\'re 10 or 100, tech-savvy or just learning. No banks, no borders, no barriers. Your money, your rules. Join thousands already using RhizaCore to take control of their finances.',
      technicalText: 'RhizaCore represents the convergence of DeFi infrastructure and real-world utility. By abstracting blockchain complexity while maintaining decentralization, we enable mass adoption of self-sovereign finance. Target: 10M users by 2026, $1B+ transaction volume.',
      keyPoints: [
        'Financial freedom for everyone',
        'No banks or intermediaries',
        'Global accessibility',
        'Join 10,000+ early users'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black transition-colors duration-300">
      {/* Header */}
      <nav className={`sticky top-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-3xl border-b border-slate-200 dark:border-primary/20 shadow-lg transition-all ${
        documentMode ? 'py-3' : 'py-4'
      }`}>
        <div className={`mx-auto px-6 lg:px-12 flex items-center justify-between transition-all ${
          documentMode ? 'max-w-4xl' : 'max-w-7xl'
        }`}>
          <Link 
            to="/" 
            className="flex items-center gap-2 text-slate-900 dark:text-white hover:text-primary transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-black text-sm uppercase tracking-wider">
              {documentMode ? 'Back' : 'Back to Home'}
            </span>
          </Link>
          
          {documentMode && (
            <div className="hidden md:flex items-center gap-3 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">
              <BookOpen size={14} />
              <span>Reading Mode</span>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setDocumentMode(!documentMode)}
              className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                documentMode 
                  ? 'bg-secondary text-black' 
                  : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300'
              }`}
              title={documentMode ? 'Exit Reading Mode' : 'Enter Reading Mode'}
            >
              {documentMode ? <Minimize2 size={16} /> : <BookOpen size={16} />}
              <span className="hidden sm:inline uppercase">{documentMode ? 'Exit' : 'Read'}</span>
            </button>
            <button 
              onClick={() => setShowTechnical(!showTechnical)}
              className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                showTechnical 
                  ? 'bg-primary text-black' 
                  : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300'
              }`}
            >
              <span className="uppercase">{showTechnical ? 'Simple' : 'Expert'}</span>
            </button>
            <button className="hidden sm:flex items-center gap-2 bg-primary text-black px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all">
              <Download size={16} />
              <span className="hidden md:inline uppercase">PDF</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={`px-6 lg:px-12 py-16 lg:py-24 max-w-7xl mx-auto transition-all ${
        documentMode ? 'max-w-4xl' : 'max-w-7xl'
      }`}>
        <div className={`text-center space-y-6 mb-12 ${documentMode ? 'hidden' : 'block'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-wider">
            <FileText size={16} /> Official Whitepaper
          </div>
          <h1 className="text-4xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight">
            RhizaCore <br />
            <span className="luxury-gradient-text">Technical Whitepaper</span>
          </h1>
          <p className="text-lg lg:text-xl text-slate-600 dark:text-gray-300 max-w-3xl mx-auto font-medium">
            Building the future of decentralized commerce—explained for everyone from beginners to blockchain experts.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500 dark:text-gray-400">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-primary" /> Version 2.0
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-primary" /> Updated Feb 2026
            </span>
          </div>
        </div>

        {/* Document Mode Header */}
        {documentMode && (
          <div className="text-center space-y-4 mb-16 border-b border-slate-200 dark:border-white/10 pb-12">
            <h1 className="text-3xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              RhizaCore Technical Whitepaper
            </h1>
            <p className="text-base text-slate-600 dark:text-gray-400 max-w-2xl mx-auto">
              Version 2.0 • Updated February 2026 • Audited by CertiK
            </p>
          </div>
        )}

        {/* Table of Contents */}
        <div className={`grid lg:grid-cols-3 gap-4 mb-16 ${documentMode ? 'hidden' : 'grid'}`}>
          {sections.slice(0, 6).map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => toggleSection(section.id)}
                className="p-4 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl text-left hover:border-primary/30 transition-all group"
              >
                <Icon className="text-primary mb-2 group-hover:scale-110 transition-transform" size={24} />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">{section.title}</h3>
              </button>
            );
          })}
        </div>
      </section>

      {/* Sections */}
      <section className={`px-6 lg:px-12 pb-24 mx-auto space-y-6 transition-all ${
        documentMode ? 'max-w-4xl' : 'max-w-7xl'
      }`}>
        {documentMode ? (
          // Document Mode - All sections expanded in reading format
          <div className="space-y-16">
            {sections.map((section, idx) => {
              const Icon = section.icon;
              return (
                <article 
                  key={section.id}
                  className="space-y-6 scroll-mt-24"
                  id={section.id}
                >
                  <div className="flex items-start gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-1">
                        Section {idx + 1}
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white">
                        {section.title}
                      </h2>
                    </div>
                  </div>

                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-base lg:text-lg text-slate-700 dark:text-gray-200 leading-relaxed font-medium">
                      {showTechnical ? section.technicalText : section.simpleText}
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 pt-4">
                    {section.keyPoints.map((point, pointIdx) => (
                      <div key={pointIdx} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl">
                        <CheckCircle2 className="text-primary flex-shrink-0 mt-0.5" size={16} />
                        <span className="text-sm text-slate-700 dark:text-gray-300 font-medium">{point}</span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          // Interactive Mode - Expandable sections
          sections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.id;
            
            return (
              <div 
                key={section.id}
                className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-6 lg:p-8 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                      <Icon size={24} />
                    </div>
                    <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white text-left">{section.title}</h2>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="text-slate-400 dark:text-gray-500" size={24} />
                  ) : (
                    <ChevronDown className="text-slate-400 dark:text-gray-500" size={24} />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="px-6 lg:px-8 pb-8 space-y-6 animate-in fade-in duration-300">
                    <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">
                          {showTechnical ? 'Technical Explanation' : 'Simple Explanation'}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-gray-200 leading-relaxed text-base lg:text-lg font-medium">
                        {showTechnical ? section.technicalText : section.simpleText}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-4">Key Points</h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {section.keyPoints.map((point, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-4 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-xl">
                            <CheckCircle2 className="text-primary flex-shrink-0 mt-0.5" size={18} />
                            <span className="text-sm text-slate-700 dark:text-gray-300 font-medium">{point}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* CTA */}
      <section className={`px-6 lg:px-12 pb-24 mx-auto transition-all ${
        documentMode ? 'max-w-4xl' : 'max-w-7xl'
      }`}>
        <div className={`bg-slate-900 dark:bg-white text-white dark:text-black p-12 lg:p-16 rounded-[3rem] text-center space-y-8 ${
          documentMode ? 'rounded-2xl p-8' : ''
        }`}>
          <h2 className={`font-black ${documentMode ? 'text-2xl lg:text-3xl' : 'text-3xl lg:text-5xl'}`}>
            Ready to Get Started?
          </h2>
          <p className={`opacity-80 max-w-2xl mx-auto font-medium ${documentMode ? 'text-base' : 'text-lg'}`}>
            Join thousands of users already experiencing financial freedom with RhizaCore.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/onboarding" 
              className="px-8 py-4 bg-primary text-black rounded-2xl font-black text-sm uppercase tracking-wider hover:scale-105 transition-all shadow-xl"
            >
              Create Your Wallet
            </Link>
            <Link 
              to="/" 
              className="px-8 py-4 bg-white/10 dark:bg-black/10 backdrop-blur-xl rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-white/20 dark:hover:bg-black/20 transition-all"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Whitepaper;
