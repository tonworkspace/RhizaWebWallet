import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Loader, Database, Users, Activity, Code } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

const SupabaseConnectionTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Supabase Configuration', status: 'pending', message: 'Checking...' },
    { name: 'Database Connection', status: 'pending', message: 'Checking...' },
    { name: 'Tables Exist', status: 'pending', message: 'Checking...' },
    { name: 'Create Test User', status: 'pending', message: 'Checking...' },
    { name: 'Read Test User', status: 'pending', message: 'Checking...' },
    { name: 'Create Referral Code', status: 'pending', message: 'Checking...' },
    { name: 'Track Analytics Event', status: 'pending', message: 'Checking...' },
    { name: 'Database Statistics', status: 'pending', message: 'Checking...' },
    { name: 'Cleanup Test Data', status: 'pending', message: 'Checking...' }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [testUserId, setTestUserId] = useState<string | null>(null);

  const updateTest = (index: number, status: 'success' | 'error', message: string, details?: any) => {
    setTests(prev => {
      const newTests = [...prev];
      newTests[index] = { ...newTests[index], status, message, details };
      return newTests;
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    let userId: string | null = null;

    try {
      // Test 1: Check Configuration
      await new Promise(resolve => setTimeout(resolve, 500));
      const isConfigured = supabaseService.isConfigured();
      if (isConfigured) {
        updateTest(0, 'success', 'Supabase is configured correctly');
      } else {
        updateTest(0, 'error', 'Supabase is not configured. Check .env file');
        setIsRunning(false);
        return;
      }

      // Test 2: Test Connection
      await new Promise(resolve => setTimeout(resolve, 500));
      const connectionTest = await supabaseService.testConnection();
      if (connectionTest.success) {
        updateTest(1, 'success', connectionTest.message);
      } else {
        updateTest(1, 'error', connectionTest.message);
        setIsRunning(false);
        return;
      }

      // Test 3: Check Tables
      await new Promise(resolve => setTimeout(resolve, 500));
      const statsResult = await supabaseService.getStats();
      if (statsResult.success) {
        updateTest(2, 'success', 'All tables exist', statsResult.data);
      } else {
        updateTest(2, 'error', 'Tables not found. Run SQL setup script');
        setIsRunning(false);
        return;
      }

      // Test 4: Create Test User
      await new Promise(resolve => setTimeout(resolve, 500));
      const testWalletAddress = `EQTest${Date.now()}`;
      const createResult = await supabaseService.createOrUpdateProfile({
        wallet_address: testWalletAddress,
        name: 'Test User',
        avatar: '🧪',
        role: 'user',
        is_active: true
      });

      if (createResult.success && createResult.data) {
        userId = createResult.data.id;
        setTestUserId(userId);
        updateTest(3, 'success', `User created with ID: ${userId.slice(0, 8)}...`, createResult.data);
      } else {
        updateTest(3, 'error', createResult.error || 'Failed to create user');
        setIsRunning(false);
        return;
      }

      // Test 5: Read Test User
      await new Promise(resolve => setTimeout(resolve, 500));
      const readResult = await supabaseService.getProfile(testWalletAddress);
      if (readResult.success && readResult.data) {
        updateTest(4, 'success', 'User read successfully', readResult.data);
      } else {
        updateTest(4, 'error', readResult.error || 'Failed to read user');
      }

      // Test 6: Create Referral Code
      await new Promise(resolve => setTimeout(resolve, 500));
      if (userId) {
        const referralResult = await supabaseService.createReferralCode(userId, testWalletAddress);
        if (referralResult.success && referralResult.data) {
          updateTest(5, 'success', `Referral code: ${referralResult.data.referral_code}`, referralResult.data);
        } else {
          updateTest(5, 'error', referralResult.error || 'Failed to create referral code');
        }
      }

      // Test 7: Track Analytics
      await new Promise(resolve => setTimeout(resolve, 500));
      const analyticsResult = await supabaseService.trackEvent('test_event', {
        test: true,
        timestamp: new Date().toISOString()
      }, userId);

      if (analyticsResult.success) {
        updateTest(6, 'success', 'Analytics event tracked');
      } else {
        updateTest(6, 'error', analyticsResult.error || 'Failed to track event');
      }

      // Test 8: Get Statistics
      await new Promise(resolve => setTimeout(resolve, 500));
      const stats = await supabaseService.getStats();
      if (stats.success && stats.data) {
        updateTest(7, 'success', 'Statistics retrieved', stats.data);
      } else {
        updateTest(7, 'error', stats.error || 'Failed to get stats');
      }

      // Test 9: Cleanup
      await new Promise(resolve => setTimeout(resolve, 500));
      if (userId) {
        const client = supabaseService.getClient();
        if (client) {
          // Delete test user (cascade will delete referral and analytics)
          const { error } = await client
            .from('wallet_users')
            .delete()
            .eq('id', userId);

          if (!error) {
            updateTest(8, 'success', 'Test data cleaned up');
          } else {
            updateTest(8, 'error', 'Failed to cleanup: ' + error.message);
          }
        }
      }

    } catch (error: any) {
      console.error('Test error:', error);
      updateTest(tests.findIndex(t => t.status === 'pending'), 'error', error.message);
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <Loader className="text-gray-500 animate-spin" size={20} />;
    }
  };

  const allSuccess = tests.every(t => t.status === 'success');
  const hasError = tests.some(t => t.status === 'error');

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-black">Supabase Connection Test</h1>
              <p className="text-gray-500 text-sm">Test your database integration</p>
            </div>
          </div>
          <Database className="text-[#00FF88]" size={32} />
        </div>

        {/* Status Banner */}
        {!isRunning && allSuccess && (
          <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-500" size={24} />
              <div>
                <h3 className="font-bold text-green-400">All Tests Passed!</h3>
                <p className="text-sm text-gray-400">Your Supabase integration is working perfectly.</p>
              </div>
            </div>
          </div>
        )}

        {!isRunning && hasError && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <div className="flex items-center gap-3">
              <XCircle className="text-red-500" size={24} />
              <div>
                <h3 className="font-bold text-red-400">Some Tests Failed</h3>
                <p className="text-sm text-gray-400">Check the errors below and fix the issues.</p>
              </div>
            </div>
          </div>
        )}

        {/* Run Tests Button */}
        <button
          onClick={runTests}
          disabled={isRunning}
          className={`w-full p-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
            isRunning
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-[#00FF88] text-black hover:bg-[#00CCFF]'
          }`}
        >
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </button>

        {/* Test Results */}
        <div className="space-y-3">
          {tests.map((test, index) => (
            <div
              key={index}
              className={`p-4 rounded-2xl border transition-all ${
                test.status === 'success'
                  ? 'bg-green-500/5 border-green-500/20'
                  : test.status === 'error'
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getStatusIcon(test.status)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{test.name}</h3>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      {test.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{test.message}</p>
                  {test.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                        View Details
                      </summary>
                      <pre className="mt-2 p-3 bg-black/50 rounded-lg text-xs overflow-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <Users className="text-[#00FF88] mb-2" size={24} />
            <h4 className="font-bold text-sm">User Profiles</h4>
            <p className="text-xs text-gray-500 mt-1">
              Create and manage user profiles with wallet addresses
            </p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <Activity className="text-[#00CCFF] mb-2" size={24} />
            <h4 className="font-bold text-sm">Referral System</h4>
            <p className="text-xs text-gray-500 mt-1">
              Track referrals and generate unique codes
            </p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <Code className="text-purple-400" size={24} />
            <h4 className="font-bold text-sm">Analytics</h4>
            <p className="text-xs text-gray-500 mt-1">
              Track events and user behavior
            </p>
          </div>
        </div>

        {/* Documentation Links */}
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
          <h3 className="font-bold mb-4">Documentation</h3>
          <div className="space-y-2 text-sm">
            <a href="#" className="block text-[#00FF88] hover:underline">
              → SUPABASE_DATABASE_SETUP.md - Setup instructions
            </a>
            <a href="#" className="block text-[#00FF88] hover:underline">
              → SUPABASE_COMPLETE_SETUP.md - Complete integration guide
            </a>
            <a href="#" className="block text-[#00FF88] hover:underline">
              → QUICK_REFERENCE.md - Quick reference guide
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseConnectionTest;
