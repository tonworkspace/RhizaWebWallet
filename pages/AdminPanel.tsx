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
  RefreshCw
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { adminService, AdminUser } from '../services/adminService';
import { supabaseService } from '../services/supabaseService';
import { getPriceOverrides, setPriceOverrides, clearPriceOverrides, PriceOverrides } from '../utils/priceConfig';

const AdminPanel: React.FC = () => {
  const { address } = useWallet();
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

  const handleFetchLiveRates = async () => {
    setFetchingRates(true);
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price' +
        '?ids=the-open-network,bitcoin,ethereum&vs_currencies=usd'
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRateForm(prev => ({
        ...prev,
        ton: data['the-open-network']?.usd ?? prev.ton,
        btc: data['bitcoin']?.usd ?? prev.btc,
        eth: data['ethereum']?.usd ?? prev.eth,
      }));
      success('✅ Live prices fetched — review and save to apply');
    } catch (err: any) {
      error(`❌ Failed to fetch live prices: ${err.message}`);
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
    }
  }, [isAdmin, page, search, filter, nodeFilter]);

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
      
      const { data, error } = await client
        .from('mining_nodes')
        .select('wallet_address')
        .in('wallet_address', walletAddresses);

      if (error) {
        console.error('Error loading node counts:', error);
        return;
      }

      // Count nodes per wallet
      const counts: Record<string, number> = {};
      data?.forEach(node => {
        counts[node.wallet_address] = (counts[node.wallet_address] || 0) + 1;
      });

      setUserNodes(counts);
    } catch (err) {
      console.error('Error loading node counts:', err);
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

  const handleSaveRates = () => {
    setPriceOverrides({
      ...rateForm,
      updatedAt: new Date().toISOString(),
      updatedBy: address || 'admin',
    });
    setRateSaved(true);
    setTimeout(() => setRateSaved(false), 2500);
    success('✅ Fallback coin rates saved');
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
              <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">With Nodes</p>
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
            <option value="all">All Nodes</option>
            <option value="has_nodes">Has Mining Nodes</option>
            <option value="no_nodes">No Mining Nodes</option>
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
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Mining Nodes</th>
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
                            {userNodes[user.wallet_address]} Node{userNodes[user.wallet_address] > 1 ? 's' : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-500">No nodes</span>
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
                  <p className="text-xs text-gray-600 dark:text-gray-400">Mining Nodes</p>
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
            <h2 className="text-lg font-black text-gray-950 dark:text-white">Fallback Coin Rates</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Used when CoinGecko is unreachable. Live prices always take priority.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleFetchLiveRates}
              disabled={fetchingRates}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-500/20 rounded-xl text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-500/20 transition-all disabled:opacity-50"
            >
              {fetchingRates ? (
                <Loader size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              {fetchingRates ? 'Fetching...' : 'Fetch Live Prices'}
            </button>
            {rateForm.updatedAt && (
              <p className="text-[10px] text-gray-400 dark:text-gray-600 text-right">
                Last saved<br />{new Date(rateForm.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* TON */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-lg">💎</span> TON (USD)
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
