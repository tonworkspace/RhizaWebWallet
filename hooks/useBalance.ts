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
  timestamp: number;
}

// Module-level price cache — survives re-renders
let priceCache: PriceCache | null = null;
const CACHE_DURATION = 30_000; // 30 seconds

// Read admin-configured fallbacks (or built-in defaults)
function getFallbacks() {
  return getPriceOverrides();
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

  const res = await fetch(url, { signal });
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

  return { tonPrice, btcPrice, ethPrice, bnbPrice, maticPrice, avaxPrice, solPrice, tronPrice, usdtPrice, usdcPrice, change, timestamp: Date.now() };
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
