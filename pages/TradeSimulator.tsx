import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { useTranslation } from 'react-i18next';
import { demoTradeService, DemoTradeAccount, DemoTrade } from '../services/demoTradeService';
import { ArrowLeftRight, Activity, ArrowRight, ArrowDownUp, RefreshCw, AlertCircle, History, Wallet, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type TradingPair = 'RZC/USDT' | 'RZC/TON';
type OrderType = 'BUY' | 'SELL';

// Helper to generate a realistic-looking price history for the chart
const generateChartData = (currentPrice: number, points = 40) => {
  const now = Date.now();
  const data = [];
  let price = currentPrice * 0.95; // start slightly lower or higher
  for (let i = points; i >= 0; i--) {
    data.push({
      time: new Date(now - i * 2000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      price: price
    });
    // Random walk
    price = price * (1 + (Math.random() - 0.5) * 0.005);
  }
  // Make sure the last point ends exactly at current price
  data[data.length - 1].price = currentPrice;
  return data;
};

const TradeSimulator: React.FC = () => {
  const { t } = useTranslation();
  const { address, rzcPrice, balance } = useWallet();
  const [account, setAccount] = useState<DemoTradeAccount | null>(null);

  const [pair, setPair] = useState<TradingPair>('RZC/USDT');
  const [orderType, setOrderType] = useState<OrderType>('BUY');
  const [amount, setAmount] = useState<string>('');

  const [chartData, setChartData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [volatilityOffset, setVolatilityOffset] = useState(0);

  // Derive prices with live volatility
  const baseRzcPrice = rzcPrice || 0.15; // default fallback
  const rzcUsdtPrice = baseRzcPrice * (1 + volatilityOffset);
  // Use user's real TON price if available, otherwise fallback
  const tonUsdPrice = 6.5;
  const rzcTonPrice = rzcUsdtPrice / tonUsdPrice;

  const currentPrice = pair === 'RZC/USDT' ? rzcUsdtPrice : rzcTonPrice;

  // Live market ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setVolatilityOffset(prev => {
        // Random walk between -0.5% and +0.5% per tick
        const move = (Math.random() - 0.5) * 0.01;
        let next = prev + move;
        // Bound the total deviation to +/- 10%
        if (next > 0.1) next = 0.1;
        if (next < -0.1) next = -0.1;
        return next;
      });
    }, 2000); // 2 second ticks

    return () => clearInterval(interval);
  }, []);

  // Init account and chart
  useEffect(() => {
    if (address) {
      demoTradeService.getAccount(address).then(acc => {
        setAccount(acc);
      });
    }
  }, [address]);

  // Initialize base chart
  useEffect(() => {
    const basePrice = pair === 'RZC/USDT' ? (rzcPrice || 0.15) : ((rzcPrice || 0.15) / 6.5);
    setChartData(generateChartData(basePrice));
  }, [pair, rzcPrice]);

  // Append live ticks to chart
  useEffect(() => {
    setChartData(prev => {
      if (prev.length === 0) return prev;
      const newChart = [...prev.slice(1)];
      newChart.push({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        price: currentPrice
      });
      return newChart;
    });
  }, [volatilityOffset]); // Only run when volatility ticks

  const handleExecuteTrade = async () => {
    if (!address) return;
    setError(null);
    setSuccess(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const result = await demoTradeService.placeOrder(
      address,
      pair,
      orderType,
      numAmount,
      currentPrice,
      { RZC: rzcUsdtPrice, TON: tonUsdPrice }
    );

    if (result.success && result.account) {
      setAccount(result.account);
      setAmount('');
      setSuccess(`Successfully ${orderType === 'BUY' ? 'bought' : 'sold'} ${numAmount} RZC`);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.message);
    }
  };

  const handleReset = async () => {
    if (!address) return;
    if (window.confirm('Are you sure you want to reset your demo account to 100 USDT and 20 TON?')) {
      const acc = await demoTradeService.resetAccount(address);
      setAccount(acc);
      setSuccess('Demo account reset successfully');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  if (!account) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const baseSymbol = 'RZC';
  const quoteSymbol = pair.split('/')[1];
  const quoteBalance = quoteSymbol === 'USDT' ? account.balances.USDT : account.balances.TON;

  const estimatedTotal = (parseFloat(amount) || 0) * currentPrice;

  // Calculate PnL and ROI
  const totalValueUsdt = account.balances.USDT + (account.balances.RZC * rzcUsdtPrice) + (account.balances.TON * tonUsdPrice);
  const pnlUsdt = totalValueUsdt - 100; // 100 USDT is the starting balance
  const roiPercent = (pnlUsdt / 100) * 100;
  const isProfit = pnlUsdt >= 0;

  // Position specific calculations
  const rzcPosition = account.positions?.RZC || { amount: account.balances.RZC, avgEntryUsdt: 0 };
  const rzcPosValue = rzcPosition.amount * rzcUsdtPrice;
  const rzcPosCost = rzcPosition.amount * rzcPosition.avgEntryUsdt;
  const rzcPosPnl = rzcPosition.avgEntryUsdt > 0 ? rzcPosValue - rzcPosCost : 0;
  const rzcPosRoi = rzcPosCost > 0 ? (rzcPosPnl / rzcPosCost) * 100 : 0;
  const isRzcProfit = rzcPosPnl >= 0;

  const tonPosition = account.positions?.TON || { amount: account.balances.TON, avgEntryUsdt: 0 };
  const tonPosValue = tonPosition.amount * tonUsdPrice;
  const tonPosCost = tonPosition.amount * tonPosition.avgEntryUsdt;
  const tonPosPnl = tonPosition.avgEntryUsdt > 0 ? tonPosValue - tonPosCost : 0;
  const tonPosRoi = tonPosCost > 0 ? (tonPosPnl / tonPosCost) * 100 : 0;
  const isTonProfit = tonPosPnl >= 0;

  return (
    <>
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 dark:from-emerald-500/5 dark:to-cyan-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] bg-gradient-to-l from-blue-500/10 to-purple-500/10 dark:from-blue-500/5 dark:to-purple-500/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-slate-50/30 dark:from-black/40 dark:via-transparent dark:to-black/10" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto space-y-4 sm:space-y-5 page-enter px-3 sm:px-4 md:px-0 pt-3 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="text-primary w-5 h-5 sm:w-6 sm:h-6" />
              Swap
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-0.5 sm:mt-1 hidden sm:block">
              Swap RZC, TON, and USDT with a 100 USDT and 20 TON demo account
            </p>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-xs sm:text-sm font-bold transition-colors w-fit shadow-sm"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>
        </div>

        {/* Disclaimer Banner */}
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 flex items-start sm:items-center gap-3 shadow-sm mb-4">
          <div className="bg-amber-500/20 text-amber-600 dark:text-amber-400 p-1.5 rounded-lg flex-shrink-0">
            <AlertCircle size={16} strokeWidth={2.5} />
          </div>
          <div className="text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300">
            <span className="uppercase tracking-wider mr-1 font-black">Disclaimer:</span>
            This is a mock swap environment. The real live swap is coming soon!
          </div>
        </div>

        {/* Top Card: Chart & Quick Trading */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-300/60 to-cyan-300/60 dark:from-primary/20 dark:to-secondary/20 rounded-2xl sm:rounded-[2rem] blur-lg opacity-30 group-hover:opacity-60 transition-all duration-1000 ease-in-out" />
          <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl sm:rounded-[2rem] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 shadow-xl shadow-slate-200/20 dark:shadow-black/40 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <div className="flex items-center gap-3">
                <select
                  value={pair}
                  onChange={(e) => setPair(e.target.value as TradingPair)}
                  className="bg-slate-100 dark:bg-black border-none text-base sm:text-lg font-black rounded-xl px-3 sm:px-4 py-2 focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                >
                  <option value="RZC/USDT">RZC / USDT</option>
                  <option value="RZC/TON">RZC / TON</option>
                </select>
              </div>
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-numbers font-black text-slate-900 dark:text-white transition-colors duration-300" key={volatilityOffset}>
                  {currentPrice.toFixed(quoteSymbol === 'USDT' ? 4 : 6)}
                </div>
                <div className={`text-[10px] sm:text-xs font-bold ${volatilityOffset >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {volatilityOffset >= 0 ? '+' : ''}{(volatilityOffset * 100).toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="h-[200px] sm:h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10 dark:opacity-20 text-slate-300 dark:text-gray-600" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} stroke="currentColor" className="text-slate-400 dark:text-gray-500" />
                  <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} stroke="currentColor" className="text-slate-400 dark:text-gray-500" width={60} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: '12px', border: 'none', color: '#fff' }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Card: Trading Panel */}
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl sm:rounded-[2rem] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 shadow-xl shadow-slate-200/20 dark:shadow-black/40 relative overflow-hidden">
          <div className="flex rounded-xl bg-slate-100/80 dark:bg-black/60 p-1 mb-4 sm:mb-5">
            <button
              className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-black rounded-lg transition-all ${orderType === 'BUY' ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white'}`}
              onClick={() => setOrderType('BUY')}
            >
              BUY
            </button>
            <button
              className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-black rounded-lg transition-all ${orderType === 'SELL' ? 'bg-white dark:bg-white/10 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white'}`}
              onClick={() => setOrderType('SELL')}
            >
              SELL
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 text-sm font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 text-sm font-bold flex items-center gap-2">
              <CheckCircle2 size={16} />
              {success}
            </div>
          )}

          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 sm:mb-2">
                  <span>Price ({quoteSymbol})</span>
                </label>
                <div className="w-full bg-slate-50/80 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-slate-500 text-sm sm:text-base font-numbers font-bold cursor-not-allowed">
                  {currentPrice.toFixed(quoteSymbol === 'USDT' ? 4 : 6)}
                </div>
              </div>
              <div>
                <label className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 sm:mb-2">
                  <span>Amount (RZC)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50/80 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 pr-16 text-sm sm:text-base text-slate-900 dark:text-white font-numbers font-bold focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      onClick={() => setAmount(orderType === 'BUY' ? (quoteBalance / currentPrice).toFixed(4) : account.balances.RZC.toString())}
                      className="text-[9px] sm:text-[10px] font-black uppercase text-primary hover:text-primary/80 transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold text-slate-500 dark:text-gray-400 px-1">
              <span>Available: {orderType === 'BUY' ? (quoteBalance).toFixed(2) + ' ' + quoteSymbol : account.balances.RZC.toFixed(2) + ' RZC'}</span>
              <span>Total: {estimatedTotal > 0 ? estimatedTotal.toFixed(4) : '0.00'} {quoteSymbol}</span>
            </div>

            <button
              onClick={handleExecuteTrade}
              disabled={!amount || parseFloat(amount) <= 0}
              className={`w-full py-3 sm:py-4 mt-2 rounded-xl text-sm sm:text-base font-black text-white uppercase tracking-wider transition-all
                ${!amount || parseFloat(amount) <= 0
                  ? 'bg-slate-300 dark:bg-white/10 cursor-not-allowed text-slate-500 dark:text-gray-500'
                  : orderType === 'BUY'
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25'
                    : 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/25'
                }`}
            >
              {orderType} RZC
            </button>
          </div>
        </div>

        {/* Card: Demo Portfolio */}
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl sm:rounded-[2rem] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 shadow-xl shadow-slate-200/20 dark:shadow-black/40 relative overflow-hidden">
          <h3 className="text-base sm:text-lg font-black mb-3 sm:mb-4 flex items-center gap-2">
            <Wallet size={18} className="text-primary" />
            Demo Portfolio
          </h3>

          {/* Performance Overview */}
          <div className="mb-4 sm:mb-5 lg:mb-6 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Total Est. Value</div>
              <div className="text-2xl sm:text-3xl font-numbers font-black text-slate-900 dark:text-white">
                ${totalValueUsdt.toFixed(2)}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Unrealized PnL</div>
              <div className={`flex items-center gap-1.5 text-base sm:text-lg font-numbers font-black ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isProfit ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {isProfit ? '+' : ''}{pnlUsdt.toFixed(2)} USDT ({isProfit ? '+' : ''}{roiPercent.toFixed(2)}%)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-5 lg:mb-6">
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5">
              <div className="text-[10px] sm:text-xs text-slate-500 dark:text-gray-400 mb-0.5 sm:mb-1 font-bold">USDT</div>
              <div className="text-lg sm:text-xl font-numbers font-black">{account.balances.USDT.toFixed(2)}</div>
            </div>
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5">
              <div className="text-[10px] sm:text-xs text-slate-500 dark:text-gray-400 mb-0.5 sm:mb-1 font-bold">RZC</div>
              <div className="text-lg sm:text-xl font-numbers font-black text-primary">{account.balances.RZC.toFixed(2)}</div>
            </div>
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5">
              <div className="text-[10px] sm:text-xs text-slate-500 dark:text-gray-400 mb-0.5 sm:mb-1 font-bold">TON</div>
              <div className="text-lg sm:text-xl font-numbers font-black">{account.balances.TON.toFixed(4)}</div>
            </div>
          </div>

          {/* Active Positions */}
          <h4 className="text-sm font-black text-slate-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Activity size={16} />
            Open Positions
          </h4>
          <div className="space-y-2 sm:space-y-3">
            {rzcPosition.amount > 0 && (
              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-[10px] font-black text-primary">RZC</span>
                    </div>
                    <span className="font-bold text-sm">RZC Holding</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Amt: <span className="font-numbers font-bold text-slate-700 dark:text-gray-300">{rzcPosition.amount.toFixed(2)}</span> •
                    Avg Entry: <span className="font-numbers font-bold text-slate-700 dark:text-gray-300">${rzcPosition.avgEntryUsdt.toFixed(4)}</span>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs font-bold text-slate-500 dark:text-gray-400 mb-1">Position PnL</div>
                  {rzcPosition.avgEntryUsdt > 0 ? (
                    <div className={`flex items-center gap-1 text-sm font-numbers font-black ${isRzcProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isRzcProfit ? '+' : ''}{rzcPosPnl.toFixed(2)} USDT ({isRzcProfit ? '+' : ''}{rzcPosRoi.toFixed(2)}%)
                    </div>
                  ) : (
                    <div className="text-sm font-numbers font-black text-slate-500">N/A</div>
                  )}
                </div>
              </div>
            )}

            {tonPosition.amount > 0 && (
              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <span className="text-[10px] font-black text-blue-500">TON</span>
                    </div>
                    <span className="font-bold text-sm">TON Holding</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Amt: <span className="font-numbers font-bold text-slate-700 dark:text-gray-300">{tonPosition.amount.toFixed(4)}</span> •
                    Avg Entry: <span className="font-numbers font-bold text-slate-700 dark:text-gray-300">${tonPosition.avgEntryUsdt.toFixed(4)}</span>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs font-bold text-slate-500 dark:text-gray-400 mb-1">Position PnL</div>
                  {tonPosition.avgEntryUsdt > 0 ? (
                    <div className={`flex items-center gap-1 text-sm font-numbers font-black ${isTonProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isTonProfit ? '+' : ''}{tonPosPnl.toFixed(2)} USDT ({isTonProfit ? '+' : ''}{tonPosRoi.toFixed(2)}%)
                    </div>
                  ) : (
                    <div className="text-sm font-numbers font-black text-slate-500">N/A</div>
                  )}
                </div>
              </div>
            )}

            {rzcPosition.amount === 0 && tonPosition.amount === 0 && (
              <div className="text-center p-6 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl text-slate-500 dark:text-gray-400 text-sm font-bold">
                No open asset positions.
              </div>
            )}
          </div>
        </div>
        {/* Card: Trade History */}
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl sm:rounded-[2rem] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 shadow-xl shadow-slate-200/20 dark:shadow-black/40 relative overflow-hidden">
          <h3 className="text-xs sm:text-sm font-black mb-3 sm:mb-4 flex items-center gap-2">
            <History size={16} className="text-slate-400" />
            Recent Trades
          </h3>

          <div className="space-y-2 sm:space-y-3 max-h-[250px] sm:max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {account.tradeHistory.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500 dark:text-gray-400 font-medium">
                No trades yet
              </div>
            ) : (
              account.tradeHistory.slice(0, 10).map((trade) => (
                <div key={trade.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {trade.type}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-gray-300">{trade.pair}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {new Date(trade.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-numbers font-black text-slate-900 dark:text-white">
                      {trade.amount.toFixed(2)} RZC
                    </div>
                    <div className="text-[10px] font-numbers text-slate-500">
                      @ {trade.price.toFixed(trade.pair.includes('USDT') ? 4 : 6)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TradeSimulator;
