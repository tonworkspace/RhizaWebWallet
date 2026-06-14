/**
 * Balance Formatter Utility
 * 
 * Handles large balance formatting using BigInt to avoid JavaScript number precision loss.
 * Supports all blockchain decimal formats (0-18 decimals).
 * 
 * Key Features:
 * - No precision loss for large numbers
 * - Handles edge cases (zero, negative, invalid input)
 * - Configurable decimal display
 * - Locale-aware formatting
 */

export interface FormatBalanceOptions {
  /** Maximum number of decimal places to display (default: 9) */
  maxDecimals?: number;
  /** Minimum number of decimal places to display (default: 0) */
  minDecimals?: number;
  /** Whether to use locale-specific formatting (default: true) */
  useLocale?: boolean;
  /** Whether to trim trailing zeros (default: true) */
  trimZeros?: boolean;
  /** Fallback value if formatting fails (default: '0') */
  fallback?: string;
}

/**
 * Format a balance string with proper decimal handling using BigInt.
 * 
 * @param balance - Balance as string (e.g., "5234200000" for 5.2342 TON with 9 decimals)
 * @param decimals - Number of decimal places the balance uses (e.g., 9 for TON, 6 for USDT)
 * @param options - Formatting options
 * @returns Formatted balance string
 * 
 * @example
 * formatBalance("5234200000", 9) // "5.2342"
 * formatBalance("1000000", 6) // "1"
 * formatBalance("1500000", 6, { minDecimals: 2 }) // "1.50"
 */
export function formatBalance(
  balance: string | number,
  decimals: number,
  options: FormatBalanceOptions = {}
): string {
  const {
    maxDecimals = 9,
    minDecimals = 0,
    useLocale = true,
    trimZeros = true,
    fallback = '0'
  } = options;

  try {
    // Validate inputs
    if (balance === null || balance === undefined || balance === '') {
      return fallback;
    }

    if (decimals < 0 || decimals > 18) {
      console.error(`Invalid decimals: ${decimals}. Must be between 0 and 18.`);
      return fallback;
    }

    // Convert to string and clean
    const balanceStr = String(balance).trim();
    
    // Handle zero explicitly
    if (balanceStr === '0' || balanceStr === '0.0' || balanceStr === '') {
      return minDecimals > 0 ? `0.${'0'.repeat(minDecimals)}` : '0';
    }

    // Remove any non-numeric characters except decimal point and minus sign
    const cleaned = balanceStr.replace(/[^\d.-]/g, '');
    
    // Check for negative (shouldn't happen for balances, but handle gracefully)
    const isNegative = cleaned.startsWith('-');
    const absoluteValue = cleaned.replace('-', '');

    // If the input already has a decimal point, it's a float representation
    if (absoluteValue.includes('.')) {
      const num = parseFloat(absoluteValue);
      if (isNaN(num)) return fallback;
      
      return formatFloatBalance(
        isNegative ? -num : num,
        maxDecimals,
        minDecimals,
        useLocale,
        trimZeros
      );
    }

    // Otherwise, treat as integer with implied decimals (e.g., nanotons)
    const bigIntBalance = BigInt(absoluteValue);
    
    // Handle zero after BigInt conversion
    if (bigIntBalance === 0n) {
      return minDecimals > 0 ? `0.${'0'.repeat(minDecimals)}` : '0';
    }

    // Calculate divisor (10^decimals)
    const divisor = BigInt(10 ** decimals);
    
    // Get integer and fractional parts
    const integerPart = bigIntBalance / divisor;
    const remainder = bigIntBalance % divisor;

    // Format integer part with locale if requested
    let integerStr = integerPart.toString();
    if (useLocale) {
      integerStr = Number(integerStr).toLocaleString(undefined, {
        maximumFractionDigits: 0
      });
    }

    // Handle fractional part
    if (remainder === 0n && minDecimals === 0) {
      return (isNegative ? '-' : '') + integerStr;
    }

    // Convert remainder to string with leading zeros
    let fractionalStr = remainder.toString().padStart(decimals, '0');

    // Trim to maxDecimals
    if (fractionalStr.length > maxDecimals) {
      fractionalStr = fractionalStr.substring(0, maxDecimals);
    }

    // Trim trailing zeros if requested
    if (trimZeros) {
      fractionalStr = fractionalStr.replace(/0+$/, '');
    }

    // Ensure minDecimals
    if (fractionalStr.length < minDecimals) {
      fractionalStr = fractionalStr.padEnd(minDecimals, '0');
    }

    // Construct final result
    if (fractionalStr.length === 0) {
      return (isNegative ? '-' : '') + integerStr;
    }

    return (isNegative ? '-' : '') + integerStr + '.' + fractionalStr;

  } catch (error) {
    console.error('Balance formatting error:', error, { balance, decimals });
    return fallback;
  }
}

/**
 * Format a float balance (already in human-readable form)
 */
function formatFloatBalance(
  num: number,
  maxDecimals: number,
  minDecimals: number,
  useLocale: boolean,
  trimZeros: boolean
): string {
  if (num === 0) {
    return minDecimals > 0 ? `0.${'0'.repeat(minDecimals)}` : '0';
  }

  if (useLocale) {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: trimZeros ? 0 : minDecimals,
      maximumFractionDigits: maxDecimals
    });
  }

  // Manual formatting without locale
  const fixed = num.toFixed(maxDecimals);
  const trimmed = trimZeros ? fixed.replace(/\.?0+$/, '') : fixed;
  
  // Ensure minDecimals
  if (minDecimals > 0) {
    const parts = trimmed.split('.');
    const currentDecimals = parts[1]?.length || 0;
    if (currentDecimals < minDecimals) {
      return parts[0] + '.' + (parts[1] || '').padEnd(minDecimals, '0');
    }
  }
  
  return trimmed;
}

/**
 * Format balance with USD value
 * 
 * @example
 * formatBalanceWithUsd("5234200000", 9, 6.82) // "5.2342 ($35.70)"
 */
export function formatBalanceWithUsd(
  balance: string | number,
  decimals: number,
  priceUsd: number,
  options: FormatBalanceOptions = {}
): string {
  const formattedBalance = formatBalance(balance, decimals, options);
  
  if (formattedBalance === '0' || !priceUsd || priceUsd <= 0) {
    return formattedBalance;
  }

  try {
    // Calculate USD value
    const balanceNum = parseBalanceToNumber(balance, decimals);
    const usdValue = balanceNum * priceUsd;
    
    if (usdValue < 0.01) {
      return `${formattedBalance} (< $0.01)`;
    }
    
    const usdFormatted = usdValue.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return `${formattedBalance} ($${usdFormatted})`;
  } catch (error) {
    console.error('USD formatting error:', error);
    return formattedBalance;
  }
}

/**
 * Parse balance string to number (for calculations only, not display)
 * WARNING: May lose precision for very large numbers
 */
export function parseBalanceToNumber(
  balance: string | number,
  decimals: number
): number {
  try {
    if (balance === null || balance === undefined || balance === '') {
      return 0;
    }

    const balanceStr = String(balance).trim();
    
    // If already a float
    if (balanceStr.includes('.')) {
      return parseFloat(balanceStr);
    }

    // Convert from integer representation
    const num = Number(balanceStr) / Math.pow(10, decimals);
    return isNaN(num) ? 0 : num;
  } catch (error) {
    console.error('Balance parsing error:', error);
    return 0;
  }
}

/**
 * Format USD value from balance
 */
export function formatUsdValue(
  balance: string | number,
  decimals: number,
  priceUsd?: number
): string | null {
  if (!priceUsd || priceUsd <= 0) return null;

  try {
    const num = parseBalanceToNumber(balance, decimals);
    const usdValue = num * priceUsd;
    
    if (usdValue === 0) return '$0.00';
    if (usdValue < 0.01) return '< $0.01';
    
    return '$' + usdValue.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch (error) {
    console.error('USD value formatting error:', error);
    return null;
  }
}

/**
 * Validate balance string
 */
export function isValidBalance(balance: string | number): boolean {
  try {
    if (balance === null || balance === undefined || balance === '') {
      return false;
    }

    const balanceStr = String(balance).trim();
    
    // Check for valid number format
    if (!/^-?\d*\.?\d+$/.test(balanceStr)) {
      return false;
    }

    // Try to parse
    if (balanceStr.includes('.')) {
      const num = parseFloat(balanceStr);
      return !isNaN(num) && isFinite(num);
    } else {
      BigInt(balanceStr);
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Compare two balances
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareBalances(
  a: string | number,
  b: string | number,
  decimals: number
): number {
  try {
    const aNum = parseBalanceToNumber(a, decimals);
    const bNum = parseBalanceToNumber(b, decimals);
    
    if (aNum < bNum) return -1;
    if (aNum > bNum) return 1;
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Format balance for specific asset types with sensible defaults
 */
export function formatAssetBalance(
  balance: string | number,
  assetType: 'TON' | 'RZC' | 'BTC' | 'ETH' | 'BNB' | 'EVM' | 'SOL' | 'TRON' | 'USDT' | 'JETTON',
  decimals: number
): string {
  const presets: Record<string, FormatBalanceOptions> = {
    TON: { maxDecimals: 4, trimZeros: true },
    RZC: { maxDecimals: 2, trimZeros: true },
    BTC: { maxDecimals: 8, trimZeros: true },
    ETH: { maxDecimals: 6, trimZeros: true },
    BNB: { maxDecimals: 6, trimZeros: true },
    EVM: { maxDecimals: 6, trimZeros: true },
    SOL: { maxDecimals: 6, trimZeros: true },
    TRON: { maxDecimals: 6, trimZeros: true },
    USDT: { maxDecimals: 2, minDecimals: 2, trimZeros: false },
    JETTON: { maxDecimals: 6, trimZeros: true }
  };

  return formatBalance(balance, decimals, presets[assetType] || {});
}
