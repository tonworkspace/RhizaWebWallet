/**
 * Transaction Sync Service
 * Synchronizes blockchain transactions with Supabase database
 */

import { tonWalletService } from './tonWalletService';
import { supabaseService } from './supabaseService';
import { referralRewardService } from './referralRewardService';

export class TransactionSyncService {
  private syncInProgress: boolean = false;
  private lastSyncTime: number = 0;
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
   * Start automatic sync interval
   */
  startAutoSync(
    walletAddress: string,
    userId: string,
    intervalMs: number = 30000 // 30 seconds
  ): NodeJS.Timeout {
    console.log('🔄 Starting auto-sync every', intervalMs / 1000, 'seconds');

    // Initial sync
    this.syncTransactions(walletAddress, userId);

    // Set up interval
    return setInterval(() => {
      this.syncTransactions(walletAddress, userId);
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
