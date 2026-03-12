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
  emoji?: string; // Fallback emoji if image fails to load
  verified: boolean;
  rateUsd: number;
}

// Minimal in-app registry cache. This mirrors public/jetton-registry.json
// so lookups are synchronous for UI rendering.
const STATIC_REGISTRY: Record<string, Omit<JettonRegistryData, "address">> = {
  // USDT (Tether USD) - Official TON Mainnet
  "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs": {
    verified: true,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    image: "https://cache.tonapi.io/imgproxy/T3PB4s7oprNVaJkwqbGg54nexKE0zzKhcrPv8jcWYzU/rs:fill:200:200:1/g:no/aHR0cHM6Ly90ZXRoZXIudG8vaW1hZ2VzL2xvZ29DaXJjbGUucG5n.webp",
    emoji: "💵",
    rateUsd: 1.0,
  },

  // USDC (USD Coin) - Official TON Mainnet
  "EQC_1YoM8RBixN95lz7odcF3Vrkc_N8Ne7gQi7Abtlet_Efi": {
    verified: true,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    image: "https://cache.tonapi.io/imgproxy/yb2_6-_tVGiHbfiMvC8-_Gu-Hs_TpTlhCWrVe-ZTQIQ/rs:fill:200:200:1/g:no/aHR0cHM6Ly9jZW50cmUuaW8vYXNzZXRzL2ltYWdlcy91c2RjLWxvZ28ucG5n.webp",
    emoji: "💲",
    rateUsd: 1.0,
  },

  // jUSDT (Bridged USDT)
  "EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA": {
    verified: true,
    symbol: "jUSDT",
    name: "Bridged Tether USD",
    decimals: 6,
    image: "https://cache.tonapi.io/imgproxy/T3PB4s7oprNVaJkwqbGg54nexKE0zzKhcrPv8jcWYzU/rs:fill:200:200:1/g:no/aHR0cHM6Ly90ZXRoZXIudG8vaW1hZ2VzL2xvZ29DaXJjbGUucG5n.webp",
    emoji: "🌉",
    rateUsd: 1.0,
  },

  // jUSDC (Bridged USDC)
  "EQC61IQRl0_la95t27xhIpjxZt32vl1QQVF2UgTNuvD18W-4": {
    verified: true,
    symbol: "jUSDC",
    name: "Bridged USD Coin",
    decimals: 6,
    image: "https://cache.tonapi.io/imgproxy/yb2_6-_tVGiHbfiMvC8-_Gu-Hs_TpTlhCWrVe-ZTQIQ/rs:fill:200:200:1/g:no/aHR0cHM6Ly9jZW50cmUuaW8vYXNzZXRzL2ltYWdlcy91c2RjLWxvZ28ucG5n.webp",
    emoji: "🌉",
    rateUsd: 1.0,
  },

  // NOT (Notcoin) - Popular TON Gaming Token
  "EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT": {
    verified: true,
    symbol: "NOT",
    name: "Notcoin",
    decimals: 9,
    image: "https://cache.tonapi.io/imgproxy/T6RBxmGJlnKDWltiIRpHWIiMT4LnVkTfRgNggRxWDhk/rs:fill:200:200:1/g:no/aHR0cHM6Ly9jZG4uam9pbmNvbW11bml0eS54eXovY2xpY2tlci9ub3RfbG9nby5wbmc.webp",
    emoji: "🎮",
    rateUsd: 0.008, // Approximate price
  },

  // SCALE Token
  "EQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-SCALE": {
    verified: true,
    symbol: "SCALE",
    name: "SCALE",
    decimals: 9,
    image: "https://cache.tonapi.io/imgproxy/WB7I2GJQN8JpABs_Zy4w_PqRDWKIBnYWQJqFbqKKLRE/rs:fill:200:200:1/g:no/aHR0cHM6Ly9zY2FsZS50b24vbG9nby5wbmc.webp",
    emoji: "⚖️",
    rateUsd: 0.05, // Approximate price
  },

  // STK (Stakers Token)
  "EQBObyiP7EtGDBxWV--eZYAB-o8U8RuGL7kPZELbu-cTufNr": {
    verified: true,
    symbol: "STK",
    name: "Stakers Token",
    decimals: 9,
    image: "https://storage.dyor.io/jettons/images/1759255309/19733916.png",
    emoji: "🎯",
    rateUsd: 0.0000012,
  },
};

function normalizeAddress(address: string): string {
  if (!address) return address;
  // tonapi returns user-friendly addresses; also support raw 0:... form
  return address.trim();
}

export function getJettonRegistryData(
  address: string
): JettonRegistryData | null {
  const key = normalizeAddress(address);
  const entry = STATIC_REGISTRY[key];
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
    return {
      ...jetton,
      jetton: {
        ...jetton.jetton,
        verified: false,
        description: undefined,
      },
    };
  }

  return {
    ...jetton,
    jetton: {
      ...jetton.jetton,
      verified: registryData.verified,
      name: registryData.name || jetton.jetton.name,
      symbol: registryData.symbol || jetton.jetton.symbol,
      image: registryData.image || (jetton as any).jetton?.image,
      // description is optional in our UI
      description: (jetton as any).jetton?.description,
    },
  };
}

/**
 * Get USD price for a jetton from registry
 */
export function getJettonPrice(address: string): number | null {
  const registryData = getJettonRegistryData(address);
  return registryData?.rateUsd ?? null;
}

/**
 * Check if a jetton is verified in the registry
 */
export function isJettonVerified(address: string): boolean {
  const registryData = getJettonRegistryData(address);
  return registryData?.verified ?? false;
}

/**
 * Get all tokens from the registry
 * Returns array of all registered tokens with their metadata
 */
export function getAllRegistryTokens(): JettonRegistryData[] {
  const tokens: JettonRegistryData[] = [];
  const seenAddresses = new Set<string>();

  for (const [address, data] of Object.entries(STATIC_REGISTRY)) {
    // Skip if we've already added this token (handles duplicate addresses)
    const normalizedAddr = normalizeAddress(address);
    if (seenAddresses.has(normalizedAddr)) continue;
    
    // Only add if it's a user-friendly address (EQ...) to avoid duplicates
    if (address.startsWith('EQ')) {
      tokens.push({
        address: normalizedAddr,
        ...data,
      });
      seenAddresses.add(normalizedAddr);
    }
  }

  return tokens;
}
