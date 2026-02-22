import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { getNetworkConfig, getTonApiKey } from '../constants';

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
}

export const useTransactions = () => {
  const { address, network } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      
      console.log(`📜 Fetching transactions for ${address} on ${network}...`);
      
      // Fetch transactions from TonAPI
      const response = await fetch(`${tonApiEndpoint}/blockchain/accounts/${address}/transactions?limit=50`, {
        headers: {
          'Authorization': `Bearer ${config.TONAPI_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.transactions || data.transactions.length === 0) {
        console.log('ℹ️ No transactions found');
        setTransactions([]);
        setIsLoading(false);
        return;
      }
      
      // Parse and format transactions
      const formattedTransactions: Transaction[] = data.transactions.map((tx: any) => {
        const isOutgoing = tx.out_msgs && tx.out_msgs.length > 0;
        const isIncoming = tx.in_msg && tx.in_msg.value > 0;
        
        // Determine transaction type
        let type: 'send' | 'receive' | 'swap' | 'purchase' = 'receive';
        if (isOutgoing) {
          type = 'send';
        } else if (isIncoming) {
          type = 'receive';
        }
        
        // Get amount (in TON)
        let amount = '0';
        let targetAddress = '';
        
        if (isOutgoing && tx.out_msgs[0]) {
          amount = (Number(tx.out_msgs[0].value) / 1e9).toFixed(4);
          targetAddress = tx.out_msgs[0].destination?.address || '';
        } else if (isIncoming && tx.in_msg) {
          amount = (Number(tx.in_msg.value) / 1e9).toFixed(4);
          targetAddress = tx.in_msg.source?.address || '';
        }
        
        // Get fee
        const fee = tx.total_fees ? (Number(tx.total_fees) / 1e9).toFixed(4) : '0';
        
        // Get comment/message
        let comment = '';
        if (tx.in_msg?.decoded_body?.text) {
          comment = tx.in_msg.decoded_body.text;
        } else if (tx.out_msgs?.[0]?.decoded_body?.text) {
          comment = tx.out_msgs[0].decoded_body.text;
        }
        
        return {
          id: tx.hash || tx.lt,
          type,
          amount,
          asset: 'TON',
          timestamp: tx.utime * 1000, // Convert to milliseconds
          status: tx.success ? 'completed' : 'failed',
          address: targetAddress,
          hash: tx.hash,
          fee,
          comment
        };
      });
      
      console.log(`✅ Fetched ${formattedTransactions.length} transactions`);
      setTransactions(formattedTransactions);
    } catch (err) {
      console.error('❌ Transaction fetch failed:', err);
      setError('Failed to load transactions');
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [address, network]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const refreshTransactions = () => {
    fetchTransactions();
  };

  return {
    transactions,
    isLoading,
    error,
    refreshTransactions
  };
};
