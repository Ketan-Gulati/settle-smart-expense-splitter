export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

export const DEFAULT_CURRENCY: CurrencyInfo = {
  code: 'INR',
  symbol: '₹',
  name: 'Indian Rupee',
};

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  INR: DEFAULT_CURRENCY,
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  AUD: { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar' },
  SGD: { code: 'SGD', symbol: 'SG$', name: 'Singapore Dollar' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht' },
};

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  IN: 'INR',
  US: 'USD',
  GB: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  AE: 'AED',
  CA: 'CAD',
  AU: 'AUD',
  SG: 'SGD',
  JP: 'JPY',
  TH: 'THB',
};

let cachedCurrency: CurrencyInfo | null = null;

export async function detectCurrencyFromIP(): Promise<CurrencyInfo> {
  if (cachedCurrency) {
    return cachedCurrency;
  }

  try {
    // 1. Try free public ipapi.co JSON endpoint (no API key required)
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      const code = (data.currency || COUNTRY_TO_CURRENCY[data.country_code] || 'INR').toUpperCase();
      if (SUPPORTED_CURRENCIES[code]) {
        cachedCurrency = SUPPORTED_CURRENCIES[code]!;
        return cachedCurrency;
      }
      cachedCurrency = {
        code,
        symbol: data.currency_name || code,
        name: data.currency_name || code,
      };
      return cachedCurrency;
    }
  } catch {
    // Fallback if IP endpoint is unreachable
  }

  // 2. Fallback to Intl browser locale detection
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timeZone?.includes('Calcutta') || timeZone?.includes('Kolkata') || timeZone?.includes('India')) {
        cachedCurrency = SUPPORTED_CURRENCIES.INR || DEFAULT_CURRENCY;
        return cachedCurrency;
      }
      if (timeZone?.includes('New_York') || timeZone?.includes('Los_Angeles') || timeZone?.includes('Chicago')) {
        cachedCurrency = SUPPORTED_CURRENCIES.USD || DEFAULT_CURRENCY;
        return cachedCurrency;
      }
      if (timeZone?.includes('London')) {
        cachedCurrency = SUPPORTED_CURRENCIES.GBP || DEFAULT_CURRENCY;
        return cachedCurrency;
      }
      if (timeZone?.includes('Paris') || timeZone?.includes('Berlin')) {
        cachedCurrency = SUPPORTED_CURRENCIES.EUR || DEFAULT_CURRENCY;
        return cachedCurrency;
      }
      if (timeZone?.includes('Dubai')) {
        cachedCurrency = SUPPORTED_CURRENCIES.AED || DEFAULT_CURRENCY;
        return cachedCurrency;
      }
    }
  } catch {
    // Ignore Intl errors
  }

  cachedCurrency = DEFAULT_CURRENCY;
  return cachedCurrency;
}
