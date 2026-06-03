/**
 * Real-time Balance Monitor
 * Provides real-time balance monitoring with WebSocket support for better UX
 */

export interface BalanceChangeEvent {
  chain: string;
  oldBalance: string;
  newBalance: string;
  change: string;
  isIncrease: boolean;
  timestamp: number;
}

export interface MonitoringConfig {
  intervalMs: number;
  enableWebSocket: boolean;
  chains: string[];
  threshold: number; // Minimum change to trigger event
}

export class BalanceMonitor extends EventTarget {
  private intervals = new Map<string, NodeJS.Timeout>();
  private lastBalances = new Map<string, string>();
  private webSockets = new Map<string, WebSocket>();
  private isMonitoring = false;
  private config: MonitoringConfig;

  constructor(config: Partial<MonitoringConfig> = {}) {
    super();
    this.config = {
      intervalMs: 10000, // 10 seconds
      enableWebSocket: true,
      chains: ['evm', 'ton', 'btc', 'sol', 'tron'],
      threshold: 0.000001, // Minimum change to report
      ...config
    };
  }

  /**
   * Start monitoring balances for specified chains
   */
  async startMonitoring(tetherWdkService: any): Promise<void> {
    if (this.isMonitoring) {
      console.warn('[BalanceMonitor] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    console.log('[BalanceMonitor] Starting balance monitoring for:', this.config.chains);

    // Initialize last balances
    try {
      const initialBalances = await tetherWdkService.getBalances();
      for (const chain of this.config.chains) {
        const balanceKey = `${chain}Balance`;
        if (initialBalances[balanceKey]) {
          this.lastBalances.set(chain, initialBalances[balanceKey]);
        }
      }
    } catch (error) {
      console.error('[BalanceMonitor] Failed to get initial balances:', error);
    }

    // Start polling
    this.startPolling(tetherWdkService);

    // Start WebSocket monitoring for supported chains
    if (this.config.enableWebSocket) {
      await this.startWebSocketMonitoring(tetherWdkService);
    }
  }

  /**
   * Stop all monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    console.log('[BalanceMonitor] Stopping balance monitoring');
    this.isMonitoring = false;

    // Clear intervals
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();

    // Close WebSockets
    for (const ws of this.webSockets.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
    this.webSockets.clear();

    // Clear state
    this.lastBalances.clear();
  }

  /**
   * Start polling-based monitoring
   */
  private startPolling(tetherWdkService: any): void {
    const pollBalances = async () => {
      if (!this.isMonitoring) return;

      try {
        const balances = await tetherWdkService.getBalances();
        this.processBalanceUpdate(balances);
      } catch (error) {
        console.error('[BalanceMonitor] Polling error:', error);
        
        // Emit error event
        this.dispatchEvent(new CustomEvent('monitoringError', {
          detail: { error: error.message, type: 'polling' }
        }));
      }
    };

    // Initial poll
    pollBalances();

    // Set up interval
    const interval = setInterval(pollBalances, this.config.intervalMs);
    this.intervals.set('polling', interval);
  }

  /**
   * Start WebSocket monitoring for supported chains
   */
  private async startWebSocketMonitoring(tetherWdkService: any): Promise<void> {
    try {
      // Get addresses for WebSocket subscriptions
      const addresses = await tetherWdkService.getAddresses();

      // TON WebSocket monitoring
      if (this.config.chains.includes('ton') && addresses.tonAddress) {
        await this.startTonWebSocket(addresses.tonAddress);
      }

      // Add more WebSocket implementations as needed
      // Ethereum WebSocket would require different setup
      
    } catch (error) {
      console.error('[BalanceMonitor] WebSocket setup failed:', error);
    }
  }

  /**
   * Start TON WebSocket monitoring
   */
  private async startTonWebSocket(address: string): Promise<void> {
    try {
      const ws = new WebSocket('wss://tonapi.io/v2/websocket');
      
      ws.onopen = () => {
        console.log('[BalanceMonitor] TON WebSocket connected');
        ws.send(JSON.stringify({
          id: 1,
          method: 'subscribe_account',
          params: { account: address }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.method === 'account_update') {
            const balance = (Number(data.params.balance) / 1e9).toFixed(4);
            this.processBalanceUpdate({ tonBalance: balance }, 'websocket');
          }
        } catch (error) {
          console.error('[BalanceMonitor] TON WebSocket message error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[BalanceMonitor] TON WebSocket error:', error);
        this.dispatchEvent(new CustomEvent('monitoringError', {
          detail: { error: 'TON WebSocket error', type: 'websocket' }
        }));
      };

      ws.onclose = () => {
        console.log('[BalanceMonitor] TON WebSocket closed');
        
        // Attempt to reconnect after 5 seconds if still monitoring
        if (this.isMonitoring) {
          setTimeout(() => {
            if (this.isMonitoring) {
              this.startTonWebSocket(address);
            }
          }, 5000);
        }
      };

      this.webSockets.set('ton', ws);
    } catch (error) {
      console.error('[BalanceMonitor] TON WebSocket setup failed:', error);
    }
  }

  /**
   * Process balance updates and emit events for changes
   */
  private processBalanceUpdate(balances: Record<string, string>, source = 'polling'): void {
    const timestamp = Date.now();

    for (const chain of this.config.chains) {
      const balanceKey = `${chain}Balance`;
      const currentBalance = balances[balanceKey];
      
      if (!currentBalance) continue;

      const lastBalance = this.lastBalances.get(chain);
      
      if (lastBalance && currentBalance !== lastBalance) {
        const change = parseFloat(currentBalance) - parseFloat(lastBalance);
        
        // Only emit if change is above threshold
        if (Math.abs(change) >= this.config.threshold) {
          const event: BalanceChangeEvent = {
            chain,
            oldBalance: lastBalance,
            newBalance: currentBalance,
            change: change.toString(),
            isIncrease: change > 0,
            timestamp
          };

          console.log(`[BalanceMonitor] Balance change detected (${source}):`, event);

          this.dispatchEvent(new CustomEvent('balanceChange', {
            detail: event
          }));

          // Emit chain-specific event
          this.dispatchEvent(new CustomEvent(`${chain}BalanceChange`, {
            detail: event
          }));
        }
      }
      
      this.lastBalances.set(chain, currentBalance);
    }
  }

  /**
   * Get current monitoring status
   */
  getStatus(): {
    isMonitoring: boolean;
    config: MonitoringConfig;
    lastBalances: Record<string, string>;
    webSocketStatus: Record<string, string>;
  } {
    const webSocketStatus: Record<string, string> = {};
    for (const [chain, ws] of this.webSockets.entries()) {
      webSocketStatus[chain] = ws.readyState === WebSocket.OPEN ? 'connected' : 'disconnected';
    }

    return {
      isMonitoring: this.isMonitoring,
      config: this.config,
      lastBalances: Object.fromEntries(this.lastBalances),
      webSocketStatus
    };
  }

  /**
   * Manually trigger a balance check
   */
  async triggerCheck(tetherWdkService: any): Promise<void> {
    if (!this.isMonitoring) {
      throw new Error('Monitoring is not active');
    }

    try {
      const balances = await tetherWdkService.getBalances();
      this.processBalanceUpdate(balances, 'manual');
    } catch (error) {
      console.error('[BalanceMonitor] Manual check failed:', error);
      throw error;
    }
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.isMonitoring) {
      console.log('[BalanceMonitor] Configuration updated, restarting monitoring');
      // Note: In a real implementation, you might want to restart monitoring
      // with the new config without losing state
    }
  }
}

// Singleton instance for global use
export const balanceMonitor = new BalanceMonitor();