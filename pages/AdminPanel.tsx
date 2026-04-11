import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Shield, 
  ShieldOff, 
  Edit, 
  Gift,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Save,
  Mail,
  User,
  Coins,
  Zap,
  RefreshCw,
  ExternalLink,
  Clock,
  DollarSign,
  Receipt
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { adminService, AdminUser } from '../services/adminService';
import { supabaseService } from '../services/supabaseService';
import { getPriceOverrides, setPriceOverrides, clearPriceOverrides, PriceOverrides } from '../utils/priceConfig';

const AdminPanel: React.FC = () => {
  const { address, updateRzcPrice } = useWallet();
  const { success, error } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'activated' | 'not_activated' | 'active' | 'inactive'>('all');
  const [nodeFilter, setNodeFilter] = useState<'all' | 'has_nodes' | 'no_nodes'>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userNodes, setUserNodes] = useState<Record<string, number>>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: '',
    is_active: true,
    rzc_balance: 0
  });
  const [editReason, setEditReason] = useState('');

  // Coin rate overrides
  const [rateForm, setRateForm] = useState<PriceOverrides>(() => getPriceOverrides());
  const [rateSaved, setRateSaved] = useState(false);
  const [fetchingRates, setFetchingRates] = useState(false);

  const [priceSource, setPriceSource] = useState<'coingecko' | 'binance' | 'okx'>('coingecko');

  // Recent activations state
  const [activations, setActivations] = useState<any[]>([]);
  const [activationsTotal, setActivationsTotal] = useState(0);
  const [activationsPage, setActivationsPage] = useState(1);
  const [loadingActivations, setLoadingActivations] = useState(false);
  const [showActivations, setShowActivations] = useState(false);
  const activationsPageSize = 20;

  const handleFetchLiveRates = async () => {
    setFetchingRates(true);
    let successCount = 0;
    
    try {
      if (priceSource === 'coingecko') {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price' +
          '?ids=the-open-network,bitcoin,ethereum,solana,tron,notcoin,tether,usd-coin,binancecoin,matic-network,avalanche-2&vs_currencies=usd'
        );
        if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
        const data = await res.json();
        
        setRateForm(prev => ({
          ...prev,
          ton: data['the-open-network']?.usd ?? prev.ton,
          btc: data['bitcoin']?.usd ?? prev.btc,
          eth: data['ethereum']?.usd ?? prev.eth,
          sol: data['solana']?.usd ?? prev.sol,
          trx: data['tron']?.usd ?? prev.trx,
          not: data['notcoin']?.usd ?? prev.not,
          usdt: data['tether']?.usd ?? prev.usdt,
          usdc: data['usd-coin']?.usd ?? prev.usdc,
          bnb: data['binancecoin']?.usd ?? prev.bnb,
          matic: data['matic-network']?.usd ?? prev.matic,
          avax: data['avalanche-2']?.usd ?? prev.avax,
        }));
        successCount = 11;
      } else if (priceSource === 'binance') {
        // Binance Public Ticker Price API
        const symbols = [
          'TONUSDT', 'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'TRXUSDT', 
          'NOTUSDT', 'BNBUSDT', 'MATICUSDT', 'POLUSDT', 'AVAXUSDT', 'USDCUSDT'
        ];
        
        const res = await fetch('https://api.binance.com/api/v3/ticker/price');
        if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
        const data = await res.json();
        
        const prices: Record<string, number> = {};
        data.forEach((item: { symbol: string; price: string }) => {
          if (symbols.includes(item.symbol)) {
            prices[item.symbol] = parseFloat(item.price);
          }
        });

        setRateForm(prev => ({
          ...prev,
          ton: prices['TONUSDT'] ?? prev.ton,
          btc: prices['BTCUSDT'] ?? prev.btc,
          eth: prices['ETHUSDT'] ?? prev.eth,
          sol: prices['SOLUSDT'] ?? prev.sol,
          trx: prices['TRXUSDT'] ?? prev.trx,
          not: prices['NOTUSDT'] ?? prev.not,
          bnb: prices['BNBUSDT'] ?? prev.bnb,
          matic: prices['POLUSDT'] ?? prices['MATICUSDT'] ?? prev.matic,
          avax: prices['AVAXUSDT'] ?? prev.avax,
          usdc: prices['USDCUSDT'] ?? prev.usdc,
          usdt: 1.0, // Binance baseline
        }));
        successCount = Object.keys(prices).length;
      } else if (priceSource === 'okx') {
        const symbols = [
          'TON-USDT', 'BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'TRX-USDT', 
          'NOT-USDT', 'BNB-USDT', 'MATIC-USDT', 'POL-USDT', 'AVAX-USDT', 'USDC-USDT'
        ];
        
        // OKX requires individual or specific ticker calls, but they have a public tickers list
        const res = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT');
        if (!res.ok) throw new Error(`OKX HTTP ${res.status}`);
        const data = await res.json();
        
        if (data.code !== '0') throw new Error(`OKX API Error: ${data.msg}`);
        
        const prices: Record<string, number> = {};
        data.data.forEach((item: { instId: string; last: string }) => {
          if (symbols.includes(item.instId)) {
            prices[item.instId] = parseFloat(item.last);
          }
        });

        setRateForm(prev => ({
          ...prev,
          ton: prices['TON-USDT'] ?? prev.ton,
          btc: prices['BTC-USDT'] ?? prev.btc,
          eth: prices['ETH-USDT'] ?? prev.eth,
          sol: prices['SOL-USDT'] ?? prev.sol,
          trx: prices['TRX-USDT'] ?? prev.trx,
          not: prices['NOT-USDT'] ?? prev.not,
          bnb: prices['BNB-USDT'] ?? prev.bnb,
          matic: prices['POL-USDT'] ?? prices['MATIC-USDT'] ?? prev.matic,
          avax: prices['AVAX-USDT'] ?? prev.avax,
          usdc: prices['USDC-USDT'] ?? prev.usdc,
          usdt: 1.0,
        }));
        successCount = Object.keys(prices).length;
      }

      success(`✅ Fetch success! ${successCount} rates updated from ${priceSource.toUpperCase()}`);
    } catch (err: any) {
      error(`❌ Failed to fetch from ${priceSource.toUpperCase()}: ${err.message}`);
    } finally {
      setFetchingRates(false);
    }
  };

  const pageSize = 20;

  useEffect(() => {
    checkAdminAccess();
  }, [address]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadDatabaseRates();
      if (showActivations) {
        loadActivations();
      }
    }
  }, [isAdmin, page, search, filter, nodeFilter, activationsPage, showActivations]);

  const loadDatabaseRates = async () => {
    const result = await adminService.getAssetRates();
    if (result.success && result.rates) {
      const rates = result.rates;
      setRateForm(prev => ({
        ...prev,
        ton: rates.TON_PRICE ?? prev.ton,
        btc: rates.BTC_PRICE ?? prev.btc,
        eth: rates.ETH_PRICE ?? prev.eth,
        sol: rates.SOL_PRICE ?? prev.sol,
        trx: rates.TRX_PRICE ?? prev.trx,
        rzc: rates.RZC_PRICE ?? prev.rzc,
        usdt: rates.USDT_PRICE ?? prev.usdt,
        usdc: rates.USDC_PRICE ?? prev.usdc,
        not: rates.NOT_PRICE ?? prev.not,
        scale: rates.SCALE_PRICE ?? prev.scale,
        stk: rates.STK_PRICE ?? prev.stk,
        bnb: rates.BNB_PRICE ?? prev.bnb,
        matic: rates.MATIC_PRICE ?? prev.matic,
        avax: rates.AVAX_PRICE ?? prev.avax,
      }));
    }
  };

  const loadActivations = async () => {
    setLoadingActivations(true);
    console.log('🔍 Loading activations...');
    
    const result = await adminService.getRecentActivations({
      limit: activationsPageSize,
      offset: (activationsPage - 1) * activationsPageSize
    });

    console.log('📊 Activations result:', result);

    if (result.success) {
      console.log(`✅ Loaded ${result.activations?.length || 0} activations (total: ${result.total || 0})`);
      setActivations(result.activations || []);
      setActivationsTotal(result.total || 0);
      
      if ((result.activations?.length || 0) === 0) {
        console.warn('⚠️ No activation records found in database');
      }
    } else {
      console.error('❌ Failed to load activations:', result.error);
      error(`Failed to load activations: ${result.error}`);
    }
    setLoadingActivations(false);
  };

  const checkAdminAccess = async () => {
    if (!address) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const adminStatus = await adminService.isAdmin(address);
    setIsAdmin(adminStatus);
    setLoading(false);
  };

  const loadUsers = async () => {
    setLoading(true);
    const result = await adminService.getAllUsers({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      search: search || undefined,
      filter
    });

    if (result.success) {
      setUsers(result.users || []);
      setTotal(result.total || 0);
      
      // Load node counts for each user
      await loadNodeCounts(result.users || []);
    } else {
      setErrorState(result.error || 'Failed to load users');
    }
    setLoading(false);
  };

  const loadNodeCounts = async (users: AdminUser[]) => {
    const client = supabaseService.getClient();
    if (!client) return;

    try {
      const walletAddresses = users.map(u => u.wallet_address);
      
      // Try to get squad mining claims count (mining nodes don't exist)
      // Using wallet_squad_claims table instead
      const { data, error } = await client
        .from('wallet_squad_claims')
        .select('user_id')
        .in('user_id', users.map(u => u.id));

      if (error) {
        // Table might not exist, silently fail
        console.warn('Squad mining table not available:', error.message);
        setUserNodes({}); // Set empty object
        return;
      }

      // Count claims per user (as proxy for "mining activity")
      const counts: Record<string, number> = {};
      data?.forEach(claim => {
        const user = users.find(u => u.id === claim.user_id);
        if (user) {
          counts[user.wallet_address] = (counts[user.wallet_address] || 0) + 1;
        }
      });

      setUserNodes(counts);
    } catch (err) {
      console.warn('Error loading node counts:', err);
      setUserNodes({}); // Set empty object on error
    }
  };

  const handleActivate = async (user: AdminUser) => {
    if (!address) return;

    const reason = prompt('Enter reason for activation:');
    if (!reason) return;

    setProcessing(true);
    const result = await adminService.activateUser(user.wallet_address, address, reason);
    
    if (result.success) {
      success(`✅ User ${user.name} activated successfully`);
      loadUsers();
    } else {
      error(`❌ Failed to activate user: ${result.error}`);
    }
    setProcessing(false);
  };

  const handleDeactivate = async (user: AdminUser) => {
    if (!address) return;

    const reason = prompt('Enter reason for deactivation:');
    if (!reason) return;

    const confirm = window.confirm(`Are you sure you want to deactivate ${user.name}?`);
    if (!confirm) return;

    setProcessing(true);
    const result = await adminService.deactivateUser(user.wallet_address, address, reason);
    
    if (result.success) {
      success(`✅ User ${user.name} deactivated successfully`);
      loadUsers();
    } else {
      error(`❌ Failed to deactivate user: ${result.error}`);
    }
    setProcessing(false);
  };

  const handleAwardRZC = async (user: AdminUser) => {
    if (!address) return;

    const amountStr = prompt('Enter RZC amount to award:');
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      error('Invalid amount');
      return;
    }

    const reason = prompt('Enter reason for RZC award:');
    if (!reason) return;

    setProcessing(true);
    const result = await adminService.awardRZCToUser(user.wallet_address, amount, reason, address);
    
    if (result.success) {
      success(`✅ Awarded ${amount} RZC to ${user.name}. New balance: ${result.newBalance}`);
      loadUsers();
    } else {
      error(`❌ Failed to award RZC: ${result.error}`);
    }
    setProcessing(false);
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email || '',
      role: user.role,
      is_active: user.is_active,
      rzc_balance: user.rzc_balance
    });
    setEditReason('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!address || !selectedUser) return;

    if (!editReason.trim()) {
      error('Please provide a reason for this update');
      return;
    }

    setProcessing(true);
    const result = await adminService.updateUserAccount(
      selectedUser.wallet_address,
      editForm,
      address,
      editReason
    );

    if (result.success) {
      success(`✅ User ${selectedUser.name} updated successfully`);
      setShowEditModal(false);
      loadUsers();
    } else {
      error(`❌ Failed to update user: ${result.error}`);
    }
    setProcessing(false);
  };

  const handleSaveRates = async () => {
    setProcessing(true);
    try {
      // 1. Save to local storage (legacy/fallback)
      setPriceOverrides({
        ...rateForm,
        updatedAt: new Date().toISOString(),
        updatedBy: address || 'admin',
      });

      // 2. Save to database (global)
      if (address) {
        const rateMappings = [
          { key: 'TON_PRICE', value: rateForm.ton },
          { key: 'BTC_PRICE', value: rateForm.btc },
          { key: 'ETH_PRICE', value: rateForm.eth },
          { key: 'SOL_PRICE', value: rateForm.sol },
          { key: 'TRX_PRICE', value: rateForm.trx },
          { key: 'RZC_PRICE', value: rateForm.rzc },
          { key: 'USDT_PRICE', value: rateForm.usdt },
          { key: 'USDC_PRICE', value: rateForm.usdc },
          { key: 'NOT_PRICE', value: rateForm.not },
          { key: 'SCALE_PRICE', value: rateForm.scale },
          { key: 'STK_PRICE', value: rateForm.stk },
          { key: 'BNB_PRICE', value: rateForm.bnb },
          { key: 'MATIC_PRICE', value: rateForm.matic },
          { key: 'AVAX_PRICE', value: rateForm.avax },
        ];

        for (const mapping of rateMappings) {
          await adminService.updateAssetRate(mapping.key, mapping.value, address);
        }
      }

      // 3. Instantly update the live price in the running app for all components
      updateRzcPrice(rateForm.rzc);

      setRateSaved(true);
      setTimeout(() => setRateSaved(false), 2500);
      success('✅ Global asset rates saved — live price updated instantly');
    } catch (err: any) {
      error(`❌ Failed to save rates: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleResetRates = () => {
    clearPriceOverrides();
    setRateForm(getPriceOverrides());
    success('↩️ Coin rates reset to defaults');
  };

  if (loading && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-600" />
          <h2 className="text-2xl font-bold text-gray-950 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to access the admin panel.
          </p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  // Apply client-side node filter
  const displayedUsers = nodeFilter === 'all' 
    ? users 
    : nodeFilter === 'has_nodes'
    ? users.filter(u => (userNodes[u.wallet_address] || 0) > 0)
    : users.filter(u => (userNodes[u.wallet_address] || 0) === 0);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-950 dark:text-white">
            Admin Panel
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage users and wallet activations
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-500/10 border-2 border-purple-300 dark:border-purple-500/20 rounded-xl">
          <Shield size={20} className="text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-bold text-purple-900 dark:text-purple-300">
            Admin Access
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl">
          <div className="flex items-center gap-3">
            <Users size={24} className="text-blue-600" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Total Users</p>
              <p className="text-2xl font-black text-gray-950 dark:text-white">{total}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} className="text-emerald-600" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Activated</p>
              <p className="text-2xl font-black text-gray-950 dark:text-white">
                {displayedUsers.filter(u => u.is_activated).length}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl">
          <div className="flex items-center gap-3">
            <XCircle size={24} className="text-amber-600" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Not Activated</p>
              <p className="text-2xl font-black text-gray-950 dark:text-white">
                {displayedUsers.filter(u => !u.is_activated).length}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl">
          <div className="flex items-center gap-3">
            <Zap size={24} className="text-purple-600" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Squad Active</p>
              <p className="text-2xl font-black text-gray-950 dark:text-white">
                {displayedUsers.filter(u => (userNodes[u.wallet_address] || 0) > 0).length}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl">
          <div className="flex items-center gap-3">
            <Gift size={24} className="text-purple-600" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Total RZC</p>
              <p className="text-2xl font-black text-gray-950 dark:text-white">
                {displayedUsers.reduce((sum, u) => sum + u.rzc_balance, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activations Section */}
      <div className="bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl overflow-hidden">
        <button
          onClick={() => {
            setShowActivations(!showActivations);
            if (!showActivations && activations.length === 0) {
              loadActivations();
            }
          }}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Receipt size={24} className="text-emerald-600" />
            <div className="text-left">
              <h2 className="text-lg font-black text-gray-950 dark:text-white">Recent Activations</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                View payment details and transaction hashes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activationsTotal > 0 && (
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">
                {activationsTotal} total
              </span>
            )}
            <ChevronRight 
              size={20} 
              className={`text-gray-400 transition-transform ${showActivations ? 'rotate-90' : ''}`} 
            />
          </div>
        </button>

        {showActivations && (
          <div className="border-t-2 border-gray-200 dark:border-white/10">
            {loadingActivations ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin" size={32} />
              </div>
            ) : activations.length === 0 ? (
              <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                No activations found
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">User</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Wallet</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Payment</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Transaction</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-gray-200 dark:divide-white/10">
                      {activations.map((activation) => (
                        <tr key={activation.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-bold text-gray-950 dark:text-white">
                                {activation.wallet_users?.name || 'Unknown'}
                              </p>
                              {activation.wallet_users?.email && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {activation.wallet_users.email}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                              {activation.wallet_address.slice(0, 8)}...{activation.wallet_address.slice(-6)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-bold text-gray-950 dark:text-white">
                                ${activation.activation_fee_usd?.toFixed(2) || '0.00'}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {activation.activation_fee_ton?.toFixed(4) || '0.0000'} TON
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {activation.transaction_hash ? (
                              <a
                                href={`https://tonscan.org/tx/${activation.transaction_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {activation.transaction_hash.slice(0, 8)}...
                                <ExternalLink size={12} />
                              </a>
                            ) : (
                              <span className="text-xs text-gray-500 dark:text-gray-500">
                                {activation.activation_fee_usd === 0 ? 'Admin activated' : 'No tx hash'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                              <Clock size={12} />
                              {new Date(activation.completed_at || activation.created_at).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded ${
                              activation.status === 'completed'
                                ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            }`}>
                              {activation.status === 'completed' ? <CheckCircle size={12} /> : <Clock size={12} />}
                              {activation.status || 'pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden divide-y-2 divide-gray-200 dark:divide-white/10">
                  {activations.map((activation) => (
                    <div key={activation.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-gray-950 dark:text-white">
                            {activation.wallet_users?.name || 'Unknown'}
                          </p>
                          <p className="text-xs font-mono text-gray-600 dark:text-gray-400 mt-0.5">
                            {activation.wallet_address.slice(0, 12)}...{activation.wallet_address.slice(-8)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded ${
                          activation.status === 'completed'
                            ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        }`}>
                          {activation.status === 'completed' ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {activation.status || 'pending'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-white/10">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Payment</p>
                          <p className="font-bold text-gray-950 dark:text-white">
                            ${activation.activation_fee_usd?.toFixed(2) || '0.00'}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {activation.activation_fee_ton?.toFixed(4) || '0.0000'} TON
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Date</p>
                          <p className="text-xs font-bold text-gray-950 dark:text-white">
                            {new Date(activation.completed_at || activation.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(activation.completed_at || activation.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      {activation.transaction_hash && (
                        <a
                          href={`https://tonscan.org/tx/${activation.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-500/20 transition-colors"
                        >
                          <ExternalLink size={14} />
                          View on TonScan
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {Math.ceil(activationsTotal / activationsPageSize) > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t-2 border-gray-200 dark:border-white/10">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {(activationsPage - 1) * activationsPageSize + 1} to {Math.min(activationsPage * activationsPageSize, activationsTotal)} of {activationsTotal} activations
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActivationsPage(p => Math.max(1, p - 1))}
                        disabled={activationsPage === 1}
                        className="p-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-sm font-bold text-gray-950 dark:text-white">
                        Page {activationsPage} of {Math.ceil(activationsTotal / activationsPageSize)}
                      </span>
                      <button
                        onClick={() => setActivationsPage(p => Math.min(Math.ceil(activationsTotal / activationsPageSize), p + 1))}
                        disabled={activationsPage === Math.ceil(activationsTotal / activationsPageSize)}
                        className="p-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by wallet address, name, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-600 dark:text-gray-400" />
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
          >
            <option value="all">All Users</option>
            <option value="activated">Activated</option>
            <option value="not_activated">Not Activated</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={nodeFilter}
            onChange={(e) => {
              setNodeFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
          >
            <option value="all">All Users</option>
            <option value="has_nodes">Has Squad Claims</option>
            <option value="no_nodes">No Squad Claims</option>
          </select>
        </div>
      </div>

      {/* Users Table - Desktop */}
      <div className="hidden lg:block bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-white/5 border-b-2 border-gray-300 dark:border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Wallet</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Activation</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Squad Claims</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">RZC Balance</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-200 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <Loader className="animate-spin mx-auto" size={32} />
                  </td>
                </tr>
              ) : displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-600 dark:text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                displayedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-gray-950 dark:text-white">{user.name}</p>
                        {user.email && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">{user.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                        {user.wallet_address.slice(0, 8)}...{user.wallet_address.slice(-6)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_activated ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded">
                            <CheckCircle size={12} />
                            Activated
                          </span>
                          {user.activated_at && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
                              {new Date(user.activated_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold rounded">
                          <XCircle size={12} />
                          Not Activated
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {!user.is_active && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-bold rounded">
                            Inactive
                          </span>
                        )}
                        {user.is_active && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-bold rounded">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(userNodes[user.wallet_address] || 0) > 0 ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-bold rounded">
                            <Zap size={12} />
                            {userNodes[user.wallet_address]} Claim{userNodes[user.wallet_address] > 1 ? 's' : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-500">No claims</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-950 dark:text-white">
                        {user.rzc_balance.toLocaleString()} RZC
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {!user.is_activated ? (
                          <button
                            onClick={() => handleActivate(user)}
                            disabled={processing}
                            className="p-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                            title="Activate User"
                          >
                            <Shield size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeactivate(user)}
                            disabled={processing}
                            className="p-2 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            title="Deactivate User"
                          >
                            <ShieldOff size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleAwardRZC(user)}
                          disabled={processing}
                          className="p-2 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                          title="Award RZC"
                        >
                          <Gift size={16} />
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          disabled={processing}
                          className="p-2 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                          title="Edit User"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t-2 border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-gray-950 dark:text-white">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Users Cards - Mobile */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="animate-spin" size={32} />
          </div>
        ) : displayedUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            No users found
          </div>
        ) : (
          displayedUsers.map((user) => (
            <div key={user.id} className="bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl p-4 space-y-3">
              {/* User Info */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-950 dark:text-white">{user.name}</h3>
                  {user.email && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{user.email}</p>
                  )}
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-400 mt-1">
                    {user.wallet_address.slice(0, 12)}...{user.wallet_address.slice(-8)}
                  </p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {user.is_activated ? (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded">
                        <CheckCircle size={12} />
                        Activated
                      </span>
                      {user.activated_at && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
                          {new Date(user.activated_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold rounded">
                      <XCircle size={12} />
                      Not Activated
                    </span>
                  )}
                  {!user.is_active ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-bold rounded mt-1">
                      Inactive
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-bold rounded mt-1">
                      Active
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t-2 border-gray-200 dark:border-white/10">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Squad Claims</p>
                  {(userNodes[user.wallet_address] || 0) > 0 ? (
                    <p className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
                      <Zap size={14} />
                      {userNodes[user.wallet_address]}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-500">None</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">RZC Balance</p>
                  <p className="font-bold text-gray-950 dark:text-white">
                    {user.rzc_balance.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Joined</p>
                  <p className="text-xs font-bold text-gray-950 dark:text-white">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t-2 border-gray-200 dark:border-white/10">
                {!user.is_activated ? (
                  <button
                    onClick={() => handleActivate(user)}
                    disabled={processing}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50 text-sm font-bold"
                  >
                    <Shield size={14} />
                    Activate
                  </button>
                ) : (
                  <button
                    onClick={() => handleDeactivate(user)}
                    disabled={processing}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50 text-sm font-bold"
                  >
                    <ShieldOff size={14} />
                    Deactivate
                  </button>
                )}
                <button
                  onClick={() => handleAwardRZC(user)}
                  disabled={processing}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-500/20 transition-colors disabled:opacity-50 text-sm font-bold"
                >
                  <Gift size={14} />
                  Award RZC
                </button>
                <button
                  onClick={() => handleEditUser(user)}
                  disabled={processing}
                  className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-500/20 transition-colors disabled:opacity-50 text-sm font-bold"
                >
                  <Edit size={14} />
                  Edit User
                </button>
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col gap-3 p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl">
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} users
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <span className="text-sm font-bold text-gray-950 dark:text-white px-4">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Coin Rate Overrides */}
      <div className="bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-950 dark:text-white">Global Asset Rates</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Saved to database — all users see these rates on next load. RZC price updates instantly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={priceSource}
              onChange={(e) => setPriceSource(e.target.value as any)}
              className="px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl text-xs font-bold text-gray-950 dark:text-white focus:outline-none focus:border-primary"
            >
              <option value="coingecko">CoinGecko (Aggregated)</option>
              <option value="binance">Binance (Market Tickers)</option>
              <option value="okx">OKX (Market Tickers)</option>
            </select>
            <button
              onClick={handleFetchLiveRates}
              disabled={fetchingRates}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-500/20 rounded-xl text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-500/20 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {fetchingRates ? (
                <Loader size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              {fetchingRates ? 'Fetching...' : 'Fetch Rates'}
            </button>
            {rateForm.updatedAt && (
              <p className="text-[10px] text-gray-400 dark:text-gray-600 text-right">
                Last saved<br />{new Date(rateForm.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* RZC */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-lg">💎</span> RZC (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={rateForm.rzc}
                onChange={(e) => setRateForm({ ...rateForm, rzc: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary font-bold"
              />
            </div>
          </div>

          {/* TON */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-lg">💠</span> TON (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={rateForm.ton}
                onChange={(e) => setRateForm({ ...rateForm, ton: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* BTC */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-lg">₿</span> BTC (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={rateForm.btc}
                onChange={(e) => setRateForm({ ...rateForm, btc: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* ETH */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-lg">⟠</span> ETH (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={rateForm.eth}
                onChange={(e) => setRateForm({ ...rateForm, eth: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* USDT */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-lg">💵</span> USDT (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={rateForm.usdt}
                onChange={(e) => setRateForm({ ...rateForm, usdt: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* SOL */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-lg">☀️</span> SOL (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={rateForm.sol}
                onChange={(e) => setRateForm({ ...rateForm, sol: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* TRX */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-lg">🔴</span> TRX (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={rateForm.trx}
                onChange={(e) => setRateForm({ ...rateForm, trx: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* USDC */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-lg">💰</span> USDC (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={rateForm.usdc}
                onChange={(e) => setRateForm({ ...rateForm, usdc: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* BNB */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-lg">🟡</span> BNB (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={rateForm.bnb}
                onChange={(e) => setRateForm({ ...rateForm, bnb: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* MATIC */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-lg">🟣</span> MATIC (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={rateForm.matic}
                onChange={(e) => setRateForm({ ...rateForm, matic: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* AVAX */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-lg">🔴</span> AVAX (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={rateForm.avax}
                onChange={(e) => setRateForm({ ...rateForm, avax: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* NOT */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-lg">🎮</span> NOT (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={rateForm.not}
                onChange={(e) => setRateForm({ ...rateForm, not: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* SCALE */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-lg">📈</span> SCALE (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={rateForm.scale}
                onChange={(e) => setRateForm({ ...rateForm, scale: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* STK */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-lg">🥩</span> STK (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={rateForm.stk}
                onChange={(e) => setRateForm({ ...rateForm, stk: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={handleSaveRates}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              rateSaved
                ? 'bg-emerald-500 text-white'
                : 'bg-primary text-black hover:bg-[#00dd77]'
            }`}
          >
            <Save size={15} />
            {rateSaved ? 'Saved!' : 'Save Rates'}
          </button>
          <button
            onClick={handleResetRates}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-all"
          >
            <X size={15} />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => !processing && setShowEditModal(false)}
          />

          {/* Modal */}
          <div className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b-2 border-gray-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-950 dark:text-white">
                  Edit User Account
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {selectedUser.wallet_address.slice(0, 12)}...{selectedUser.wallet_address.slice(-8)}
                </p>
              </div>
              <button
                onClick={() => !processing && setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                disabled={processing}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <User size={16} />
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="User name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <Mail size={16} />
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="user@example.com"
                />
              </div>

              {/* Role */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <Shield size={16} />
                  Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                >
                  <option value="user">User</option>
                  <option value="premium">Premium</option>
                  <option value="vip">VIP</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              {/* RZC Balance */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <Coins size={16} />
                  RZC Balance
                </label>
                <input
                  type="number"
                  value={editForm.rzc_balance}
                  onChange={(e) => setEditForm({ ...editForm, rzc_balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="0"
                  step="0.01"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-gray-300 dark:border-white/10"
                />
                <label htmlFor="is_active" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                  Account Active
                </label>
              </div>

              {/* Reason */}
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">
                  Reason for Update <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary resize-none"
                  placeholder="Enter reason for this update..."
                  rows={3}
                  required
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t-2 border-gray-200 dark:border-white/10 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => !processing && setShowEditModal(false)}
                disabled={processing}
                className="flex-1 py-3 bg-gray-200 dark:bg-white/10 text-gray-950 dark:text-white rounded-xl text-sm font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={processing || !editReason.trim()}
                className="flex-1 py-3 bg-emerald-600 dark:bg-primary text-white dark:text-black rounded-xl text-sm font-bold hover:bg-emerald-700 dark:hover:bg-[#00dd77] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPanel;
