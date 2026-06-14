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
  Receipt,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ListTodo,
  Eye
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { useAdminEditModal } from '../context/AdminEditModalContext';
import { adminService, AdminUser } from '../services/adminService';
import { supabaseService } from '../services/supabaseService';
import { getPriceOverrides, setPriceOverrides, clearPriceOverrides, PriceOverrides } from '../utils/priceConfig';
import { databaseAirdropService, DatabaseAirdropTask, CreateTaskData, UpdateTaskData } from '../services/databaseAirdropService';
import { launchpadService, LaunchpadProject } from '../services/launchpadService';
import { Address } from '@ton/ton';

const AdminPanel: React.FC = () => {
  const { address, updateRzcPrice } = useWallet();
  const { success, error } = useToast();
  const { openEditModal } = useAdminEditModal();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'activated' | 'not_activated' | 'active' | 'inactive'>('all');
  const [nodeFilter, setNodeFilter] = useState<'all' | 'has_nodes' | 'no_nodes'>('all');
  const [userNodes, setUserNodes] = useState<Record<string, number>>({});
  const [processing, setProcessing] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

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

  // Airdrop task management state
  const [tasks, setTasks] = useState<DatabaseAirdropTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<DatabaseAirdropTask | null>(null);
  const [taskForm, setTaskForm] = useState<CreateTaskData>({
    title: '',
    description: '',
    reward: 100,
    action: '',
    category: 'social',
    difficulty: 'easy',
    instructions: '',
    time_limit: '',
    verification_type: 'manual',
    requirements: {},
    sort_order: 0,
  });
  const [taskProcessing, setTaskProcessing] = useState(false);

  // Launchpad project management state
  const [projects, setProjects] = useState<LaunchpadProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<LaunchpadProject | null>(null);
  const [projectForm, setProjectForm] = useState<Partial<LaunchpadProject>>({
    name: '',
    symbol: '',
    tagline: '',
    description: '',
    logo_url: '',
    status: 'upcoming',
    total_supply: 0,
    presale_allocation: 0,
    presale_rate: 0,
    listing_rate: 0,
    soft_cap: 0,
    hard_cap: 0,
    min_purchase: 0,
    max_purchase: 0,
    presale_start: '',
    presale_end: '',
    kyc_verified: false,
    audit_verified: false,
    safu_verified: false,
    doxxed: false,
    distribution_presale: 0,
    distribution_liquidity: 0,
    distribution_team: 0,
    distribution_marketing: 0,
    distribution_reserve: 0,
    tge_unlock_percent: 0,
    vesting_months: 0,
    monthly_unlock_percent: 0,
    liquidity_lock_days: 0,
    liquidity_percent: 0,
    featured: false,
    trending: false,
  });
  const [projectProcessing, setProjectProcessing] = useState(false);

  // Wallet Audit system state
  interface AuditIssue {
    user: AdminUser;
    storedAddress: string;
    expectedAddress: string;
    issueDescription: string;
  }
  const [showAudit, setShowAudit] = useState(false);
  const { network } = useWallet();
  const [auditNetwork, setAuditNetwork] = useState<'mainnet' | 'testnet'>('mainnet');
  const [auditing, setAuditing] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [auditResults, setAuditResults] = useState<AuditIssue[]>([]);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [totalAudited, setTotalAudited] = useState(0);

  useEffect(() => {
    if (network) {
      setAuditNetwork(network as 'mainnet' | 'testnet');
    }
  }, [network]);

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

  const runWalletAudit = async () => {
    setAuditing(true);
    setScanCompleted(false);
    setAuditResults([]);
    
    try {
      const client = supabaseService.getClient();
      if (!client) {
        error('Supabase client not initialized');
        setAuditing(false);
        return;
      }

      // Fetch all users to audit (without page size limits, to be thorough)
      const { data: allUsers, error: fetchErr } = await client
        .from('wallet_users')
        .select('*');

      if (fetchErr) throw fetchErr;

      if (!allUsers) {
        setTotalAudited(0);
        setScanCompleted(true);
        setAuditing(false);
        return;
      }

      setTotalAudited(allUsers.length);

      const targetIsTestnet = auditNetwork === 'testnet';
      const issues: AuditIssue[] = [];

      for (const u of allUsers) {
        const storedAddr = u.wallet_address;
        if (!storedAddr) continue;

        try {
          const parsed = Address.parse(storedAddr);
          const expectedAddr = parsed.toString({ bounceable: false, testOnly: targetIsTestnet });

          if (storedAddr !== expectedAddr) {
            let desc = '';
            if (storedAddr.startsWith('0Q') && !targetIsTestnet) {
              desc = 'Testnet address prefix (0Q...) used on Mainnet';
            } else if (storedAddr.startsWith('UQ') && targetIsTestnet) {
              desc = 'Mainnet address prefix (UQ...) used on Testnet';
            } else if (storedAddr.startsWith('EQ') || storedAddr.startsWith('kQ')) {
              desc = 'Bounceable address format used (expects non-bounceable)';
            } else {
              desc = 'Address format mismatch (prefix/testnet flag difference)';
            }

            issues.push({
              user: u,
              storedAddress: storedAddr,
              expectedAddress: expectedAddr,
              issueDescription: desc
            });
          }
        } catch (parseErr) {
          issues.push({
            user: u,
            storedAddress: storedAddr,
            expectedAddress: 'N/A (Invalid TON format)',
            issueDescription: 'Address is invalid and cannot be parsed as a TON address'
          });
        }
      }

      setAuditResults(issues);
      setScanCompleted(true);
      success(`✅ Audit complete! Scanned ${allUsers.length} wallets, found ${issues.length} issue(s).`);
    } catch (err: any) {
      console.error('Audit error:', err);
      error(`❌ Audit failed: ${err.message}`);
    } finally {
      setAuditing(false);
    }
  };

  const fixSingleWallet = async (issue: AuditIssue) => {
    const { user, expectedAddress } = issue;
    if (expectedAddress.startsWith('N/A')) {
      error(`Cannot auto-fix invalid address: ${issue.storedAddress}`);
      return;
    }

    try {
      const client = supabaseService.getClient();
      if (!client) throw new Error('Supabase client not initialized');

      // Update wallet_users
      const { error: userErr } = await client
        .from('wallet_users')
        .update({ wallet_address: expectedAddress, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (userErr) throw userErr;

      // Update denormalized tables in background
      await Promise.all([
        client.from('wallet_transactions').update({ wallet_address: expectedAddress }).eq('user_id', user.id),
        client.from('wallet_activations').update({ wallet_address: expectedAddress }).eq('user_id', user.id),
        client.from('wallet_analytics').update({ wallet_address: expectedAddress }).eq('user_id', user.id)
      ]);

      // Remove from auditResults state
      setAuditResults(prev => prev.filter(item => item.user.id !== user.id));
      
      // Update global users list in AdminPanel if loaded
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, wallet_address: expectedAddress } : u));

      success(`Successfully fixed wallet for user: ${user.name}`);
    } catch (err: any) {
      console.error('Fix error:', err);
      error(`❌ Failed to fix wallet: ${err.message}`);
    }
  };

  const fixAllWallets = async () => {
    if (auditResults.length === 0) return;
    
    const confirmFix = window.confirm(`Are you sure you want to auto-fix all ${auditResults.length} wallets with issues?`);
    if (!confirmFix) return;

    setFixing(true);
    let successCount = 0;
    let failCount = 0;

    const client = supabaseService.getClient();
    if (!client) {
      error('Supabase client not initialized');
      setFixing(false);
      return;
    }

    for (const issue of auditResults) {
      const { user, expectedAddress } = issue;
      if (expectedAddress.startsWith('N/A')) {
        failCount++;
        continue;
      }

      try {
        const { error: userErr } = await client
          .from('wallet_users')
          .update({ wallet_address: expectedAddress, updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (userErr) throw userErr;

        await Promise.all([
          client.from('wallet_transactions').update({ wallet_address: expectedAddress }).eq('user_id', user.id),
          client.from('wallet_activations').update({ wallet_address: expectedAddress }).eq('user_id', user.id),
          client.from('wallet_analytics').update({ wallet_address: expectedAddress }).eq('user_id', user.id)
        ]);

        successCount++;
      } catch (err) {
        console.error(`Failed to fix user ${user.name} (${user.id}):`, err);
        failCount++;
      }
    }

    setFixing(false);
    
    // Rerun audit to refresh results list
    await runWalletAudit();
    
    // Refresh main users list
    loadUsers();

    if (failCount > 0) {
      success(`Bulk fix completed: ${successCount} fixed, ${failCount} failed.`);
    } else {
      success(`✅ Successfully fixed all ${successCount} wallets!`);
    }
  };

  const [pageSize, setPageSize] = useState<number | 'all'>(20);
  const isAllActive = filter === 'active';
  const effectivePageSize = isAllActive || pageSize === 'all' ? 1000000 : pageSize;

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
  }, [isAdmin, page, search, filter, nodeFilter, pageSize, activationsPage, showActivations]);

  // Listen for user updates from the global modal
  useEffect(() => {
    const handleUserUpdate = () => {
      loadUsers();
    };
    
    window.addEventListener('admin-user-updated', handleUserUpdate);
    return () => window.removeEventListener('admin-user-updated', handleUserUpdate);
  }, []);

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
      limit: effectivePageSize,
      offset: (page - 1) * effectivePageSize,
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

      // 4. Clear the price cache in useBalance to force fresh percentage data
      const { clearPriceCache } = await import('../hooks/useBalance');
      clearPriceCache();

      setRateSaved(true);
      setTimeout(() => setRateSaved(false), 2500);
      success('✅ Global asset rates saved — live price & percentages updated instantly');
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

  // ── Airdrop Task Management ──────────────────────────────────────────────

  const loadTasks = async () => {
    setLoadingTasks(true);
    const result = await databaseAirdropService.getAllTasks();
    if (result.success && result.data) {
      setTasks(result.data);
    } else {
      error(`Failed to load tasks: ${result.error}`);
    }
    setLoadingTasks(false);
  };

  const openCreateTask = () => {
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      reward: 100,
      action: '',
      category: 'social',
      difficulty: 'easy',
      instructions: '',
      time_limit: '',
      verification_type: 'manual',
      requirements: {},
      sort_order: tasks.length,
    });
    setShowTaskModal(true);
  };

  const openEditTask = (task: DatabaseAirdropTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      reward: task.reward,
      action: task.action,
      category: task.category,
      difficulty: task.difficulty,
      instructions: task.instructions || '',
      time_limit: task.time_limit || '',
      verification_type: task.verification_type,
      requirements: task.requirements || {},
      sort_order: task.sort_order,
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim() || !taskForm.action.trim()) {
      error('Title and action are required');
      return;
    }
    setTaskProcessing(true);
    if (editingTask) {
      const result = await databaseAirdropService.updateTask(
        editingTask.id,
        { ...taskForm, is_active: editingTask.is_active },
        address || undefined
      );
      if (result.success) {
        success('✅ Task updated successfully');
        setShowTaskModal(false);
        loadTasks();
      } else {
        error(`❌ Failed to update task: ${result.message}`);
      }
    } else {
      const result = await databaseAirdropService.createTask(taskForm, address || undefined);
      if (result.success) {
        success('✅ Task created successfully');
        setShowTaskModal(false);
        loadTasks();
      } else {
        error(`❌ Failed to create task: ${result.message}`);
      }
    }
    setTaskProcessing(false);
  };

  const handleToggleTask = async (task: DatabaseAirdropTask) => {
    setTaskProcessing(true);
    const result = await databaseAirdropService.toggleTaskStatus(task.id, address || undefined);
    if (result.success) {
      success(`✅ Task ${task.is_active ? 'deactivated' : 'activated'}`);
      loadTasks();
    } else {
      error(`❌ ${result.message}`);
    }
    setTaskProcessing(false);
  };

  const handleDeleteTask = async (task: DatabaseAirdropTask) => {
    if (!window.confirm(`Deactivate task "${task.title}"? It won't be shown to users.`)) return;
    setTaskProcessing(true);
    const result = await databaseAirdropService.deleteTask(task.id, address || undefined);
    if (result.success) {
      success('✅ Task deactivated');
      loadTasks();
    } else {
      error(`❌ ${result.message}`);
    }
    setTaskProcessing(false);
  };

  // ── Launchpad Project Management ──────────────────────────────────────────

  const loadProjects = async () => {
    setLoadingProjects(true);
    const result = await launchpadService.getProjects({ status: 'all' });
    if (result.success && result.data) {
      setProjects(result.data);
    } else {
      error(`Failed to load projects: ${result.error}`);
    }
    setLoadingProjects(false);
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setProjectForm({
      name: '',
      symbol: '',
      tagline: '',
      description: '',
      logo_url: '',
      status: 'upcoming',
      total_supply: 1000000000,
      presale_allocation: 200000000,
      presale_rate: 1000,
      listing_rate: 800,
      soft_cap: 50000,
      hard_cap: 100000,
      min_purchase: 100,
      max_purchase: 5000,
      presale_start: new Date().toISOString().slice(0, 16),
      presale_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      kyc_verified: false,
      audit_verified: false,
      safu_verified: false,
      doxxed: false,
      distribution_presale: 20,
      distribution_liquidity: 50,
      distribution_team: 15,
      distribution_marketing: 10,
      distribution_reserve: 5,
      tge_unlock_percent: 25,
      vesting_months: 6,
      monthly_unlock_percent: 12.5,
      liquidity_lock_days: 365,
      liquidity_percent: 70,
      featured: false,
      trending: false,
    });
    setShowProjectModal(true);
  };

  const handleEditProject = (project: LaunchpadProject) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      symbol: project.symbol,
      tagline: project.tagline,
      description: project.description,
      logo_url: project.logo_url,
      status: project.status,
      total_supply: project.total_supply,
      presale_allocation: project.presale_allocation,
      presale_rate: project.presale_rate,
      listing_rate: project.listing_rate,
      soft_cap: project.soft_cap,
      hard_cap: project.hard_cap,
      min_purchase: project.min_purchase,
      max_purchase: project.max_purchase,
      presale_start: project.presale_start.slice(0, 16),
      presale_end: project.presale_end.slice(0, 16),
      kyc_verified: project.kyc_verified,
      audit_verified: project.audit_verified,
      safu_verified: project.safu_verified,
      doxxed: project.doxxed,
      website_url: project.website_url || '',
      twitter_url: project.twitter_url || '',
      telegram_url: project.telegram_url || '',
      discord_url: project.discord_url || '',
      distribution_presale: project.distribution_presale,
      distribution_liquidity: project.distribution_liquidity,
      distribution_team: project.distribution_team,
      distribution_marketing: project.distribution_marketing,
      distribution_reserve: project.distribution_reserve,
      tge_unlock_percent: project.tge_unlock_percent,
      vesting_months: project.vesting_months,
      monthly_unlock_percent: project.monthly_unlock_percent,
      liquidity_lock_days: project.liquidity_lock_days,
      liquidity_percent: project.liquidity_percent,
      featured: project.featured,
      trending: project.trending,
    });
    setShowProjectModal(true);
  };

  const handleSaveProject = async () => {
    if (!projectForm.name || !projectForm.symbol) {
      error('Name and symbol are required');
      return;
    }

    setProjectProcessing(true);
    
    const result = editingProject
      ? await launchpadService.updateProject(editingProject.id, projectForm)
      : await launchpadService.createProject(projectForm);

    if (result.success) {
      success(`✅ Project ${editingProject ? 'updated' : 'created'} successfully`);
      setShowProjectModal(false);
      loadProjects();
    } else {
      error(`❌ Failed to ${editingProject ? 'update' : 'create'} project: ${result.error}`);
    }
    setProjectProcessing(false);
  };

  const handleToggleProjectStatus = async (project: LaunchpadProject) => {
    const newStatus = project.status === 'live' ? 'upcoming' : 'live';
    setProjectProcessing(true);
    const result = await launchpadService.updateProject(project.id, { status: newStatus });
    if (result.success) {
      success(`✅ Project ${newStatus === 'live' ? 'enabled' : 'disabled'}`);
      loadProjects();
    } else {
      error(`❌ Failed to update status: ${result.error}`);
    }
    setProjectProcessing(false);
  };

  const handleDeleteProject = async (project: LaunchpadProject) => {
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    setProjectProcessing(true);
    const result = await launchpadService.deleteProject(project.id);
    if (result.success) {
      success('✅ Project deleted');
      loadProjects();
    } else {
      error(`❌ Failed to delete: ${result.error}`);
    }
    setProjectProcessing(false);
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

  const totalPages = Math.ceil(total / effectivePageSize);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            const newShowState = !showActivations;
            setShowActivations(newShowState);
            // Always reload when opening, even if we have cached data
            if (newShowState) {
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
            {showActivations && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  loadActivations();
                }}
                disabled={loadingActivations}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh activations"
              >
                <RefreshCw size={16} className={`text-gray-600 dark:text-gray-400 ${loadingActivations ? 'animate-spin' : ''}`} />
              </button>
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
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-gray-200 dark:divide-white/10">
                      {activations.map((activation) => {
                        // Find the user in the users list
                        const user = users.find(u => u.wallet_address === activation.wallet_address);
                        
                        return (
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
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                {user ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        // Scroll to user in the main list
                                        setSearch(activation.wallet_address);
                                        setShowActivations(false);
                                        // Small delay to let the search filter apply
                                        setTimeout(() => {
                                          const userRow = document.querySelector(`[data-wallet="${activation.wallet_address}"]`);
                                          userRow?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }, 100);
                                      }}
                                      className="p-2 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-500/20 transition-colors"
                                      title="View User"
                                    >
                                      <Eye size={14} />
                                    </button>
                                    <button
                                      onClick={() => openEditModal(user)}
                                      disabled={processing}
                                      className="p-2 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                                      title="Edit User"
                                    >
                                      <Edit size={14} />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-500 dark:text-gray-500 italic">
                                    User not found
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden divide-y-2 divide-gray-200 dark:divide-white/10">
                  {activations.map((activation) => {
                    // Find the user in the users list
                    const user = users.find(u => u.wallet_address === activation.wallet_address);
                    
                    return (
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

                        {/* User Actions */}
                        {user ? (
                          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
                            <button
                              onClick={() => {
                                // Scroll to user in the main list
                                setSearch(activation.wallet_address);
                                setShowActivations(false);
                                // Small delay to let the search filter apply
                                setTimeout(() => {
                                  const userRow = document.querySelector(`[data-wallet="${activation.wallet_address}"]`);
                                  userRow?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 100);
                              }}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-500/20 transition-colors"
                            >
                              <Eye size={14} />
                              View User
                            </button>
                            <button
                              onClick={() => openEditModal(user)}
                              disabled={processing}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-200 dark:hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                            >
                              <Edit size={14} />
                              Edit User
                            </button>
                          </div>
                        ) : (
                          <div className="pt-3 border-t border-gray-200 dark:border-white/10 text-center">
                            <span className="text-xs text-gray-500 dark:text-gray-500 italic">
                              User not found in current page
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
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

      {/* Wallet Address Audit System */}
      <div className="bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl overflow-hidden animate-fadeIn">
        <button
          onClick={() => setShowAudit(prev => !prev)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Shield className="text-blue-600" size={24} />
            <div className="text-left">
              <h2 className="text-lg font-black text-gray-950 dark:text-white">Wallet Address Audit System</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Scan database for mismatched network prefixes and perform batch auto-corrections
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {scanCompleted && auditResults.length > 0 && (
              <span className="px-3 py-1 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-bold rounded-full">
                {auditResults.length} issue{auditResults.length > 1 ? 's' : ''} found
              </span>
            )}
            {scanCompleted && auditResults.length === 0 && (
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">
                Healthy
              </span>
            )}
            <ChevronRight 
              size={20} 
              className={`text-gray-400 transition-transform ${showAudit ? 'rotate-90' : ''}`} 
            />
          </div>
        </button>

        {showAudit && (
          <div className="border-t-2 border-gray-200 dark:border-white/10 p-4 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Target Network:</span>
                <select
                  value={auditNetwork}
                  onChange={(e) => {
                    setAuditNetwork(e.target.value as 'mainnet' | 'testnet');
                    setScanCompleted(false);
                    setAuditResults([]);
                  }}
                  className="px-3 py-1.5 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                >
                  <option value="mainnet">Mainnet (UQ...)</option>
                  <option value="testnet">Testnet (0Q...)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={runWalletAudit}
                  disabled={auditing || fixing}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white border border-blue-500/20 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {auditing ? <Loader className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                  {auditing ? 'Auditing...' : 'Run Wallet Audit'}
                </button>

                {scanCompleted && auditResults.length > 0 && (
                  <button
                    onClick={fixAllWallets}
                    disabled={fixing || auditing}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-black rounded-xl text-sm font-bold hover:bg-[#00dd77] transition-all disabled:opacity-50"
                  >
                    {fixing ? <Loader className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                    {fixing ? 'Fixing...' : 'Auto Fix All'}
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            {!scanCompleted && !auditing && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Select target network format and click <span className="font-bold text-gray-800 dark:text-gray-200">"Run Wallet Audit"</span> to scan.
              </div>
            )}

            {auditing && (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader className="animate-spin text-blue-600" size={32} />
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Scanning database records...</p>
              </div>
            )}

            {scanCompleted && (
              <div className="space-y-4">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Scanned</p>
                    <p className="text-xl font-black text-gray-950 dark:text-white">{totalAudited} wallets</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Healthy</p>
                    <p className="text-xl font-black text-emerald-600">{totalAudited - auditResults.length} wallets</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Issues</p>
                    <p className={`text-xl font-black ${auditResults.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {auditResults.length} wallet{auditResults.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {auditResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-emerald-600 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                    <CheckCircle size={32} className="mb-2 text-emerald-600" />
                    <p className="font-bold text-sm">All Stored Addresses Are Correct!</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No mismatches found for {auditNetwork.toUpperCase()} network format.</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto border border-gray-200 dark:border-white/10 rounded-xl">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-white/5 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                          <tr>
                            <th className="px-4 py-3 text-left">User</th>
                            <th className="px-4 py-3 text-left">Stored Address</th>
                            <th className="px-4 py-3 text-left">Expected Address</th>
                            <th className="px-4 py-3 text-left">Issue Description</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                          {auditResults.map((issue) => (
                            <tr key={issue.user.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                              <td className="px-4 py-3 font-bold text-gray-950 dark:text-white">
                                {issue.user.name}
                                {issue.user.email && (
                                  <span className="block text-xs font-normal text-gray-500">{issue.user.email}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-red-600 dark:text-red-400 truncate max-w-[150px]" title={issue.storedAddress}>
                                {issue.storedAddress}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-emerald-600 dark:text-emerald-400 truncate max-w-[150px]" title={issue.expectedAddress}>
                                {issue.expectedAddress}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                                {issue.issueDescription}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => fixSingleWallet(issue)}
                                  disabled={fixing}
                                  className="px-2.5 py-1 bg-primary text-black rounded-lg text-xs font-bold hover:bg-[#00dd77] transition-all disabled:opacity-50"
                                >
                                  Auto Fix
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {auditResults.map((issue) => (
                        <div key={issue.user.id} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-950 dark:text-white">{issue.user.name}</span>
                            <button
                              onClick={() => fixSingleWallet(issue)}
                              disabled={fixing}
                              className="px-2.5 py-1 bg-primary text-black rounded-lg text-xs font-bold hover:bg-[#00dd77] transition-all disabled:opacity-50"
                            >
                              Auto Fix
                            </button>
                          </div>
                          <div className="text-xs space-y-1">
                            <p className="text-gray-500 dark:text-gray-400">
                              Stored: <span className="font-mono text-red-600 dark:text-red-400 break-all">{issue.storedAddress}</span>
                            </p>
                            <p className="text-gray-500 dark:text-gray-400">
                              Expected: <span className="font-mono text-emerald-600 dark:text-emerald-400 break-all">{issue.expectedAddress}</span>
                            </p>
                            <p className="text-red-600 dark:text-red-400 font-semibold">{issue.issueDescription}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
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
          <select
            value={pageSize === 'all' ? 'all' : pageSize.toString()}
            onChange={(e) => {
              const val = e.target.value;
              setPageSize(val === 'all' ? 'all' : parseInt(val));
              setPage(1);
            }}
            disabled={isAllActive}
            className="px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
            <option value="all">All</option>
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
                  <tr key={user.id} data-wallet={user.wallet_address} className="hover:bg-gray-50 dark:hover:bg-white/5">
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
                          onClick={() => openEditModal(user)}
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
              Showing {(page - 1) * effectivePageSize + 1} to {Math.min(page * effectivePageSize, total)} of {total} users
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
            <div key={user.id} data-wallet={user.wallet_address} className="bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl p-4 space-y-3">
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
                  onClick={() => openEditModal(user)}
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
              Showing {(page - 1) * effectivePageSize + 1} to {Math.min(page * effectivePageSize, total)} of {total} users
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

      {/* Airdrop Task Management */}
      <div className="bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl overflow-hidden">
        <button
          onClick={() => {
            setShowTasks(prev => {
              if (!prev && tasks.length === 0) loadTasks();
              return !prev;
            });
          }}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ListTodo size={24} className="text-primary" />
            <div className="text-left">
              <h2 className="text-lg font-black text-gray-950 dark:text-white">Airdrop Task Management</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create, edit, and toggle airdrop tasks synced with the database
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tasks.length > 0 && (
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                {tasks.filter(t => t.is_active).length} active / {tasks.length} total
              </span>
            )}
            <ChevronRight
              size={20}
              className={`text-gray-400 transition-transform ${showTasks ? 'rotate-90' : ''}`}
            />
          </div>
        </button>

        {showTasks && (
          <div className="border-t-2 border-gray-200 dark:border-white/10">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-white/5">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {tasks.length} tasks in database
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadTasks}
                  disabled={loadingTasks}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={13} className={loadingTasks ? 'animate-spin' : ''} />
                  Refresh
                </button>
                <button
                  onClick={openCreateTask}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-black rounded-lg text-xs font-bold hover:bg-[#00dd77] transition-colors"
                >
                  <Plus size={13} />
                  New Task
                </button>
              </div>
            </div>

            {loadingTasks ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin" size={32} />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                <ListTodo size={32} className="mx-auto mb-3 opacity-40" />
                <p className="font-bold">No tasks in database</p>
                <p className="text-xs mt-1">Click "New Task" to create the first one</p>
              </div>
            ) : (
              <div className="divide-y-2 divide-gray-200 dark:divide-white/10">
                {tasks.map(task => (
                  <div key={task.id} className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${!task.is_active ? 'opacity-50' : ''}`}>
                    {/* Status toggle */}
                    <button
                      onClick={() => handleToggleTask(task)}
                      disabled={taskProcessing}
                      title={task.is_active ? 'Deactivate' : 'Activate'}
                      className="shrink-0 text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {task.is_active
                        ? <ToggleRight size={24} className="text-primary" />
                        : <ToggleLeft size={24} />}
                    </button>

                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-950 dark:text-white text-sm truncate">{task.title}</p>
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase ${
                          task.category === 'social' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                          task.category === 'engagement' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
                          task.category === 'growth' ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400' :
                          'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        }`}>{task.category}</span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase ${
                          task.difficulty === 'easy' ? 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400' :
                          task.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                          task.difficulty === 'hard' ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400' :
                          'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                        }`}>{task.difficulty}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{task.description}</p>
                    </div>

                    {/* Reward */}
                    <div className="shrink-0 text-right hidden sm:block">
                      <p className="font-black text-primary text-sm">{task.reward} RZC</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{task.total_completions || 0} completions</p>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-1">
                      <button
                        onClick={() => openEditTask(task)}
                        disabled={taskProcessing}
                        className="p-1.5 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                        title="Edit task"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task)}
                        disabled={taskProcessing}
                        className="p-1.5 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        title="Deactivate task"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* Launchpad Project Management */}
      <div className="bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl overflow-hidden">
        <button
          onClick={() => {
            setShowProjects(prev => {
              if (!prev && projects.length === 0) loadProjects();
              return !prev;
            });
          }}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Zap size={24} className="text-emerald-600" />
            <div className="text-left">
              <h2 className="text-lg font-black text-gray-950 dark:text-white">Launchpad Management</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create, edit, and manage presale projects
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {projects.length > 0 && (
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">
                {projects.filter(p => p.status === 'live').length} live / {projects.length} total
              </span>
            )}
            <ChevronRight
              size={20}
              className={`text-gray-400 transition-transform ${showProjects ? 'rotate-90' : ''}`}
            />
          </div>
        </button>

        {showProjects && (
          <div className="border-t-2 border-gray-200 dark:border-white/10">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-white/5">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {projects.length} projects
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadProjects}
                  disabled={loadingProjects}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={13} className={loadingProjects ? 'animate-spin' : ''} />
                  Refresh
                </button>
                <button
                  onClick={handleCreateProject}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                >
                  <Plus size={13} />
                  New Project
                </button>
              </div>
            </div>

            {/* Projects List */}
            <div className="p-4 space-y-3">
              {loadingProjects ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="animate-spin" size={24} />
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No projects yet. Click "New Project" to create one.
                </div>
              ) : (
                projects.map(project => (
                  <div
                    key={project.id}
                    className="p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Project Info */}
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                          {project.logo_url?.startsWith('http') ? (
                            <img src={project.logo_url} alt={project.name} className="w-full h-full object-cover" />
                          ) : (
                            project.logo_url || '🚀'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-black text-gray-950 dark:text-white">
                              {project.name}
                            </h3>
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-xs font-bold rounded">
                              {project.symbol}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                              project.status === 'live' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
                              project.status === 'upcoming' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                              project.status === 'success' ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400' :
                              'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300'
                            }`}>
                              {project.status.toUpperCase()}
                            </span>
                            {project.featured && (
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold rounded">
                                ⭐ Featured
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {project.tagline}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Hard Cap:</span>
                              <span className="ml-1 font-bold text-gray-950 dark:text-white">
                                ${project.hard_cap.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Raised:</span>
                              <span className="ml-1 font-bold text-gray-950 dark:text-white">
                                ${project.raised_amount.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Rate:</span>
                              <span className="ml-1 font-bold text-gray-950 dark:text-white">
                                {project.presale_rate} {project.symbol}/USDC
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Participants:</span>
                              <span className="ml-1 font-bold text-gray-950 dark:text-white">
                                {project.participant_count}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleEditProject(project)}
                          disabled={projectProcessing}
                          className="p-2 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleProjectStatus(project)}
                          disabled={projectProcessing}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                            project.status === 'live'
                              ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/20'
                              : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20'
                          }`}
                          title={project.status === 'live' ? 'Disable' : 'Enable'}
                        >
                          {project.status === 'live' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project)}
                          disabled={projectProcessing}
                          className="p-2 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Create / Edit Modal */}
      {showTaskModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => !taskProcessing && setShowTaskModal(false)}
          />
          <div className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b-2 border-gray-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-950 dark:text-white">
                  {editingTask ? 'Edit Task' : 'New Airdrop Task'}
                </h2>
                {editingTask && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">ID #{editingTask.id} · {editingTask.total_completions || 0} completions</p>
                )}
              </div>
              <button
                onClick={() => !taskProcessing && setShowTaskModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                disabled={taskProcessing}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div className="sm:col-span-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                    placeholder="e.g. Follow @RhizaCore on X"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Description</label>
                  <input
                    type="text"
                    value={taskForm.description}
                    onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                    placeholder="Short description shown to users"
                  />
                </div>

                {/* Action */}
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">
                    Action Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taskForm.action}
                    onChange={e => setTaskForm(f => ({ ...f, action: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm font-mono"
                    placeholder="e.g. follow_twitter"
                  />
                </div>

                {/* Reward */}
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Reward (RZC)</label>
                  <input
                    type="number"
                    min="1"
                    value={taskForm.reward}
                    onChange={e => setTaskForm(f => ({ ...f, reward: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Category</label>
                  <select
                    value={taskForm.category}
                    onChange={e => setTaskForm(f => ({ ...f, category: e.target.value as any }))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                  >
                    <option value="social">Social</option>
                    <option value="engagement">Engagement</option>
                    <option value="growth">Growth</option>
                    <option value="content">Content</option>
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Difficulty</label>
                  <select
                    value={taskForm.difficulty}
                    onChange={e => setTaskForm(f => ({ ...f, difficulty: e.target.value as any }))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                {/* Verification Type */}
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Verification</label>
                  <select
                    value={taskForm.verification_type}
                    onChange={e => setTaskForm(f => ({ ...f, verification_type: e.target.value as any }))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                  >
                    <option value="automatic">Automatic</option>
                    <option value="manual">Manual</option>
                    <option value="social_api">Social API</option>
                  </select>
                </div>

                {/* Time Limit */}
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Time Limit</label>
                  <input
                    type="text"
                    value={taskForm.time_limit || ''}
                    onChange={e => setTaskForm(f => ({ ...f, time_limit: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                    placeholder="e.g. 24h, 7 days (leave blank for none)"
                  />
                </div>

                {/* Sort Order */}
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Sort Order</label>
                  <input
                    type="number"
                    min="0"
                    value={taskForm.sort_order ?? 0}
                    onChange={e => setTaskForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                {/* Instructions */}
                <div className="sm:col-span-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Instructions</label>
                  <textarea
                    value={taskForm.instructions || ''}
                    onChange={e => setTaskForm(f => ({ ...f, instructions: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm resize-none"
                    placeholder="Step-by-step instructions shown to users"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t-2 border-gray-200 dark:border-white/10 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => !taskProcessing && setShowTaskModal(false)}
                disabled={taskProcessing}
                className="flex-1 py-3 bg-gray-200 dark:bg-white/10 text-gray-950 dark:text-white rounded-xl text-sm font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTask}
                disabled={taskProcessing || !taskForm.title.trim() || !taskForm.action.trim()}
                className="flex-1 py-3 bg-primary text-black rounded-xl text-sm font-bold hover:bg-[#00dd77] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {taskProcessing ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {editingTask ? 'Save Changes' : 'Create Task'}
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Project Create / Edit Modal */}
      {showProjectModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => !projectProcessing && setShowProjectModal(false)}
          />
          <div className="fixed inset-4 sm:inset-8 lg:inset-16 bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b-2 border-gray-200 dark:border-white/10 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-black text-gray-950 dark:text-white">
                  {editingProject ? 'Edit Project' : 'New Launchpad Project'}
                </h2>
                {editingProject && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {editingProject.symbol} · {editingProject.participant_count} participants
                  </p>
                )}
              </div>
              <button
                onClick={() => !projectProcessing && setShowProjectModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                disabled={projectProcessing}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="p-4 sm:p-5 space-y-6 overflow-y-auto flex-1">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-black text-gray-950 dark:text-white mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={projectForm.name}
                      onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                      placeholder="e.g. RhizaCore Token"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">
                      Symbol <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={projectForm.symbol}
                      onChange={e => setProjectForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                      placeholder="e.g. RZC"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Tagline</label>
                    <input
                      type="text"
                      value={projectForm.tagline}
                      onChange={e => setProjectForm(f => ({ ...f, tagline: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                      placeholder="Short catchy description"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Description</label>
                    <textarea
                      value={projectForm.description}
                      onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm resize-none"
                      placeholder="Full project description"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Logo URL</label>
                    <input
                      type="text"
                      value={projectForm.logo_url}
                      onChange={e => setProjectForm(f => ({ ...f, logo_url: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                      placeholder="https://... or emoji"
                    />
                  </div>
                </div>
              </div>

              {/* Financial */}
              <div>
                <h3 className="text-sm font-black text-gray-950 dark:text-white mb-3">Financial Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Total Supply</label>
                    <input
                      type="number"
                      value={projectForm.total_supply}
                      onChange={e => setProjectForm(f => ({ ...f, total_supply: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Presale Allocation</label>
                    <input
                      type="number"
                      value={projectForm.presale_allocation}
                      onChange={e => setProjectForm(f => ({ ...f, presale_allocation: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Presale Rate (tokens/USDC)</label>
                    <input
                      type="number"
                      value={projectForm.presale_rate}
                      onChange={e => setProjectForm(f => ({ ...f, presale_rate: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Soft Cap (USDC)</label>
                    <input
                      type="number"
                      value={projectForm.soft_cap}
                      onChange={e => setProjectForm(f => ({ ...f, soft_cap: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Hard Cap (USDC)</label>
                    <input
                      type="number"
                      value={projectForm.hard_cap}
                      onChange={e => setProjectForm(f => ({ ...f, hard_cap: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Min Purchase (USDC)</label>
                    <input
                      type="number"
                      value={projectForm.min_purchase}
                      onChange={e => setProjectForm(f => ({ ...f, min_purchase: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Max Purchase (USDC)</label>
                    <input
                      type="number"
                      value={projectForm.max_purchase}
                      onChange={e => setProjectForm(f => ({ ...f, max_purchase: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Timing */}
              <div>
                <h3 className="text-sm font-black text-gray-950 dark:text-white mb-3">Schedule</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Presale Start</label>
                    <input
                      type="datetime-local"
                      value={projectForm.presale_start}
                      onChange={e => setProjectForm(f => ({ ...f, presale_start: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Presale End</label>
                    <input
                      type="datetime-local"
                      value={projectForm.presale_end}
                      onChange={e => setProjectForm(f => ({ ...f, presale_end: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Status</label>
                    <select
                      value={projectForm.status}
                      onChange={e => setProjectForm(f => ({ ...f, status: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary text-sm"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="live">Live</option>
                      <option value="ended">Ended</option>
                      <option value="success">Success</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Verification Badges */}
              <div>
                <h3 className="text-sm font-black text-gray-950 dark:text-white mb-3">Verification</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={projectForm.kyc_verified}
                      onChange={e => setProjectForm(f => ({ ...f, kyc_verified: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <span className="text-xs font-bold text-gray-950 dark:text-white">KYC</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={projectForm.audit_verified}
                      onChange={e => setProjectForm(f => ({ ...f, audit_verified: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <span className="text-xs font-bold text-gray-950 dark:text-white">Audit</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={projectForm.safu_verified}
                      onChange={e => setProjectForm(f => ({ ...f, safu_verified: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <span className="text-xs font-bold text-gray-950 dark:text-white">SAFU</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={projectForm.doxxed}
                      onChange={e => setProjectForm(f => ({ ...f, doxxed: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <span className="text-xs font-bold text-gray-950 dark:text-white">Doxxed</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={projectForm.featured}
                      onChange={e => setProjectForm(f => ({ ...f, featured: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <span className="text-xs font-bold text-gray-950 dark:text-white">⭐ Featured</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={projectForm.trending}
                      onChange={e => setProjectForm(f => ({ ...f, trending: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <span className="text-xs font-bold text-gray-950 dark:text-white">🔥 Trending</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t-2 border-gray-200 dark:border-white/10 flex flex-col sm:flex-row gap-3 shrink-0">
              <button
                onClick={() => !projectProcessing && setShowProjectModal(false)}
                disabled={projectProcessing}
                className="flex-1 py-3 bg-gray-200 dark:bg-white/10 text-gray-950 dark:text-white rounded-xl text-sm font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProject}
                disabled={projectProcessing || !projectForm.name || !projectForm.symbol}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {projectProcessing ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {editingProject ? 'Save Changes' : 'Create Project'}
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
