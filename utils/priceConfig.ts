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
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULTS: PriceOverrides = {
  ton: 3.5,
  btc: 65_000,
  eth: 3_000,
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
