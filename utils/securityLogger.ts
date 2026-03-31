/**
 * Security Event Logging Utility (Issue #15 FIX)
 * Tracks security-relevant events for audit and monitoring
 */

import { supabaseService } from '../services/supabaseService';

export type SecurityEventType =
  | 'wallet_created'
  | 'wallet_imported'
  | 'wallet_deleted'
  | 'large_transaction'
  | 'network_switch'
  | 'password_changed'
  | 'session_expired'
  | 'failed_transaction'
  | 'suspicious_activity';

export interface SecurityEvent {
  type: SecurityEventType;
  walletAddress: string;
  details: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Log a security event to the database
 * 
 * @param event - Security event to log
 * @returns Success status
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Add metadata
    const enrichedEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screen_resolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      severity: event.severity || getSeverity(event.type)
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('🔒 Security Event:', enrichedEvent);
    }

    // Log to database if Supabase is configured
    if (supabaseService.isConfigured()) {
      const result = await supabaseService.trackEvent(
        `security_${event.type}`,
        enrichedEvent,
        event.walletAddress
      );

      if (!result.success) {
        console.warn('⚠️ Failed to log security event to database:', result.error);
        // Don't throw - logging failures shouldn't break the app
      }

      return { success: true };
    }

    // If Supabase not configured, just log locally
    console.log('📝 Security event logged locally (Supabase not configured)');
    return { success: true };

  } catch (error) {
    console.error('❌ Security logging error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Determine severity based on event type
 */
function getSeverity(type: SecurityEventType): 'low' | 'medium' | 'high' | 'critical' {
  switch (type) {
    case 'suspicious_activity':
    case 'wallet_deleted':
      return 'critical';
    
    case 'large_transaction':
    case 'password_changed':
    case 'failed_transaction':
      return 'high';
    
    case 'network_switch':
    case 'session_expired':
      return 'medium';
    
    case 'wallet_created':
    case 'wallet_imported':
    default:
      return 'low';
  }
}

/**
 * Log wallet creation event
 */
export async function logWalletCreated(
  walletAddress: string,
  walletType: 'primary' | 'secondary',
  details?: Record<string, any>
) {
  return logSecurityEvent({
    type: 'wallet_created',
    walletAddress,
    details: {
      wallet_type: walletType,
      ...details
    },
    severity: 'low'
  });
}

/**
 * Log wallet import event
 */
export async function logWalletImported(
  walletAddress: string,
  walletType: 'primary' | 'secondary',
  origin: 'rhiza' | 'foreign' | 'new',
  details?: Record<string, any>
) {
  return logSecurityEvent({
    type: 'wallet_imported',
    walletAddress,
    details: {
      wallet_type: walletType,
      origin,
      ...details
    },
    severity: 'low'
  });
}

/**
 * Log large transaction (> threshold)
 */
export async function logLargeTransaction(
  walletAddress: string,
  amount: string,
  asset: string,
  recipient: string,
  txHash?: string,
  details?: Record<string, any>
) {
  return logSecurityEvent({
    type: 'large_transaction',
    walletAddress,
    details: {
      amount,
      asset,
      recipient,
      tx_hash: txHash,
      ...details
    },
    severity: 'high'
  });
}

/**
 * Log network switch
 */
export async function logNetworkSwitch(
  walletAddress: string,
  fromNetwork: string,
  toNetwork: string,
  details?: Record<string, any>
) {
  return logSecurityEvent({
    type: 'network_switch',
    walletAddress,
    details: {
      from_network: fromNetwork,
      to_network: toNetwork,
      ...details
    },
    severity: 'medium'
  });
}

/**
 * Log password change
 */
export async function logPasswordChanged(
  walletAddress: string,
  details?: Record<string, any>
) {
  return logSecurityEvent({
    type: 'password_changed',
    walletAddress,
    details: details || {},
    severity: 'high'
  });
}

/**
 * Log session expiration
 */
export async function logSessionExpired(
  walletAddress: string,
  sessionAge: number,
  details?: Record<string, any>
) {
  return logSecurityEvent({
    type: 'session_expired',
    walletAddress,
    details: {
      session_age_minutes: Math.floor(sessionAge / 60000),
      ...details
    },
    severity: 'medium'
  });
}

/**
 * Log failed transaction
 */
export async function logFailedTransaction(
  walletAddress: string,
  error: string,
  amount?: string,
  recipient?: string,
  details?: Record<string, any>
) {
  return logSecurityEvent({
    type: 'failed_transaction',
    walletAddress,
    details: {
      error,
      amount,
      recipient,
      ...details
    },
    severity: 'high'
  });
}

/**
 * Log wallet deletion
 */
export async function logWalletDeleted(
  walletAddress: string,
  details?: Record<string, any>
) {
  return logSecurityEvent({
    type: 'wallet_deleted',
    walletAddress,
    details: details || {},
    severity: 'critical'
  });
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  walletAddress: string,
  reason: string,
  details?: Record<string, any>
) {
  return logSecurityEvent({
    type: 'suspicious_activity',
    walletAddress,
    details: {
      reason,
      ...details
    },
    severity: 'critical'
  });
}

/**
 * Check if transaction amount is considered "large"
 * Returns true if amount exceeds threshold
 */
export function isLargeTransaction(amount: string, asset: string): boolean {
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum)) return false;

  // Define thresholds for different assets
  const thresholds: Record<string, number> = {
    TON: 100,      // 100 TON
    ETH: 0.5,      // 0.5 ETH
    BTC: 0.01,     // 0.01 BTC
    USDT: 1000,    // 1000 USDT
    USDC: 1000,    // 1000 USDC
    RZC: 10000     // 10000 RZC
  };

  const threshold = thresholds[asset.toUpperCase()] || 1000; // Default threshold
  return amountNum >= threshold;
}
