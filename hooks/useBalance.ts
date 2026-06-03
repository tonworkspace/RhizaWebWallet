import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { getPriceOverrides } from '../utils/priceConfig';

interface BalanceData {
  tonBalance: number;
  tonPrice: number;
  btcPrice: number;
  ethPrice: number;
  bnbPrice: number;
  maticPrice: number;
  avaxPrice: number;
  solPrice: number;
  tronPrice: number;
  usdtPrice: number;
  usdcPrice: number;
  rzcPrice: number;
  totalUsdValue: number;
  change24h: number;
  changePercent24h: number;
  // Per-asset 24h change percentages
  assetChanges: {
    ton: number;
    btc: number;
    eth: number;
    bnb: number;
    matic: number;
    avax: number;
    sol: number;
    tron: number;
    usdt: number;
    usdc: number;
  };
}

interface PriceCache {
  tonPrice: number;
  btcPrice: number;
  ethPrice: number;
  bnbPrice: number;
  maticPrice: number;
  avaxPrice: number;
  solPrice: number;
  tronPrice: number;
  usdtPrice: number;
  usdcPrice: number;
  change: number;
  // Per-asset changes
  btcChange: number;
  ethChange: number;
  bnbChange: number;
  maticChange: number;
  avaxChange: number;
  solChange: number;
  tronChange: number;
  usdtChange: number;
  usdcChange: number;
  timestamp: number;
}

// Module-level price cache — survives re-renders
let priceCache: PriceCache | null = null;
const CACHE_DURATION = 60_000; // 60 seconds — prices don't change that fast

// Read admin-configured fallbacks (or built-in defaults)
function getFallbacks() {
  return getPriceOverrides();
}

/**
 * Clear the price cache to force a fresh fetch on next balance update.
 * Called by admin panel after updating prices to ensure percentage changes refresh immediately.
 */
export function clearPriceCache() {
  priceCache = null;
  console.log('💨 Price cache cleared — next balance update will fetch fresh prices');
}

/**
 * Fetch TON/BTC/ETH/BNB/MATIC/AVAX prices from CoinGecko's public API.
 */
async function fetchCoinGeckoPrices(signal: AbortSignal): Promise<PriceCache> {
  const url =
    'https://api.coingecko.com/api/v3/simple/price' +
    '?ids=the-open-network,bitcoin,ethereum,binancecoin,matic-network,avalanche-2,solana,tron,tether,usd-coin' +
    '&vs_currencies=usd' +
    '&include_24hr_change=true';

  // 5-second timeout — don't block balance display waiting for price data
  const timeoutId = setTimeout(() => {
    try { (signal as any).controller?.abort(); } catch { }
  }, 5000);

  try {
    const res = await fetch(url, { signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

    const data = await res.json();
    const fb = getFallbacks();

    const tonPrice: number = data['the-open-network']?.usd ?? fb.ton;
    const btcPrice: number = data['bitcoin']?.usd ?? fb.btc;
    const ethPrice: number = data['ethereum']?.usd ?? fb.eth;
    const bnbPrice: number = data['binancecoin']?.usd ?? fb.bnb;
    const maticPrice: number = data['matic-network']?.usd ?? fb.matic;
    const avaxPrice: number = data['avalanche-2']?.usd ?? fb.avax;
    const solPrice: number = data['solana']?.usd ?? fb.sol;
    const tronPrice: number = data['tron']?.usd ?? fb.trx;
    const usdtPrice: number = data['tether']?.usd ?? fb.usdt;
    const usdcPrice: number = data['usd-coin']?.usd ?? fb.usdc;
    const change: number = data['the-open-network']?.usd_24h_change ?? 0;
    const btcChange: number = data['bitcoin']?.usd_24h_change ?? 0;
    const ethChange: number = data['ethereum']?.usd_24h_change ?? 0;
    const bnbChange: number = data['binancecoin']?.usd_24h_change ?? 0;
    const maticChange: number = data['matic-network']?.usd_24h_change ?? 0;
    const avaxChange: number = data['avalanche-2']?.usd_24h_change ?? 0;
    const solChange: number = data['solana']?.usd_24h_change ?? 0;
    const tronChange: number = data['tron']?.usd_24h_change ?? 0;
    const usdtChange: number = data['tether']?.usd_24h_change ?? 0;
    const usdcChange: number = data['usd-coin']?.usd_24h_change ?? 0;

    return { tonPrice, btcPrice, ethPrice, bnbPrice, maticPrice, avaxPrice, solPrice, tronPrice, usdtPrice, usdcPrice, change, btcChange, ethChange, bnbChange, maticChange, avaxChange, solChange, tronChange, usdtChange, usdcChange, timestamp: Date.now() };
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

export const useBalance = () => {
  const { balance: tonBalanceStr, network, rzcPrice: contextRzcPrice } = useWallet();

  const [balanceData, setBalanceData] = useState<BalanceData>(() => {
    const fb = getFallbacks();
    return {
      tonBalance: 0,
      tonPrice: fb.ton,
      btcPrice: fb.btc,
      ethPrice: fb.eth,
      bnbPrice: fb.bnb,
      maticPrice: fb.matic,
      avaxPrice: fb.avax,
      solPrice: fb.sol,
      tronPrice: fb.trx,
      usdtPrice: fb.usdt,
      usdcPrice: fb.usdc,
      rzcPrice: fb.rzc || contextRzcPrice,
      totalUsdValue: 0,
      change24h: 0,
      changePercent24h: 0,
      assetChanges: {
        ton: 0, btc: 0, eth: 0, bnb: 0, matic: 0,
        avax: 0, sol: 0, tron: 0, usdt: 0, usdc: 0,
      },
    };
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBalance = useCallback(
    async (skipCache = false) => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const tonBalance = parseFloat(tonBalanceStr) || 0;
        const now = Date.now();

        let prices: PriceCache;

        // Return valid cache if still fresh
        if (!skipCache && priceCache && now - priceCache.timestamp < CACHE_DURATION) {
          prices = priceCache;
        } else {
          try {
            prices = await fetchCoinGeckoPrices(controller.signal);
            priceCache = prices;
            console.log(
              `✅ Prices (CoinGecko) — TON: $${prices.tonPrice.toFixed(2)}, BTC: $${prices.btcPrice.toFixed(0)}, ETH: $${prices.ethPrice.toFixed(2)}`
            );
          } catch (priceErr: any) {
            if (priceErr.name === 'AbortError') return;
            console.warn('⚠️ Price fetch failed, using cache/fallback:', priceErr.message);
            // Prefer stale cache over hardcoded fallback
            prices = priceCache ?? (() => {
              const fb = getFallbacks();
              return {
                tonPrice: fb.ton,
                btcPrice: fb.btc,
                ethPrice: fb.eth,
                bnbPrice: fb.bnb,
                maticPrice: fb.matic,
                avaxPrice: fb.avax,
                solPrice: fb.sol,
                tronPrice: fb.trx,
                usdtPrice: fb.usdt,
                usdcPrice: fb.usdc,
                change: 0,
                btcChange: 0,
                ethChange: 0,
                bnbChange: 0,
                maticChange: 0,
                avaxChange: 0,
                solChange: 0,
                tronChange: 0,
                usdtChange: 0,
                usdcChange: 0,
                timestamp: now,
              };
            })();
          }
        }

        const totalUsdValue = tonBalance * prices.tonPrice;
        const change24h = totalUsdValue * (prices.change / 100);

        setBalanceData({
          tonBalance,
          tonPrice: prices.tonPrice,
          btcPrice: prices.btcPrice,
          ethPrice: prices.ethPrice,
          bnbPrice: prices.bnbPrice,
          maticPrice: prices.maticPrice,
          avaxPrice: prices.avaxPrice,
          solPrice: prices.solPrice,
          tronPrice: prices.tronPrice,
          usdtPrice: prices.usdtPrice,
          usdcPrice: prices.usdcPrice,
          rzcPrice: contextRzcPrice || getPriceOverrides().rzc,
          totalUsdValue,
          change24h,
          changePercent24h: prices.change,
          assetChanges: {
            ton: prices.change,
            btc: prices.btcChange ?? 0,
            eth: prices.ethChange ?? 0,
            bnb: prices.bnbChange ?? 0,
            matic: prices.maticChange ?? 0,
            avax: prices.avaxChange ?? 0,
            sol: prices.solChange ?? 0,
            tron: prices.tronChange ?? 0,
            usdt: prices.usdtChange ?? 0,
            usdc: prices.usdcChange ?? 0,
          },
        });
      } catch (err) {
        setError('Failed to fetch balance');
        console.error('❌ useBalance error:', err);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [tonBalanceStr, network]
  );

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(() => fetchBalance(false), 30_000);
    return () => {
      clearInterval(interval);
      abortControllerRef.current?.abort();
    };
  }, [fetchBalance]);

  return {
    ...balanceData,
    isLoading,
    error,
    refreshBalance: () => fetchBalance(true),
  };
};
