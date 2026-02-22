import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Rocket, TrendingUp, Users, Clock, Target, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

const Launchpad: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'live' | 'upcoming' | 'ended'>('live');

  const projects = {
    live: [
      {
        id: 1,
        name: 'DeFi Protocol X',
        description: 'Next-generation lending and borrowing platform',
        logo: '🏦',
        raised: 450000,
        goal: 500000,
        participants: 1234,
        timeLeft: '2 days',
        tokenPrice: '0.05',
        allocation: '10,000',
        status: 'live'
      },
      {
        id: 2,
        name: 'GameFi Arena',
        description: 'Play-to-earn gaming ecosystem',
        logo: '🎮',
        raised: 320000,
        goal: 400000,
        participants: 892,
        timeLeft: '5 days',
        tokenPrice: '0.08',
        allocation: '8,000',
        status: 'live'
      }
    ],
    upcoming: [
      {
        id: 3,
        name: 'AI Trading Bot',
        description: 'Automated crypto trading with AI',
        logo: '🤖',
        raised: 0,
        goal: 600000,
        participants: 0,
        timeLeft: '7 days',
        tokenPrice: '0.10',
        allocation: '15,000',
        status: 'upcoming'
      }
    ],
    ended: [
      {
        id: 4,
        name: 'NFT Marketplace Pro',
        description: 'Premium NFT trading platform',
        logo: '🖼️',
        raised: 800000,
        goal: 750000,
        participants: 2341,
        timeLeft: 'Ended',
        tokenPrice: '0.12',
        allocation: '12,000',
        status: 'ended'
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link to="/" className="flex items-center gap-2 text-slate-600 dark:text-gray-400 hover:text-primary transition-colors group">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold">Back to Home</span>
            </Link>
            <Link
              to="/onboarding"
              className="px-6 py-2 bg-primary text-black rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all"
            >
              Apply to Launch
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
              <Rocket className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">Launchpad</h1>
              <p className="text-slate-600 dark:text-gray-400 font-medium">Discover and invest in new projects</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        {/* Hero */}
        <div className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl mb-12">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Early Access to Top Projects</h2>
          <p className="text-slate-600 dark:text-gray-300 text-lg mb-6">
            Get exclusive access to vetted crypto projects before they hit exchanges. 
            Invest with $RZC and be part of the next big thing.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-4 bg-white dark:bg-black/50 rounded-2xl">
              <div className="text-3xl font-black text-primary mb-1">$8.2M</div>
              <div className="text-sm text-slate-600 dark:text-gray-400 font-bold">Total Raised</div>
            </div>
            <div className="p-4 bg-white dark:bg-black/50 rounded-2xl">
              <div className="text-3xl font-black text-primary mb-1">24</div>
              <div className="text-sm text-slate-600 dark:text-gray-400 font-bold">Projects Launched</div>
            </div>
            <div className="p-4 bg-white dark:bg-black/50 rounded-2xl">
              <div className="text-3xl font-black text-primary mb-1">12,543</div>
              <div className="text-sm text-slate-600 dark:text-gray-400 font-bold">Investors</div>
            </div>
            <div className="p-4 bg-white dark:bg-black/50 rounded-2xl">
              <div className="text-3xl font-black text-primary mb-1">92%</div>
              <div className="text-sm text-slate-600 dark:text-gray-400 font-bold">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-8 border-b border-slate-200 dark:border-white/10">
          {[
            { id: 'live', label: 'Live Now', count: projects.live.length },
            { id: 'upcoming', label: 'Upcoming', count: projects.upcoming.length },
            { id: 'ended', label: 'Ended', count: projects.ended.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`px-6 py-3 font-black text-sm uppercase tracking-widest transition-all relative ${
                selectedTab === tab.id
                  ? 'text-primary'
                  : 'text-slate-400 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label} ({tab.count})
              {selectedTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {projects[selectedTab].map((project) => (
            <div key={project.id} className="p-8 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="text-5xl">{project.logo}</div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">{project.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400">{project.description}</p>
                  </div>
                </div>
                {project.status === 'live' && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-500/20 text-green-900 dark:text-green-300 text-xs font-black uppercase rounded-full">
                    Live
                  </span>
                )}
              </div>

              {/* Progress */}
              {project.status !== 'upcoming' && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-600 dark:text-gray-400">Progress</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {((project.raised / project.goal) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-1000"
                      style={{ width: `${(project.raised / project.goal) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500 dark:text-gray-400">
                      ${project.raised.toLocaleString()} raised
                    </span>
                    <span className="text-xs text-slate-500 dark:text-gray-400">
                      Goal: ${project.goal.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                  <div className="text-xs text-slate-500 dark:text-gray-400 mb-1">Token Price</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">${project.tokenPrice}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                  <div className="text-xs text-slate-500 dark:text-gray-400 mb-1">Allocation</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">{project.allocation}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                  <div className="text-xs text-slate-500 dark:text-gray-400 mb-1">
                    {project.status === 'upcoming' ? 'Starts In' : project.status === 'live' ? 'Ends In' : 'Status'}
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">{project.timeLeft}</div>
                </div>
              </div>

              {/* Participants */}
              <div className="flex items-center gap-2 mb-6 text-sm text-slate-600 dark:text-gray-400">
                <Users size={16} />
                <span className="font-bold">{project.participants.toLocaleString()} participants</span>
              </div>

              {/* CTA */}
              <button className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                project.status === 'live'
                  ? 'bg-primary text-black hover:scale-105'
                  : project.status === 'upcoming'
                  ? 'bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 cursor-not-allowed'
              }`}>
                {project.status === 'live' ? 'Invest Now' : project.status === 'upcoming' ? 'Set Reminder' : 'View Results'}
              </button>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">How Launchpad Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', icon: Target, title: 'Browse Projects', desc: 'Explore vetted projects with detailed information' },
              { step: '2', icon: CheckCircle, title: 'Complete KYC', desc: 'Verify your identity (one-time process)' },
              { step: '3', icon: Rocket, title: 'Invest with $RZC', desc: 'Commit your $RZC to the project' },
              { step: '4', icon: TrendingUp, title: 'Receive Tokens', desc: 'Get project tokens after launch' }
            ].map((item, idx) => (
              <div key={idx} className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                <div className="w-12 h-12 bg-primary text-black rounded-xl flex items-center justify-center font-black text-xl mb-4">
                  {item.step}
                </div>
                <item.icon className="text-primary mb-3" size={24} />
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Why Use RhizaCore Launchpad?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Vetted Projects', desc: 'All projects undergo rigorous due diligence', icon: '✅' },
              { title: 'Fair Launch', desc: 'Equal opportunity for all investors', icon: '⚖️' },
              { title: 'Low Fees', desc: 'Only 3% platform fee on raised funds', icon: '💰' },
              { title: 'Secure Escrow', desc: 'Funds held safely until launch', icon: '🔒' },
              { title: 'Early Access', desc: 'Get tokens before public sale', icon: '🚀' },
              { title: 'Community Driven', desc: 'Vote on which projects to list', icon: '🗳️' }
            ].map((benefit, idx) => (
              <div key={idx} className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/30 transition-all">
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{benefit.title}</h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* For Projects */}
        <section className="mb-16">
          <div className="p-8 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-600/10 border border-blue-200 dark:border-blue-500/20 rounded-3xl">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Want to Launch Your Project?</h2>
            <p className="text-slate-600 dark:text-gray-300 mb-6">
              RhizaCore Launchpad helps promising crypto projects raise funds from our community of investors.
            </p>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-primary flex-shrink-0 mt-1" size={20} />
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white mb-1">Access to Capital</h4>
                  <p className="text-sm text-slate-600 dark:text-gray-400">Raise up to $5M from our investor network</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="text-primary flex-shrink-0 mt-1" size={20} />
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white mb-1">Marketing Support</h4>
                  <p className="text-sm text-slate-600 dark:text-gray-400">Promoted to 50K+ active users</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="text-primary flex-shrink-0 mt-1" size={20} />
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white mb-1">Technical Guidance</h4>
                  <p className="text-sm text-slate-600 dark:text-gray-400">Expert advice on tokenomics and launch</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="text-primary flex-shrink-0 mt-1" size={20} />
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white mb-1">Community Building</h4>
                  <p className="text-sm text-slate-600 dark:text-gray-400">Build engaged community from day one</p>
                </div>
              </div>
            </div>
            <Link
              to="/onboarding"
              className="inline-block px-8 py-4 bg-primary text-black rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all"
            >
              Apply to Launch
            </Link>
          </div>
        </section>

        {/* Warning */}
        <div className="p-6 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-2xl mb-16">
          <div className="flex items-start gap-4">
            <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="text-lg font-black text-yellow-900 dark:text-yellow-300 mb-2">Investment Risk Warning</h3>
              <p className="text-yellow-900 dark:text-yellow-300 text-sm">
                Investing in early-stage crypto projects carries high risk. Only invest what you can afford to lose. 
                Past performance does not guarantee future results. Always do your own research (DYOR).
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl text-center">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Start Investing Today</h2>
          <p className="text-slate-600 dark:text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
            Join thousands of investors discovering the next big crypto projects on RhizaCore Launchpad.
          </p>
          <Link
            to="/onboarding"
            className="inline-block px-12 py-4 bg-primary text-black rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all"
          >
            Explore Projects
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Launchpad;
