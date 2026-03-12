import { supabaseService } from './supabaseService';

// Get supabase client
const supabase = supabaseService.getClient();

export interface P2POffer {
  id: string;
  seller_wallet: string;
  offer_type: 'sell' | 'buy';
  offer_asset: string;
  offer_amount: number;
  want_asset: string;
  want_amount: number;
  price_per_unit: number;
  min_order_amount?: number;
  max_order_amount?: number;
  payment_methods?: string[];
  payment_instructions?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  available_amount: number;
  time_limit_minutes: number;
  created_at: string;
}

export interface P2PTrade {
  id: string;
  offer_id: string;
  seller_wallet: string;
  buyer_wallet: string;
  offer_asset: string;
  offer_amount: number;
  want_asset: string;
  want_amount: number;
  escrow_status: string;
  expires_at: string;
  created_at: string;
}

class P2PExchangeService {
  /**
   * Create a new P2P offer
   */
  async createOffer(
    sellerWallet: string,
    offerData: {
      offerType: 'sell' | 'buy';
      offerAsset: string;
      offerAmount: number;
      wantAsset: string;
      wantAmount: number;
      paymentMethods: string[];
      paymentInstructions?: string;
      minOrderAmount?: number;
      maxOrderAmount?: number;
    }
  ): Promise<{ success: boolean; offerId?: string; error?: string }> {
    try {
      const pricePerUnit = offerData.wantAmount / offerData.offerAmount;

      const { data, error } = await supabase
        .from('p2p_offers')
        .insert({
          seller_wallet: sellerWallet,
          offer_type: offerData.offerType,
          offer_asset: offerData.offerAsset,
          offer_amount: offerData.offerAmount,
          want_asset: offerData.wantAsset,
          want_amount: offerData.wantAmount,
          price_per_unit: pricePerUnit,
          payment_methods: offerData.paymentMethods,
          payment_instructions: offerData.paymentInstructions,
          min_order_amount: offerData.minOrderAmount,
          max_order_amount: offerData.maxOrderAmount,
          available_amount: offerData.offerAmount,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, offerId: data.id };
    } catch (error) {
      console.error('Create offer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create offer'
      };
    }
  }

  /**
   * Get all active offers
   */
  async getActiveOffers(filters?: {
    offerAsset?: string;
    wantAsset?: string;
    offerType?: 'sell' | 'buy';
  }): Promise<{ success: boolean; offers?: P2POffer[]; error?: string }> {
    try {
      let query = supabase
        .from('p2p_offers')
        .select('*')
        .eq('status', 'active')
        .gt('available_amount', 0)
        .order('created_at', { ascending: false });

      if (filters?.offerAsset) {
        query = query.eq('offer_asset', filters.offerAsset);
      }
      if (filters?.wantAsset) {
        query = query.eq('want_asset', filters.wantAsset);
      }
      if (filters?.offerType) {
        query = query.eq('offer_type', filters.offerType);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, offers: data as P2POffer[] };
    } catch (error) {
      console.error('Get offers error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch offers'
      };
    }
  }

  /**
   * Accept an offer and create a trade
   */
  async acceptOffer(
    offerId: string,
    buyerWallet: string,
    amount: number
  ): Promise<{ success: boolean; tradeId?: string; error?: string }> {
    try {
      // Get offer details
      const { data: offer, error: offerError } = await supabase
        .from('p2p_offers')
        .select('*')
        .eq('id', offerId)
        .single();

      if (offerError) throw offerError;
      if (!offer) throw new Error('Offer not found');
      if (offer.available_amount < amount) throw new Error('Insufficient amount available');

      // Calculate want amount
      const wantAmount = amount * offer.price_per_unit;

      // Create trade
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + offer.time_limit_minutes);

      const { data: trade, error: tradeError } = await supabase
        .from('p2p_trades')
        .insert({
          offer_id: offerId,
          seller_wallet: offer.seller_wallet,
          buyer_wallet: buyerWallet,
          offer_asset: offer.offer_asset,
          offer_amount: amount,
          want_asset: offer.want_asset,
          want_amount: wantAmount,
          price_per_unit: offer.price_per_unit,
          escrow_status: 'pending',
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (tradeError) throw tradeError;

      // Update offer available amount
      await supabase
        .from('p2p_offers')
        .update({
          available_amount: offer.available_amount - amount
        })
        .eq('id', offerId);

      return { success: true, tradeId: trade.id };
    } catch (error) {
      console.error('Accept offer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to accept offer'
      };
    }
  }

  /**
   * Get user's trades
   */
  async getUserTrades(
    userWallet: string
  ): Promise<{ success: boolean; trades?: P2PTrade[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('p2p_trades')
        .select('*')
        .or(`seller_wallet.eq.${userWallet},buyer_wallet.eq.${userWallet}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, trades: data as P2PTrade[] };
    } catch (error) {
      console.error('Get trades error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trades'
      };
    }
  }

  /**
   * Mark payment as sent (buyer)
   */
  async markPaymentSent(
    tradeId: string,
    paymentProofUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('p2p_trades')
        .update({
          escrow_status: 'payment_sent',
          payment_proof_url: paymentProofUrl,
          payment_proof_uploaded_at: new Date().toISOString(),
          buyer_confirmed: true,
          buyer_confirmed_at: new Date().toISOString()
        })
        .eq('id', tradeId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Mark payment sent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark payment'
      };
    }
  }

  /**
   * Confirm payment received and release escrow (seller)
   */
  async confirmPaymentReceived(
    tradeId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update trade status
      const { error } = await supabase
        .from('p2p_trades')
        .update({
          escrow_status: 'completed',
          seller_confirmed: true,
          seller_confirmed_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .eq('id', tradeId);

      if (error) throw error;

      // TODO: Release funds from escrow to buyer
      // This would involve transferring RZC or crypto

      return { success: true };
    } catch (error) {
      console.error('Confirm payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm payment'
      };
    }
  }

  /**
   * Raise a dispute
   */
  async raiseDispute(
    tradeId: string,
    raisedBy: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('p2p_trades')
        .update({
          escrow_status: 'disputed',
          dispute_reason: reason,
          dispute_raised_by: raisedBy,
          dispute_raised_at: new Date().toISOString()
        })
        .eq('id', tradeId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Raise dispute error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to raise dispute'
      };
    }
  }
}

export const p2pExchangeService = new P2PExchangeService();
