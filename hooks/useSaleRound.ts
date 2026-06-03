import { useState, useEffect, useCallback } from 'react';
import { saleRoundService, ActiveSaleRound } from '../services/saleRoundService';

// Fallback values shown while the round is loading or if Supabase is unreachable
const FALLBACK_ROUND: ActiveSaleRound = {
  id:               '',
  round_name:       'Seed Round',
  round_number:     1,
  price_usd:        0.012,
  token_cap:        3_150_000,    // 15% of 21M total supply
  tokens_sold:      0,
  tokens_remaining: 3_150_000,
  progress_pct:     0,
  bonus_tiers:      [{ min: 500, bonus: 5 }, { min: 2000, bonus: 15 }],
  start_date:       null,
  end_date:         '2026-06-30T23:59:59Z',
  is_complete:      false,
  next_round_price: 0.018,
};

// Fallback prices for all rounds (used when DB is unavailable)
const FALLBACK_ROUND_PRICES = {
  1: 0.12,   // Seed
  2: 0.18,   // Private Sale
  3: 0.25,   // Pre-Launch
  4: 1.00,   // Public Listing
};

interface UseSaleRoundResult {
  /** The currently active sale round, or fallback data while loading. */
  activeRound: ActiveSaleRound;
  /** True while the first fetch is in-flight. */
  isLoading: boolean;
  /** True if Supabase returned an error AND no cached data is available. */
  isError: boolean;
  /** Tokens sold / token cap expressed as 0–100 (used for progress bar). */
  roundProgress: number;
  /** True when tokens_sold >= token_cap. Buy button should be disabled. */
  isSoldOut: boolean;
  /**
   * The Date to count down towards. Driven from the round's end_date if set,
   * otherwise falls back to June 30, 2026.
   */
  saleEndDate: Date;
  /** Manually re-fetch the round (call after a successful purchase). */
  refresh: () => Promise<void>;
  /**
   * Calculate the bonus % for a given RZC amount using the active round's
   * bonus_tiers — replaces the hardcoded `bonus` logic in StoreUI.
   */
  getBonusForAmount: (rzcAmount: number) => number;
  /**
   * Get the price for any round number (1-4).
   * Returns live price from DB if available, otherwise fallback.
   */
  getRoundPrice: (roundNumber: number) => number;
}

const DEFAULT_END_DATE = new Date('2026-06-30T23:59:59Z');

/**
 * useSaleRound
 *
 * Fetches the active ICO round from Supabase on mount and after each purchase.
 * All values gracefully fall back to hardcoded defaults if the network is
 * unavailable, so the store always renders.
 */
export function useSaleRound(): UseSaleRoundResult {
  const [activeRound, setActiveRound] = useState<ActiveSaleRound>(FALLBACK_ROUND);
  const [isLoading, setIsLoading]     = useState(true);
  const [isError,   setIsError]       = useState(false);
  const [allRoundPrices, setAllRoundPrices] = useState<Record<number, number>>(FALLBACK_ROUND_PRICES);

  const fetchRound = useCallback(async () => {
    setIsLoading(true);
    const result = await saleRoundService.getActiveRound();

    if (result.success && result.data) {
      setActiveRound(result.data);
      setIsError(false);
      
      // Also fetch all round prices for the chart
      try {
        const { supabaseService } = await import('../services/supabaseService');
        const client = supabaseService.getClient();
        if (client) {
          const { data: allRounds } = await client
            .from('sale_rounds')
            .select('round_number, price_usd')
            .order('round_number');
          
          if (allRounds && allRounds.length > 0) {
            const priceMap: Record<number, number> = {};
            allRounds.forEach((r: any) => {
              priceMap[r.round_number] = Number(r.price_usd);
            });
            setAllRoundPrices(priceMap);
          }
        }
      } catch (err) {
        console.warn('[useSaleRound] Failed to fetch all round prices:', err);
        // Keep fallback prices
      }
    } else {
      // Leave the current value (either fallback or previous fetch) intact
      setIsError(true);
      console.warn('[useSaleRound] Using fallback round data:', result.error);
    }
    setIsLoading(false);
  }, []);

  // Fetch on mount; re-fetch automatically every 2 minutes to stay fresh
  useEffect(() => {
    fetchRound();
    const interval = setInterval(fetchRound, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRound]);

  const roundProgress = activeRound.progress_pct;
  const isSoldOut     = activeRound.tokens_remaining <= 0 || activeRound.is_complete;

  const saleEndDate = activeRound.end_date
    ? new Date(activeRound.end_date)
    : DEFAULT_END_DATE;

  const getBonusForAmount = useCallback(
    (rzcAmount: number) => saleRoundService.getBonusForAmount(rzcAmount, activeRound.bonus_tiers),
    [activeRound.bonus_tiers],
  );

  const getRoundPrice = useCallback(
    (roundNumber: number) => allRoundPrices[roundNumber] ?? FALLBACK_ROUND_PRICES[roundNumber] ?? 0,
    [allRoundPrices],
  );

  return {
    activeRound,
    isLoading,
    isError,
    roundProgress,
    isSoldOut,
    saleEndDate,
    refresh: fetchRound,
    getBonusForAmount,
    getRoundPrice,
  };
}
