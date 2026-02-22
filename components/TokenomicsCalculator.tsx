import React, { useState } from 'react';
import { Calculator, TrendingUp, DollarSign, Percent } from 'lucide-react';

const TokenomicsCalculator: React.FC = () => {
  const [investment, setInvestment] = useState<string>('1000');
  const [tokenPrice, setTokenPrice] = useState<string>('0.15');
  const [stakingAPY, setStakingAPY] = useState<string>('10');
  const [holdingPeriod, setHoldingPeriod] = useState<string>('12');

  const calculateReturns = () => {
    const investmentAmount = parseFloat(investment) || 0;
    const price = parseFloat(tokenPrice) || 0;
    const apy = parseFloat(stakingAPY) || 0;
    const months = parseFloat(holdingPeriod) || 0;

    const tokens = investmentAmount / price;
    const stakingRewards = tokens * (apy / 100) * (months / 12);
    const totalTokens = tokens + stakingRewards;
    const totalValue = totalTokens * price;
    const profit = totalValue - investmentAmount;
    const roi = (profit / investmentAmount) * 100;

    return {
      tokens: tokens.toFixed(2),
      stakingRewards: stakingRewards.toFixed(2),
      totalTokens: totalTokens.toFixed(2),
      totalValue: totalValue.toFixed(2),
      profit: profit.toFixed(2),
      roi: roi.toFixed(2)
    };
  };

  const results = calculateReturns();

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
          <Calculator size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">ROI Calculator</h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
            Estimate your potential returns
          </p>
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">
            Investment Amount ($)
          </label>
          <div className="relative">
            <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
            <input
              type="number"
              value={investment}
              onChange={(e) => setInvestment(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-all text-sm"
              placeholder="1000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">
            Token Price ($)
          </label>
          <div className="relative">
            <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
            <input
              type="number"
              step="0.01"
              value={tokenPrice}
              onChange={(e) => setTokenPrice(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-all text-sm"
              placeholder="0.15"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">
            Staking APY (%)
          </label>
          <div className="relative">
            <Percent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
            <input
              type="number"
              value={stakingAPY}
              onChange={(e) => setStakingAPY(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-all text-sm"
              placeholder="10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">
            Holding Period (Months)
          </label>
          <div className="relative">
            <TrendingUp size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
            <input
              type="number"
              value={holdingPeriod}
              onChange={(e) => setHoldingPeriod(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-all text-sm"
              placeholder="12"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="p-5 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl space-y-3">
        <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-3">
          Projected Returns
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="p-3 bg-white/50 dark:bg-black/20 rounded-xl">
            <div className="text-xs text-slate-500 dark:text-gray-400 font-bold mb-1">
              Initial Tokens
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {results.tokens} <span className="text-xs text-slate-400 dark:text-gray-500">RZC</span>
            </div>
          </div>

          <div className="p-3 bg-white/50 dark:bg-black/20 rounded-xl">
            <div className="text-xs text-slate-500 dark:text-gray-400 font-bold mb-1">
              Staking Rewards
            </div>
            <div className="text-xl font-black text-primary">
              +{results.stakingRewards} <span className="text-xs text-slate-400 dark:text-gray-500">RZC</span>
            </div>
          </div>

          <div className="p-3 bg-white/50 dark:bg-black/20 rounded-xl">
            <div className="text-xs text-slate-500 dark:text-gray-400 font-bold mb-1">
              Total Tokens
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {results.totalTokens} <span className="text-xs text-slate-400 dark:text-gray-500">RZC</span>
            </div>
          </div>

          <div className="p-3 bg-white/50 dark:bg-black/20 rounded-xl">
            <div className="text-xs text-slate-500 dark:text-gray-400 font-bold mb-1">
              Total Value
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              ${results.totalValue}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-gray-400 font-bold mb-1">
              Estimated Profit
            </div>
            <div className="text-2xl font-black text-primary">
              ${results.profit}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 dark:text-gray-400 font-bold mb-1">
              ROI
            </div>
            <div className="text-2xl font-black text-secondary">
              {results.roi}%
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl">
        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium leading-relaxed">
          <span className="font-black text-slate-700 dark:text-gray-300">Disclaimer:</span> This calculator provides estimates only. Actual returns may vary based on market conditions, token price fluctuations, and staking participation rates. Not financial advice.
        </p>
      </div>
    </div>
  );
};

export default TokenomicsCalculator;
