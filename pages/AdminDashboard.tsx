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
  Download,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  ArrowLeft,
  ArrowRight,
  FileText,
  Star,
  Gift,
  ExternalLink,
  Edit,
  Save,
  X,
  Plus,
  Upload
} from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { balanceVerificationService, BalanceVerificationRequest } from '../services/balanceVerificationService';
import { migrationService, MigrationRequest, StkMigrationRequest } from '../services/migrationService';
import { adminAirdropService, ManualSubmission } from '../services/adminAirdropService';
import { AIRDROP_TASKS, getAirdropTaskById, AirdropTaskConfig, getAirdropTaskByIdSync } from '../config/airdropTasks';
import { databaseAirdropService, DatabaseAirdropTask, CreateTaskData, UpdateTaskData } from '../services/databaseAirdropService';
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

interface AirdropTask extends AirdropTaskConfig {
  completions: number;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, logout, address } = useWallet();
  const { showToast } = useToast();
  
  // Add database task list state
  const [databaseTasks, setDatabaseTasks] = useState<DatabaseAirdropTask[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  
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
  
  const [activeTab, setActiveTab] = useState<'users' | 'migrations' | 'stk-migrations' | 'airdrop-tasks' | 'balance-verification'>('users');
  const [selectedMigration, setSelectedMigration] = useState<MigrationRequest | null>(null);
  const [selectedStkMigration, setSelectedStkMigration] = useState<StkMigrationRequest | null>(null);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [showStkMigrationModal, setShowStkMigrationModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  // Balance verification state
  const [verificationRequests, setVerificationRequests] = useState<BalanceVerificationRequest[]>([]);
  const [verificationStats, setVerificationStats] = useState({
    total: 0,
    pending: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    resolved: 0
  });
  const [selectedVerificationRequest, setSelectedVerificationRequest] = useState<BalanceVerificationRequest | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Airdrop management state
  const [pendingSubmissions, setPendingSubmissions] = useState<ManualSubmission[]>([]);
  const [airdropStats, setAirdropStats] = useState({
    totalTasks: 21,
    activeTasks: 18,
    pendingReviews: 0,
    totalRewards: 5250
  });

  // Task editing state
  const [showTaskEditModal, setShowTaskEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<AirdropTask | null>(null);
  const [taskFormData, setTaskFormData] = useState<{
    title: string;
    description: string;
    reward: number;
    action: string;
    category: 'social' | 'engagement' | 'growth' | 'content';
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    is_active: boolean;
    instructions: string;
    timeLimit: string;
  }>({
    title: '',
    description: '',
    reward: 0,
    action: '',
    category: 'social',
    difficulty: 'easy',
    is_active: true,
    instructions: '',
    timeLimit: ''
  });
  const [taskFormErrors, setTaskFormErrors] = useState<Record<string, string>>({});

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
  }, [userProfile, address]);

  // Debug: Log active tab changes
  useEffect(() => {
    console.log('Active tab changed to:', activeTab);
  }, [activeTab]);

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

      // Load airdrop data from database
      const airdropStatsResult = await databaseAirdropService.getAirdropStats();
      if (airdropStatsResult.success && airdropStatsResult.data) {
        setAirdropStats({
          totalTasks: airdropStatsResult.data.totalTasks,
          activeTasks: airdropStatsResult.data.activeTasks,
          pendingReviews: 0, // Will be updated with pending submissions
          totalRewards: airdropStatsResult.data.totalRewards
        });
      }

      // Load all tasks from database
      const allTasksResult = await databaseAirdropService.getAllTasks();
      if (allTasksResult.success && allTasksResult.data) {
        setDatabaseTasks(allTasksResult.data);
        setTasksLoaded(true);
      }

      const pendingSubmissionsResult = await adminAirdropService.getPendingSubmissions();
      if (pendingSubmissionsResult.success && pendingSubmissionsResult.data) {
        setPendingSubmissions(pendingSubmissionsResult.data);
        
        // Update pending reviews count
        setAirdropStats(prev => ({
          ...prev,
          pendingReviews: pendingSubmissionsResult.data?.length || 0
        }));
      }

      // Load balance verification requests
      const adminAddr = address || (userProfile as any)?.wallet_address;
      console.log('🔍 Loading verification requests with admin address:', adminAddr);
      const verificationRequestsResult = await balanceVerificationService.getAllVerificationRequests(adminAddr);
      console.log('📋 Verification requests result:', verificationRequestsResult);
      if (verificationRequestsResult.success && verificationRequestsResult.requests) {
        setVerificationRequests(verificationRequestsResult.requests);
        
        // Calculate verification stats
        const requests = verificationRequestsResult.requests;
        setVerificationStats({
          total: requests.length,
          pending: requests.filter(r => r.status === 'pending').length,
          under_review: requests.filter(r => r.status === 'under_review').length,
          approved: requests.filter(r => r.status === 'approved').length,
          rejected: requests.filter(r => r.status === 'rejected').length,
          resolved: requests.filter(r => r.status === 'resolved').length
        });
      } else {
        console.error('❌ Failed to load verification requests:', verificationRequestsResult.error);
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

  // Balance Verification Handlers
  const openVerificationModal = (request: BalanceVerificationRequest) => {
    setSelectedVerificationRequest(request);
    setAdminNotes('');
    setShowVerificationModal(true);
  };

  const handleApproveVerificationRequest = async (request: BalanceVerificationRequest) => {
    if (!address) return;
    
    try {
      const result = await balanceVerificationService.updateVerificationRequest(
        request.id,
        'approved',
        adminNotes || 'Approved by admin',
        'Balance verified and approved',
        address
      );
      
      if (result.success) {
        const creditedAmount = result.credited_amount || 0;
        const balanceUnlocked = result.balance_unlocked || false;
        const badgeAwarded = result.verification_badge_awarded || false;
        
        let message = 'Verification approved!';
        if (balanceUnlocked) {
          message += ' User balance unlocked and verification badge awarded.';
        }
        if (creditedAmount > 0) {
          message += ` ${creditedAmount.toLocaleString()} RZC credited to user's account.`;
        }
        
        showToast(message, 'success');
        setShowVerificationModal(false);
        setSelectedVerificationRequest(null);
        setAdminNotes('');
        loadData(); // Refresh data
      } else {
        throw new Error(result.error || 'Failed to approve verification request');
      }
    } catch (error: any) {
      console.error('Failed to approve verification request:', error);
      showToast(error.message || 'Failed to approve verification request', 'error');
    }
  };

  const handleRejectVerificationRequest = async (request: BalanceVerificationRequest) => {
    if (!address || !adminNotes.trim()) {
      showToast('Please provide a reason for rejection', 'error');
      return;
    }
    
    try {
      const result = await balanceVerificationService.updateVerificationRequest(
        request.id,
        'rejected',
        adminNotes,
        'Request rejected after review',
        address
      );
      
      if (result.success) {
        showToast('Verification request rejected', 'success');
        setShowVerificationModal(false);
        setSelectedVerificationRequest(null);
        setAdminNotes('');
        loadData(); // Refresh data
      } else {
        throw new Error(result.error || 'Failed to reject verification request');
      }
    } catch (error: any) {
      console.error('Failed to reject verification request:', error);
      showToast(error.message || 'Failed to reject verification request', 'error');
    }
  };

  // Airdrop Task Management Handlers
  const handleManualVerificationAction = async (submissionId: string, action: 'approve' | 'reject') => {
    try {
      if (!address) {
        showToast('Admin address not available', 'error');
        return;
      }

      console.log(`${action === 'approve' ? 'Approving' : 'Rejecting'} submission ${submissionId}`);
      
      let result;
      if (action === 'approve') {
        result = await adminAirdropService.approveSubmission(submissionId, address, 'Approved by admin');
      } else {
        result = await adminAirdropService.rejectSubmission(submissionId, address, 'Rejected by admin');
      }

      if (result.success) {
        showToast(result.message, 'success');
        // Refresh the data
        loadData();
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      console.error(`Failed to ${action} submission:`, error);
      showToast(`Failed to ${action} submission`, 'error');
    }
  };

  const handleTaskEdit = async (taskId: number) => {
    try {
      // Get task from database first
      const taskResult = await databaseAirdropService.getTaskById(taskId);
      
      if (taskResult.success && taskResult.data) {
        const task = taskResult.data;
        setEditingTask({
          ...task,
          completions: task.total_completions || 0
        });
        setTaskFormData({
          title: task.title,
          description: task.description,
          reward: task.reward,
          action: task.action,
          category: task.category,
          difficulty: task.difficulty,
          is_active: task.is_active,
          instructions: task.instructions || '',
          timeLimit: task.time_limit || ''
        });
        setTaskFormErrors({});
        setShowTaskEditModal(true);
      } else {
        // Fallback to hardcoded config
        const taskConfig = getAirdropTaskByIdSync(taskId);
        if (taskConfig) {
          const task: AirdropTask = {
            ...taskConfig,
            completions: AIRDROP_TASKS.find(t => t.id === taskId)?.completions || 0
          };
          
          setEditingTask(task);
          setTaskFormData({
            title: task.title,
            description: task.description,
            reward: task.reward,
            action: task.action,
            category: task.category,
            difficulty: task.difficulty,
            is_active: task.is_active,
            instructions: task.instructions || '',
            timeLimit: task.timeLimit || ''
          });
          setTaskFormErrors({});
          setShowTaskEditModal(true);
        } else {
          showToast('Task not found', 'error');
        }
      }
    } catch (error) {
      console.error('Error loading task for editing:', error);
      showToast('Failed to load task', 'error');
    }
  };

  const handleExportTasks = () => {
    console.log('Exporting airdrop tasks data');
    
    // Create sample CSV data
    const csvData = [
      ['Task ID', 'Title', 'Reward', 'Category', 'Difficulty', 'Status', 'Completions'].join(','),
      ['0', 'Create RhizaCore Wallet', '150', 'engagement', 'easy', 'active', '1247'].join(','),
      ['1', 'Follow @RhizaCore on X', '100', 'social', 'easy', 'active', '892'].join(','),
      ['2', 'Retweet Announcement', '75', 'social', 'easy', 'active', '756'].join(','),
      ['13', 'Create RZC Video Content', '500', 'content', 'hard', 'active', '45'].join(','),
      ['14', 'Write RZC Blog/Article', '750', 'content', 'hard', 'active', '23'].join(','),
      ['19', 'Influencer Collaboration', '1000', 'growth', 'expert', 'active', '8'].join(',')
    ].join('\n');
    
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `airdrop_tasks_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showToast('Airdrop tasks data exported successfully', 'success');
  };

  const handleBulkApprove = () => {
    console.log('Bulk approving pending submissions');
    showToast('Bulk approve functionality coming soon', 'info');
  };

  const handleTaskAnalytics = () => {
    console.log('Opening task analytics');
    showToast('Task analytics dashboard coming soon', 'info');
  };

  const validateTaskForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!taskFormData.title.trim()) {
      errors.title = 'Title is required';
    } else if (taskFormData.title.length < 3) {
      errors.title = 'Title must be at least 3 characters';
    } else if (taskFormData.title.length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }

    if (!taskFormData.description.trim()) {
      errors.description = 'Description is required';
    } else if (taskFormData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    } else if (taskFormData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }

    if (!taskFormData.reward || taskFormData.reward < 1) {
      errors.reward = 'Reward must be at least 1 RZC';
    } else if (taskFormData.reward > 10000) {
      errors.reward = 'Reward cannot exceed 10,000 RZC';
    }

    if (!taskFormData.action.trim()) {
      errors.action = 'Action is required';
    }

    if (taskFormData.instructions && taskFormData.instructions.length > 1000) {
      errors.instructions = 'Instructions must be less than 1000 characters';
    }

    if (taskFormData.timeLimit && taskFormData.timeLimit.length > 50) {
      errors.timeLimit = 'Time limit must be less than 50 characters';
    }

    setTaskFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTaskSave = async () => {
    if (!validateTaskForm()) {
      showToast('Please fix the form errors', 'error');
      return;
    }

    if (!editingTask) {
      showToast('No task selected for editing', 'error');
      return;
    }

    try {
      const updateData: UpdateTaskData = {
        title: taskFormData.title,
        description: taskFormData.description,
        reward: taskFormData.reward,
        action: taskFormData.action,
        category: taskFormData.category,
        difficulty: taskFormData.difficulty,
        is_active: taskFormData.is_active,
        instructions: taskFormData.instructions,
        time_limit: taskFormData.timeLimit,
        verification_type: editingTask.verification_type || 'manual',
        requirements: editingTask.requirements || {}
      };

      const result = await databaseAirdropService.updateTask(editingTask.id, updateData, address);
      
      if (result.success) {
        showToast(result.message, 'success');
        setShowTaskEditModal(false);
        setEditingTask(null);
        
        // Refresh data
        loadData();
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      console.error('Failed to save task:', error);
      showToast('Failed to save task', 'error');
    }
  };

  const handleTaskFormChange = (field: string, value: any) => {
    setTaskFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (taskFormErrors[field]) {
      setTaskFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const closeTaskEditModal = () => {
    setShowTaskEditModal(false);
    setEditingTask(null);
    setTaskFormData({
      title: '',
      description: '',
      reward: 0,
      action: '',
      category: 'social',
      difficulty: 'easy',
      is_active: true,
      instructions: '',
      timeLimit: ''
    });
    setTaskFormErrors({});
  };

  const toggleTaskStatus = async (taskId: number, currentStatus: boolean) => {
    try {
      const result = await databaseAirdropService.toggleTaskStatus(taskId, address);
      
      if (result.success) {
        showToast(result.message, 'success');
        // Refresh data
        loadData();
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      console.error('Failed to toggle task status:', error);
      showToast('Failed to update task status', 'error');
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
          <button
            onClick={() => setActiveTab('airdrop-tasks')}
            className={`px-4 py-3 font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === 'airdrop-tasks'
                ? 'text-primary border-b-2 border-primary -mb-0.5'
                : 'text-slate-600 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Gift size={16} />
              <span>Airdrop Tasks</span>
              {airdropStats.pendingReviews > 0 && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full text-xs font-black">
                  {airdropStats.pendingReviews}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('balance-verification')}
            className={`px-4 py-3 font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === 'balance-verification'
                ? 'text-primary border-b-2 border-primary -mb-0.5'
                : 'text-slate-600 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield size={16} />
              <span>Balance Verification</span>
              {verificationStats.pending > 0 && (
                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full text-xs font-black">
                  {verificationStats.pending}
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

        {/* Airdrop Task Management */}
        {activeTab === 'airdrop-tasks' && (
          <div className="space-y-4">
            {/* Airdrop Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {airdropStats.totalTasks}
                </div>
                <div className="text-xs text-slate-600 dark:text-gray-500 mt-1">Total Tasks</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-500/10 border-2 border-green-200 dark:border-green-500/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-green-700 dark:text-green-400">
                  {airdropStats.activeTasks}
                </div>
                <div className="text-xs text-green-600 dark:text-green-500 mt-1">Active Tasks</div>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-500/10 border-2 border-yellow-200 dark:border-yellow-500/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-yellow-700 dark:text-yellow-400">
                  {airdropStats.pendingReviews}
                </div>
                <div className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">Pending Reviews</div>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-blue-700 dark:text-blue-400">
                  {airdropStats.totalRewards.toLocaleString()}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-500 mt-1">Total RZC Rewards</div>
              </div>
            </div>

            {/* Task Management Section */}
            <div className="bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-black">Task Management</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {/* TODO: Add create task functionality */}}
                    className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Task
                  </button>
                  <button
                    onClick={handleTaskAnalytics}
                    className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-lg text-sm font-bold transition-all"
                  >
                    Analytics
                  </button>
                </div>
              </div>
              
              {/* Task List */}
              <div className="space-y-3">
                {tasksLoaded ? (
                  databaseTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <Gift className="mx-auto text-slate-400 dark:text-gray-600 mb-4" size={48} />
                      <p className="text-slate-600 dark:text-gray-500">No tasks found</p>
                    </div>
                  ) : (
                    databaseTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl hover:border-primary/50 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded-lg text-xs font-black ${
                                task.is_active
                                  ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                  : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                              }`}>
                                {task.is_active ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                              <span className={`px-2 py-1 rounded-lg text-xs font-black ${
                                task.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' :
                                task.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                                task.difficulty === 'hard' ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400' :
                                'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400'
                              }`}>
                                {task.difficulty.toUpperCase()}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-black">
                                {task.category.toUpperCase()}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-bold text-slate-900 dark:text-white">
                                #{task.id} - {task.title}
                              </div>
                              <div className="text-xs text-slate-600 dark:text-gray-400">
                                {task.description}
                              </div>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  +{task.reward} RZC
                                </div>
                                <div className="text-xs text-slate-500 dark:text-gray-500">
                                  {task.total_completions || 0} completions
                                </div>
                                <div className="text-xs text-slate-500 dark:text-gray-500">
                                  {task.verification_type}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTaskEdit(task.id)}
                              className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                            >
                              <Edit size={12} />
                              Edit
                            </button>
                            <button
                              onClick={() => toggleTaskStatus(task.id, task.is_active)}
                              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                task.is_active
                                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-600'
                                  : 'bg-green-500/10 hover:bg-green-500/20 text-green-600'
                              }`}
                            >
                              {task.is_active ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-gray-500">Loading tasks...</p>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-black">Manual Verification Queue</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkApprove}
                    className="px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 rounded-lg text-sm font-bold transition-all"
                  >
                    Bulk Approve
                  </button>
                  <button
                    onClick={handleExportTasks}
                    className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-lg text-sm font-bold transition-all"
                  >
                    Export
                  </button>
                </div>
              </div>
              
              {/* Manual Verification Items */}
              <div className="space-y-3">
                {pendingSubmissions.length === 0 ? (
                  <div className="text-center py-8">
                    <Gift className="mx-auto text-slate-400 dark:text-gray-600 mb-4" size={48} />
                    <p className="text-slate-600 dark:text-gray-500">No pending manual verifications</p>
                  </div>
                ) : (
                  pendingSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl hover:border-primary/50 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-lg text-xs font-black">
                              PENDING
                            </span>
                            <span className="text-xs text-slate-500 dark:text-gray-500">
                              {new Date(submission.submitted_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              Task ID: {submission.task_id} - {submission.task_action}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-gray-400 font-mono">
                              {submission.wallet_address.slice(0, 12)}...{submission.wallet_address.slice(-8)}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-gray-400">
                              {submission.description}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {submission.proof_urls.length > 0 && (
                                <a
                                  href={submission.proof_urls[0]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink size={12} />
                                  View Proof URL
                                </a>
                              )}
                              {submission.proof_screenshots.length > 0 && (
                                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                  <FileText size={12} />
                                  {submission.proof_screenshots.length} file(s) uploaded
                                </span>
                              )}
                              {submission.additional_info?.fileCount > 0 && (
                                <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                  <Upload size={12} />
                                  {submission.additional_info.fileCount} files ({(submission.additional_info.totalFileSize / 1024 / 1024).toFixed(1)}MB)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleManualVerificationAction(submission.id, 'reject')}
                            className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold transition-all"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleManualVerificationAction(submission.id, 'approve')}
                            className="px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-xs font-bold transition-all"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Task Management */}
            <div className="bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-black">Task Management</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleTaskAnalytics}
                    className="px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 rounded-lg text-sm font-bold transition-all"
                  >
                    Analytics
                  </button>
                  <button
                    onClick={() => showToast('Add task functionality coming soon', 'info')}
                    className="px-3 py-2 bg-primary hover:bg-primary/90 text-black rounded-lg text-sm font-bold transition-all"
                  >
                    Add Task
                  </button>
                </div>
              </div>

              {/* Task List */}
              <div className="space-y-3">
                {AIRDROP_TASKS.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl hover:border-primary/50 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-lg text-xs font-black ${
                            task.is_active 
                              ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                              : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                          }`}>
                            {task.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                          <span className={`px-2 py-1 rounded-lg text-xs font-black ${
                            task.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' :
                            task.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                            task.difficulty === 'hard' ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400' :
                            'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          }`}>
                            {task.difficulty.toUpperCase()}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-black">
                            {task.category.toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {task.title}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-gray-400">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              +{task.reward} RZC
                            </span>
                            <span>
                              {(task.completions || 0).toLocaleString()} completions
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTaskEdit(task.id)}
                          className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleTaskStatus(task.id, task.is_active)}
                          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                            task.is_active
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400'
                              : 'bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400'
                          }`}
                        >
                          {task.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Balance Verification Management */}
        {activeTab === 'balance-verification' && (
          <div className="space-y-4">
            {/* Balance Verification Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 sm:gap-4">
              <div className="p-4 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {verificationStats.total}
                </div>
                <div className="text-xs text-slate-600 dark:text-gray-500 mt-1">Total Requests</div>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border-2 border-orange-200 dark:border-orange-500/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-orange-700 dark:text-orange-400">
                  {verificationStats.pending}
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-500 mt-1">Pending</div>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-blue-700 dark:text-blue-400">
                  {verificationStats.under_review}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-500 mt-1">Under Review</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-500/10 border-2 border-green-200 dark:border-green-500/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-green-700 dark:text-green-400">
                  {verificationStats.approved}
                </div>
                <div className="text-xs text-green-600 dark:text-green-500 mt-1">Approved</div>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-red-700 dark:text-red-400">
                  {verificationStats.rejected}
                </div>
                <div className="text-xs text-red-600 dark:text-red-500 mt-1">Rejected</div>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400">
                  {verificationStats.resolved}
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">Resolved</div>
              </div>
            </div>

            {/* Balance Verification Requests List */}
            <div className="bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-black mb-4">Balance Verification Requests</h3>
              
              {verificationRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="mx-auto text-slate-400 dark:text-gray-600 mb-4" size={48} />
                  <p className="text-slate-600 dark:text-gray-500">No balance verification requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {verificationRequests.map((request) => {
                    const statusInfo = balanceVerificationService.getStatusInfo(request.status);
                    const priorityInfo = balanceVerificationService.getPriorityInfo(request.priority);
                    const discrepancyInfo = balanceVerificationService.formatDiscrepancy(request.discrepancy_amount);
                    
                    return (
                      <div
                        key={request.id}
                        className="p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl hover:border-orange-500/50 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded-lg text-xs font-black bg-${statusInfo.color}-500/20 text-${statusInfo.color}-600 dark:text-${statusInfo.color}-400`}>
                                {statusInfo.icon} {statusInfo.label}
                              </span>
                              <span className={`px-2 py-1 rounded-lg text-xs font-black bg-${priorityInfo.color}-500/20 text-${priorityInfo.color}-600 dark:text-${priorityInfo.color}-400`}>
                                {priorityInfo.icon} {priorityInfo.label}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-gray-500">
                                {new Date(request.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                Wallet: {request.wallet_address.slice(0, 12)}...{request.wallet_address.slice(-8)}
                              </div>
                              <div className="text-xs text-slate-600 dark:text-gray-400">
                                Telegram: {request.telegram_username} • Old Wallet: {request.old_wallet_address.slice(0, 8)}...{request.old_wallet_address.slice(-6)}
                              </div>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                  Current: {request.current_balance.toLocaleString()} RZC
                                </div>
                                <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
                                  Claimed: {request.claimed_balance.toLocaleString()} RZC
                                </div>
                                <div className={`text-xs font-bold ${discrepancyInfo.color}`}>
                                  Diff: {discrepancyInfo.formatted}
                                </div>
                              </div>
                              {request.additional_notes && (
                                <div className="text-xs text-slate-500 dark:text-gray-500 italic mt-1">
                                  Note: {request.additional_notes}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {request.screenshot_url && (
                              <a
                                href={request.screenshot_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                              >
                                <ExternalLink size={12} />
                                Screenshot
                              </a>
                            )}
                            {request.status === 'pending' && (
                              <button
                                onClick={() => openVerificationModal(request)}
                                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                              >
                                Review
                              </button>
                            )}
                            {request.status !== 'pending' && request.admin_notes && (
                              <div className="text-xs text-slate-600 dark:text-gray-400 italic max-w-32 truncate">
                                {request.admin_notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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

        {/* Balance Verification Review Modal */}
        {showVerificationModal && selectedVerificationRequest && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0a0a0a] border-2 border-slate-300 dark:border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Review Balance Verification</h2>
                  <button
                    onClick={() => setShowVerificationModal(false)}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <XCircle size={24} className="text-slate-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Request Details */}
                <div className="space-y-4">
                  <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                    <div className="text-xs font-black text-slate-600 dark:text-gray-500 uppercase tracking-wider mb-2">
                      Current Wallet Address
                    </div>
                    <code className="text-sm font-mono text-slate-900 dark:text-white break-all">
                      {selectedVerificationRequest.wallet_address}
                    </code>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                      <div className="text-xs font-black text-slate-600 dark:text-gray-500 uppercase tracking-wider mb-2">
                        Telegram Username
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedVerificationRequest.telegram_username}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                      <div className="text-xs font-black text-slate-600 dark:text-gray-500 uppercase tracking-wider mb-2">
                        Old Wallet Address
                      </div>
                      <code className="text-xs font-mono text-slate-900 dark:text-white break-all">
                        {selectedVerificationRequest.old_wallet_address}
                      </code>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
                      <div className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2">
                        Current Balance
                      </div>
                      <div className="text-xl font-black text-blue-900 dark:text-blue-300">
                        {selectedVerificationRequest.current_balance.toLocaleString()}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">RZC</div>
                    </div>

                    <div className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-200 dark:border-purple-500/20">
                      <div className="text-xs font-black text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-2">
                        Claimed Balance
                      </div>
                      <div className="text-xl font-black text-purple-900 dark:text-purple-300">
                        {selectedVerificationRequest.claimed_balance.toLocaleString()}
                      </div>
                      <div className="text-xs text-purple-600 dark:text-purple-400">RZC</div>
                    </div>

                    <div className={`p-4 rounded-xl border ${
                      selectedVerificationRequest.discrepancy_amount > 0
                        ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
                        : selectedVerificationRequest.discrepancy_amount < 0
                        ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20'
                        : 'bg-gray-50 dark:bg-gray-500/10 border-gray-200 dark:border-gray-500/20'
                    }`}>
                      <div className={`text-xs font-black uppercase tracking-wider mb-2 ${
                        selectedVerificationRequest.discrepancy_amount > 0
                          ? 'text-red-700 dark:text-red-400'
                          : selectedVerificationRequest.discrepancy_amount < 0
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-gray-700 dark:text-gray-400'
                      }`}>
                        Discrepancy
                      </div>
                      <div className={`text-xl font-black ${
                        selectedVerificationRequest.discrepancy_amount > 0
                          ? 'text-red-900 dark:text-red-300'
                          : selectedVerificationRequest.discrepancy_amount < 0
                          ? 'text-green-900 dark:text-green-300'
                          : 'text-gray-900 dark:text-gray-300'
                      }`}>
                        {selectedVerificationRequest.discrepancy_amount > 0 ? '+' : ''}
                        {selectedVerificationRequest.discrepancy_amount.toLocaleString()}
                      </div>
                      <div className={`text-xs ${
                        selectedVerificationRequest.discrepancy_amount > 0
                          ? 'text-red-600 dark:text-red-400'
                          : selectedVerificationRequest.discrepancy_amount < 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {selectedVerificationRequest.discrepancy_amount > 0 ? 'Claiming more' : 
                         selectedVerificationRequest.discrepancy_amount < 0 ? 'Claiming less' : 'No difference'}
                      </div>
                    </div>
                  </div>

                  {selectedVerificationRequest.screenshot_url && (
                    <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                      <div className="text-xs font-black text-slate-600 dark:text-gray-500 uppercase tracking-wider mb-2">
                        Screenshot Evidence
                      </div>
                      <a
                        href={selectedVerificationRequest.screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                      >
                        <ExternalLink size={16} />
                        View Screenshot
                      </a>
                    </div>
                  )}

                  {selectedVerificationRequest.additional_notes && (
                    <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                      <div className="text-xs font-black text-slate-600 dark:text-gray-500 uppercase tracking-wider mb-2">
                        User Notes
                      </div>
                      <p className="text-sm text-slate-900 dark:text-white">
                        {selectedVerificationRequest.additional_notes}
                      </p>
                    </div>
                  )}

                  <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                    <div className="text-xs font-black text-slate-600 dark:text-gray-500 uppercase tracking-wider mb-2">
                      Request Details
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600 dark:text-gray-400">Status:</span>
                        <span className="ml-2 font-bold text-slate-900 dark:text-white">
                          {selectedVerificationRequest.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-gray-400">Priority:</span>
                        <span className="ml-2 font-bold text-slate-900 dark:text-white">
                          {selectedVerificationRequest.priority.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-gray-400">Submitted:</span>
                        <span className="ml-2 font-bold text-slate-900 dark:text-white">
                          {new Date(selectedVerificationRequest.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-gray-400">Updated:</span>
                        <span className="ml-2 font-bold text-slate-900 dark:text-white">
                          {new Date(selectedVerificationRequest.updated_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Notes */}
                  <div>
                    <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                      Admin Notes {selectedVerificationRequest.status === 'pending' && '(Required for rejection)'}
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this verification request..."
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border-2 border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Actions */}
                {selectedVerificationRequest.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleRejectVerificationRequest(selectedVerificationRequest)}
                      className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl font-bold transition-all"
                    >
                      Reject Request
                    </button>
                    <button
                      onClick={() => handleApproveVerificationRequest(selectedVerificationRequest)}
                      className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-all"
                    >
                      Approve Request
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Task Edit Modal */}
        {showTaskEditModal && editingTask && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0a0a0a] border-2 border-slate-300 dark:border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Edit Airdrop Task</h2>
                  <button
                    onClick={closeTaskEditModal}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <X size={24} className="text-slate-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Task Form */}
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                      Task Title *
                    </label>
                    <input
                      type="text"
                      value={taskFormData.title}
                      onChange={(e) => handleTaskFormChange('title', e.target.value)}
                      placeholder="Enter task title..."
                      className={`w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border-2 rounded-xl text-slate-900 dark:text-white text-sm outline-none transition-all ${
                        taskFormErrors.title 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-slate-300 dark:border-white/10 focus:border-primary'
                      }`}
                    />
                    {taskFormErrors.title && (
                      <p className="text-red-500 text-xs mt-1">{taskFormErrors.title}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                      Description *
                    </label>
                    <textarea
                      value={taskFormData.description}
                      onChange={(e) => handleTaskFormChange('description', e.target.value)}
                      placeholder="Enter task description..."
                      rows={3}
                      className={`w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border-2 rounded-xl text-slate-900 dark:text-white text-sm outline-none transition-all resize-none ${
                        taskFormErrors.description 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-slate-300 dark:border-white/10 focus:border-primary'
                      }`}
                    />
                    {taskFormErrors.description && (
                      <p className="text-red-500 text-xs mt-1">{taskFormErrors.description}</p>
                    )}
                  </div>

                  {/* Instructions */}
                  <div>
                    <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                      Instructions (Optional)
                    </label>
                    <textarea
                      value={taskFormData.instructions}
                      onChange={(e) => handleTaskFormChange('instructions', e.target.value)}
                      placeholder="Enter detailed instructions for users..."
                      rows={2}
                      className={`w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border-2 rounded-xl text-slate-900 dark:text-white text-sm outline-none transition-all resize-none ${
                        taskFormErrors.instructions 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-slate-300 dark:border-white/10 focus:border-primary'
                      }`}
                    />
                    {taskFormErrors.instructions && (
                      <p className="text-red-500 text-xs mt-1">{taskFormErrors.instructions}</p>
                    )}
                  </div>

                  {/* Reward and Action */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                        Reward (RZC) *
                      </label>
                      <input
                        type="number"
                        value={taskFormData.reward}
                        onChange={(e) => handleTaskFormChange('reward', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        min="1"
                        max="10000"
                        className={`w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border-2 rounded-xl text-slate-900 dark:text-white text-sm outline-none transition-all ${
                          taskFormErrors.reward 
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-slate-300 dark:border-white/10 focus:border-primary'
                        }`}
                      />
                      {taskFormErrors.reward && (
                        <p className="text-red-500 text-xs mt-1">{taskFormErrors.reward}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                        Action Type *
                      </label>
                      <input
                        type="text"
                        value={taskFormData.action}
                        onChange={(e) => handleTaskFormChange('action', e.target.value)}
                        placeholder="e.g., follow, retweet, create_video"
                        className={`w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border-2 rounded-xl text-slate-900 dark:text-white text-sm outline-none transition-all ${
                          taskFormErrors.action 
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-slate-300 dark:border-white/10 focus:border-primary'
                        }`}
                      />
                      {taskFormErrors.action && (
                        <p className="text-red-500 text-xs mt-1">{taskFormErrors.action}</p>
                      )}
                    </div>
                  </div>

                  {/* Category and Difficulty */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                        Category *
                      </label>
                      <select
                        value={taskFormData.category}
                        onChange={(e) => handleTaskFormChange('category', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border-2 border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:border-primary transition-all"
                      >
                        <option value="social">Social</option>
                        <option value="engagement">Engagement</option>
                        <option value="growth">Growth</option>
                        <option value="content">Content</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                        Difficulty *
                      </label>
                      <select
                        value={taskFormData.difficulty}
                        onChange={(e) => handleTaskFormChange('difficulty', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border-2 border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:border-primary transition-all"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>
                  </div>

                  {/* Time Limit and Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                        Time Limit (Optional)
                      </label>
                      <input
                        type="text"
                        value={taskFormData.timeLimit}
                        onChange={(e) => handleTaskFormChange('timeLimit', e.target.value)}
                        placeholder="e.g., 24h, 7 days, 1 week"
                        className={`w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border-2 rounded-xl text-slate-900 dark:text-white text-sm outline-none transition-all ${
                          taskFormErrors.timeLimit 
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-slate-300 dark:border-white/10 focus:border-primary'
                        }`}
                      />
                      {taskFormErrors.timeLimit && (
                        <p className="text-red-500 text-xs mt-1">{taskFormErrors.timeLimit}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                        Status
                      </label>
                      <div className="flex items-center gap-3 pt-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="taskStatus"
                            checked={taskFormData.is_active}
                            onChange={() => handleTaskFormChange('is_active', true)}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm text-slate-900 dark:text-white">Active</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="taskStatus"
                            checked={!taskFormData.is_active}
                            onChange={() => handleTaskFormChange('is_active', false)}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm text-slate-900 dark:text-white">Inactive</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Task Preview */}
                  <div className="p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Preview</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-xs font-black ${
                          taskFormData.is_active 
                            ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                            : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                        }`}>
                          {taskFormData.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                        <span className={`px-2 py-1 rounded-lg text-xs font-black ${
                          taskFormData.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' :
                          taskFormData.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                          taskFormData.difficulty === 'hard' ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400' :
                          'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        }`}>
                          {taskFormData.difficulty.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-black">
                          {taskFormData.category.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {taskFormData.title || 'Task Title'}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-gray-400">
                        {taskFormData.description || 'Task description'}
                      </div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        +{taskFormData.reward} RZC
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={closeTaskEditModal}
                    className="flex-1 py-3 bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTaskSave}
                    className="flex-1 py-3 bg-primary hover:bg-primary/90 text-black rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
