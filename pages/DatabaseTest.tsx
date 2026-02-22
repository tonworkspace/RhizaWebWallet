import React, { useState } from 'react';
import { authService } from '../services/authService';
import { CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';

const DatabaseTest: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (test: string, status: 'success' | 'error' | 'warning', message: string, data?: any) => {
    setResults(prev => [...prev, { test, status, message, data, timestamp: new Date().toISOString() }]);
  };

  const runTests = async () => {
    setResults([]);
    setIsLoading(true);

    try {
      // Test 1: Check Supabase connection
      addResult('Connection', 'success', 'Testing Supabase connection...');
      const client = authService.getClient();
      
      // Test 2: Check current user
      const { user } = await authService.getCurrentUser();
      if (user) {
        addResult('Current User', 'success', `Logged in as: ${user.email}`, user);
      } else {
        addResult('Current User', 'warning', 'No user logged in');
      }

      // Test 3: Check if tables exist
      addResult('Tables', 'success', 'Checking if wallet_users table exists...');
      const { data: tables, error: tablesError } = await client
        .from('wallet_users')
        .select('id')
        .limit(1);
      
      if (tablesError) {
        addResult('Tables', 'error', `Table check failed: ${tablesError.message}`, tablesError);
      } else {
        addResult('Tables', 'success', 'wallet_users table exists');
      }

      // Test 4: Check wallet_users for current user
      if (user) {
        const { data: walletUser, error: walletError } = await client
          .from('wallet_users')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        if (walletError) {
          if (walletError.code === 'PGRST116') {
            addResult('Wallet User', 'error', 'wallet_users entry NOT FOUND for current user', walletError);
          } else {
            addResult('Wallet User', 'error', `Error fetching wallet user: ${walletError.message}`, walletError);
          }
        } else {
          addResult('Wallet User', 'success', 'wallet_users entry found', walletUser);
        }
      }

      // Test 5: Check RLS policies
      addResult('RLS', 'success', 'Checking Row Level Security...');
      const { error: policyError } = await client
        .from('wallet_users')
        .select('*')
        .limit(1);
      
      if (policyError) {
        addResult('RLS', 'error', `RLS policy error: ${policyError.message}`, policyError);
      } else {
        addResult('RLS', 'success', 'RLS policies working');
      }

    } catch (error: any) {
      addResult('Error', 'error', `Test failed: ${error.message}`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const createWalletUser = async () => {
    setIsLoading(true);
    try {
      const { user } = await authService.getCurrentUser();
      if (!user) {
        addResult('Create User', 'error', 'No user logged in');
        return;
      }

      const client = authService.getClient();
      const { data, error } = await client
        .from('wallet_users')
        .insert({
          auth_user_id: user.id,
          wallet_address: user.user_metadata?.wallet_address || 'PENDING',
          email: user.email,
          name: user.user_metadata?.name || 'Rhiza User',
          avatar: user.user_metadata?.avatar || '🌱',
          role: 'user',
          is_active: true
        })
        .select()
        .single();

      if (error) {
        addResult('Create User', 'error', `Failed to create wallet_users entry: ${error.message}`, error);
      } else {
        addResult('Create User', 'success', 'wallet_users entry created successfully!', data);
      }
    } catch (error: any) {
      addResult('Create User', 'error', `Error: ${error.message}`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="text-emerald-500" size={20} />;
      case 'error': return <XCircle className="text-rose-500" size={20} />;
      case 'warning': return <AlertCircle className="text-amber-500" size={20} />;
      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-black text-white">Database Test</h1>
        <p className="text-gray-400">Test Supabase connection and database setup</p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={runTests}
          disabled={isLoading}
          className="flex-1 p-4 bg-[#00FF88] text-black rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Running Tests...' : 'Run Tests'}
        </button>

        <button
          onClick={createWalletUser}
          disabled={isLoading}
          className="flex-1 p-4 bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Wallet User
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-4 rounded-2xl border ${
              result.status === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : result.status === 'error'
                ? 'bg-rose-500/10 border-rose-500/20'
                : 'bg-amber-500/10 border-amber-500/20'
            }`}
          >
            <div className="flex items-start gap-3">
              {getIcon(result.status)}
              <div className="flex-1">
                <div className="font-bold text-white">{result.test}</div>
                <div className="text-sm text-gray-400 mt-1">{result.message}</div>
                {result.data && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                      Show details
                    </summary>
                    <pre className="mt-2 p-2 bg-black/50 rounded text-xs text-gray-300 overflow-auto max-h-40">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && !isLoading && (
        <div className="text-center text-gray-500 py-12">
          Click "Run Tests" to check database setup
        </div>
      )}
    </div>
  );
};

export default DatabaseTest;
