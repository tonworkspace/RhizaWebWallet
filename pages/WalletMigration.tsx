import React, { useState } from 'react';
import { ArrowRight, AlertCircle, CheckCircle, Loader, RefreshCw, Send, Coins, Star } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { migrationService } from '../services/migrationService';

const WalletMigration: React.FC = () => {
  const { address, userProfile } = useWallet();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'rzc' | 'stk'>('rzc');

  // RZC Migration States
  const [telegramUsername, setTelegramUsername] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [availableBalance, setAvailableBalance] = useState('');
  const [claimableBalance, setClaimableBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle');

  // STK Migration States
  const [stkAmount, setStkAmount] = useState('');
  const [tonStaked, setTonStaked] = useState('');
  const [stkTelegramUsername, setStkTelegramUsername] = useState('');
  const [stkMobileNumber, setStkMobileNumber] = useState('');
  const [stkWalletAddress, setStkWalletAddress] = useState('');
  const [nftTokenId, setNftTokenId] = useState('');
  const [isStkSubmitting, setIsStkSubmitting] = useState(false);
  const [stkMigrationStatus, setStkMigrationStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle');

  // Check if user has already submitted migration request
  React.useEffect(() => {
    const checkMigrationStatus = async () => {
      if (!address) return;
      
      const result = await migrationService.getMigrationStatus(address);
      if (result.success && result.data) {
        setMigrationStatus(result.data.status);
        setTelegramUsername(result.data.telegram_username);
        setMobileNumber(result.data.mobile_number);
        setAvailableBalance(result.data.available_balance.toString());
        setClaimableBalance(result.data.claimable_balance.toString());
      }
    };

    const checkStkMigrationStatus = async () => {
      if (!address) return;
      
      const result = await migrationService.getStkMigrationStatus(address);
      if (result.success && result.data) {
        setStkMigrationStatus(result.data.status);
        setStkTelegramUsername(result.data.telegram_username);
        setStkMobileNumber(result.data.mobile_number);
        setStkWalletAddress(result.data.stk_wallet_address);
        setNftTokenId(result.data.nft_token_id);
        setStkAmount(result.data.stk_amount.toString());
        setTonStaked(result.data.ton_staked.toString());
      }
    };

    checkMigrationStatus();
    checkStkMigrationStatus();
  }, [address]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      showToast('Wallet not connected', 'error');
      return;
    }

    // Validation
    if (!telegramUsername.trim()) {
      showToast('Please enter your Telegram username', 'error');
      return;
    }

    if (!mobileNumber.trim()) {
      showToast('Please enter your mobile number', 'error');
      return;
    }

    const mobileRegex = /^\+?[1-9]\d{1,14}$/;
    if (!mobileRegex.test(mobileNumber.replace(/[\s-]/g, ''))) {
      showToast('Please enter a valid mobile number', 'error');
      return;
    }

    const available = parseFloat(availableBalance);
    const claimable = parseFloat(claimableBalance);

    if (isNaN(available) || available < 0) {
      showToast('Please enter a valid available balance', 'error');
      return;
    }

    if (isNaN(claimable) || claimable < 0) {
      showToast('Please enter a valid claimable balance', 'error');
      return;
    }

    if (available === 0 && claimable === 0) {
      showToast('Total balance must be greater than 0', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await migrationService.submitMigrationRequest({
        wallet_address: address,
        telegram_username: telegramUsername.trim(),
        mobile_number: mobileNumber.trim(),
        available_balance: available,
        claimable_balance: claimable,
        total_balance: available + claimable
      });

      if (result.success) {
        showToast('Migration request submitted successfully!', 'success');
        setMigrationStatus('pending');
      } else {
        throw new Error(result.error || 'Failed to submit migration request');
      }
    } catch (error: any) {
      console.error('Migration submission error:', error);
      showToast(error.message || 'Failed to submit migration request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      showToast('Wallet not connected', 'error');
      return;
    }

    // Validation
    if (!stkTelegramUsername.trim()) {
      showToast('Please enter your Telegram username', 'error');
      return;
    }

    if (!stkMobileNumber.trim()) {
      showToast('Please enter your mobile number', 'error');
      return;
    }

    const mobileRegex = /^\+?[1-9]\d{1,14}$/;
    if (!mobileRegex.test(stkMobileNumber.replace(/[\s-]/g, ''))) {
      showToast('Please enter a valid mobile number', 'error');
      return;
    }

    if (!stkWalletAddress.trim()) {
      showToast('Please enter your STK wallet address', 'error');
      return;
    }

    if (!nftTokenId.trim()) {
      showToast('Please enter your NFT Token ID', 'error');
      return;
    }

    const stk = parseFloat(stkAmount);
    const ton = parseFloat(tonStaked);

    if (isNaN(stk) || stk <= 0) {
      showToast('Please enter a valid STK amount', 'error');
      return;
    }

    if (isNaN(ton) || ton < 0) {
      showToast('Please enter a valid TON staked amount', 'error');
      return;
    }

    setIsStkSubmitting(true);

    try {
      const result = await migrationService.submitStkMigrationRequest({
        wallet_address: address,
        telegram_username: stkTelegramUsername.trim(),
        mobile_number: stkMobileNumber.trim(),
        stk_wallet_address: stkWalletAddress.trim(),
        nft_token_id: nftTokenId.trim(),
        stk_amount: stk,
        ton_staked: ton
      });

      if (result.success) {
        showToast('STK migration request submitted successfully!', 'success');
        setStkMigrationStatus('pending');
      } else {
        throw new Error(result.error || 'Failed to submit STK migration request');
      }
    } catch (error: any) {
      console.error('STK migration submission error:', error);
      showToast(error.message || 'Failed to submit STK migration request', 'error');
    } finally {
      setIsStkSubmitting(false);
    }
  };

  const totalBalance = (parseFloat(availableBalance) || 0) + (parseFloat(claimableBalance) || 0);
  const starfiPoints = parseFloat(stkAmount) || 0;
  const rzcFromStk = (starfiPoints / 10000000) * 8; // 10M STK = 8 RZC

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter px-3 sm:px-4 md:px-0 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950 dark:text-white">
          Wallet Migration
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Migrate your assets from pre-mine season to mainnet
        </p>
      </div>

      {/* Tab Navigation - hidden, STK tab disabled for now */}
      <div className="hidden">
        <button
          onClick={() => setActiveTab('rzc')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'rzc'
              ? 'bg-white dark:bg-white/10 text-gray-950 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
          }`}
        >
          <Coins size={18} />
          <span>RZC Migration</span>
        </button>
        <button
          onClick={() => setActiveTab('stk')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'stk'
              ? 'bg-white dark:bg-white/10 text-gray-950 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
          }`}
        >
          <Star size={18} />
          <span>STK to StarFi</span>
        </button>
      </div>

      {/* RZC Migration Tab */}
      {activeTab === 'rzc' && (
        <>
          {/* Info Banner */}
          <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/20 rounded-2xl">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">
                  Important Information
                </h3>
                <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1 leading-relaxed">
                  <li>• Submit your old wallet balance details for verification</li>
                  <li>• Our team will review and approve your migration request</li>
                  <li>• Once approved, your RZC will be credited to your mainnet wallet</li>
                  <li>• This process may take 24-48 hours for verification</li>
                </ul>
              </div>
            </div>
          </div>

      {/* Status Display */}
      {migrationStatus !== 'idle' && (
        <div className={`p-4 rounded-2xl border-2 ${
          migrationStatus === 'pending' 
            ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20'
            : migrationStatus === 'approved'
            ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20'
            : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
        }`}>
          <div className="flex items-center gap-3">
            {migrationStatus === 'pending' && <Loader className="animate-spin text-yellow-600 dark:text-yellow-400" size={20} />}
            {migrationStatus === 'approved' && <CheckCircle className="text-green-600 dark:text-green-400" size={20} />}
            {migrationStatus === 'rejected' && <AlertCircle className="text-red-600 dark:text-red-400" size={20} />}
            <div className="flex-1">
              <h3 className={`text-sm font-bold mb-0.5 ${
                migrationStatus === 'pending' 
                  ? 'text-yellow-900 dark:text-yellow-300'
                  : migrationStatus === 'approved'
                  ? 'text-green-900 dark:text-green-300'
                  : 'text-red-900 dark:text-red-300'
              }`}>
                {migrationStatus === 'pending' && 'Migration Request Pending'}
                {migrationStatus === 'approved' && 'Migration Approved!'}
                {migrationStatus === 'rejected' && 'Migration Request Rejected'}
              </h3>
              <p className={`text-xs ${
                migrationStatus === 'pending' 
                  ? 'text-yellow-800 dark:text-yellow-400'
                  : migrationStatus === 'approved'
                  ? 'text-green-800 dark:text-green-400'
                  : 'text-red-800 dark:text-red-400'
              }`}>
                {migrationStatus === 'pending' && 'Your request is being reviewed by our team'}
                {migrationStatus === 'approved' && 'Your RZC has been credited to your wallet'}
                {migrationStatus === 'rejected' && 'Please contact support for more information'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Migration Form */}
      {(migrationStatus === 'idle' || migrationStatus === 'rejected') && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Main Card */}
          <div className="bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-2xl p-5 sm:p-6 space-y-5">
            {/* Current Wallet Info */}
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-500 mb-2 uppercase tracking-wider">
                Mainnet Wallet Address
              </p>
              <code className="text-xs font-mono text-gray-900 dark:text-white break-all">
                {address}
              </code>
            </div>

            {/* Telegram Username */}
            <div>
              <label className="block text-sm font-bold text-gray-950 dark:text-white mb-2">
                Telegram Username *
              </label>
              <input
                type="text"
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
                placeholder="@username"
                disabled={migrationStatus !== 'idle' && migrationStatus !== 'rejected'}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white font-semibold outline-none focus:border-primary transition-all disabled:opacity-50"
              />
              <p className="text-xs text-gray-600 dark:text-gray-500 mt-1.5">
                Your Telegram username from the old wallet
              </p>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-sm font-bold text-gray-950 dark:text-white mb-2">
                Mobile Number *
              </label>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="+1234567890"
                disabled={migrationStatus !== 'idle' && migrationStatus !== 'rejected'}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white font-semibold outline-none focus:border-primary transition-all disabled:opacity-50"
              />
              <p className="text-xs text-gray-600 dark:text-gray-500 mt-1.5">
                Include country code (e.g., +1 for US)
              </p>
            </div>

            {/* Balance Section */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-gray-950 dark:text-white">
                Old Wallet Balance
              </h3>

              {/* Available Balance */}
              <div>
                <label className="block text-sm font-bold text-gray-950 dark:text-white mb-2">
                  Available Balance (RZC) *
                </label>
                <input
                  type="number"
                  value={availableBalance}
                  onChange={(e) => setAvailableBalance(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  disabled={migrationStatus !== 'idle' && migrationStatus !== 'rejected'}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white font-semibold outline-none focus:border-primary transition-all disabled:opacity-50"
                />
                <p className="text-xs text-gray-600 dark:text-gray-500 mt-1.5">
                  Your current available balance in the old wallet
                </p>
              </div>

              {/* Claimable Balance */}
              <div>
                <label className="block text-sm font-bold text-gray-950 dark:text-white mb-2">
                  Claimable Balance (RZC) *
                </label>
                <input
                  type="number"
                  value={claimableBalance}
                  onChange={(e) => setClaimableBalance(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  disabled={migrationStatus !== 'idle' && migrationStatus !== 'rejected'}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white font-semibold outline-none focus:border-primary transition-all disabled:opacity-50"
                />
                <p className="text-xs text-gray-600 dark:text-gray-500 mt-1.5">
                  Your pending/claimable balance in the old wallet
                </p>
              </div>

              {/* Total Display */}
              {totalBalance > 0 && (
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-500/10 dark:to-cyan-500/10 border-2 border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                      Total Balance to Migrate
                    </span>
                    <span className="text-2xl font-black text-emerald-900 dark:text-emerald-300">
                      {totalBalance.toLocaleString()} RZC
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || (migrationStatus !== 'idle' && migrationStatus !== 'rejected')}
            className="w-full py-4 bg-primary text-black rounded-xl font-bold text-base hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader className="animate-spin" size={20} />
                <span>Submitting Request...</span>
              </>
            ) : (
              <>
                <Send size={20} />
                <span>Submit Migration Request</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      )}

          {/* Help Section */}
          <div className="p-4 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl">
            <h3 className="text-sm font-bold text-gray-950 dark:text-white mb-2">
              Need Help?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              If you have any questions about the migration process or need assistance, 
              please contact our support team through the Help Center.
            </p>
          </div>
        </>
      )}

      {/* STK to StarFi Tab - hidden */}
      {false && activeTab === 'stk' && (
        <>
          {/* Info Banner */}
          <div className="p-4 bg-purple-50 dark:bg-purple-500/10 border-2 border-purple-200 dark:border-purple-500/20 rounded-2xl">
            <div className="flex items-start gap-3">
              <Star size={20} className="text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300 mb-1">
                  STK to StarFi Point Conversion
                </h3>
                <ul className="text-xs text-purple-800 dark:text-purple-400 space-y-1 leading-relaxed">
                  <li>• Convert your STK tokens to StarFi Points (1:1 ratio)</li>
                  <li>• StarFi Points can be claimed as RZC (10,000,000 Points = 8 RZC)</li>
                  <li>• Submit your STK balance for verification</li>
                  <li>• Verification process takes 24-48 hours</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Status Display */}
          {stkMigrationStatus !== 'idle' && (
            <div className={`p-4 rounded-2xl border-2 ${
              stkMigrationStatus === 'pending' 
                ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20'
                : stkMigrationStatus === 'approved'
                ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20'
                : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
            }`}>
              <div className="flex items-center gap-3">
                {stkMigrationStatus === 'pending' && <Loader className="animate-spin text-yellow-600 dark:text-yellow-400" size={20} />}
                {stkMigrationStatus === 'approved' && <CheckCircle className="text-green-600 dark:text-green-400" size={20} />}
                {stkMigrationStatus === 'rejected' && <AlertCircle className="text-red-600 dark:text-red-400" size={20} />}
                <div className="flex-1">
                  <h3 className={`text-sm font-bold mb-0.5 ${
                    stkMigrationStatus === 'pending' 
                      ? 'text-yellow-900 dark:text-yellow-300'
                      : stkMigrationStatus === 'approved'
                      ? 'text-green-900 dark:text-green-300'
                      : 'text-red-900 dark:text-red-300'
                  }`}>
                    {stkMigrationStatus === 'pending' && 'STK Migration Request Pending'}
                    {stkMigrationStatus === 'approved' && 'STK Migration Approved!'}
                    {stkMigrationStatus === 'rejected' && 'STK Migration Request Rejected'}
                  </h3>
                  <p className={`text-xs ${
                    stkMigrationStatus === 'pending' 
                      ? 'text-yellow-800 dark:text-yellow-400'
                      : stkMigrationStatus === 'approved'
                      ? 'text-green-800 dark:text-green-400'
                      : 'text-red-800 dark:text-red-400'
                  }`}>
                    {stkMigrationStatus === 'pending' && 'Your request is being reviewed by our team'}
                    {stkMigrationStatus === 'approved' && 'Your StarFi Points have been credited'}
                    {stkMigrationStatus === 'rejected' && 'Please contact support for more information'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STK Migration Form */}
          {(stkMigrationStatus === 'idle' || stkMigrationStatus === 'rejected') && (
            <form onSubmit={handleStkSubmit} className="space-y-5">
              {/* Main Card */}
              <div className="bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-2xl p-5 sm:p-6 space-y-5">
                {/* Current Wallet Info */}
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-500 mb-2 uppercase tracking-wider">
                    Mainnet Wallet Address
                  </p>
                  <code className="text-xs font-mono text-gray-900 dark:text-white break-all">
                    {address}
                  </code>
                </div>

                {/* Telegram Username */}
                <div>
                  <label className="block text-sm font-bold text-gray-950 dark:text-white mb-2">
                    Telegram Username *
                  </label>
                  <input
                    type="text"
                    value={stkTelegramUsername}
                    onChange={(e) => setStkTelegramUsername(e.target.value)}
                    placeholder="@username"
                    disabled={stkMigrationStatus !== 'idle' && stkMigrationStatus !== 'rejected'}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white font-semibold outline-none focus:border-primary transition-all disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-500 mt-1.5">
                    Your Telegram username from the old wallet
                  </p>
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-sm font-bold text-gray-950 dark:text-white mb-2">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={stkMobileNumber}
                    onChange={(e) => setStkMobileNumber(e.target.value)}
                    placeholder="+1234567890"
                    disabled={stkMigrationStatus !== 'idle' && stkMigrationStatus !== 'rejected'}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white font-semibold outline-none focus:border-primary transition-all disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-500 mt-1.5">
                    Include country code (e.g., +1 for US)
                  </p>
                </div>

                {/* STK Wallet Address */}
                <div>
                  <label className="block text-sm font-bold text-gray-950 dark:text-white mb-2">
                    STK Wallet Address *
                  </label>
                  <input
                    type="text"
                    value={stkWalletAddress}
                    onChange={(e) => setStkWalletAddress(e.target.value)}
                    placeholder="UQxxx..."
                    disabled={stkMigrationStatus !== 'idle' && stkMigrationStatus !== 'rejected'}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white font-mono text-sm outline-none focus:border-primary transition-all disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-500 mt-1.5">
                    Your old wallet address that holds the STK tokens
                  </p>
                </div>

                {/* NFT Token ID */}
                <div>
                  <label className="block text-sm font-bold text-gray-950 dark:text-white mb-2">
                    NFT Token ID *
                  </label>
                  <input
                    type="text"
                    value={nftTokenId}
                    onChange={(e) => setNftTokenId(e.target.value)}
                    placeholder="NFT-12345"
                    disabled={stkMigrationStatus !== 'idle' && stkMigrationStatus !== 'rejected'}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white font-semibold outline-none focus:border-primary transition-all disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-500 mt-1.5">
                    Your NFT Token ID associated with the STK wallet
                  </p>
                </div>

                {/* STK Amount */}
                <div>
                  <label className="block text-sm font-bold text-gray-950 dark:text-white mb-2">
                    STK Amount *
                  </label>
                  <input
                    type="number"
                    value={stkAmount}
                    onChange={(e) => setStkAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    disabled={stkMigrationStatus !== 'idle' && stkMigrationStatus !== 'rejected'}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white font-semibold outline-none focus:border-primary transition-all disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-500 mt-1.5">
                    Your total STK balance from the old wallet
                  </p>
                </div>

                {/* TON Staked */}
                <div>
                  <label className="block text-sm font-bold text-gray-950 dark:text-white mb-2">
                    TON Staked *
                  </label>
                  <input
                    type="number"
                    value={tonStaked}
                    onChange={(e) => setTonStaked(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    disabled={stkMigrationStatus !== 'idle' && stkMigrationStatus !== 'rejected'}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white font-semibold outline-none focus:border-primary transition-all disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-500 mt-1.5">
                    Amount of TON tokens you have staked
                  </p>
                </div>

                {/* Conversion Display */}
                {starfiPoints > 0 && (
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 border-2 border-purple-200 dark:border-purple-500/20 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-purple-900 dark:text-purple-300">
                          StarFi Points
                        </span>
                        <span className="text-2xl font-black text-purple-900 dark:text-purple-300">
                          {starfiPoints.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-purple-700 dark:text-purple-400">
                        1 STK = 1 StarFi Point
                      </p>
                    </div>

                    <div className="flex items-center justify-center">
                      <ArrowRight className="text-gray-400" size={24} />
                    </div>

                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-500/10 dark:to-cyan-500/10 border-2 border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                          Claimable RZC
                        </span>
                        <span className="text-2xl font-black text-emerald-900 dark:text-emerald-300">
                          {rzcFromStk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RZC
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        10,000,000 StarFi Points = 8 RZC
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isStkSubmitting || (stkMigrationStatus !== 'idle' && stkMigrationStatus !== 'rejected')}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-base hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg flex items-center justify-center gap-2"
              >
                {isStkSubmitting ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Star size={20} />
                    <span>Submit STK Migration</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Help Section */}
          <div className="p-4 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl">
            <h3 className="text-sm font-bold text-gray-950 dark:text-white mb-2">
              Need Help?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              If you have any questions about the STK migration process or need assistance, 
              please contact our support team through the Help Center.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default WalletMigration;
