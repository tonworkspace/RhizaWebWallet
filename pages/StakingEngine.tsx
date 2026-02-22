import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Lock, Calendar, DollarSign, Shield, Info, Calculator } from 'lucide-react';

const StakingEngine: React.FC = () => {
  const [stakeAmount, setStakeAmount] = useState('10000');
  const [stakePeriod, setStakePeriod] = useState(90);

  const calculateRewards = () => {
    const amount = parseFloat(stakeAmount) || 0;
    const apy = stakePeriod === 30 ? 5 : stakePeriod === 90 ? 10 : 15;
    const days = stakePeriod;
    const rewards = (amount * apy / 100 * days / 365);
    return {
      rewards: rewards.toFixed(2),
      total: (amount + rewards).toFixed(2),
      apy
    };
  };

  const calc = calculateRewards();

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
              Start Staking
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
              <TrendingUp className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">Staking Engine</h1>
              <p className="text-slate-600 dark:text-gray-400 font-medium">Earn passive income with $RZC</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        {/* Hero */}
        <div className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl mb-12">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Earn Up to 15% APY</h2>
          <p className="text-slate-600 dark:text-gray-300 text-lg mb-6">
            Stake your $RZC tokens and earn rewards. The longer you stake, the higher your returns. 
            No minimum amount required, withdraw anytime after lock period.
          </p>
          <div className="grid grid-cols-3 gap-6">
            <div className="p-4 bg-white dark:bg-black/50 rounded-2xl">
              <div className="text-3xl font-black text-primary mb-1">$12.5M</div>
              <div className="text-sm text-slate-600 dark:text-gray-400 font-bold">Total Value Locked</div>
            </div>
            <div className="p-4 bg-white dark:bg-black/50 rounded-2xl">
              <div className="text-3xl font-black text-primary mb-1">8,432</div>
              <div className="text-sm text-slate-600 dark:text-gray-400 font-bold">Active Stakers</div>
            </div>
            <div className="p-4 bg-white dark:bg-black/50 rounded-2xl">
              <div className="text-3xl font-black text-primary mb-1">$2.1M</div>
              <div className="text-sm text-slate-600 dark:text-gray-400 font-bold">Rewards Distributed</div>
            </div>
          </div>
        </div>

        {/* Calculator */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <Calculator size={28} className="text-primary" />
            Staking Calculator
          </h2>
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input */}
            <div className="p-8 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-black text-slate-900 dark:text-white mb-3 block">
                    Amount to Stake
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-2xl font-black text-slate-900 dark:text-white outline-none focus:border-primary/50 transition-all"
                      placeholder="10000"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 dark:text-gray-400 font-black">
                      $RZC
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {['1000', '5000', '10000', '50000'].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setStakeAmount(amount)}
                        className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-primary hover:text-black rounded-xl text-sm font-bold transition-all"
                      >
                        {parseInt(amount).toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-black text-slate-900 dark:text-white mb-3 block">
                    Staking Period
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { days: 30, apy: 5 },
                      { days: 90, apy: 10 },
                      { days: 180, apy: 15 }
                    ].map((option) => (
                      <button
                        key={option.days}
                        onClick={() => setStakePeriod(option.days)}
                        className={`p-4 rounded-2xl border-2 transition-all ${
                          stakePeriod === option.days
                            ? 'border-primary bg-primary/10'
                            : 'border-slate-200 dark:border-white/10 hover:border-primary/50'
                        }`}
                      >
                        <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                          {option.days}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-gray-400 font-bold">Days</div>
                        <div className="text-sm font-black text-primary mt-2">{option.apy}% APY</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Estimated Returns</h3>
              <div className="space-y-6">
                <div className="p-6 bg-white dark:bg-black/50 rounded-2xl">
                  <div className="text-sm text-slate-600 dark:text-gray-400 font-bold mb-2">Staked Amount</div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">
                    {parseFloat(stakeAmount || '0').toLocaleString()} $RZC
                  </div>
                </div>

                <div className="p-6 bg-white dark:bg-black/50 rounded-2xl">
                  <div className="text-sm text-slate-600 dark:text-gray-400 font-bold mb-2">Rewards Earned</div>
                  <div className="text-3xl font-black text-primary">
                    +{parseFloat(calc.rewards).toLocaleString()} $RZC
                  </div>
                  <div className="text-sm text-slate-500 dark:text-gray-400 mt-2">
                    {calc.apy}% APY for {stakePeriod} days
                  </div>
                </div>

                <div className="p-6 bg-primary text-black rounded-2xl">
                  <div className="text-sm font-bold mb-2">Total After {stakePeriod} Days</div>
                  <div className="text-4xl font-black">
                    {parseFloat(calc.total).toLocaleString()} $RZC
                  </div>
                </div>

                <Link
                  to="/onboarding"
                  className="block w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-sm uppercase tracking-widest text-center hover:scale-105 transition-all"
                >
                  Start Staking Now
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">How Staking Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Choose Amount', desc: 'Decide how much $RZC you want to stake' },
              { step: '2', title: 'Select Period', desc: 'Pick 30, 90, or 180 days lock period' },
              { step: '3', title: 'Confirm Stake', desc: 'Lock your tokens in the staking contract' },
              { step: '4', title: 'Earn Rewards', desc: 'Receive daily rewards, withdraw after period' }
            ].map((item, idx) => (
              <div key={idx} className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl relative">
                <div className="w-12 h-12 bg-primary text-black rounded-xl flex items-center justify-center font-black text-xl mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Staking Tiers */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Staking Tiers</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { 
                name: 'Flexible', 
                period: '30 Days', 
                apy: '5%', 
                features: ['Shortest lock period', 'Lower APY', 'Good for testing', 'Withdraw after 30 days'] 
              },
              { 
                name: 'Standard', 
                period: '90 Days', 
                apy: '10%', 
                features: ['Balanced option', 'Good APY', 'Most popular', 'Withdraw after 90 days'],
                popular: true
              },
              { 
                name: 'Premium', 
                period: '180 Days', 
                apy: '15%', 
                features: ['Highest APY', 'Maximum rewards', 'Best for long-term', 'Withdraw after 180 days'] 
              }
            ].map((tier, idx) => (
              <div 
                key={idx} 
                className={`p-8 rounded-3xl relative ${
                  tier.popular 
                    ? 'bg-primary/10 border-2 border-primary' 
                    : 'bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-black text-xs font-black uppercase rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{tier.name}</h3>
                <div className="text-4xl font-black text-primary mb-1">{tier.apy}</div>
                <div className="text-sm text-slate-600 dark:text-gray-400 font-bold mb-6">{tier.period}</div>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/onboarding"
                  className={`block w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest text-center hover:scale-105 transition-all ${
                    tier.popular
                      ? 'bg-primary text-black'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white'
                  }`}
                >
                  Stake Now
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Staking Benefits</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: DollarSign, title: 'Passive Income', desc: 'Earn rewards daily without active trading' },
              { icon: Shield, title: 'Secure', desc: 'Audited smart contracts, your keys stay with you' },
              { icon: Lock, title: 'Predictable Returns', desc: 'Fixed APY rates, know exactly what you\'ll earn' },
              { icon: Calendar, title: 'Flexible Options', desc: 'Choose from 30, 90, or 180 day periods' }
            ].map((benefit, idx) => (
              <div key={idx} className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="text-primary" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{benefit.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-gray-400">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Risks */}
        <section className="mb-16">
          <div className="p-6 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-2xl">
            <div className="flex items-start gap-4">
              <Info className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" size={24} />
              <div>
                <h3 className="text-lg font-black text-yellow-900 dark:text-yellow-300 mb-3">Important Information</h3>
                <ul className="space-y-2 text-yellow-900 dark:text-yellow-300 text-sm">
                  <li>• <strong>Lock Period:</strong> Your tokens are locked for the selected period. Early withdrawal is not possible.</li>
                  <li>• <strong>Smart Contract Risk:</strong> While audited, smart contracts carry inherent risks.</li>
                  <li>• <strong>APY Changes:</strong> APY rates may change for new stakes but remain fixed for existing stakes.</li>
                  <li>• <strong>Market Risk:</strong> Token price may fluctuate during staking period.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: 'What is the minimum stake amount?', a: 'There is no minimum! You can stake any amount of $RZC.' },
              { q: 'When do I receive rewards?', a: 'Rewards are calculated daily and added to your stake automatically.' },
              { q: 'Can I unstake early?', a: 'No, tokens are locked for the selected period. Plan accordingly.' },
              { q: 'What happens after the lock period?', a: 'You can withdraw your stake + rewards anytime after the period ends.' },
              { q: 'Can I add more to my stake?', a: 'Yes, but it will create a new separate stake with its own lock period.' }
            ].map((faq, idx) => (
              <div key={idx} className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{faq.q}</h3>
                <p className="text-slate-600 dark:text-gray-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl text-center">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Ready to Start Earning?</h2>
          <p className="text-slate-600 dark:text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
            Join thousands of users already earning passive income with RhizaCore staking.
          </p>
          <Link
            to="/onboarding"
            className="inline-block px-12 py-4 bg-primary text-black rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all"
          >
            Start Staking Now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StakingEngine;
