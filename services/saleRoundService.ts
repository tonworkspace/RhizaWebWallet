import { supabaseService } from './supabaseService';

// ── Types ──────────────────────────────────────────────────────────────────

export interface BonusTier {
  min: number;    // min RZC to qualify
  bonus: number;  // bonus percentage
}

export interface ActiveSaleRound {
  id: string;
  round_name: string;       // 'Seed Round', 'Round 2', etc.
  round_number: number;     // 1, 2, 3, 4
  price_usd: number;        // price per RZC in USD
  token_cap: number;        // max tokens for this round
  tokens_sold: number;      // how many have been sold
  tokens_remaining: number; // token_cap - tokens_sold
  progress_pct: number;     // 0–100 (2dp)
  bonus_tiers: BonusTier[]; // sorted ascending by min
  start_date: string | null;
  end_date: string | null;
  is_complete: boolean;
  next_round_price: number; // price of the following round
}

export interface RecordPurchaseParams {
  walletAddress: string;
  rzcAmount: number;         // total RZC including bonus
  priceUsd: number;          // price per RZC at time of purchase
  costUsd: number;           // total USD paid
  paymentMethod: 'TON' | 'USDT' | 'TRX' | 'USDT_TRC20';
  txHash?: string;
  referrerWallet?: string;
}

export interface RecordPurchaseResult {
  success: boolean;
  purchaseId?: string;
  roundName?: string;
  error?: string;
  remaining?: number; // tokens remaining if sold out
}

export interface WalletICOPurchase {
  id: string;
  round_name: string;
  round_number: number;
  rzc_amount: number;
  price_at_purchase: number;
  cost_usd: number;
  payment_method: string;
  tx_hash: string | null;
  created_at: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

class SaleRoundService {
  /** Fetch the currently active sale round from Supabase. */
  async getActiveRound(): Promise<{ success: boolean; data?: ActiveSaleRound; error?: string }> {
    try {
      const client = supabaseService.getClient();
      if (!client) return { success: false, error: 'Supabase not configured' };

      const { data, error } = await client.rpc('get_active_sale_round');

      if (error) {
        console.error('[SaleRoundService] getActiveRound error:', error);
        return { success: false, error: error.message };
      }

      if (!data) return { success: false, error: 'No active round found' };

      return {
        success: true,
        data: {
          ...data,
          price_usd:        Number(data.price_usd),
          token_cap:        Number(data.token_cap),
          tokens_sold:      Number(data.tokens_sold),
          tokens_remaining: Number(data.tokens_remaining),
          progress_pct:     Number(data.progress_pct),
          next_round_price: Number(data.next_round_price),
          bonus_tiers:      (data.bonus_tiers as BonusTier[]) || [],
        } as ActiveSaleRound,
      };
    } catch (err: any) {
      console.error('[SaleRoundService] getActiveRound exception:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Atomically record a confirmed purchase in the DB.
   * Increments tokens_sold and marks round complete if cap is hit.
   * Call this AFTER the blockchain transaction is confirmed.
   */
  async recordPurchase(params: RecordPurchaseParams): Promise<RecordPurchaseResult> {
    try {
      const client = supabaseService.getClient();
      if (!client) return { success: false, error: 'Supabase not configured' };

      const { data, error } = await client.rpc('record_ico_purchase', {
        p_wallet_address:  params.walletAddress,
        p_rzc_amount:      Math.floor(params.rzcAmount),  // whole tokens only
        p_price_usd:       params.priceUsd,
        p_cost_usd:        params.costUsd,
        p_payment_method:  params.paymentMethod,
        p_tx_hash:         params.txHash ?? null,
        p_referrer_wallet: params.referrerWallet ?? null,
      });

      if (error) {
        console.error('[SaleRoundService] recordPurchase error:', error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return {
          success: false,
          error: data?.error ?? 'Unknown error',
          remaining: data?.remaining,
        };
      }

      return {
        success:    true,
        purchaseId: data.purchase_id,
        roundName:  data.round_name,
      };
    } catch (err: any) {
      console.error('[SaleRoundService] recordPurchase exception:', err);
      return { success: false, error: err.message };
    }
  }

  /** Fetch the full ICO purchase history for a wallet address. */
  async getWalletPurchases(walletAddress: string): Promise<WalletICOPurchase[]> {
    try {
      const client = supabaseService.getClient();
      if (!client) return [];

      const { data, error } = await client.rpc('get_wallet_ico_purchases', {
        p_wallet_address: walletAddress,
      });

      if (error) {
        console.error('[SaleRoundService] getWalletPurchases error:', error);
        return [];
      }

      return (data as WalletICOPurchase[]) ?? [];
    } catch (err: any) {
      console.error('[SaleRoundService] getWalletPurchases exception:', err);
      return [];
    }
  }

  /**
   * Calculate the bonus percentage for a given RZC amount
   * using the active round's bonus_tiers.
   */
  getBonusForAmount(rzcAmount: number, tiers: BonusTier[]): number {
    if (!tiers || tiers.length === 0) return 0;
    // Sort descending so highest tier matches first
    const sorted = [...tiers].sort((a, b) => b.min - a.min);
    const match = sorted.find(t => rzcAmount >= t.min);
    return match?.bonus ?? 0;
  }
}

export const saleRoundService = new SaleRoundService();
