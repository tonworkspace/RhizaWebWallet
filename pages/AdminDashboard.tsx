import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  DollarSign, 
  Shield,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  PieChart,
  ArrowLeft
} from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';

interface Stats {
  totalUsers: number;
  totalTransactions: number;
  totalReferrals: number;
  totalEvents: number;
  activeUsers: number;
  newUsersToday: number;
  totalVolume: string;
}

interface User {
  id: string;
  wallet_address: string;
  name: string;
  avatar: string;
  role: string;
  is_active: boolean;
  referrer_code: string | null;
  created_at: string;
  updated_at: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, logout } = useWallet();
  const { showToast } = useToast();
  
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalTransactions: 0,
    totalReferrals: 0,
    totalEvents: 0,
    activeUsers: 0,
    newUsersToday: 0,
    totalVolume: '0'
  });
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'user' | 'admin'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!userProfile) {
      navigate('/login');
      return;
    }
    
    if (userProfile.role !== 'admin') {
      showToast('Access denied. Admin only.', 'error');
      navigate('/wallet/dashboard');
      return;
    }
    
    loadData();
  }, [userProfile]);

  const loadData = async () => {
    setIsLoading(true);
    
    try {
      // Load statistics
      const statsResult = await supabaseService.getStats();
      if (statsResult.success && statsResult.data) {
        // Calculate additional stats
        const usersResult = await supabaseService.getAllUsers(1000);
        if (usersResult.success && usersResult.data) {
          const allUsers = usersResult.data;
          const activeUsers = allUsers.filter(u => u.is_active).length;
          
          // Users created today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const newUsersToday = allUsers.filter(u => 
            new Date(u.created_at) >= today
          ).length;
          
          setStats({
            ...statsResult.data,
            activeUsers,
            newUsersToday,
            totalVolume: '0' // Calculate from transactions
          });
          
          setUsers(allUsers);
          setFilteredUsers(allUsers);
        }
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
      showToast('Failed to load data', 'error');
    }
    
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    showToast('Data refreshed', 'success');
  };

  // Filter users
  useEffect(() => {
    let filtered = [...users];
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.wallet_address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => 
        filterStatus === 'active' ? user.is_active : !user.is_active
      );
    }
    
    setFilteredUsers(filtered);
  }, [searchQuery, filterRole, filterStatus, users]);

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const client = supabaseService.getClient();
    if (!client) return;
    
    try {
      const { error } = await client
        .from('wallet_users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Update local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_active: !currentStatus } : u
      ));
      
      showToast(
        `User ${!currentStatus ? 'activated' : 'deactivated'}`,
        'success'
      );
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      showToast('Failed to update user status', 'error');
    }
  };

  const exportData = () => {
    const csv = [
      ['Name', 'Wallet Address', 'Role', 'Status', 'Created At'].join(','),
      ...filteredUsers.map(u => [
        u.name,
        u.wallet_address,
        u.role,
        u.is_active ? 'Active' : 'Inactive',
        new Date(u.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showToast('Data exported', 'success');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00FF88] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/wallet/dashboard')}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black">Admin Dashboard</h1>
              <p className="text-gray-500 text-sm">Manage users and view statistics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
            >
              <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Users */}
          <div className="p-6 bg-gradient-to-br from-[#00FF88]/10 to-[#00CCFF]/10 border border-[#00FF88]/20 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <Users className="text-[#00FF88]" size={32} />
              <span className="text-xs text-gray-500 uppercase tracking-wider">Total</span>
            </div>
            <div className="text-4xl font-black text-white mb-1">
              {stats.totalUsers.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Total Users</div>
            <div className="mt-2 text-xs text-[#00FF88]">
              +{stats.newUsersToday} today
            </div>
          </div>

          {/* Active Users */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="text-green-500" size={32} />
              <span className="text-xs text-gray-500 uppercase tracking-wider">Active</span>
            </div>
            <div className="text-4xl font-black text-white mb-1">
              {stats.activeUsers.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Active Users</div>
            <div className="mt-2 text-xs text-gray-500">
              {((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% of total
            </div>
          </div>

          {/* Total Transactions */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <Activity className="text-blue-400" size={32} />
              <span className="text-xs text-gray-500 uppercase tracking-wider">Transactions</span>
            </div>
            <div className="text-4xl font-black text-white mb-1">
              {stats.totalTransactions.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Total Transactions</div>
            <div className="mt-2 text-xs text-gray-500">
              Avg: {(stats.totalTransactions / Math.max(stats.totalUsers, 1)).toFixed(1)} per user
            </div>
          </div>

          {/* Total Referrals */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="text-purple-400" size={32} />
              <span className="text-xs text-gray-500 uppercase tracking-wider">Referrals</span>
            </div>
            <div className="text-4xl font-black text-white mb-1">
              {stats.totalReferrals.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Total Referrals</div>
            <div className="mt-2 text-xs text-gray-500">
              {((stats.totalReferrals / Math.max(stats.totalUsers, 1)) * 100).toFixed(1)}% conversion
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-[#00CCFF]" size={24} />
              <div>
                <div className="text-2xl font-black">{stats.totalEvents.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Analytics Events</div>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-3">
              <Clock className="text-yellow-400" size={24} />
              <div>
                <div className="text-2xl font-black">{stats.newUsersToday}</div>
                <div className="text-xs text-gray-500">New Users Today</div>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-3">
              <DollarSign className="text-green-400" size={24} />
              <div>
                <div className="text-2xl font-black">{stats.totalVolume} TON</div>
                <div className="text-xs text-gray-500">Total Volume</div>
              </div>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black">User Management</h2>
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 bg-[#00FF88]/10 hover:bg-[#00FF88]/20 text-[#00FF88] rounded-xl text-sm font-bold transition-colors"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or address..."
                className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#00FF88]/50 transition-all"
              />
            </div>

            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
              className="px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#00FF88]/50 transition-all"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#00FF88]/50 transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="mb-4 text-sm text-gray-500">
            Showing {filteredUsers.length} of {users.length} users
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-xs font-black uppercase tracking-wider text-gray-500">User</th>
                  <th className="text-left py-3 px-4 text-xs font-black uppercase tracking-wider text-gray-500">Wallet Address</th>
                  <th className="text-left py-3 px-4 text-xs font-black uppercase tracking-wider text-gray-500">Role</th>
                  <th className="text-left py-3 px-4 text-xs font-black uppercase tracking-wider text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-black uppercase tracking-wider text-gray-500">Created</th>
                  <th className="text-right py-3 px-4 text-xs font-black uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{user.avatar}</div>
                        <div>
                          <div className="font-bold text-sm">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-mono text-xs text-gray-400">
                        {user.wallet_address.slice(0, 8)}...{user.wallet_address.slice(-6)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        user.role === 'admin' 
                          ? 'bg-purple-500/20 text-purple-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        user.is_active 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/user/${user.id}`)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.is_active
                              ? 'hover:bg-red-500/20 text-red-400'
                              : 'hover:bg-green-500/20 text-green-400'
                          }`}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {user.is_active ? <Ban size={16} /> : <CheckCircle size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto text-gray-600 mb-4" size={48} />
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
