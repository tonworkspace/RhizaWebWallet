import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  Gift, 
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Wrench
} from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { fixReferralCount } from '../utils/referralCountFixer';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

const ReferralSystemTest: React.FC = () => {
  const { userProfile, referralData } = useWallet();
  const { showToast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [results, setResults] = useState<TestResult[]>([
    { name: 'User Profile Check', status: 'pending', message: 'Checking...' },
    { name: 'Referral Code Generation', status: 'pending', message: 'Checking...' },
    { name: 'Referral Link Creation', status: 'pending', message: 'Checking...' },
    { name: 'Upline Lookup', status: 'pending', message: 'Checking...' },
    { name: 'Downline Lookup', status: 'pending', message: 'Checking...' },
    { name: 'Referral Count Accuracy', status: 'pending', message: 'Checking...' },
    { name: 'Referral Stats Sync', status: 'pending', message: 'Checking...' },
    { name: 'RZC Balance Check', status: 'pending', message: 'Checking...' },
    { name: 'Database Connection', status: 'pending', message: 'Checking...' }
  ]);

  const updateResult = (index: number, status: TestResult['status'], message: string, data?: any) => {
    setResults(prev => prev.map((result, i) => 
      i === index ? { ...result, status, message, data } : result
    ));
  };

  const runTests = async () => {
    if (!userProfile?.id) {
      showToast('Please log in to run referral tests', 'error');
      return;
    }

    setIsRunning(true);
    
    try {
      // Test 1: User Profile Check
      updateResult(0, 'pending', 'Checking user profile...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (userProfile) {
        updateResult(0, 'success', `Profile found: ${userProfile.name}`, userProfile);
      } else {
        updateResult(0, 'error', 'No user profile found');
        setIsRunning(false);
        return;
      }

      // Test 2: Referral Code Generation
      updateResult(1, 'pending', 'Checking referral code...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (referralData?.referral_code) {
        updateResult(1, 'success', `Code: ${referralData.referral_code}`, referralData);
      } else {
        // Try to create one
        const createResult = await supabaseService.createReferralCode(
          userProfile.id,
          userProfile.wallet_address
        );
        
        if (createResult.success) {
          updateResult(1, 'success', `Created: ${createResult.data?.referral_code}`, createResult.data);
        } else {
          updateResult(1, 'error', createResult.error || 'Failed to create referral code');
        }
      }

      // Test 3: Referral Link Creation
      updateResult(2, 'pending', 'Testing referral link...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const referralCode = referralData?.referral_code || results[1].data?.referral_code;
      if (referralCode) {
        const referralLink = `${window.location.origin}/#/join?ref=${referralCode}`;
        updateResult(2, 'success', 'Link generated successfully', { link: referralLink });
      } else {
        updateResult(2, 'error', 'No referral code available for link generation');
      }

      // Test 4: Upline Lookup
      updateResult(3, 'pending', 'Checking upline...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const uplineResult = await supabaseService.getUpline(userProfile.id);
      if (uplineResult.success) {
        if (uplineResult.data) {
          updateResult(3, 'success', `Upline: ${uplineResult.data.name}`, uplineResult.data);
        } else {
          updateResult(3, 'warning', 'No upline found (not referred by anyone)');
        }
      } else {
        updateResult(3, 'error', uplineResult.error || 'Failed to check upline');
      }

      // Test 5: Downline Lookup
      updateResult(4, 'pending', 'Checking downline...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const downlineResult = await supabaseService.getDownline(userProfile.id);
      if (downlineResult.success) {
        const count = downlineResult.data?.length || 0;
        updateResult(4, 'success', `Found ${count} referrals`, downlineResult.data);
      } else {
        updateResult(4, 'error', downlineResult.error || 'Failed to check downline');
      }

      // Test 6: Referral Count Accuracy
      updateResult(5, 'pending', 'Verifying referral count accuracy...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const statsResult = await supabaseService.getReferralData(userProfile.id);
      if (statsResult.success && statsResult.data) {
        const actualDownlineCount = downlineResult.data?.length || 0;
        const storedReferralCount = statsResult.data.total_referrals || 0;
        
        if (actualDownlineCount === storedReferralCount) {
          updateResult(5, 'success', `Count matches: ${actualDownlineCount} referrals`, {
            actual: actualDownlineCount,
            stored: storedReferralCount,
            match: true
          });
        } else {
          updateResult(5, 'warning', `Count mismatch: Actual ${actualDownlineCount} vs Stored ${storedReferralCount}`, {
            actual: actualDownlineCount,
            stored: storedReferralCount,
            match: false,
            suggestion: 'Run sync to fix count'
          });
        }
      } else {
        updateResult(5, 'error', 'Failed to get referral stats for comparison');
      }

      // Test 7: Referral Stats Sync
      updateResult(6, 'pending', 'Checking referral stats...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (statsResult.success && statsResult.data) {
        updateResult(6, 'success', `Level ${statsResult.data.level}, ${statsResult.data.total_referrals} refs`, statsResult.data);
      } else {
        updateResult(6, 'error', statsResult.error || 'Failed to get referral stats');
      }

      // Test 8: RZC Balance Check
      updateResult(7, 'pending', 'Checking RZC balance...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const balanceResult = await supabaseService.getRZCBalance(userProfile.id);
      if (balanceResult.success) {
        updateResult(7, 'success', `Balance: ${balanceResult.balance?.toLocaleString()} RZC`, { balance: balanceResult.balance });
      } else {
        updateResult(7, 'error', balanceResult.error || 'Failed to check RZC balance');
      }

      // Test 9: Database Connection
      updateResult(8, 'pending', 'Testing database connection...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const connectionResult = await supabaseService.testConnection();
      if (connectionResult.success) {
        updateResult(8, 'success', 'Database connection OK', connectionResult);
      } else {
        updateResult(8, 'error', connectionResult.message || 'Database connection failed');
      }

    } catch (error: any) {
      console.error('Test error:', error);
      showToast('Test failed: ' + error.message, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const fixReferralCountMismatch = async () => {
    if (!userProfile?.id) {
      showToast('Please log in to fix referral count', 'error');
      return;
    }

    setIsFixing(true);
    
    try {
      const result = await fixReferralCount(userProfile.id);
      
      if (result.success && result.fixed) {
        showToast(`Referral count fixed: ${result.oldCount} → ${result.newCount}`, 'success');
        // Re-run the tests to show updated results
        await runTests();
      } else if (result.success && !result.fixed) {
        showToast('Referral count is already accurate', 'info');
      } else {
        showToast(`Failed to fix count: ${result.error}`, 'error');
      }
    } catch (error: any) {
      showToast(`Error fixing count: ${error.message}`, 'error');
    } finally {
      setIsFixing(false);
    }
  };

  const copyReferralLink = () => {
    const linkData = results[2].data;
    if (linkData?.link) {
      navigator.clipboard.writeText(linkData.link);
      showToast('Referral link copied!', 'success');
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <XCircle className="text-red-500" size={20} />;
      case 'warning':
        return <AlertCircle className="text-yellow-500" size={20} />;
      default:
        return <Clock className="text-gray-400" size={20} />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 dark:border-green-500/20 bg-green-50 dark:bg-green-500/10';
      case 'error':
        return 'border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10';
      case 'warning':
        return 'border-yellow-200 dark:border-yellow-500/20 bg-yellow-50 dark:bg-yellow-500/10';
      default:
        return 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-950 dark:text-white">Referral System Test</h2>
          <p className="text-xs text-gray-600 dark:text-gray-500 font-semibold">
            Verify that your referral system is working properly
          </p>
        </div>
        <button
          onClick={runTests}
          disabled={isRunning || !userProfile?.id}
          className="px-4 py-2 bg-emerald-600 dark:bg-[#00FF88] text-white dark:text-black rounded-xl font-bold text-sm hover:bg-emerald-700 dark:hover:bg-[#00FF88]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <RefreshCw className="animate-spin" size={16} />
              Testing...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Run Tests
            </>
          )}
        </button>
      </div>

      <div className="space-y-3">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl border-2 transition-all ${getStatusColor(result.status)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(result.status)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-gray-950 dark:text-white">
                  {result.name}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-semibold">
                  {result.message}
                </p>
                
                {/* Show additional data for successful tests */}
                {result.status === 'success' && result.data && (
                  <div className="mt-2 p-2 bg-gray-100 dark:bg-black/20 rounded-lg">
                    <pre className="text-[10px] text-gray-700 dark:text-gray-300 overflow-x-auto font-mono">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
                
                {/* Special actions for referral link */}
                {result.name === 'Referral Link Creation' && result.status === 'success' && result.data?.link && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={copyReferralLink}
                      className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-1"
                    >
                      <Copy size={12} />
                      Copy Link
                    </button>
                    <a
                      href={result.data.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-1"
                    >
                      <ExternalLink size={12} />
                      Test Link
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-xl border-2 border-gray-200 dark:border-white/10">
        <h3 className="font-bold text-sm text-gray-950 dark:text-white mb-2">Test Summary</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-black text-green-600 dark:text-green-400">
              {results.filter(r => r.status === 'success').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-500 font-semibold">Passed</div>
          </div>
          <div>
            <div className="text-lg font-black text-red-600 dark:text-red-400">
              {results.filter(r => r.status === 'error').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-500 font-semibold">Failed</div>
          </div>
          <div>
            <div className="text-lg font-black text-yellow-600 dark:text-yellow-400">
              {results.filter(r => r.status === 'warning').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-500 font-semibold">Warnings</div>
          </div>
          <div>
            <div className="text-lg font-black text-gray-600 dark:text-gray-400">
              {results.filter(r => r.status === 'pending').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-500 font-semibold">Pending</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border-2 border-blue-200 dark:border-blue-500/20">
        <h3 className="font-bold text-sm text-blue-900 dark:text-blue-300 mb-2">How to Test Referrals</h3>
        <ol className="text-xs text-blue-800 dark:text-blue-400 space-y-1 font-semibold">
          <li>1. Run the test above to check your referral system</li>
          <li>2. Copy your referral link and share it</li>
          <li>3. Have someone create a wallet using your link</li>
          <li>4. Check your downline to see the new referral</li>
          <li>5. Verify you received the 25 RZC referral bonus</li>
        </ol>
      </div>
    </div>
  );
};

export default ReferralSystemTest;