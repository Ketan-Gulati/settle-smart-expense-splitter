/**
 * Currency and Monetary Types
 * As per rules.md, monetary amounts must be stored in integer minor units (e.g., paise, cents)
 */
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | (string & {});

export interface Money {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

/**
 * Common Entity Identifier
 */
export type EntityId = string;

/**
 * Result pattern for domain operations
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };
