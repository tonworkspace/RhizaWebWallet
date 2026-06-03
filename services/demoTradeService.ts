import { RZC_CONFIG } from '../config/rzcConfig';
import { authService } from './authService';

export interface DemoTradeAccount {
  balances: {
    USDT: number;
    RZC: number;
    TON: number;
  };
  positions: {
    RZC: { amount: number; avgEntryUsdt: number };
    TON: { amount: number; avgEntryUsdt: number };
  };
  tradeHistory: DemoTrade[];
}

export interface DemoTrade {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  amount: number;
  price: number;
  total: number;
  timestamp: number;
}

const STORAGE_KEY_PREFIX = 'rhiza_demo_account_';

export const demoTradeService = {
  _getFallbackAccount(): DemoTradeAccount {
    return {
      balances: { USDT: 100, RZC: 0, TON: 20 },
      positions: {
        RZC: { amount: 0, avgEntryUsdt: 0 },
        TON: { amount: 0, avgEntryUsdt: 0 }
      },
      tradeHistory: []
    };
  },

  _saveToLocal(address: string, account: DemoTradeAccount) {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${address}`, JSON.stringify(account));
  },

  /**
   * Initialize or retrieve the demo account for a given address from Supabase (or fallback to local)
   */
  async getAccount(address: string): Promise<DemoTradeAccount> {
    if (!address) return this._getFallbackAccount();

    const client = authService.getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('wallet_demo_accounts')
          .select('account_data')
          .eq('wallet_address', address)
          .single();

        if (data && data.account_data) {
          this._saveToLocal(address, data.account_data);
          return data.account_data;
        }
      } catch (error) {
        console.warn('Could not fetch demo account from Supabase, falling back to local storage', error);
      }
    }

    // Fallback to local
    const key = `${STORAGE_KEY_PREFIX}${address}`;
    const stored = localStorage.getItem(key);

    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse demo account data', e);
      }
    }

    // Initialize new demo account with 100 USDT and 20 TON
    const newAccount = this._getFallbackAccount();
    await this.saveAccount(address, newAccount);
    return newAccount;
  },

  /**
   * Migrate old account to new format with positions
   */
  _ensurePositions(account: DemoTradeAccount): void {
    if (!account.positions) {
      account.positions = {
        RZC: { amount: account.balances.RZC, avgEntryUsdt: 0 }, // fallback
        TON: { amount: account.balances.TON, avgEntryUsdt: 0 }
      };
    }
  },

  /**
   * Save the demo account state to Supabase and LocalStorage
   */
  async saveAccount(address: string, account: DemoTradeAccount): Promise<void> {
    if (!address) return;
    
    // Save locally first for instant UI response
    this._saveToLocal(address, account);

    const client = authService.getClient();
    if (client) {
      (async () => {
        const { error } = await client
          .from('wallet_demo_accounts')
          .upsert(
            { 
              wallet_address: address, 
              account_data: account, 
              updated_at: new Date().toISOString() 
            },
            { onConflict: 'wallet_address' }
          );
        
        if (error) {
          console.warn('Failed to save demo account to Supabase', error);
        }
      })();
    }
  },

  /**
   * Place a demo trade order
   */
  async placeOrder(
    address: string,
    pair: 'RZC/USDT' | 'RZC/TON',
    type: 'BUY' | 'SELL',
    amount: number, // amount of base token (RZC)
    price: number, // price in quote token (USDT or TON)
    usdtPrices: { RZC: number; TON: number } // current USDT prices for normalization
  ): Promise<{ success: boolean; message: string; account?: DemoTradeAccount }> {
    if (!address) return { success: false, message: 'Wallet address required' };
    
    const account = await this.getAccount(address);
    this._ensurePositions(account);
    const total = amount * price;

    if (pair === 'RZC/USDT') {
      if (type === 'BUY') {
        if (account.balances.USDT < total) return { success: false, message: 'Insufficient USDT balance' };
        
        const oldRzcAmount = account.positions.RZC.amount;
        const oldRzcAvg = account.positions.RZC.avgEntryUsdt;
        const newRzcAmount = oldRzcAmount + amount;
        const newRzcAvg = ((oldRzcAmount * oldRzcAvg) + total) / newRzcAmount;
        
        account.positions.RZC = { amount: newRzcAmount, avgEntryUsdt: newRzcAvg };
        account.balances.USDT -= total;
        account.balances.RZC += amount;
      } else {
        if (account.balances.RZC < amount) return { success: false, message: 'Insufficient RZC balance' };
        
        account.positions.RZC.amount -= amount;
        if (account.positions.RZC.amount <= 0) {
          account.positions.RZC.amount = 0;
          account.positions.RZC.avgEntryUsdt = 0;
        }
        
        account.balances.RZC -= amount;
        account.balances.USDT += total;
      }
    } else if (pair === 'RZC/TON') {
      if (type === 'BUY') {
        if (account.balances.TON < total) return { success: false, message: 'Insufficient TON balance' };
        
        account.positions.TON.amount -= total;
        if (account.positions.TON.amount <= 0) {
          account.positions.TON.amount = 0;
          account.positions.TON.avgEntryUsdt = 0;
        }
        
        const usdtValueBought = amount * usdtPrices.RZC;
        const oldRzcAmount = account.positions.RZC.amount;
        const oldRzcAvg = account.positions.RZC.avgEntryUsdt;
        const newRzcAmount = oldRzcAmount + amount;
        const newRzcAvg = ((oldRzcAmount * oldRzcAvg) + usdtValueBought) / newRzcAmount;
        
        account.positions.RZC = { amount: newRzcAmount, avgEntryUsdt: newRzcAvg };
        
        account.balances.TON -= total;
        account.balances.RZC += amount;
      } else {
        if (account.balances.RZC < amount) return { success: false, message: 'Insufficient RZC balance' };
        
        account.positions.RZC.amount -= amount;
        if (account.positions.RZC.amount <= 0) {
          account.positions.RZC.amount = 0;
          account.positions.RZC.avgEntryUsdt = 0;
        }
        
        const usdtValueBought = total * usdtPrices.TON;
        const oldTonAmount = account.positions.TON.amount;
        const oldTonAvg = account.positions.TON.avgEntryUsdt;
        const newTonAmount = oldTonAmount + total;
        const newTonAvg = ((oldTonAmount * oldTonAvg) + usdtValueBought) / newTonAmount;
        
        account.positions.TON = { amount: newTonAmount, avgEntryUsdt: newTonAvg };
        
        account.balances.RZC -= amount;
        account.balances.TON += total;
      }
    } else {
      return { success: false, message: 'Invalid trading pair' };
    }

    const trade: DemoTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      pair,
      type,
      amount,
      price,
      total,
      timestamp: Date.now()
    };

    account.tradeHistory.unshift(trade);
    await this.saveAccount(address, account);

    return { success: true, message: 'Trade executed successfully', account };
  },

  /**
   * Reset demo account (gives back 100 USDT and 20 TON, clears history)
   */
  async resetAccount(address: string): Promise<DemoTradeAccount> {
    const newAccount = this._getFallbackAccount();
    await this.saveAccount(address, newAccount);
    return newAccount;
  }
};
