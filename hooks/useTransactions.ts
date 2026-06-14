import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { getNetworkConfig } from '../constants';
import { supabaseService } from '../services/supabaseService';
import { WalletManager } from '../utils/walletManager';
import { tetherWdkService } from '../services/tetherWdkService';

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
  const { address, network, userProfile, pendingTransactions, removePendingTransaction } = useWallet();
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

      let fetchAddress = address;
      try {
        const { Address } = await import('@ton/ton');
        // TonAPI testnet endpoint requires mainnet-formatted (UQ/EQ) or raw addresses
        fetchAddress = Address.parse(address).toString({ testOnly: false, bounceable: false });
      } catch (e) {
        console.warn('Failed to parse address for TonAPI:', e);
      }

      // ── Fetch TON + RZC in parallel ───────────────────────────────────────────
      const tonPromise = (async () => {
        try {
          const [resNative, resJetton] = await Promise.all([
            fetch(`${tonApiEndpoint}/blockchain/accounts/${fetchAddress}/transactions?limit=50`, {
              headers: { 'Authorization': `Bearer ${config.TONAPI_KEY}` }
            }).then(res => res.ok ? res.json() : { transactions: [] }),
            fetch(`${tonApiEndpoint}/accounts/${fetchAddress}/jettons/history?limit=50`, {
              headers: { 'Authorization': `Bearer ${config.TONAPI_KEY}` }
            }).then(res => res.ok ? res.json() : { operations: [] })
          ]);

          const nativeTxs: Transaction[] = [];
          for (const tx of resNative.transactions ?? []) {
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

            nativeTxs.push({
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

          const jettonTxs: Transaction[] = [];
          for (const op of resJetton.operations ?? []) {
            if (op.operation === 'transfer') {
              const isIncoming = op.destination?.address && op.destination.address.toLowerCase() === fetchAddress.toLowerCase();
              
              let jettonSymbol = op.jetton?.symbol || 'USDT';
              if (jettonSymbol === 'USD₮') jettonSymbol = 'USDT';

              const amountDec = Number(op.amount || 0) / Math.pow(10, op.jetton?.decimals || 6);

              let comment = '';
              if (op.payload?.SumType === 'TextComment' && op.payload?.Value?.Text) {
                comment = op.payload.Value.Text;
              }

              jettonTxs.push({
                id: op.transaction_hash,
                type: isIncoming ? 'receive' : 'send',
                amount: amountDec.toFixed(4),
                asset: jettonSymbol,
                timestamp: op.utime * 1000,
                status: 'completed',
                address: isIncoming ? (op.source?.address || '') : (op.destination?.address || ''),
                hash: op.transaction_hash,
                fee: '0',
                comment: comment || `${jettonSymbol} Jetton Transfer`
              });
            }
          }

          return { data: [...nativeTxs, ...jettonTxs], error: null };
        } catch (e) {
          console.warn('[useTransactions] TON fetch error:', e);
          return { data: [], error: e };
        }
      })();

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

      const allWallets = WalletManager.getWallets();
      const multiChainWallet = allWallets.find(w => w.type === 'secondary');
      const tronAddress = multiChainWallet?.addresses?.tron || (multiChainWallet?.addresses as any)?.tron;
      const evmAddress = multiChainWallet?.addresses?.evm || (multiChainWallet?.addresses as any)?.evm;
      const btcAddress = multiChainWallet?.addresses?.btc || (multiChainWallet?.addresses as any)?.btc;
      const solAddress = multiChainWallet?.addresses?.sol || (multiChainWallet?.addresses as any)?.sol;

      const tronPromise = (async () => {
        if (!tronAddress) return { data: [], error: null };
        try {
          const tronTxs = await tetherWdkService.getTronTransactions(tronAddress);
          return { data: tronTxs, error: null };
        } catch (e) {
          console.warn('[useTransactions] TRON fetch error:', e);
          return { data: [], error: e };
        }
      })();

      const evmPromise = (async () => {
        if (!evmAddress) return { data: [], error: null };
        try {
          const isTestnet = network === 'testnet';
          const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_KEY;

          const fetchFromAlchemy = async (alchemyUrl: string, chainLabel: string) => {
            try {
              const [resIncoming, resOutgoing] = await Promise.all([
                fetch(alchemyUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'alchemy_getAssetTransfers',
                    params: [{
                      fromBlock: '0x0',
                      toBlock: 'latest',
                      toAddress: evmAddress,
                      category: ['external', 'erc20'],
                      withMetadata: true,
                      excludeZeroValue: true,
                      maxCount: '0x19'
                    }]
                  })
                }).then(r => r.ok ? r.json() : null),
                fetch(alchemyUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'alchemy_getAssetTransfers',
                    params: [{
                      fromBlock: '0x0',
                      toBlock: 'latest',
                      fromAddress: evmAddress,
                      category: ['external', 'erc20'],
                      withMetadata: true,
                      excludeZeroValue: true,
                      maxCount: '0x19'
                    }]
                  })
                }).then(r => r.ok ? r.json() : null)
              ]);

              const incomingTransfers = resIncoming?.result?.transfers || [];
              const outgoingTransfers = resOutgoing?.result?.transfers || [];
              const allTransfers = [...incomingTransfers, ...outgoingTransfers];

              return allTransfers.map((tx: any) => {
                const isIncoming = tx.to.toLowerCase() === evmAddress.toLowerCase();
                let assetSym = tx.asset || 'ETH';
                if (assetSym === 'USDt' || assetSym === 'USD₮') assetSym = 'USDT';
                return {
                  id: tx.hash,
                  type: isIncoming ? 'receive' : 'send',
                  amount: Number(tx.value || 0).toFixed(6),
                  asset: assetSym,
                  timestamp: new Date(tx.metadata?.blockTimestamp || Date.now()).getTime(),
                  status: 'completed',
                  address: isIncoming ? tx.from : tx.to,
                  hash: tx.hash,
                  fee: '0',
                  comment: `${chainLabel} Transaction`
                };
              });
            } catch (err) {
              console.warn(`[useTransactions] Alchemy fetch error for ${chainLabel}:`, err);
              return [];
            }
          };

          const fetchFromExplorerV1 = async (host: string, assetSymbol: string, keyEnvName: string) => {
            try {
              const apiKey = import.meta.env[keyEnvName] || '';
              const url = `https://${host}/api?module=account&action=txlist&address=${evmAddress}&startblock=0&endblock=99999999&page=1&offset=25&sort=desc${apiKey ? `&apikey=${apiKey}` : ''}`;
              const res = await fetch(url);
              if (!res.ok) return [];
              const json = await res.json();
              if (json.status === '1' && Array.isArray(json.result)) {
                return json.result.map((tx: any) => {
                  const isIncoming = tx.to.toLowerCase() === evmAddress.toLowerCase();
                  const amountVal = (Number(tx.value) / 1e18).toFixed(6);
                  return {
                    id: tx.hash,
                    type: isIncoming ? 'receive' : 'send',
                    amount: amountVal,
                    asset: assetSymbol,
                    timestamp: Number(tx.timeStamp) * 1000,
                    status: tx.isError === '0' ? 'completed' : 'failed',
                    address: isIncoming ? tx.from : tx.to,
                    hash: tx.hash,
                    fee: (Number(tx.gasUsed) * Number(tx.gasPrice) / 1e18).toFixed(6),
                    comment: assetSymbol === 'BNB' ? 'BSC Transaction' : 'Ethereum Transaction'
                  };
                });
              }
            } catch (err) {
              console.warn(`[useTransactions] Explorer V1 fetch error for ${assetSymbol}:`, err);
            }
            return [];
          };

          const ethAlchemyUrl = ALCHEMY_KEY ? `https://${isTestnet ? 'eth-sepolia' : 'eth-mainnet'}.g.alchemy.com/v2/${ALCHEMY_KEY}` : null;
          const bscAlchemyUrl = (!isTestnet && ALCHEMY_KEY) ? `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}` : null;
          const polyAlchemyUrl = ALCHEMY_KEY ? `https://${isTestnet ? 'polygon-amoy' : 'polygon-mainnet'}.g.alchemy.com/v2/${ALCHEMY_KEY}` : null;

          const promises = [];

          if (ethAlchemyUrl) {
            promises.push(fetchFromAlchemy(ethAlchemyUrl, isTestnet ? 'Sepolia' : 'Ethereum'));
          } else {
            promises.push(fetchFromExplorerV1(isTestnet ? 'api-sepolia.etherscan.io' : 'api.etherscan.io', 'ETH', 'VITE_ETHERSCAN_API_KEY'));
          }

          if (bscAlchemyUrl) {
            promises.push(fetchFromAlchemy(bscAlchemyUrl, 'BSC'));
          } else {
            promises.push(fetchFromExplorerV1(isTestnet ? 'api-testnet.bscscan.com' : 'api.bscscan.com', 'BNB', 'VITE_BSCSCAN_API_KEY'));
          }

          if (polyAlchemyUrl) {
            promises.push(fetchFromAlchemy(polyAlchemyUrl, isTestnet ? 'Amoy' : 'Polygon'));
          } else {
            promises.push(fetchFromExplorerV1(isTestnet ? 'api-amoy.polygonscan.com' : 'api.polygonscan.com', 'MATIC', 'VITE_POLYGONSCAN_API_KEY'));
          }

          const results = await Promise.all(promises);
          return { data: results.flat(), error: null };
        } catch (e) {
          console.warn('[useTransactions] EVM master fetch error:', e);
          return { data: [], error: e };
        }
      })();

      const btcPromise = (async () => {
        if (!btcAddress) return { data: [], error: null };
        try {
          const isTestnet = network === 'testnet';
          const baseUrl = isTestnet ? 'https://blockstream.info/testnet/api' : 'https://blockstream.info/api';
          const res = await fetch(`${baseUrl}/address/${btcAddress}/txs`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          
          const btcTxs = data.map((tx: any) => {
            const isOutgoing = tx.vin?.some((input: any) => input.prevout?.scriptpubkey_address === btcAddress);
            
            let valueSats = 0;
            let counterparty = '';
            
            if (isOutgoing) {
              const otherOutputs = tx.vout?.filter((output: any) => output.scriptpubkey_address !== btcAddress) || [];
              valueSats = otherOutputs.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0);
              counterparty = otherOutputs[0]?.scriptpubkey_address || '';
            } else {
              const ourOutputs = tx.vout?.filter((output: any) => output.scriptpubkey_address === btcAddress) || [];
              valueSats = ourOutputs.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0);
              const senderInput = tx.vin?.[0]?.prevout;
              counterparty = senderInput?.scriptpubkey_address || '';
            }
            
            return {
              id: tx.txid,
              type: isOutgoing ? 'send' : 'receive',
              amount: (valueSats / 1e8).toFixed(8),
              asset: 'BTC',
              timestamp: (tx.status?.block_time || Math.floor(Date.now() / 1000)) * 1000,
              status: tx.status?.confirmed ? 'completed' : 'pending',
              address: counterparty,
              hash: tx.txid,
              fee: tx.fee ? (tx.fee / 1e8).toFixed(8) : '0',
              comment: 'Bitcoin Transaction'
            };
          });
          
          return { data: btcTxs, error: null };
        } catch (e) {
          console.warn('[useTransactions] BTC fetch error:', e);
          return { data: [], error: e };
        }
      })();

      const solPromise = (async () => {
        if (!solAddress) return { data: [], error: null };
        try {
          const isTestnet = network === 'testnet';
          const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_KEY;
          const rpcUrl = ALCHEMY_KEY 
            ? `https://solana-${isTestnet ? 'devnet' : 'mainnet'}.g.alchemy.com/v2/${ALCHEMY_KEY}`
            : (isTestnet ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com');
            
          const res = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getSignaturesForAddress',
              params: [
                solAddress,
                { limit: 20 }
              ]
            })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          const signatures = json.result || [];
          
          const solTxs = signatures.map((tx: any) => {
            return {
              id: tx.signature,
              type: 'receive',
              amount: '0.000000',
              asset: 'SOL',
              timestamp: (tx.blockTime || Math.floor(Date.now() / 1000)) * 1000,
              status: tx.err ? 'failed' : 'completed',
              address: '',
              hash: tx.signature,
              fee: '0.000005',
              comment: tx.memo ? `Solana: ${tx.memo}` : 'Solana Transaction'
            };
          });
          
          return { data: solTxs, error: null };
        } catch (e) {
          console.warn('[useTransactions] SOL fetch error:', e);
          return { data: [], error: e };
        }
      })();

      const results = await Promise.allSettled([
        tonPromise,
        rzcPromise,
        tronPromise,
        evmPromise,
        btcPromise,
        solPromise
      ]);
      const tonResponse = results[0];
      const rzcResult = results[1];
      const tronResult = results[2];
      const evmResult = results[3];
      const btcResult = results[4];
      const solResult = results[5];

      const tonFetchError = tonResponse.status === 'rejected' ? tonResponse.reason?.message : (tonResponse.value as any)?.error?.message;

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
      const merged = [
        ...(tonResponse.status === 'fulfilled' ? tonResponse.value.data : []),
        ...rzcTransactions,
        ...(tronResult.status === 'fulfilled' ? tronResult.value.data : []),
        ...(evmResult.status === 'fulfilled' ? evmResult.value.data : []),
        ...(btcResult.status === 'fulfilled' ? btcResult.value.data : []),
        ...(solResult.status === 'fulfilled' ? solResult.value.data : [])
      ];
      const deduplicated = deduplicateTransactions(merged);
      const sorted = deduplicated.sort((a, b) => b.timestamp - a.timestamp);

      // Check for confirmed pending transactions
      if (pendingTransactions && pendingTransactions.length > 0) {
        pendingTransactions.forEach(pt => {
          const isConfirmed = sorted.some(tx => {
            if (pt.hash && tx.hash === pt.hash) return true;
            // Fallback matching by amount and asset within last 5 minutes
            const isRecent = Math.abs(tx.timestamp - pt.timestamp) < 5 * 60 * 1000;
            const isSameAsset = tx.asset.toLowerCase() === pt.symbol.toLowerCase();
            const isSameAmount = parseFloat(tx.amount) === parseFloat(pt.amount);
            return isRecent && isSameAsset && isSameAmount;
          });
          if (isConfirmed && removePendingTransaction) {
            console.log(`✅ Pending transaction confirmed: ${pt.symbol} ${pt.amount}`);
            removePendingTransaction(pt.id);
            // We could trigger a toast here, but currently notificationService handles confirmed toasts
          }
        });
      }

      const tonCount = tonResponse.status === 'fulfilled' ? tonResponse.value.data.length : 0;
      console.log(`✅ Fetched ${tonCount} TON + ${rzcTransactions.length} RZC transactions (${merged.length - deduplicated.length} duplicates removed)`);
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
  }, [address, network, userProfile?.id, pendingTransactions, removePendingTransaction]);

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
