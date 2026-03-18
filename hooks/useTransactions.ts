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

      console.log(`📜 Fetching transactions for ${address} on ${network}...`);

      // Fetch TON on-chain transactions and RZC Supabase transactions in parallel
      const [tonResponse, rzcResult] = await Promise.allSettled([
        fetch(`${tonApiEndpoint}/blockchain/accounts/${address}/transactions?limit=50`, {
          headers: { 'Authorization': `Bearer ${config.TONAPI_KEY}` }
        }),
        userId
          ? supabaseService.getClient()
              ?.from('rzc_transactions')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(50) ?? Promise.resolve({ data: [], error: null })
          : Promise.resolve({ data: [], error: null })
      ]);

      // --- TON transactions ---
      const tonTransactions: Transaction[] = [];
      let tonFetchError: string | null = null;

      if (tonResponse.status === 'fulfilled') {
        if (tonResponse.value.ok) {
          const data = await tonResponse.value.json();
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
          tonFetchError = `TonAPI error: ${tonResponse.value.status}`;
          console.error('❌ TON transaction fetch failed:', tonFetchError);
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
            // Determine direction from type field
            const isSent = row.type === 'transfer_sent';
            const isReceived = row.type === 'transfer_received';
            const isPurchase = row.type === 'purchase' || row.type === 'bonus' || row.type === 'reward';

            let txType: Transaction['type'] = 'receive';
            if (isSent) txType = 'send';
            else if (isPurchase) txType = 'purchase';
            else if (isReceived) txType = 'receive';

            // Pull counterparty info from metadata if available
            const meta = row.metadata ?? {};
            const counterpartyUsername: string | undefined =
              meta.recipient_username ?? meta.sender_username ?? undefined;
            const counterpartyWallet: string | undefined =
              meta.recipient_wallet ?? meta.sender_wallet ?? undefined;

            rzcTransactions.push({
              id: row.id,
              type: txType,
              // Always store as absolute value — direction is encoded in `type`
              amount: Math.abs(Number(row.amount)).toLocaleString(undefined, { maximumFractionDigits: 2 }),
              asset: 'RZC',
              timestamp: new Date(row.created_at).getTime(),
              status: 'completed',
              address: counterpartyWallet,
              counterpartyUsername,
              comment: row.description ?? undefined
            });
          }
        }
      } else {
        console.error('❌ RZC fetch promise rejected:', rzcResult.reason);
      }

      // Merge and sort by timestamp descending
      const merged = [...tonTransactions, ...rzcTransactions].sort(
        (a, b) => b.timestamp - a.timestamp
      );

      console.log(`✅ Fetched ${tonTransactions.length} TON + ${rzcTransactions.length} RZC transactions`);
      setTransactions(merged);

      if (merged.length === 0 && tonFetchError) {
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
  }, [fetchTransactions, refreshTick]);

  // Re-fetch once userProfile becomes available (loads after address)
  useEffect(() => {
    if (userProfile?.id && address) {
      fetchTransactions();
    }
  }, [userProfile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
