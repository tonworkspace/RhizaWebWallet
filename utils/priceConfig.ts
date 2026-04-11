/**
 * Admin-configurable fallback prices for TON, BTC, ETH.
 * Stored in localStorage so they persist across sessions.
 * CoinGecko live prices always take priority — these are only used
 * when the live fetch fails.
 */

const STORAGE_KEY = 'admin_price_overrides';

export interface PriceOverrides {
  ton: number;
  btc: number;
  eth: number;
  sol: number;
  trx: number;
  rzc: number;
  usdt: number;
  usdc: number;
  not: number;
  scale: number;
  stk: number;
  bnb: number;
  matic: number;
  avax: number;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULTS: PriceOverrides = {
  ton: 5.42,
  btc: 65000,
  eth: 3500,
  sol: 150,
  trx: 0.12,
  rzc: 0.12,  // Matches RZC_CONFIG.RZC_PRICE_USD — update both together
  usdt: 1.0,
  usdc: 1.0,
  not: 0.008,
  scale: 0.55,
  stk: 0.15,
  bnb: 300,
  matic: 0.8,
  avax: 25,
};

export function getPriceOverrides(): PriceOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setPriceOverrides(overrides: PriceOverrides): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function clearPriceOverrides(): void {
  localStorage.removeItem(STORAGE_KEY);
}
