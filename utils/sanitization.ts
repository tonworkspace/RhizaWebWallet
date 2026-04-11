/**
 * Sanitization utilities for user input
 * Prevents XSS attacks and other injection vulnerabilities
 */

/**
 * Sanitize transaction comments to prevent XSS attacks
 * 
 * @param comment - User-provided comment string
 * @returns Sanitized comment safe for storage and display
 */
export function sanitizeComment(comment: string): string {
  if (!comment) return '';
  
  return comment
    // Remove HTML tags
    .replace(/[<>]/g, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol (can be used for XSS)
    .replace(/data:/gi, '')
    // Remove event handlers (onclick, onload, etc.)
    .replace(/on\w+\s*=/gi, '')
    // Remove script tags (case insensitive)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Limit length to prevent abuse
    .substring(0, 100)
    // Trim whitespace
    .trim();
}

/**
 * Sanitize wallet names to prevent XSS in UI
 * 
 * @param name - User-provided wallet name
 * @returns Sanitized name safe for display
 */
export function sanitizeWalletName(name: string): string {
  if (!name) return '';
  
  return name
    // Remove HTML tags
    .replace(/[<>]/g, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=/gi, '')
    // Limit length
    .substring(0, 50)
    // Trim whitespace
    .trim();
}

/**
 * Sanitize general text input
 * 
 * @param text - User-provided text
 * @param maxLength - Maximum allowed length (default: 200)
 * @returns Sanitized text
 */
export function sanitizeText(text: string, maxLength: number = 200): string {
  if (!text) return '';
  
  return text
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .substring(0, maxLength)
    .trim();
}

/**
 * Escape HTML entities for safe display
 * Use this when you need to display user content as-is but safely
 * 
 * @param text - Text to escape
 * @returns HTML-escaped text
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Normalize a TON address to its raw string form (e.g. "0:abcd...").
 * Used as a stable key for DB lookups so EQ.../UQ.../0:... all resolve
 * to the same record regardless of which format was stored.
 *
 * Returns null if the string is not a valid TON address.
 */
export function normalizeTonAddress(address: string): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Address } = require('@ton/ton') as typeof import('@ton/ton');
    return Address.parse(address).toRawString();
  } catch {
    return null;
  }
}

/**
 * Validate and sanitize URL input
 * 
 * @param url - User-provided URL
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    
    return parsed.toString();
  } catch {
    return '';
  }
}
