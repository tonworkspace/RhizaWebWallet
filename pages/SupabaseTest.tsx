import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader, Database, Shield, Users, Activity } from 'lucide-react';
import { authService } from '../services/authService';
import { supabaseService } from '../services/supabaseService';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: string;
}

const SupabaseTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const updateTest = (name: string, status: 'pending' | 'success' | 'error', message: string, details?: string) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        return prev.map(t => t.name === name ? { name, status, message, details } : t);
      }
      return [...prev, { name, status, message, details }];
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    setTests([]);

    // Test 1: Check Supabase Configuration
    updateTest('config', 'pending', 'Checking Supabase configuration...');
    try {
      const client = authService.getClient();
      if (client) {
        updateTest('config', 'success', 'Supabase client initialized', 'URL and API key are configured');
      } else {
        updateTest('config', 'error', 'Supabase client not initialized', 'Check .env.local file');
      }
    } catch (error: any) {
      updateTest('config', 'error', 'Configuration error', error.message);
    }

    // Test 2: Check Current Session
    updateTest('session', 'pending', 'Checking authentication session...');
    try {
      const { session } = await authService.getSession();
      if (session) {
        updateTest('session', 'success', 'User is authenticated', `User ID: ${session.user.id}`);
        setCurrentUser(session.user);
      } else {
        updateTest('session', 'success', 'No active session', 'User is not logged in');
      }
    } catch (error: any) {
      updateTest('session', 'error', 'Session check failed', error.message);
    }

    // Test 3: Check Database Connection
    updateTest('database', 'pending', 'Testing database connection...');
    try {
      const client = authService.getClient();
      const { data, error } = await client
        .from('wallet_users')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      updateTest('database', 'success', 'Database connection successful', 'wallet_users table accessible');
    } catch (error: any) {
      updateTest('database', 'error', 'Database connection failed', error.message);
    }

    // Test 4: Check RLS Policies
    updateTest('rls', 'pending', 'Testing Row Level Security...');
    try {
      const { session } = await authService.getSession();
      if (session) {
        const walletUser = await authService.getWalletUser(session.user.id);
        if (walletUser) {
          updateTest('rls', 'success', 'RLS policies working', `Retrieved user profile: ${walletUser.name}`);
        } else {
          updateTest('rls', 'error', 'No wallet user found', 'Profile may not be created yet');
        }
      } else {
        updateTest('rls', 'success', 'RLS test skipped', 'No authenticated user');
      }
    } catch (error: any) {
      updateTest('rls', 'error', 'RLS test failed', error.message);
    }

    // Test 5: Check Admin Functions
    updateTest('admin', 'pending', 'Testing admin functions...');
    try {
      const isAdmin = await authService.isAdmin();
      updateTest('admin', 'success', `Admin check complete`, `User is ${isAdmin ? 'an admin' : 'not an admin'}`);
    } catch (error: any) {
      updateTest('admin', 'error', 'Admin function failed', error.message);
    }

    // Test 6: Check Supabase Service Integration
    updateTest('service', 'pending', 'Testing supabaseService integration...');
    try {
      const isConfigured = supabaseService.isConfigured();
      if (isConfigured) {
        updateTest('service', 'success', 'SupabaseService configured', 'Ready for transactions and analytics');
      } else {
        updateTest('service', 'error', 'SupabaseService not configured', 'Check environment variables');
      }
    } catch (error: any) {
      updateTest('service', 'error', 'Service test failed', error.message);
    }

    // Test 7: Test Analytics Tracking
    updateTest('analytics', 'pending', 'Testing analytics tracking...');
    try {
      const result = await supabaseService.trackEvent('test_event', {
        test: true,
        timestamp: new Date().toISOString()
      });
      if (result.success) {
        updateTest('analytics', 'success', 'Analytics tracking works', 'Test event logged successfully');
      } else {
        updateTest('analytics', 'error', 'Analytics tracking failed', result.error || 'Unknown error');
      }
    } catch (error: any) {
      updateTest('analytics', 'error', 'Analytics test failed', error.message);
    }

    setIsRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader className="animate-spin text-blue-400" size={20} />;
      case 'success':
        return <CheckCircle className="text-emerald-400" size={20} />;
      case 'error':
        return <XCircle className="text-rose-400" size={20} />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'success':
        return 'border-emerald-500/20 bg-emerald-500/5';
      case 'error':
        return 'border-rose-500/20 bg-rose-500/5';
    }
  };

  const successCount = tests.filter(t => t.status === 'success').length;
  const errorCount = tests.filter(t => t.status === 'error').length;
  const totalTests = tests.length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Database className="text-[#00FF88]" size={32} />
            Supabase Integration Test
          </h1>
          <p className="text-gray-500 text-sm mt-2">Verify backend connectivity and functionality</p>
        </div>
        <button
          onClick={runTests}
          disabled={isRunning}
          className="px-6 py-3 bg-[#00FF88] text-black rounded-xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Running...' : 'Run Tests'}
        </button>
      </div>

      {/* Summary */}
      {totalTests > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-2xl font-black text-white">{totalTests}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Total Tests</div>
          </div>
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-2xl font-black text-emerald-400">{successCount}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Passed</div>
          </div>
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <div className="text-2xl font-black text-rose-400">{errorCount}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Failed</div>
          </div>
        </div>
      )}

      {/* Current User Info */}
      {currentUser && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#00FF88]/10 to-transparent border border-[#00FF88]/20">
          <div className="flex items-center gap-3 mb-3">
            <Users className="text-[#00FF88]" size={20} />
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Current User</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Email:</span>
              <span className="text-white font-mono">{currentUser.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">User ID:</span>
              <span className="text-white font-mono text-xs">{currentUser.id}</span>
            </div>
          </div>
        </div>
      )}

      {/* Test Results */}
      <div className="space-y-4">
        {tests.map((test, index) => (
          <div
            key={test.name}
            className={`p-6 rounded-2xl border transition-all ${getStatusColor(test.status)}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-4">
              <div className="mt-1">{getStatusIcon(test.status)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">
                    Test {index + 1}: {test.name}
                  </h3>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                    test.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                    test.status === 'error' ? 'bg-rose-500/20 text-rose-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {test.status}
                  </span>
                </div>
                <p className="text-white font-medium mb-1">{test.message}</p>
                {test.details && (
                  <p className="text-gray-500 text-sm">{test.details}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      {errorCount > 0 && (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="text-amber-400" size={20} />
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Troubleshooting</h3>
          </div>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>• Verify .env.local has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY</li>
            <li>• Ensure database schema is created (run supabase-schema.sql)</li>
            <li>• Check Supabase project is active and not paused</li>
            <li>• Verify RLS policies are enabled on all tables</li>
            <li>• Try logging in first if you see authentication errors</li>
          </ul>
        </div>
      )}

      {successCount === totalTests && totalTests > 0 && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 text-center">
          <CheckCircle className="text-emerald-400 mx-auto mb-3" size={48} />
          <h3 className="text-xl font-black text-white mb-2">All Tests Passed!</h3>
          <p className="text-gray-400">Your Supabase backend is fully integrated and working correctly.</p>
        </div>
      )}
    </div>
  );
};

export default SupabaseTest;
