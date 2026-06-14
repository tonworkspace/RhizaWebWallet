/**
 * Network Failover Service
 * Provides RPC endpoint failover and health checking for better reliability
 */

export interface FailoverConfig {
  maxRetries: number;
  timeoutMs: number;
  healthCheckInterval: number;
}

export class NetworkFailover {
  private static healthCache = new Map<string, { healthy: boolean; lastCheck: number }>();
  private static readonly DEFAULT_CONFIG: FailoverConfig = {
    maxRetries: 3,
    timeoutMs: 8000,
    healthCheckInterval: 60000 // 1 minute
  };

  /**
   * Test if an RPC endpoint is healthy
   */
  private static async testEndpoint(url: string, testFn?: (url: string) => Promise<any>): Promise<boolean> {
    try {
      if (testFn) {
        await Promise.race([
          testFn(url),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), this.DEFAULT_CONFIG.timeoutMs)
          )
        ]);
      } else {
        // Default health check for EVM endpoints
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_CONFIG.timeoutMs);
        
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_chainId',
              params: [],
              id: 1
            }),
            signal: controller.signal
          });
          
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
        } finally {
          clearTimeout(timeoutId);
        }
      }
      
      return true;
    } catch (error: any) {
      console.warn(`[NetworkFailover] Endpoint ${url} failed health check:`, error?.message || error);
      return false;
    }
  }

  /**
   * Get the first working RPC endpoint from a list
   */
  static async getWorkingRpc(
    urls: string[], 
    testFn?: (url: string) => Promise<any>,
    config: Partial<FailoverConfig> = {}
  ): Promise<string> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    // Check cached health status first
    const now = Date.now();
    for (const url of urls) {
      const cached = this.healthCache.get(url);
      if (cached && 
          cached.healthy && 
          (now - cached.lastCheck) < finalConfig.healthCheckInterval) {
        return url;
      }
    }

    // Test endpoints in order
    for (const url of urls) {
      const isHealthy = await this.testEndpoint(url, testFn);
      
      // Cache result
      this.healthCache.set(url, {
        healthy: isHealthy,
        lastCheck: now
      });
      
      if (isHealthy) {
        console.log(`[NetworkFailover] Selected healthy endpoint: ${url}`);
        return url;
      }
    }
    
    throw new Error(`All RPC endpoints failed: ${urls.join(', ')}`);
  }

  /**
   * Execute operation with automatic failover
   */
  static async withFailover<T>(
    urls: string[],
    operation: (url: string) => Promise<T>,
    config: Partial<FailoverConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    let lastError: Error;

    for (const url of urls) {
      for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
        try {
          const result = await Promise.race([
            operation(url),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Operation timeout')), finalConfig.timeoutMs)
            )
          ]);
          
          // Mark as healthy on success
          this.healthCache.set(url, {
            healthy: true,
            lastCheck: Date.now()
          });
          
          return result;
        } catch (error) {
          lastError = error as Error;
          
          // Mark as unhealthy
          this.healthCache.set(url, {
            healthy: false,
            lastCheck: Date.now()
          });
          
          if (attempt < finalConfig.maxRetries) {
            const delay = 1000 * Math.pow(2, attempt - 1);
            console.warn(`[NetworkFailover] Attempt ${attempt} failed for ${url}, retrying in ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }
    
    throw new Error(`All endpoints failed after ${finalConfig.maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Clear health cache (useful for testing or manual refresh)
   */
  static clearHealthCache(): void {
    this.healthCache.clear();
  }

  /**
   * Get health status of all cached endpoints
   */
  static getHealthStatus(): Record<string, { healthy: boolean; lastCheck: number }> {
    const status: Record<string, { healthy: boolean; lastCheck: number }> = Object.create(null);
    for (const [url, health] of this.healthCache.entries()) {
      status[url] = { ...health };
    }
    return status;
  }
}

const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_KEY;
const QUICKNODE_KEY = import.meta.env.VITE_QUICKNODE_KEY;
const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

// Enhanced RPC configuration with failover support
export const EVM_RPC_FAILOVER = {
  polygon: [
    ...(THIRDWEB_CLIENT_ID ? [`https://137.rpc.thirdweb.com/${THIRDWEB_CLIENT_ID}`] : []),
    ...(ALCHEMY_KEY ? [`https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`] : []),
    ...(QUICKNODE_KEY ? [`https://methodical-falling-putty.matic.quiknode.pro/${QUICKNODE_KEY}/`] : []),
    'https://polygon-rpc.com/',
    'https://rpc.ankr.com/polygon',
    'https://polygon.drpc.org',
    'https://rpc-mainnet.matic.quiknode.pro',
    'https://polygon.llamarpc.com'
  ],
  polygon_testnet: [
    ...(THIRDWEB_CLIENT_ID ? [`https://80002.rpc.thirdweb.com/${THIRDWEB_CLIENT_ID}`] : []),
    ...(ALCHEMY_KEY ? [`https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_KEY}`] : []),
    'https://rpc-amoy.polygon.technology',
    'https://polygon-amoy.drpc.org',
    'https://rpc.ankr.com/polygon_amoy'
  ],
  ethereum: [
    ...(THIRDWEB_CLIENT_ID ? [`https://1.rpc.thirdweb.com/${THIRDWEB_CLIENT_ID}`] : []),
    ...(ALCHEMY_KEY ? [`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`] : []),
    ...(QUICKNODE_KEY ? [`https://patient-wandering-cherry.quiknode.pro/${QUICKNODE_KEY}/`] : []),
    'https://eth.drpc.org',
    'https://ethereum.publicnode.com',
    'https://1rpc.io/eth',
    'https://rpc.mevblocker.io',
    'https://eth.meowrpc.com',
    'https://eth-mainnet.public.blastapi.io'
  ],
  arbitrum: [
    ...(THIRDWEB_CLIENT_ID ? [`https://42161.rpc.thirdweb.com/${THIRDWEB_CLIENT_ID}`] : []),
    ...(ALCHEMY_KEY ? [`https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`] : []),
    'https://arb1.arbitrum.io/rpc',
    'https://rpc.ankr.com/arbitrum',
    'https://arbitrum.drpc.org',
    'https://arbitrum.llamarpc.com'
  ],
  bsc: [
    ...(THIRDWEB_CLIENT_ID ? [`https://56.rpc.thirdweb.com/${THIRDWEB_CLIENT_ID}`] : []),
    ...(ALCHEMY_KEY ? [`https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`] : []),
    'https://bsc-dataseed.binance.org',
    'https://rpc.ankr.com/bsc',
    'https://bsc.drpc.org',
    'https://bsc.publicnode.com'
  ],
  bsc_testnet: [
    ...(THIRDWEB_CLIENT_ID ? [`https://97.rpc.thirdweb.com/${THIRDWEB_CLIENT_ID}`] : []),
    'https://data-seed-prebsc-1-s1.binance.org:8545',
    'https://data-seed-prebsc-2-s1.binance.org:8545',
    'https://bsc-testnet.publicnode.com'
  ],
  avalanche: [
    ...(THIRDWEB_CLIENT_ID ? [`https://43114.rpc.thirdweb.com/${THIRDWEB_CLIENT_ID}`] : []),
    'https://avalanche-c-chain-rpc.publicnode.com',
    'https://rpc.ankr.com/avalanche',
    'https://avalanche.drpc.org'
  ],
  sepolia: [
    ...(THIRDWEB_CLIENT_ID ? [`https://11155111.rpc.thirdweb.com/${THIRDWEB_CLIENT_ID}`] : []),
    ...(ALCHEMY_KEY ? [`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`] : []),
    'https://sepolia.drpc.org',
    'https://rpc.ankr.com/eth_sepolia',
    'https://ethereum-sepolia.publicnode.com'
  ]
};

export const TON_RPC_FAILOVER = {
  mainnet: [
    'https://toncenter.com/api/v3',
    'https://tonapi.io/v2/jsonRPC',
    'https://mainnet.tonhubapi.com/jsonRPC',
    'https://mainnet-v4.tonhubapi.com/jsonRPC'
  ],
  testnet: [
    'https://testnet.toncenter.com/api/v3',
    'https://testnet.tonapi.io/v2/jsonRPC',
    'https://testnet-v4.tonhubapi.com/jsonRPC'
  ]
};

export const SOLANA_RPC_FAILOVER = {
  mainnet: [
    ...(ALCHEMY_KEY ? [`https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`] : []),
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana',
    'https://solana.publicnode.com'
  ],
  devnet: [
    ...(ALCHEMY_KEY ? [`https://solana-devnet.g.alchemy.com/v2/${ALCHEMY_KEY}`] : []),
    'https://api.devnet.solana.com',
    'https://rpc.ankr.com/solana_devnet'
  ]
};