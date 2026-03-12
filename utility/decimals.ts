/**
 * Convert a decimal string to bigint based on token decimals
 * @param amountStr - Amount as string (e.g., "1.5")
 * @param decimals - Token decimals (e.g., 9 for TON, 6 for USDT)
 * @returns Amount as bigint
 */
export function fromDecimals(amountStr: string, decimals: number): bigint {
  if (!amountStr || amountStr.trim() === '') {
    throw new Error('Amount cannot be empty');
  }

  // Remove any whitespace
  const cleaned = amountStr.trim();
  
  // Check for invalid characters
  if (!/^[0-9.]+$/.test(cleaned)) {
    throw new Error('Amount contains invalid characters');
  }

  // Split into integer and decimal parts
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    throw new Error('Invalid amount format');
  }

  const integerPart = parts[0] || '0';
  const decimalPart = parts[1] || '';

  // Check if decimal part is too long
  if (decimalPart.length > decimals) {
    throw new Error(`Amount has too many decimal places (max ${decimals})`);
  }

  // Pad decimal part to match token decimals
  const paddedDecimal = decimalPart.padEnd(decimals, '0');
  
  // Combine and convert to bigint
  const combined = integerPart + paddedDecimal;
  return BigInt(combined);
}

/**
 * Convert bigint to decimal string based on token decimals
 * @param amount - Amount as bigint
 * @param decimals - Token decimals
 * @returns Amount as decimal string
 */
export function toDecimals(amount: bigint, decimals: number): string {
  const amountStr = amount.toString().padStart(decimals + 1, '0');
  const integerPart = amountStr.slice(0, -decimals) || '0';
  const decimalPart = amountStr.slice(-decimals);
  
  // Remove trailing zeros from decimal part
  const trimmedDecimal = decimalPart.replace(/0+$/, '');
  
  if (trimmedDecimal === '') {
    return integerPart;
  }
  
  return `${integerPart}.${trimmedDecimal}`;
}
