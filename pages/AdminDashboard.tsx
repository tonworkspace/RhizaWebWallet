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
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  FileText,
  Star
} from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { migrationService, MigrationRequest, StkMigrationRequest } from '../services/migrationService';
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
  referrer_code?: string | null;
  created_at: string;
  updated_at: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, logout, address } = useWallet();
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
  
  // Migration requests state
  const [migrations, setMigrations] = useState<MigrationRequest[]>([]);
  const [migrationStats, setMigrationStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalRzcMigrated: 0
  });
  
  // STK Migration requests state
  const [stkMigrations, setStkMigrations] = useState<StkMigrationRequest[]>([]);
  const [stkMigrationStats, setStkMigrationStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalRzcMigrated: 0
  });
  
  const [activeTab, setActiveTab] = useState<'users' | 'migrations' | 'stk-migrations'>('users');
  const [selectedMigration, setSelectedMigration] = useState<MigrationRequest | null>(null);
  const [selectedStkMigration, setSelectedStkMigration] = useState<StkMigrationRequest | null>(null);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [showStkMigrationModal, setShowStkMigrationModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

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
      
      // Load migration requests
      const migrationsResult = await migrationService.getAllMigrationRequests();
      if (migrationsResult.success && migrationsResult.data) {
        setMigrations(migrationsResult.data);
      }
      
      // Load migration stats
      const migrationStatsResult = await migrationService.getMigrationStats();
      if (migrationStatsResult.success && migrationStatsResult.data) {
        setMigrationStats(migrationStatsResult.data);
      }
      
      // Load STK migration requests
      const stkMigrationsResult = await migrationService.getAllStkMigrationRequests();
      if (stkMigrationsResult.success && stkMigrationsResult.data) {
        setStkMigrations(stkMigrationsResult.data);
        
        // Calculate STK migration stats
        const stkData = stkMigrationsResult.data;
        setStkMigrationStats({
          total: stkData.length,
          pending: stkData.filter(m => m.status === 'pending').length,
          approved: stkData.filter(m => m.status === 'approved').length,
          rejected: stkData.filter(m => m.status === 'rejected').length,
          totalRzcMigrated: stkData
            .filter(m => m.status === 'approved')
            .reduce((sum, m) => sum + m.rzc_equivalent, 0)
        });
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

  const handleApproveMigration = async (migration: MigrationRequest) => {
    if (!address) return;
    
    try {
      const result = await migrationService.approveMigration(
        migration.id,
        address,
        adminNotes || 'Approved by admin'
      );
      
      if (result.success) {
        showToast(
          result.message || `Migration approved! ${migration.total_balance} RZC credited to user's wallet.`,
          'success'
        );
        setShowMigrationModal(false);
        setSelectedMigration(null);
        setAdminNotes('');
        loadData(); // Refresh data
      } else {
        throw new Error(result.error || 'Failed to approve migration');
      }
    } catch (error: any) {
      console.error('Failed to approve migration:', error);
      showToast(error.message || 'Failed to approve migration', 'error');
    }
  };

  const handleRejectMigration = async (migration: MigrationRequest) => {
    if (!address || !adminNotes.trim()) {
      showToast('Please provide a reason for rejection', 'error');
      return;
    }
    
    try {
      const result = await migrationService.rejectMigration(
        migration.id,
        address,
        adminNotes
      );
      
      if (result.success) {
        showToast('Migration rejected', 'success');
        setShowMigrationModal(false);
        setSelectedMigration(null);
        setAdminNotes('');
        loadData(); // Refresh data
      } else {
        throw new Error(result.error || 'Failed to reject migration');
      }
    } catch (error: any) {
      console.error('Failed to reject migration:', error);
      showToast(error.message || 'Failed to reject migration', 'error');
    }
  };

  const openMigrationModal = (migration: MigrationRequest) => {
    setSelectedMigration(migration);
    setAdminNotes('');
    setShowMigrationModal(true);
  };

  const openStkMigrationModal = (migration: StkMigrationRequest) => {
    setSelectedStkMigration(migration);
    setAdminNotes('');
    setShowStkMigrationModal(true);
  };

  const handleApproveStkMigration = async (migration: StkMigrationRequest) => {
    if (!address) return;
    
    try {
      const result = await migrationService.approveStkMigration(
        migration.id,
        address,
        adminNotes || 'Approved by admin'
      );
      
      if (result.success) {
        showToast(
          result.message || `STK migration approved! ${migration.rzc_equivalent} RZC credited to user's wallet.`,
          'success'
        );
        setShowStkMigrationModal(false);
        setSelectedStkMigration(null);
        setAdminNotes('');
        loadData(); // Refresh data
      } else {
        throw new Error(result.error || 'Failed to approve STK migration');
      }
    } catch (error: any) {
      console.error('Failed to approve STK migration:', error);
      showToast(error.message || 'Failed to approve STK migration', 'error');
    }
  };

  const handleRejectStkMigration = async (migration: StkMigrationRequest) => {
    if (!address || !adminNotes.trim()) {
      showToast('Please provide a reason for rejection', 'error');
      return;
    }
    
    try {
      const result = await migrationService.rejectStkMigration(
        migration.id,
        address,
        adminNotes
      );
      
      if (result.success) {
        showToast('STK migration rejected', 'success');
        setShowStkMigrationModal(false);
        setSelectedStkMigration(null);
        setAdminNotes('');
        loadData(); // Refresh data
      } else {
        throw new Error(result.error || 'Failed to reject STK migration');
      }
    } catch (error: any) {
      console.error('Failed to reject STK migration:', error);
      showToast(error.message || 'Failed to reject STK migration', 'error');
    }
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
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/wallet/dashboard')}
              className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors flex-shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black">Admin Dashboard</h1>
              <p className="text-slate-600 dark:text-gray-500 text-xs sm:text-sm">Manage users and migrations</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => navigate('/admin/panel')}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap"
            >
              <Shield size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">User Management</span>
              <span className="sm:hidden">Users</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 sm:p-3 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 rounded-xl transition-colors flex-shrink-0"
            >
              <RefreshCw size={18} className={`sm:w-5 sm:h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={logout}
              className="px-3 sm:px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b-2 border-slate-200 dark:border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3 font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === 'users'
                ? 'text-primary border-b-2 border-primary -mb-0.5'
                : 'text-slate-600 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>Users</span>
              <span className="px-2 py-0.5 bg-slate-200 dark:bg-white/10 rounded-full text-xs">
                {users.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('migrations')}
            className={`px-4 py-3 font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === 'migrations'
                ? 'text-primary border-b-2 border-primary -mb-0.5'
                : 'text-slate-600 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <ArrowRight size={16} />
              <span>RZC Migrations</span>
              {migrationStats.pending > 0 && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full text-xs font-black">
                  {migrationStats.pending}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('stk-migrations')}
            className={`px-4 py-3 font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === 'stk-migrations'
                ? 'text-primary border-b-2 border-primary -mb-0.5'
                : 'text-slate-600 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Star size={16} />
              <span>STK Migrations</span>
              {stkMigrationStats.pending > 0 && (
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full text-xs font-black">
                  {stkMigrationStats.pending}
                </span>
              )}
            </div>
          </button>
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
        {activeTab === 'users' && (
        <div className="bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6">
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
              <Users className="mx-auto text-slate-400 dark:text-gray-600 mb-4" size={48} />
              <p className="text-slate-600 dark:text-gray-500">No users found</p>
            </div>
          )}
        </div>
        )}

        {/* Migration Management */}
        {activeTab === 'migrations' && (
          <div className="space-y-4">
            {/* Migration Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {migrationStats.total}
                </div>
                <div className="text-xs text-slate-600 dark:text-gray-500 mt-1">Total Requests</div>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-500/10 border-2 border-yellow-200 dark:border-yellow-500/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-yellow-700 dark:text-yellow-400">
                  {migrationStats.pending}
                </div>
                <div className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">Pending</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-500/10 border-2 border-green-200 dark:border-green-500/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-green-700 dark:text-green-400">
                  {migrationStats.approved}
                </div>
                <div className="text-xs text-green-600 dark:text-green-500 mt-1">Approved</div>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-red-700 dark:text-red-400">
                  {migrationStats.rejected}
                </div>
                <div className="text-xs text-red-600 dark:text-red-500 mt-1">Rejected</div>
              </div>
            </div>

            {/* Total RZC Migrated */}
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-500/10 dark:to-cyan-500/10 border-2 border-emerald-200 dark:border-emerald-500/20 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                    Total RZC Migrated
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-900 dark:text-emerald-300">
                    {migrationStats.totalRzcMigrated.toLocaleString()} RZC
                  </div>
                </div>
                <TrendingUp size={32} className="text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>

            {/* Migrations List */}
            <div className="bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-black mb-4">Migration Requests</h3>
              
              {migrations.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto text-slate-400 dark:text-gray-600 mb-4" size={48} />
                  <p className="text-slate-600 dark:text-gray-500">No migration requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {migrations.map((migration) => (
                    <div
                      key={migration.id}
                      className="p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl hover:border-primary/50 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded-lg text-xs font-black ${
                              migration.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                : migration.status === 'approved'
                                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                : 'bg-red-500/20 text-red-600 dark:text-red-400'
                            }`}>
                              {migration.status.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-gray-500">
                              {new Date(migration.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              Wallet: {migration.wallet_address.slice(0, 12)}...{migration.wallet_address.slice(-8)}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-gray-400">
                              Telegram: {migration.telegram_username} • Mobile: {migration.mobile_number}
                            </div>
                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              Total: {migration.total_balance.toLocaleString()} RZC
                              <span className="text-xs text-slate-500 dark:text-gray-500 ml-2">
                                (Available: {migration.available_balance} • Claimable: {migration.claimable_balance})
                              </span>
                            </div>
                          </div>
                        </div>
                        {migration.status === 'pending' && (
                          <button
                            onClick={() => openMigrationModal(migration)}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-black rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                          >
                            Review
                          </button>
                        )}
                        {migration.status !== 'pending' && migration.admin_notes && (
                          <div className="text-xs text-slate-600 dark:text-gray-400 italic">
                            Note: {migration.admin_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STK Migration Management */}
        {activeTab === 'stk-migrations' && (
          <div className="space-y-4">
            {/* STK Migration Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {stkMigrationStats.total}
                </div>
                <div className="text-xs text-slate-600 dark:text-gray-500 mt-1">Total Requests</div>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-500/10 border-2 border-purple-200 dark:border-purple-500/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-purple-700 dark:text-purple-400">
                  {stkMigrationStats.pending}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-500 mt-1">Pending</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-500/10 border-2 border-green-200 dark:border-green-500/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-green-700 dark:text-green-400">
                  {stkMigrationStats.approved}
                </div>
                <div className="text-xs text-green-600 dark:text-green-500 mt-1">Approved</div>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-red-700 dark:text-red-400">
                  {stkMigrationStats.rejected}
                </div>
                <div className="text-xs text-red-600 dark:text-red-500 mt-1">Rejected</div>
              </div>
            </div>

            {/* Total RZC from STK */}
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 border-2 border-purple-200 dark:border-purple-500/20 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-1">
                    Total RZC from STK Migration
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-purple-900 dark:text-purple-300">
                    {stkMigrationStats.totalRzcMigrated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RZC
                  </div>
                </div>
                <Star size={32} className="text-purple-600 dark:text-purple-400" />
              </div>
            </div>

            {/* STK Migrations List */}
            <div className="bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-black mb-4">STK Migration Requests</h3>
              
              {stkMigrations.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="mx-auto text-slate-400 dark:text-gray-600 mb-4" size={48} />
                  <p className="text-slate-600 dark:text-gray-500">No STK migration requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stkMigrations.map((migration) => (
                    <div
                      key={migration.id}
                      className="p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl hover:border-purple-500/50 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded-lg text-xs font-black ${
                              migration.status === 'pending'
                                ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                                : migration.status === 'approved'
                                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                : 'bg-red-500/20 text-red-600 dark:text-red-400'
                            }`}>
                              {migration.status.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-gray-500">
                              {new Date(migration.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              Wallet: {migration.wallet_address.slice(0, 12)}...{migration.wallet_address.slice(-8)}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-gray-400">
                              Telegram: {migration.telegram_username} • Mobile: {migration.mobile_number}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-gray-400 font-mono">
                              STK Wallet: {migration.stk_wallet_address.slice(0, 8)}...{migration.stk_wallet_address.slice(-6)}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-gray-400">
                              NFT: {migration.nft_token_id}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <div className="px-2 py-1 bg-purple-100 dark:bg-purple-500/20 rounded text-xs font-bold text-purple-700 dark:text-purple-400">
                                {migration.stk_amount.toLocaleString()} STK
                              </div>
                              <div className="px-2 py-1 bg-blue-100 dark:bg-blue-500/20 rounded text-xs font-bold text-blue-700 dark:text-blue-400">
                                {migration.ton_staked.toLocaleString()} TON Staked
                              </div>
                              <div className="px-2 py-1 bg-pink-100 dark:bg-pink-500/20 rounded text-xs font-bold text-pink-700 dark:text-pink-400">
                                {migration.starfi_points.toLocaleString()} StarFi Points
                              </div>
                              <div className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 rounded text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                {migration.rzc_equivalent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RZC
                              </div>
                            </div>
                          </div>
                        </div>
                        {migration.status === 'pending' && (
                          <button
                            onClick={() => openStkMigrationModal(migration)}
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                          >
                            Review
                          </button>
                        )}
                        {migration.status !== 'pending' && migration.admin_notes && (
                          <div className="text-xs text-slate-600 dark:text-gray-400 italic">
                            Note: {migration.admin_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Migration Review Modal */}
        {showMigrationModal && selectedMigration && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0a0a0a] border-2 border-slate-300 dark:border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Review Migration Request</h2>
                  <button
                    onClick={() => setShowMigrationModal(false)}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <XCircle size={24} className="text-slate-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Migration Details */}
                <div className="space-y-4">
                  <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                    <div className="text-xs font-black text-slate-600 dark:text-gray-500 uppercase tracking-wider mb-2">
                      Wallet Address
                    </div>
                    <code className="text-sm font-mono text-slate-900 dark:text-white break-all">
                      {selectedMigration.wallet_address}
                    </code>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                      <div className="text-xs font-black text-slate-600 dark:text-gray-500 uppercase tracking-wider mb-2">
                        Telegram
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedMigration.telegram_username}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                      <div className="text-xs font-black text-slate-600 dark:text-gray-500 uppercase tracking-wider mb-2">
                        Mobile Number
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedMigration.mobile_number}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
                      <div className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2">
                        Available
                      </div>
                      <div className="text-xl font-black text-blue-900 dark:text-blue-300">
                        {selectedMigration.available_balance.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-200 dark:border-purple-500/20">
                      <div className="text-xs font-black text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-2">
                        Claimable
                      </div>
                      <div className="text-xl font-black text-purple-900 dark:text-purple-300">
                        {selectedMigration.claimable_balance.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                      <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">
                        Total
                      </div>
                      <div className="text-xl font-black text-emerald-900 dark:text-emerald-300">
                        {selectedMigration.total_balance.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                    <div className="text-xs font-black text-slate-600 dark:text-gray-500 uppercase tracking-wider mb-2">
                      Submitted
                    </div>
                    <div className="text-sm text-slate-900 dark:text-white">
                      {new Date(selectedMigration.created_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Admin Notes */}
                  <div>
                    <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                      Admin Notes {selectedMigration.status === 'pending' && '(Required for rejection)'}
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this migration request..."
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border-2 border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Actions */}
                {selectedMigration.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleRejectMigration(selectedMigration)}
                      className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl font-bold transition-all"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveMigration(selectedMigration)}
                      className="flex-1 py-3 bg-primary hover:bg-primary/90 text-black rounded-xl font-bold transition-all"
                    >
                      Approve & Credit RZC
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STK Migration Review Modal */}
        {showStkMigrationModal && selectedStkMigration && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0a0a0a] border-2 border-slate-300 dark:border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Review STK Migration Request</h2>
                  <button
                    onClick={() => setShowStkMigrationModal(false)}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <XCircle size={24} className="text-slate-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Migration Details */}
                <div className="space-y-4">
                  <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                    <div className="text-xs font-black text-slate-600 dark:text-gray-500 uppercase tracking-wider mb-2">
                      Mainnet Wallet Address
                    </div>
                    <code className="text-sm font-mono text-slate-900 dark:text-white break-all">
                      {selectedStkMigration.wallet_address}
                    </code>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                      <div className="text-xs font-black text-slate-600 dark:text-gray-500 uppercase tracking-wider mb-2">
                        Telegram
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedStkMigration.telegram_username}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                      <div className="text-xs font-black text-slate-600 dark:text-gray-500 uppercase tracking-wider mb-2">
                        Mobile Number
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedStkMigration.mobile_number}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                    <div className="text-xs font-black text-slate-600 dark:text-gray-500 uppercase tracking-wider mb-2">
                      STK Wallet Address
                    </div>
                    <code className="text-sm font-mono text-slate-900 dark:text-white break-all">
                      {selectedStkMigration.stk_wallet_address}
                    </code>
                  </div>

                  <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                    <div className="text-xs font-black text-slate-600 dark:text-gray-500 uppercase tracking-wider mb-2">
                      NFT Token ID
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedStkMigration.nft_token_id}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-200 dark:border-purple-500/20">
                      <div className="text-xs font-black text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-2">
                        STK Amount
                      </div>
                      <div className="text-xl font-black text-purple-900 dark:text-purple-300">
                        {selectedStkMigration.stk_amount.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
                      <div className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2">
                        TON Staked
                      </div>
                      <div className="text-xl font-black text-blue-900 dark:text-blue-300">
                        {selectedStkMigration.ton_staked.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-4 bg-pink-50 dark:bg-pink-500/10 rounded-xl border border-pink-200 dark:border-pink-500/20">
                      <div className="text-xs font-black text-pink-700 dark:text-pink-400 uppercase tracking-wider mb-2">
                        StarFi Points
                      </div>
                      <div className="text-xl font-black text-pink-900 dark:text-pink-300">
                        {selectedStkMigration.starfi_points.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                    <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">
                      RZC Equivalent
                    </div>
                    <div className="text-2xl font-black text-emerald-900 dark:text-emerald-300">
                      {selectedStkMigration.rzc_equivalent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RZC
                    </div>
                  </div>

                  <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                    <div className="text-xs font-black text-slate-600 dark:text-gray-500 uppercase tracking-wider mb-2">
                      Submitted
                    </div>
                    <div className="text-sm text-slate-900 dark:text-white">
                      {new Date(selectedStkMigration.created_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Admin Notes */}
                  <div>
                    <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                      Admin Notes {selectedStkMigration.status === 'pending' && '(Required for rejection)'}
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this STK migration request..."
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border-2 border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Actions */}
                {selectedStkMigration.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleRejectStkMigration(selectedStkMigration)}
                      className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl font-bold transition-all"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveStkMigration(selectedStkMigration)}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-bold transition-all"
                    >
                      Approve & Credit RZC
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
