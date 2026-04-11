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

      // Setup baseline tracking targets
      const fetchPromises: Promise<any>[] = [
        fetch(`${tonApiEndpoint}/blockchain/accounts/${address}/transactions?limit=50`, {
          headers: { 'Authorization': `Bearer ${config.TONAPI_KEY}` }
        }),
        userId
          ? (async () => {
              const client = supabaseService.getClient();
              if (!client) return { data: [], error: null };
              return await client.from('rzc_transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);
            })()
          : Promise.resolve({ data: [], error: null })
      ];

      // Integrate WDK Indexer REST API for Multi-Chain workflows dynamically
      const { WalletManager } = await import('../utils/walletManager');
      const allWallets = WalletManager.getWallets();
      // Secondary wallet exists independently — find it regardless of which wallet is active
      const multiWallet = allWallets.find(w => w.type === 'secondary');

      if (multiWallet && multiWallet.addresses) {
        // Use public block explorers instead of WDK indexer (more reliable, no API key needed)
        if (multiWallet.addresses.evm) {
          fetchPromises.push(
            fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=${multiWallet.addresses.evm}&startblock=0&endblock=99999999&sort=desc&apikey=YourApiKeyToken`)
              .then(res => res.ok ? res.json() : { result: [] })
              .catch(() => ({ result: [] }))
          );
        }
        if (multiWallet.addresses.btc) {
          fetchPromises.push(
            fetch(`https://mempool.space/api/address/${multiWallet.addresses.btc}/txs`)
              .then(res => res.ok ? res.json() : [])
              .catch(() => [])
          );
        }
      }

      const results = await Promise.allSettled(fetchPromises);
      const tonResponse = results[0];
      const rzcResult = results[1];

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

      // --- Multi-Chain transactions from public explorers ---
      const multiChainTransactions: Transaction[] = [];

      // EVM (Etherscan-compatible)
      if (results.length > 2 && results[2].status === 'fulfilled') {
        const evmData = results[2].value?.result;
        if (Array.isArray(evmData)) {
          const evmAddr = multiWallet?.addresses?.evm?.toLowerCase();
          for (const tx of evmData.slice(0, 20)) {
            const isSend = tx.from?.toLowerCase() === evmAddr;
            multiChainTransactions.push({
              id: tx.hash,
              type: isSend ? 'send' : 'receive',
              amount: (Number(tx.value) / 1e18).toFixed(6),
              asset: 'ETH',
              timestamp: Number(tx.timeStamp) * 1000,
              status: tx.isError === '0' ? 'completed' : 'failed',
              address: isSend ? tx.to : tx.from,
              hash: tx.hash,
              fee: (Number(tx.gasUsed) * Number(tx.gasPrice) / 1e18).toFixed(6)
            });
          }
        }
      }

      // BTC (mempool.space)
      if (results.length > 3 && results[3].status === 'fulfilled') {
        const btcData = results[3].value;
        if (Array.isArray(btcData)) {
          const btcAddr = multiWallet?.addresses?.btc;
          for (const tx of btcData.slice(0, 20)) {
            const sentSats = tx.vin?.filter((v: any) => v.prevout?.scriptpubkey_address === btcAddr)
              .reduce((sum: number, v: any) => sum + (v.prevout?.value || 0), 0) || 0;
            const receivedSats = tx.vout?.filter((v: any) => v.scriptpubkey_address === btcAddr)
              .reduce((sum: number, v: any) => sum + (v.value || 0), 0) || 0;
            const isSend = sentSats > receivedSats;
            const netSats = Math.abs(receivedSats - sentSats);
            multiChainTransactions.push({
              id: tx.txid,
              type: isSend ? 'send' : 'receive',
              amount: (netSats / 1e8).toFixed(8),
              asset: 'BTC',
              timestamp: tx.status?.block_time ? tx.status.block_time * 1000 : Date.now(),
              status: tx.status?.confirmed ? 'completed' : 'pending',
              address: isSend
                ? tx.vout?.find((v: any) => v.scriptpubkey_address !== btcAddr)?.scriptpubkey_address
                : tx.vin?.[0]?.prevout?.scriptpubkey_address,
              hash: tx.txid
            });
          }
        }
      }

      // Merge and sort by timestamp descending
      const merged = [...tonTransactions, ...rzcTransactions, ...multiChainTransactions].sort(
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
    // Auto-refresh every 60s for new incoming transactions
    const interval = setInterval(() => fetchTransactions(), 60_000);
    return () => clearInterval(interval);
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
