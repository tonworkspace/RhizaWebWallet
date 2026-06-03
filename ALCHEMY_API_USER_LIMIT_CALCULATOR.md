/**
 * Alchemy API Usage Monitor
 * Tracks compute unit usage and alerts when approaching limits
 */

interface UsageStats {
  totalCU: number;
  dailyCU: number;
  monthlyCU: number;
  requestCount: number;
  lastReset: number;
  tier: 'free' | 'growth' | 'scale';
  limit: number;
  percentUsed: number;
}

interface OperationLog {
  operation: string;
  cuCost: number;
  timestamp: number;
  chain: string;
  userId?: string;
}

class AlchemyUsageMonitor {
  private static instance: AlchemyUsageMonitor;
  private usageLog: OperationLog[] = [];
  private readonly STORAGE_KEY = 'alchemy_usage_stats';
  
  // Compute unit costs (from Alchemy docs)
  private readonly CU_COSTS: Record<string, number> = {
    'eth_getBalance': 10,
    'eth_blockNumber': 10,
    'eth_getTransactionCount': 10,
    'eth_call': 26,
    'eth_estimateGas': 50,
    'eth_sendRawTransaction': 100,
    'eth_getTransactionReceipt': 15,
    'eth_getLogs': 75,
    'alchemy_getTokenBalances': 150,
    'alchemy_getTokenMetadata': 50,
    'alchemy_getAssetTransfers': 150,
  };
  
  // Tier limits (monthly CU)
  private readonly TIER_LIMITS = {
    free: 300_000_000,      // 300M CU
    growth: 1_500_000_000,  // 1.5B CU
    scale: 6_000_000_000,   // 6B CU
  };
  
  private currentTier: 'free' | 'growth' | 'scale' = 'free';
  
  private constructor() {
    this.loadStats();
    this.startDailyReset();
  }
  
  static getInstance(): AlchemyUsageMonitor {
    if (!AlchemyUsageMonitor.instance) {
      AlchemyUsageMonitor.instance = new AlchemyUsageMonitor();
    }
    return AlchemyUsageMonitor.instance;
  }
  
  /**
   * Set the current Alchemy tier
   */
  setTier(tier: 'free' | 'growth' | 'scale') {
    this.currentTier = tier;
    this.saveStats();
  }
  
  /**
   * Log an API operation
   */
  logOperation(operation: string, chain: string, userId?: string) {
    const cuCost = this.CU_COSTS[operation] || 10; // Default 10 CU if unknown
    
    const log: OperationLog = {
      operation,
      cuCost,
      timestamp: Date.now(),
      chain,
      userId,
    };
    
    this.usageLog.push(log);
    
    // Keep only last 24 hours of logs
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.usageLog = this.usageLog.filter(l => l.timestamp > oneDayAgo);
    
    this.saveStats();
    this.checkThresholds();
  }
  
  /**
   * Get current usage statistics
   */
  getStats(): UsageStats {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    const dailyLogs = this.usageLog.filter(l => l.timestamp > oneDayAgo);
    const monthlyLogs = this.usageLog.filter(l => l.timestamp > oneMonthAgo);
    
    const dailyCU = dailyLogs.reduce((sum, log) => sum + log.cuCost, 0);
    const monthlyCU = monthlyLogs.reduce((sum, log) => sum + log.cuCost, 0);
    const totalCU = this.usageLog.reduce((sum, log) => sum + log.cuCost, 0);
    
    const limit = this.TIER_LIMITS[this.currentTier];
    const percentUsed = (monthlyCU / limit) * 100;
    
    return {
      totalCU,
      dailyCU,
      monthlyCU,
      requestCount: this.usageLog.length,
      lastReset: this.getLastResetTime(),
      tier: this.currentTier,
      limit,
      percentUsed,
    };
  }
  
  /**
   * Get usage breakdown by operation
   */
  getOperationBreakdown(): Record<string, { count: number; totalCU: number }> {
    const breakdown: Record<string, { count: number; totalCU: number }> = {};
    
    for (const log of this.usageLog) {
      if (!breakdown[log.operation]) {
        breakdown[log.operation] = { count: 0, totalCU: 0 };
      }
      breakdown[log.operation].count++;
      breakdown[log.operation].totalCU += log.cuCost;
    }
    
    return breakdown;
  }
  
  /**
   * Get usage breakdown by chain
   */
  getChainBreakdown(): Record<string, { count: number; totalCU: number }> {
    const breakdown: Record<string, { count: number; totalCU: number }> = {};
    
    for (const log of this.usageLog) {
      if (!breakdown[log.chain]) {
        breakdown[log.chain] = { count: 0, totalCU: 0 };
      }
      breakdown[log.chain].count++;
      breakdown[log.chain].totalCU += log.cuCost;
    }
    
    return breakdown;
  }
  
  /**
   * Calculate estimated monthly cost
   */
  getEstimatedMonthlyCost(): { cu: number; cost: number; tier: string } {
    const stats = this.getStats();
    const projectedMonthlyCU = stats.dailyCU * 30;
    
    let tier = 'free';
    let cost = 0;
    
    if (projectedMonthlyCU > this.TIER_LIMITS.free) {
      tier = 'growth';
      cost = 49;
    }
    if (projectedMonthlyCU > this.TIER_LIMITS.growth) {
      tier = 'scale';
      cost = 199;
    }
    if (projectedMonthlyCU > this.TIER_LIMITS.scale) {
      tier = 'enterprise';
      cost = 499; // Estimated
    }
    
    return { cu: projectedMonthlyCU, cost, tier };
  }
  
  /**
   * Calculate maximum supported users
   */
  getMaxUsers(cuPerUserPerMonth: number = 8646): number {
    const limit = this.TIER_LIMITS[this.currentTier];
    return Math.floor(limit / cuPerUserPerMonth);
  }
  
  /**
   * Check if approaching limits and alert
   */
  private checkThresholds() {
    const stats = this.getStats();
    
    // Alert at 80% usage
    if (stats.percentUsed >= 80 && stats.percentUsed < 90) {
      console.warn(`⚠️ Alchemy API usage at ${stats.percentUsed.toFixed(1)}% of monthly limit`);
      this.sendAlert('warning', stats);
    }
    
    // Critical alert at 90% usage
    if (stats.percentUsed >= 90) {
      console.error(`🚨 Alchemy API usage at ${stats.percentUsed.toFixed(1)}% of monthly limit!`);
      this.sendAlert('critical', stats);
    }
  }
  
  /**
   * Send alert to admin/monitoring system
   */
  private async sendAlert(level: 'warning' | 'critical', stats: UsageStats) {
    // In production, send to monitoring service (Sentry, Datadog, etc.)
    if (import.meta.env.PROD) {
      try {
        // Example: Send to admin notification service
        const { notificationService } = await import('./notificationService');
        await notificationService.sendAdminAlert({
          title: `Alchemy API ${level.toUpperCase()} Alert`,
          message: `Usage at ${stats.percentUsed.toFixed(1)}% (${stats.monthlyCU.toLocaleString()} / ${stats.limit.toLocaleString()} CU)`,
          level,
          data: stats,
        });
      } catch (e) {
        console.error('Failed to send Alchemy usage alert:', e);
      }
    }
  }
  
  /**
   * Reset daily statistics
   */
  private startDailyReset() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDaily();
      // Schedule next reset
      setInterval(() => this.resetDaily(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }
  
  private resetDaily() {
    console.log('📊 Alchemy usage daily reset');
    const stats = this.getStats();
    console.log(`Yesterday's usage: ${stats.dailyCU.toLocaleString()} CU`);
    
    // Keep monthly logs, clear older
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.usageLog = this.usageLog.filter(l => l.timestamp > oneMonthAgo);
    this.saveStats();
  }
  
  private getLastResetTime(): number {
    const stored = localStorage.getItem(`${this.STORAGE_KEY}_reset`);
    return stored ? parseInt(stored) : Date.now();
  }
  
  private saveStats() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        usageLog: this.usageLog,
        tier: this.currentTier,
        lastSaved: Date.now(),
      }));
    } catch (e) {
      console.warn('Failed to save Alchemy usage stats:', e);
    }
  }
  
  private loadStats() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.usageLog = data.usageLog || [];
        this.currentTier = data.tier || 'free';
      }
    } catch (e) {
      console.warn('Failed to load Alchemy usage stats:', e);
    }
  }
  
  /**
   * Export stats for admin dashboard
   */
  exportStats() {
    const stats = this.getStats();
    const operationBreakdown = this.getOperationBreakdown();
    const chainBreakdown = this.getChainBreakdown();
    const estimated = this.getEstimatedMonthlyCost();
    
    return {
      summary: stats,
      operations: operationBreakdown,
      chains: chainBreakdown,
      projection: estimated,
      maxUsers: this.getMaxUsers(),
      timestamp: Date.now(),
    };
  }
}

export const alchemyUsageMonitor = AlchemyUsageMonitor.getInstance();
