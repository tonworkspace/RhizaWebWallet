import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { getNetworkConfig } from '../constants';
import { supabaseService } from '../services/supabaseService';

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'purchase';
  amount: string;
  asset: string;
  timestamp: number;
  status: 'completed' | 'pending' | 'failed';
  address?: string;
  hash?: string;
  fee?: string;
  comment?: string;
  counterpartyUsername?: string;
}

/**
 * Deduplicate transactions based on unique identifiers.
 * 
 * Priority for deduplication:
 * 1. Transaction hash (if available)
 * 2. Combination of: id + timestamp + amount + asset
 * 
 * When duplicates are found, keeps the one with more data (e.g., has comment, username).
 */
function deduplicateTransactions(transactions: Transaction[]): Transaction[] {
  const seen = new Map<string, Transaction>();
  
  for (const tx of transactions) {
    // Create unique key based on available data
    let key: string;
    
    if (tx.hash) {
      // Hash is the most reliable unique identifier
      key = `hash:${tx.hash}`;
    } else {
      // Fallback to composite key
      // Normalize timestamp to nearest second to catch near-duplicates
      const normalizedTimestamp = Math.floor(tx.timestamp / 1000) * 1000;
      key = `composite:${tx.id}-${normalizedTimestamp}-${tx.amount}-${tx.asset}`;
    }
    
    const existing = seen.get(key);
    
    if (!existing) {
      // First occurrence - add it
      seen.set(key, tx);
    } else {
      // Duplicate found - keep the one with more data
      const existingScore = getTransactionDataScore(existing);
      const currentScore = getTransactionDataScore(tx);
      
      if (currentScore > existingScore) {
        // Current transaction has more data - replace existing
        seen.set(key, tx);
      }
      // Otherwise keep existing
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Calculate a "data score" for a transaction based on how much information it contains.
 * Higher score = more complete data.
 */
function getTransactionDataScore(tx: Transaction): number {
  let score = 0;
  
  if (tx.hash) score += 10;
  if (tx.comment) score += 5;
  if (tx.counterpartyUsername) score += 5;
  if (tx.address) score += 3;
  if (tx.fee) score += 2;
  if (tx.status === 'completed') score += 1;
  
  return score;
}

export const useTransactions = () => {
  const { address, network, userProfile } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const fetchTransactions = useCallback(async () => {
    if (!address) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const config = getNetworkConfig(network);
      const tonApiEndpoint = network === 'mainnet'
        ? 'https://tonapi.io/v2'
        : 'https://testnet.tonapi.io/v2';

      const userId = userProfile?.id ?? null;

      console.log(`📜 Fetching transactions for ${address} on ${network}... userId: ${userId}`);

      // ── Fetch TON + RZC in parallel ───────────────────────────────────────────
      const tonPromise = fetch(`${tonApiEndpoint}/blockchain/accounts/${address}/transactions?limit=50`, {
          headers: { 'Authorization': `Bearer ${config.TONAPI_KEY}` }
      }).then(res => res.ok ? res.json() : Promise.reject(new Error(`TonAPI error: ${res.status}`)));

      const rzcPromise = (async () => {
          if (!userId) return { data: [], error: null };
          const client = supabaseService.getClient();
          if (!client) return { data: [], error: null };
          try {
            return await client
              .from('rzc_transactions')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(50);
          } catch (e) {
            console.warn('[useTransactions] RZC fetch error:', e);
            return { data: [], error: e };
          }
      })();

      const results = await Promise.allSettled([
        tonPromise,
        rzcPromise
      ]);
      const tonResponse = results[0];
      const rzcResult = results[1];

      // --- TON transactions ---
      const tonTransactions: Transaction[] = [];
      let tonFetchError: string | null = null;

      if (tonResponse.status === 'fulfilled') {
        const data = tonResponse.value;
        for (const tx of data.transactions ?? []) {
          const isOutgoing = tx.out_msgs && tx.out_msgs.length > 0;
          const isIncoming = tx.in_msg && tx.in_msg.value > 0;

          let type: Transaction['type'] = 'receive';
          if (isOutgoing) type = 'send';
          else if (isIncoming) type = 'receive';

          let amount = '0';
          let targetAddress = '';

          if (isOutgoing && tx.out_msgs[0]) {
            amount = (Number(tx.out_msgs[0].value) / 1e9).toFixed(4);
            targetAddress = tx.out_msgs[0].destination?.address || '';
          } else if (isIncoming && tx.in_msg) {
            amount = (Number(tx.in_msg.value) / 1e9).toFixed(4);
            targetAddress = tx.in_msg.source?.address || '';
          }

          const fee = tx.total_fees ? (Number(tx.total_fees) / 1e9).toFixed(4) : '0';

          let comment = '';
          if (tx.in_msg?.decoded_body?.text) comment = tx.in_msg.decoded_body.text;
          else if (tx.out_msgs?.[0]?.decoded_body?.text) comment = tx.out_msgs[0].decoded_body.text;

          tonTransactions.push({
            id: tx.hash || tx.lt,
            type,
            amount,
            asset: 'TON',
            timestamp: tx.utime * 1000,
            status: tx.success ? 'completed' : 'failed',
            address: targetAddress,
            hash: tx.hash,
            fee,
            comment
          });
        }
      } else {
        tonFetchError = tonResponse.reason?.message || 'Network error';
        console.error('❌ TON transaction fetch failed:', tonFetchError);
      }

      // --- RZC transactions from Supabase ---
      const rzcTransactions: Transaction[] = [];

      if (rzcResult.status === 'fulfilled') {
        const { data: rows, error: rzcError } = rzcResult.value as { data: any[] | null; error: any };
        if (rzcError) {
          console.error('❌ RZC transaction fetch failed:', rzcError.message);
        } else {
          for (const row of rows ?? []) {
            // Map all RZC activity types to display types
            const t = row.type ?? '';
            let txType: Transaction['type'] = 'receive';
            if (t === 'transfer_sent') {
              txType = 'send';
            } else if (
              t === 'purchase' || t === 'bonus' || t === 'reward' ||
              t === 'referral_bonus' || t === 'referral_reward' ||
              t === 'activation_bonus' || t === 'squad_reward' ||
              t === 'airdrop' || t === 'claim' || t === 'migration'
            ) {
              txType = 'purchase'; // shows ShoppingBag icon — represents "earned/received"
            } else if (t === 'transfer_received' || t === 'transfer') {
              txType = 'receive';
            }

            // Human-readable label for the comment/description
            const typeLabel: Record<string, string> = {
              purchase: 'RZC Purchase',
              bonus: 'Bonus Reward',
              reward: 'Reward',
              referral_bonus: 'Referral Bonus',
              referral_reward: 'Referral Reward',
              activation_bonus: 'Activation Bonus',
              squad_reward: 'Squad Reward',
              airdrop: 'Airdrop',
              claim: 'Claim',
              migration: 'Migration',
              transfer_sent: 'Sent',
              transfer_received: 'Received',
              transfer: 'Transfer',
            };

            const meta = row.metadata ?? {};
            const counterpartyUsername: string | undefined =
              meta.recipient_username ?? meta.sender_username ?? undefined;
            const counterpartyWallet: string | undefined =
              meta.recipient_wallet ?? meta.sender_wallet ?? undefined;

            rzcTransactions.push({
              id: row.id,
              type: txType,
              amount: Math.abs(Number(row.amount)).toLocaleString(undefined, { maximumFractionDigits: 2 }),
              asset: 'RZC',
              timestamp: new Date(row.created_at).getTime(),
              status: 'completed',
              address: counterpartyWallet,
              counterpartyUsername,
              comment: row.description ?? typeLabel[t] ?? t
            });
          }
        }
      } else {
        console.error('❌ RZC fetch promise rejected:', rzcResult.reason);
      }

      // Merge, deduplicate, and sort by timestamp descending
      const merged = [...tonTransactions, ...rzcTransactions];
      const deduplicated = deduplicateTransactions(merged);
      const sorted = deduplicated.sort((a, b) => b.timestamp - a.timestamp);

      console.log(`✅ Fetched ${tonTransactions.length} TON + ${rzcTransactions.length} RZC transactions (${merged.length - deduplicated.length} duplicates removed)`);
      setTransactions(sorted);

      if (sorted.length === 0 && tonFetchError) {
        setError('Failed to load transactions');
      }
    } catch (err) {
      console.error('❌ Transaction fetch failed:', err);
      setError('Failed to load transactions');
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [address, network, userProfile?.id]);

  useEffect(() => {
    fetchTransactions();
    // Auto-refresh every 30s for new incoming transactions
    const interval = setInterval(() => fetchTransactions(), 30_000);
    return () => clearInterval(interval);
  }, [fetchTransactions, refreshTick]);

  // Re-fetch when userProfile becomes available — RZC transactions need userId
  useEffect(() => {
    if (userProfile?.id && address) {
      fetchTransactions();
    }
  }, [userProfile?.id, address]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshTransactions = useCallback((delayMs?: number) => {
    if (delayMs) {
      setTimeout(() => setRefreshTick(t => t + 1), delayMs);
    } else {
      fetchTransactions();
    }
  }, [fetchTransactions]);

  return {
    transactions,
    isLoading,
    error,
    refreshTransactions
  };
};
