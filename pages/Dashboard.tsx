
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { 
  Send, 
  Download, 
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
  ShoppingBag,
  Eye,
  EyeOff,
  History,
  AlertCircle,
  Info
} from 'lucide-react';
import { MOCK_PORTFOLIO_HISTORY, getNetworkConfig, getExplorerUrl } from '../constants';
import { useWallet } from '../context/WalletContext';
import { useBalance } from '../hooks/useBalance';
import { useTransactions } from '../hooks/useTransactions';
import TransactionItem from '../components/TransactionItem';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface ActionButtonProps {
  icon: any;
  label: string;
  primary?: boolean;
  onClick?: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon: Icon, label, primary = false, onClick }) => (
  <button 
    onClick={onClick}
    className={`
      flex flex-col items-center gap-1.5 sm:gap-2 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl transition-all duration-300 flex-1
      ${primary 
        ? 'bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-primary dark:hover:bg-primary shadow-xl active:scale-95 transition-colors' 
        : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 active:scale-95'}
    `}
  >
    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center ${primary ? 'bg-white/10 dark:bg-black/5' : 'bg-slate-100 dark:bg-white/5'}`}>
      <Icon size={18} strokeWidth={2.5} />
    </div>
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { balance, address, refreshData, network, switchNetwork, userProfile, referralData } = useWallet();
  const networkConfig = getNetworkConfig(network);
  const { 
    tonBalance, 
    tonPrice, 
    totalUsdValue, 
    change24h, 
    changePercent24h,
    isLoading: balanceLoading,
    error: balanceError,
    refreshBalance 
  } = useBalance();
  const { 
    transactions, 
    isLoading: txLoading, 
    error: txError, 
    refreshTransactions 
  } = useTransactions();
  
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'BTC' | 'TON' | 'USDT' | 'EUR'>('USD');

  // Calculate combined portfolio value (TON + RZC)
  const rzcBalance = (userProfile as any)?.rzc_balance || 0;
  const rzcPrice = 0.10; // 1 RZC = $0.10
  const rzcUsdValue = rzcBalance * rzcPrice;
  const combinedPortfolioValue = totalUsdValue + rzcUsdValue;

  // Currency conversion rates (mock data - should be fetched from API)
  const conversionRates = {
    USD: 1,
    BTC: 0.000015, // 1 USD = 0.000015 BTC (approx $66,666 per BTC)
    TON: 0.408, // 1 USD = 0.408 TON (approx $2.45 per TON)
    USDT: 1, // 1 USD = 1 USDT (stablecoin)
    EUR: 0.92, // 1 USD = 0.92 EUR
  };

  // Currency symbols
  const currencySymbols = {
    USD: '$',
    BTC: '₿',
    TON: 'TON',
    USDT: '$',
    EUR: '€',
  };

  // Convert portfolio value to selected currency
  const convertedValue = combinedPortfolioValue * conversionRates[selectedCurrency];
  
  // Format based on currency
  const formatValue = (value: number, currency: string) => {
    if (currency === 'BTC') {
      return value.toFixed(8); // BTC uses 8 decimals
    } else if (currency === 'TON') {
      return value.toFixed(4); // TON uses 4 decimals
    } else {
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

  // Currency display options
  const currencies: Array<'USD' | 'BTC' | 'TON' | 'USDT' | 'EUR'> = ['USD', 'BTC', 'TON', 'USDT', 'EUR'];
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  // Close currency menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showCurrencyMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.currency-selector')) {
          setShowCurrencyMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCurrencyMenu]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refreshBalance(),
      refreshTransactions(),
      refreshData()
    ]);
    setIsRefreshing(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5 page-enter px-3 sm:px-4 md:px-0">
      {/* Network Switcher - Compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${network === 'mainnet' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
          <span className="text-[10px] font-bold text-slate-500 dark:text-gray-500 uppercase tracking-wider">
            {networkConfig.NAME}
          </span>
          <button
            onClick={() => setShowNetworkInfo(!showNetworkInfo)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Network info"
          >
            <Info size={12} className="text-slate-400 dark:text-gray-500" />
          </button>
        </div>
        <button
          onClick={() => switchNetwork(network === 'mainnet' ? 'testnet' : 'mainnet')}
          className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-400 hover:bg-white/10 hover:text-primary transition-all active:scale-95"
        >
          Switch
        </button>
      </div>

      {/* Network Info Panel - Compact */}
      {showNetworkInfo && (
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-gray-400">Network Details</h4>
            <button
              onClick={() => setShowNetworkInfo(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-sm"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <p className="text-slate-500 dark:text-gray-500 font-medium mb-0.5 text-[10px]">Network</p>
              <p className="text-slate-900 dark:text-white font-bold text-xs">{networkConfig.NAME}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-gray-500 font-medium mb-0.5 text-[10px]">Chain ID</p>
              <p className="text-slate-900 dark:text-white font-bold text-xs">{networkConfig.CHAIN_ID}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-500 dark:text-gray-500 font-medium mb-0.5 text-[10px]">Explorer</p>
              <a
                href={networkConfig.EXPLORER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-mono text-[10px] flex items-center gap-1 break-all"
              >
                {networkConfig.EXPLORER_URL.replace('https://', '')}
                <ExternalLink size={10} className="flex-shrink-0" />
              </a>
            </div>
          </div>
        </div>
      )}
      
      {/* Portfolio Terminal Card - Compact */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl sm:rounded-[2rem] blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
        <div className="relative bg-white dark:bg-[#0a0a0a]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl sm:rounded-[2rem] overflow-hidden p-5 sm:p-6 shadow-sm">
          
          {balanceError ? (
            <div className="p-4 sm:p-5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl sm:rounded-2xl">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-bold text-sm text-red-900 dark:text-red-300 mb-1">Failed to load balance</h4>
                  <p className="text-xs text-red-700 dark:text-red-400 mb-2.5">{balanceError}</p>
                  <button 
                    onClick={handleRefresh}
                    className="px-3.5 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-red-700 transition-all active:scale-95"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div className="space-y-0.5 sm:space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400 dark:text-gray-500">
                    <ShieldCheck size={12} className="text-primary flex-shrink-0" />
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest truncate">Total Portfolio</span>
                  </div>
                  
                  {balanceLoading ? (
                    <LoadingSkeleton width={200} height={40} />
                  ) : (
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight-custom text-slate-900 dark:text-white">
                      {balanceVisible ? (
                        <>
                          {selectedCurrency === 'USD' || selectedCurrency === 'USDT' || selectedCurrency === 'EUR' ? currencySymbols[selectedCurrency] : ''}
                          {formatValue(convertedValue, selectedCurrency)}
                          <span className="text-base sm:text-lg font-bold text-slate-400 dark:text-gray-600"> {selectedCurrency === 'BTC' || selectedCurrency === 'TON' ? selectedCurrency : ''}</span>
                        </>
                      ) : (
                        <span className="text-slate-400 dark:text-gray-600">••••••</span>
                      )}
                    </h2>
                  )}
                  
                  {balanceLoading ? (
                    <LoadingSkeleton width={120} height={14} />
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className={`flex items-center gap-1.5 font-bold text-[10px] sm:text-xs transition-colors duration-300 ${
                          change24h >= 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          <TrendingUp size={10} className={`transition-transform duration-300 ${change24h < 0 ? 'rotate-180' : ''}`} />
                          <span>
                            {balanceVisible ? (
                              change24h === 0 ? 'No change' : `${change24h >= 0 ? '+' : ''}$${Math.abs(change24h).toFixed(2)} (${changePercent24h >= 0 ? '+' : ''}${changePercent24h.toFixed(2)}%)`
                            ) : (
                              '•••••'
                            )}
                          </span>
                        </div>
                        <span className="text-[8px] text-slate-400 dark:text-gray-600 font-medium">24h</span>
                      </div>
                      {balanceVisible && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-500 dark:text-gray-500 font-medium">
                            {tonBalance.toFixed(4)} TON
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-gray-600">•</span>
                          <span className="text-[10px] text-[#00FF88] font-medium">
                            {rzcBalance.toLocaleString()} RZC
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                <div className="flex gap-1.5 sm:gap-2">
                  {/* Currency Selector */}
                  <div className="relative currency-selector">
                    <button 
                      onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
                      className="p-2 sm:p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all text-slate-400 active:scale-90 text-[10px] font-black min-w-[44px] flex items-center justify-center"
                      aria-label="Select currency"
                    >
                      {selectedCurrency}
                    </button>
                    
                    {showCurrencyMenu && (
                      <div className="absolute right-0 top-full mt-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden min-w-[120px] animate-in fade-in slide-in-from-top-2 duration-200">
                        {currencies.map((currency) => (
                          <button
                            key={currency}
                            onClick={() => {
                              setSelectedCurrency(currency);
                              setShowCurrencyMenu(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-xs font-bold transition-colors flex items-center justify-between gap-2 ${
                              selectedCurrency === currency
                                ? 'bg-primary/10 text-primary'
                                : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'
                            }`}
                          >
                            <span>{currency}</span>
                            {selectedCurrency === currency && (
                              <span className="text-primary">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => setBalanceVisible(!balanceVisible)}
                    className="p-2 sm:p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all text-slate-400 active:scale-90"
                    aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}
                  >
                    {balanceVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button 
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-2 sm:p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all text-slate-400 active:scale-90 disabled:opacity-50"
                    aria-label="Refresh balance"
                  >
                    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              <div className="h-20 sm:h-24 w-full mt-6 sm:mt-8 -mb-2 opacity-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MOCK_PORTFOLIO_HISTORY}>
                    <defs>
                      <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00FF88" stopOpacity={0.15}/>
                        <stop offset="100%" stopColor="#00FF88" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#00FF88" 
                      strokeWidth={2}
                      fill="url(#chartFill)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Functional Action Grid - Compact */}
      <div className="flex gap-2 sm:gap-2.5">
        <ActionButton 
          icon={Send} 
          label="Pay" 
          primary 
          onClick={() => navigate('/wallet/transfer')} 
        />
        <ActionButton 
          icon={Download} 
          label="Receive" 
          onClick={() => navigate('/wallet/receive')} 
        />
        <ActionButton 
          icon={ShoppingBag} 
          label="Shop" 
          onClick={() => navigate('/marketplace')} 
        />
      </div>

      {/* Transaction History - Compact */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 flex items-center gap-1.5">
            <History size={12} />
            Recent Activity
          </h3>
          <button 
            onClick={() => navigate('/wallet/history')}
            className="text-[9px] font-black text-primary tracking-widest hover:underline active:scale-95"
          >
            VIEW ALL
          </button>
        </div>

        {txError ? (
          <div className="p-4 sm:p-5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl sm:rounded-2xl">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="font-bold text-sm text-red-900 dark:text-red-300 mb-1">Failed to load transactions</h4>
                <p className="text-xs text-red-700 dark:text-red-400 mb-2.5">{txError}</p>
                <button 
                  onClick={refreshTransactions}
                  className="px-3.5 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-red-700 transition-all active:scale-95"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : txLoading ? (
          <div className="space-y-2.5">
            <LoadingSkeleton height={70} />
            <LoadingSkeleton height={70} />
            <LoadingSkeleton height={70} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-6 sm:p-8 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl sm:rounded-2xl text-center">
            <History size={28} className="mx-auto mb-2.5 text-slate-300 dark:text-gray-700" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">No transactions yet</h4>
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-3">
              Your transaction history will appear here
            </p>
            <button 
              onClick={() => navigate('/wallet/transfer')}
              className="px-5 py-2 bg-primary text-black rounded-xl text-[10px] font-black uppercase hover:scale-105 transition-all active:scale-95"
            >
              Make First Transaction
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {transactions.slice(0, 5).map((tx) => (
              <TransactionItem 
                key={tx.id} 
                transaction={tx}
                onClick={() => navigate('/wallet/history')}
              />
            ))}
          </div>
        )}
      </div>

      {/* Marketplace Banner - Compact */}
      <div 
        onClick={() => navigate('/marketplace')}
        className="p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-secondary/5 to-transparent border border-secondary/10 flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all hover:border-secondary/30"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
            <ShoppingBag size={18} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">Rhiza Marketplace</h4>
            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium truncate">Explore products on TON</p>
          </div>
        </div>
        <ExternalLink size={14} className="text-secondary group-hover:translate-x-1 transition-transform flex-shrink-0" />
      </div>
    </div>
  );
};

export default Dashboard;
