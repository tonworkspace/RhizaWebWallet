// Type definition for JettonBalance (compatible with @ton-api/client)
interface JettonBalance {
  balance: string;
  jetton: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    image?: string;
    verification?: string;
  };
  price?: {
    usd: number;
  };
}

export interface JettonRegistryData {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  image: string;
  emoji?: string;
  verified: boolean;
  rateUsd: number;
}

// ─── Static fallback registry (used when remote fetch fails) ─────────────────
const STATIC_REGISTRY: Record<string, Omit<JettonRegistryData, 'address'>> = {
  'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs': {
    verified: true, symbol: 'USDT', name: 'Tether USD', decimals: 6,
    image: 'https://cache.tonapi.io/imgproxy/T3PB4s7oprNVaJkwqbGg54nexKE0zzKhcrPv8jcWYzU/rs:fill:200:200:1/g:no/aHR0cHM6Ly90ZXRoZXIudG8vaW1hZ2VzL2xvZ29DaXJjbGUucG5n.webp',
    emoji: '💵', rateUsd: 1.0,
  },
  'EQC_1YoM8RBixN95lz7odcF3Vrkc_N8Ne7gQi7Abtlet_Efi': {
    verified: true, symbol: 'USDC', name: 'USD Coin', decimals: 6,
    image: 'https://cache.tonapi.io/imgproxy/yb2_6-_tVGiHbfiMvC8-_Gu-Hs_TpTlhCWrVe-ZTQIQ/rs:fill:200:200:1/g:no/aHR0cHM6Ly9jZW50cmUuaW8vYXNzZXRzL2ltYWdlcy91c2RjLWxvZ28ucG5n.webp',
    emoji: '💲', rateUsd: 1.0,
  },
  'EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA': {
    verified: true, symbol: 'jUSDT', name: 'Bridged Tether USD', decimals: 6,
    image: 'https://cache.tonapi.io/imgproxy/T3PB4s7oprNVaJkwqbGg54nexKE0zzKhcrPv8jcWYzU/rs:fill:200:200:1/g:no/aHR0cHM6Ly90ZXRoZXIudG8vaW1hZ2VzL2xvZ29DaXJjbGUucG5n.webp',
    emoji: '🌉', rateUsd: 1.0,
  },
  'EQC61IQRl0_la95t27xhIpjxZt32vl1QQVF2UgTNuvD18W-4': {
    verified: true, symbol: 'jUSDC', name: 'Bridged USD Coin', decimals: 6,
    image: 'https://cache.tonapi.io/imgproxy/yb2_6-_tVGiHbfiMvC8-_Gu-Hs_TpTlhCWrVe-ZTQIQ/rs:fill:200:200:1/g:no/aHR0cHM6Ly9jZW50cmUuaW8vYXNzZXRzL2ltYWdlcy91c2RjLWxvZ28ucG5n.webp',
    emoji: '🌉', rateUsd: 1.0,
  },
  'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT': {
    verified: true, symbol: 'NOT', name: 'Notcoin', decimals: 9,
    image: 'https://cache.tonapi.io/imgproxy/T6RBxmGJlnKDWltiIRpHWIiMT4LnVkTfRgNggRxWDhk/rs:fill:200:200:1/g:no/aHR0cHM6Ly9jZG4uam9pbmNvbW11bml0eS54eXovY2xpY2tlci9ub3RfbG9nby5wbmc.webp',
    emoji: '🎮', rateUsd: 0.008,
  },
  'EQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-SCALE': {
    verified: true, symbol: 'SCALE', name: 'SCALE', decimals: 9,
    image: 'https://cache.tonapi.io/imgproxy/WB7I2GJQN8JpABs_Zy4w_PqRDWKIBnYWQJqFbqKKLRE/rs:fill:200:200:1/g:no/aHR0cHM6Ly9zY2FsZS50b24vbG9nby5wbmc.webp',
    emoji: '⚖️', rateUsd: 0.05,
  },
  'EQBObyiP7EtGDBxWV--eZYAB-o8U8RuGL7kPZELbu-cTufNr': {
    verified: true, symbol: 'STK', name: 'Stakers Token', decimals: 9,
    image: 'https://storage.dyor.io/jettons/images/1759255309/19733916.png',
    emoji: '🎯', rateUsd: 0.0000012,
  },
};

// ─── Dynamic registry (loaded from public/jetton-registry.json) ──────────────
const CACHE_KEY = 'jetton_registry_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Runtime map — starts as a copy of the static registry, gets merged with remote data
let runtimeRegistry: Record<string, Omit<JettonRegistryData, 'address'>> = { ...STATIC_REGISTRY };
let fetchPromise: Promise<void> | null = null;

interface RegistryCacheEntry {
  timestamp: number;
  tokens: JettonRegistryData[];
}

function loadFromLocalStorage(): JettonRegistryData[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: RegistryCacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
    return entry.tokens;
  } catch {
    return null;
  }
}

function saveToLocalStorage(tokens: JettonRegistryData[]): void {
  try {
    const entry: RegistryCacheEntry = { timestamp: Date.now(), tokens };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage quota exceeded — silently ignore
  }
}

function mergeTokensIntoRuntime(tokens: JettonRegistryData[]): void {
  for (const token of tokens) {
    const { address, ...rest } = token;
    runtimeRegistry[address] = rest;
  }
}

/**
 * Fetches jetton-registry.json once per session (with 24h localStorage cache).
 * Safe to call multiple times — deduplicates the in-flight request.
 */
export async function initJettonRegistry(): Promise<void> {
  // Already loaded from cache?
  const cached = loadFromLocalStorage();
  if (cached) {
    mergeTokensIntoRuntime(cached);
    return;
  }

  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const base = import.meta.env.BASE_URL ?? '/';
      const url = `${base}jetton-registry.json`.replace('//', '/');
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const tokens: JettonRegistryData[] = data.tokens ?? [];
      mergeTokensIntoRuntime(tokens);
      saveToLocalStorage(tokens);
      console.log(`📋 Jetton registry loaded: ${tokens.length} tokens`);
    } catch (err) {
      console.warn('⚠️ Failed to load remote jetton registry, using static fallback:', err);
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

// Kick off the fetch immediately (non-blocking)
initJettonRegistry();

// ─── Public API ──────────────────────────────────────────────────────────────

function normalizeAddress(address: string): string {
  if (!address) return address;
  return address.trim();
}

export function getJettonRegistryData(address: string): JettonRegistryData | null {
  const key = normalizeAddress(address);
  const entry = runtimeRegistry[key];
  if (!entry) return null;
  return { address: key, ...entry };
}

export function enhanceJettonData(
  jetton: JettonBalance,
  registryData?: JettonRegistryData
): JettonBalance & {
  jetton: typeof jetton.jetton & {
    verified?: boolean;
    description?: string;
    image?: string;
    symbol?: string;
    name?: string;
  };
} {
  if (!registryData) {
    return { ...jetton, jetton: { ...jetton.jetton, verified: false, description: undefined } };
  }
  return {
    ...jetton,
    jetton: {
      ...jetton.jetton,
      verified: registryData.verified,
      name: registryData.name || jetton.jetton.name,
      symbol: registryData.symbol || jetton.jetton.symbol,
      image: registryData.image || (jetton as any).jetton?.image,
      description: (jetton as any).jetton?.description,
    },
  };
}

export function getJettonPrice(address: string): number | null {
  return getJettonRegistryData(address)?.rateUsd ?? null;
}

export function isJettonVerified(address: string): boolean {
  return getJettonRegistryData(address)?.verified ?? false;
}

export function getAllRegistryTokens(): JettonRegistryData[] {
  const seen = new Set<string>();
  const tokens: JettonRegistryData[] = [];
  for (const [address, data] of Object.entries(runtimeRegistry)) {
    const norm = normalizeAddress(address);
    if (seen.has(norm)) continue;
    if (address.startsWith('EQ')) {
      tokens.push({ address: norm, ...data });
      seen.add(norm);
    }
  }
  return tokens;
}
