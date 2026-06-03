/**
 * Transaction Sync Service
 * Synchronizes blockchain transactions with Supabase database
 */

import { tonWalletService } from './tonWalletService';
import { supabaseService } from './supabaseService';
import { referralRewardService } from './referralRewardService';
import { tetherWdkService } from './tetherWdkService';

export class TransactionSyncService {
  private syncInProgress: boolean = false;
  private evmSyncInProgress: boolean = false;
  private lastSyncTime: number = 0;
  private lastEvmSyncTime: number = 0;
  private readonly SYNC_COOLDOWN = 10000; // 10 seconds between syncs

  /**
   * Sync transactions from blockchain to Supabase
   */
  async syncTransactions(
    walletAddress: string,
    userId: string
  ): Promise<{
    success: boolean;
    synced: number;
    error?: string;
  }> {
    // Prevent concurrent syncs
    if (this.syncInProgress) {
      console.log('⏳ Sync already in progress, skipping...');
      return { success: false, synced: 0, error: 'Sync in progress' };
    }

    // Cooldown check
    const now = Date.now();
    if (now - this.lastSyncTime < this.SYNC_COOLDOWN) {
      console.log('⏳ Sync cooldown active, skipping...');
      return { success: false, synced: 0, error: 'Cooldown active' };
    }

    this.syncInProgress = true;
    this.lastSyncTime = now;

    try {
      console.log('🔄 Starting transaction sync for:', walletAddress);

      // 1. Get transactions from blockchain
      const blockchainResult = await tonWalletService.getTransactions(walletAddress, 50);
      
      if (!blockchainResult.success || !blockchainResult.transactions) {
        console.warn('⚠️ Failed to fetch blockchain transactions');
        return { success: false, synced: 0, error: 'Blockchain fetch failed' };
      }

      const blockchainTxs = blockchainResult.transactions;
      console.log(`📦 Found ${blockchainTxs.length} blockchain transactions`);

      // 2. Get existing transactions from Supabase
      const supabaseResult = await supabaseService.getTransactions(walletAddress, 100);
      
      if (!supabaseResult.success) {
        console.warn('⚠️ Failed to fetch Supabase transactions');
        return { success: false, synced: 0, error: 'Supabase fetch failed' };
      }

      const existingTxs = supabaseResult.data || [];
      const existingHashes = new Set(existingTxs.map(tx => tx.tx_hash));
      console.log(`💾 Found ${existingTxs.length} existing transactions in database`);

      // 3. Find new transactions
      const newTxs = blockchainTxs.filter(tx => {
        const hash = tx.hash || tx.transaction_id?.hash;
        return hash && !existingHashes.has(hash);
      });

      console.log(`🆕 Found ${newTxs.length} new transactions to sync`);

      // 4. Save new transactions
      let syncedCount = 0;
      for (const tx of newTxs) {
        try {
          const hash = tx.hash || tx.transaction_id?.hash;
          const inMsg = tx.in_msg;
          const outMsgs = tx.out_msgs || [];
          
          // Determine transaction type
          const isReceive = inMsg && inMsg.source !== walletAddress;
          const isSend = outMsgs.length > 0;
          
          // Get amount (in nanotons, convert to TON)
          let amount = '0';
          if (isReceive && inMsg?.value) {
            amount = (Number(inMsg.value) / 1e9).toFixed(4);
          } else if (isSend && outMsgs[0]?.value) {
            amount = (Number(outMsgs[0].value) / 1e9).toFixed(4);
          }

          // Get addresses
          const fromAddress = inMsg?.source || walletAddress;
          const toAddress = outMsgs[0]?.destination || walletAddress;

          const result = await supabaseService.saveTransaction({
            user_id: userId,
            wallet_address: walletAddress,
            type: isReceive ? 'receive' : 'send',
            amount,
            asset: 'TON',
            tx_hash: hash,
            status: 'confirmed',
            from_address: fromAddress,
            to_address: toAddress,
            metadata: {
              fee: tx.fee ? (Number(tx.fee) / 1e9).toFixed(4) : '0',
              timestamp: tx.utime || tx.now,
              lt: tx.lt
            }
          });

          if (result.success) {
            syncedCount++;
            
            // Process referral reward for send transactions
            if (isSend && result.data && tx.fee) {
              const feeInTon = Number(tx.fee) / 1e9;
              console.log('💰 Processing referral reward for transaction fee:', feeInTon);
              
              // Process reward asynchronously (don't block sync)
              referralRewardService.processReferralReward(
                result.data.id,
                userId,
                feeInTon
              ).catch(error => {
                console.error('❌ Referral reward processing failed:', error);
              });
            }
          }
        } catch (error) {
          console.error('❌ Failed to save transaction:', error);
        }
      }

      console.log(`✅ Synced ${syncedCount} new transactions`);

      return {
        success: true,
        synced: syncedCount
      };
    } catch (error: any) {
      console.error('❌ Transaction sync error:', error);
      return {
        success: false,
        synced: 0,
        error: error.message
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync EVM transactions from blockchain to Supabase
   * NOTE: EVM functionality has been removed from TetherWdkService
   * This method is disabled until EVM support is re-implemented
   */
  async syncEvmTransactions(
    evmAddress: string,
    userId: string
  ): Promise<{
    success: boolean;
    synced: number;
    error?: string;
  }> {
    if (this.evmSyncInProgress) {
      console.log('⏳ EVM Sync already in progress, skipping...');
      return { success: false, synced: 0, error: 'Sync in progress' };
    }

    const now = Date.now();
    if (now - this.lastEvmSyncTime < this.SYNC_COOLDOWN) {
      console.log('⏳ EVM Sync cooldown active, skipping...');
      return { success: false, synced: 0, error: 'Cooldown active' };
    }

    this.evmSyncInProgress = true;
    this.lastEvmSyncTime = now;

    try {
      console.log('🔄 Starting multi-chain EVM USDT sync for:', evmAddress);
      
      const etherscanKey = import.meta.env.VITE_ETHERSCAN_API_KEY || '';
      const bscscanKey = import.meta.env.VITE_BSCSCAN_API_KEY || ''; 

      // Query both Ethereum Etherscan & BSC BscScan tokentx endpoints for USDT transfers
      const ethUrl = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=0xdAC17F958D2ee523a2206206994597C13D831ec7&address=${evmAddress}&page=1&offset=50&sort=desc${etherscanKey ? `&apikey=${etherscanKey}` : ''}`;
      const bscUrl = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=0x55d398326f99059fF775485246999027B3197955&address=${evmAddress}&page=1&offset=50&sort=desc${bscscanKey ? `&apikey=${bscscanKey}` : ''}`;

      const fetchTxs = async (url: string, chain: 'ethereum' | 'bsc') => {
        try {
          const res = await fetch(url);
          if (!res.ok) return [];
          const data = await res.json();
          if (data.status === '1' && Array.isArray(data.result)) {
            return data.result.map((tx: any) => ({ ...tx, chain }));
          }
        } catch (e) {
          console.warn(`⚠️ EVM block explorer fetch failed for ${chain}:`, e);
        }
        return [];
      };

      const [ethTxs, bscTxs] = await Promise.all([
        fetchTxs(ethUrl, 'ethereum'),
        fetchTxs(bscUrl, 'bsc')
      ]);

      const blockchainTxs = [...ethTxs, ...bscTxs];

      if (blockchainTxs.length === 0) {
        console.log('ℹ️ No EVM USDT transactions found or fetch failed');
        return { success: true, synced: 0 };
      }

      console.log(`📦 Found ${blockchainTxs.length} EVM USDT blockchain transactions`);

      // 2. Get existing transactions from Supabase
      const supabaseResult = await supabaseService.getTransactions(evmAddress, 100);
      const existingTxs = supabaseResult.data || [];
      const existingHashes = new Set(existingTxs.map(tx => tx.tx_hash));

      // 3. Find new transactions
      const newTxs = blockchainTxs.filter((tx: any) => tx.hash && !existingHashes.has(tx.hash));
      console.log(`🆕 Found ${newTxs.length} new EVM USDT transactions to sync`);

      // 4. Save new transactions
      let syncedCount = 0;
      for (const tx of newTxs) {
        try {
          const isReceive = tx.to.toLowerCase() === evmAddress.toLowerCase();
          const decimals = Number(tx.tokenDecimal || 18);
          const amount = (Number(tx.value) / Math.pow(10, decimals)).toFixed(2);

          const result = await supabaseService.saveTransaction({
            user_id: userId,
            wallet_address: evmAddress,
            type: isReceive ? 'receive' : 'send',
            amount,
            asset: 'USDT',
            tx_hash: tx.hash,
            status: 'confirmed',
            from_address: tx.from,
            to_address: tx.to,
            metadata: {
              fee: tx.gasUsed && tx.gasPrice ? (Number(tx.gasUsed) * Number(tx.gasPrice) / 1e18).toFixed(6) : '0',
              timestamp: tx.timeStamp,
              chain: tx.chain, 
              network: tx.chain === 'bsc' ? 'BEP-20' : 'ERC-20',
              contract_address: tx.contractAddress,
              tx_explorer_url: tx.chain === 'bsc' ? `https://bscscan.com/tx/${tx.hash}` : `https://etherscan.io/tx/${tx.hash}`
            }
          });

          if (result.success) {
            syncedCount++;
          }
        } catch (error) {
          console.error('❌ Failed to save EVM USDT transaction:', error);
        }
      }

      console.log(`✅ Synced ${syncedCount} new EVM USDT transactions`);
      return { success: true, synced: syncedCount };
    } catch (error: any) {
      console.error('❌ EVM USDT Transaction sync error:', error);
      return { success: false, synced: 0, error: error.message };
    } finally {
      this.evmSyncInProgress = false;
    }
  }

  /**
   * Start automatic sync interval
   */
  startAutoSync(
    walletAddress: string,
    userId: string,
    intervalMs: number = 30000, // 30 seconds
    evmAddress?: string
  ): NodeJS.Timeout {
    console.log('🔄 Starting auto-sync every', intervalMs / 1000, 'seconds');

    // Initial sync
    this.syncTransactions(walletAddress, userId);
    if (evmAddress) {
      this.syncEvmTransactions(evmAddress, userId);
    }

    // Set up interval
    return setInterval(() => {
      this.syncTransactions(walletAddress, userId);
      if (evmAddress) {
        this.syncEvmTransactions(evmAddress, userId);
      }
    }, intervalMs);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(intervalId: NodeJS.Timeout) {
    clearInterval(intervalId);
    console.log('🛑 Auto-sync stopped');
  }

  /**
   * Check if sync is in progress
   */
  isSyncing(): boolean {
    return this.syncInProgress;
  }
}

export const transactionSyncService = new TransactionSyncService();
