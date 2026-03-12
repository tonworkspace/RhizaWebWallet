import { Address } from '@ton/core';

/**
 * Validate if a string is a valid TON address
 * @param address - Address string to validate
 * @returns true if valid, false otherwise
 */
export function isValidAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  try {
    // Try to parse the address
    Address.parse(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Normalize address to user-friendly format
 * @param address - Address in any format
 * @returns User-friendly address (EQ...)
 */
export function normalizeAddress(address: string): string {
  try {
    const parsed = Address.parse(address);
    return parsed.toString();
  } catch (error) {
    return address;
  }
}

/**
 * Convert address to raw format
 * @param address - Address in any format
 * @returns Raw address (0:...)
 */
export function toRawAddress(address: string): string {
  try {
    const parsed = Address.parse(address);
    return parsed.toRawString();
  } catch (error) {
    return address;
  }
}
