export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  countries: string[];
  flag: string;
  rateToInr: number; // 1 Foreign Unit = X INR
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', countries: ['India'], flag: '🇮🇳', rateToInr: 1 },
  { code: 'USD', symbol: '$', name: 'US Dollar', countries: ['United States', 'USA', 'Ecuador', 'El Salvador', 'Panama', 'Puerto Rico'], flag: '🇺🇸', rateToInr: 83.75 },
  { code: 'EUR', symbol: '€', name: 'Euro', countries: ['Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Portugal', 'Greece', 'Austria', 'Belgium', 'Ireland', 'Finland', 'Europe'], flag: '🇪🇺', rateToInr: 91.50 },
  { code: 'GBP', symbol: '£', name: 'British Pound', countries: ['United Kingdom', 'UK', 'England', 'Scotland', 'Wales', 'Northern Ireland', 'London'], flag: '🇬🇧', rateToInr: 107.20 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', countries: ['United Arab Emirates', 'UAE', 'Dubai', 'Abu Dhabi'], flag: '🇦🇪', rateToInr: 22.80 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', countries: ['Singapore'], flag: '🇸🇬', rateToInr: 62.40 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', countries: ['Thailand', 'Bangkok', 'Phuket'], flag: '🇹🇭', rateToInr: 2.35 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', countries: ['Japan', 'Tokyo'], flag: '🇯🇵', rateToInr: 0.55 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', countries: ['Australia', 'Sydney', 'Melbourne'], flag: '🇦🇺', rateToInr: 54.80 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', countries: ['Canada', 'Toronto', 'Vancouver'], flag: '🇨🇦', rateToInr: 61.20 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', countries: ['Switzerland', 'Geneva', 'Zurich', 'Liechtenstein'], flag: '🇨🇭', rateToInr: 93.80 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', countries: ['China', 'Beijing', 'Shanghai'], flag: '🇨🇳', rateToInr: 11.55 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', countries: ['Hong Kong'], flag: '🇭🇰', rateToInr: 10.72 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', countries: ['New Zealand', 'Auckland'], flag: '🇳🇿', rateToInr: 50.60 },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', countries: ['Saudi Arabia', 'Riyadh', 'Jeddah', 'Mecca'], flag: '🇸🇦', rateToInr: 22.33 },
  { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal', countries: ['Qatar', 'Doha'], flag: '🇶🇦', rateToInr: 23.00 },
  { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', countries: ['Oman', 'Muscat'], flag: '🇴🇲', rateToInr: 217.50 },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', countries: ['Kuwait'], flag: '🇰🇼', rateToInr: 273.40 },
  { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar', countries: ['Bahrain', 'Manama'], flag: '🇧🇭', rateToInr: 222.15 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', countries: ['Malaysia', 'Kuala Lumpur'], flag: '🇲🇾', rateToInr: 18.15 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', countries: ['Indonesia', 'Bali', 'Jakarta'], flag: '🇮🇩', rateToInr: 0.0053 },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', countries: ['Vietnam', 'Hanoi', 'Ho Chi Minh'], flag: '🇻🇳', rateToInr: 0.0033 },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', countries: ['Philippines', 'Manila'], flag: '🇵🇭', rateToInr: 1.48 },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', countries: ['South Korea', 'Korea', 'Seoul'], flag: '🇰🇷', rateToInr: 0.062 },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', countries: ['Turkey', 'Istanbul', 'Ankara'], flag: '🇹🇷', rateToInr: 2.50 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', countries: ['South Africa', 'Cape Town', 'Johannesburg'], flag: '🇿🇦', rateToInr: 4.65 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', countries: ['Brazil', 'Rio de Janeiro', 'Sao Paulo'], flag: '🇧🇷', rateToInr: 15.20 },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', countries: ['Mexico', 'Cancun', 'Mexico City'], flag: '🇲🇽', rateToInr: 4.35 },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', countries: ['Sweden', 'Stockholm'], flag: '🇸🇪', rateToInr: 7.95 },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', countries: ['Norway', 'Oslo'], flag: '🇳🇴', rateToInr: 7.80 },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', countries: ['Denmark', 'Copenhagen'], flag: '🇩🇰', rateToInr: 12.25 },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', countries: ['Poland', 'Warsaw', 'Krakow'], flag: '🇵🇱', rateToInr: 21.20 },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', countries: ['Czech Republic', 'Prague'], flag: '🇨🇿', rateToInr: 3.65 },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', countries: ['Hungary', 'Budapest'], flag: '🇭🇺', rateToInr: 0.23 },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', countries: ['Russia', 'Moscow'], flag: '🇷🇺', rateToInr: 0.92 },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', countries: ['Egypt', 'Cairo'], flag: '🇪🇬', rateToInr: 1.72 },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', countries: ['Sri Lanka', 'Colombo'], flag: '🇱🇰', rateToInr: 0.28 },
  { code: 'NPR', symbol: 'Rs', name: 'Nepalese Rupee', countries: ['Nepal', 'Kathmandu'], flag: '🇳🇵', rateToInr: 0.63 },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', countries: ['Bangladesh', 'Dhaka'], flag: '🇧🇩', rateToInr: 0.71 },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', countries: ['Pakistan', 'Karachi', 'Lahore'], flag: '🇵🇰', rateToInr: 0.30 },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', countries: ['Israel', 'Tel Aviv', 'Jerusalem'], flag: '🇮🇱', rateToInr: 22.80 },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso', countries: ['Chile', 'Santiago'], flag: '🇨🇱', rateToInr: 0.091 },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', countries: ['Colombia', 'Bogota', 'Medellin'], flag: '🇨🇴', rateToInr: 0.021 },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', countries: ['Peru', 'Lima', 'Cusco'], flag: '🇵🇪', rateToInr: 22.40 },
  { code: 'ARS', symbol: 'Arg$', name: 'Argentine Peso', countries: ['Argentina', 'Buenos Aires'], flag: '🇦🇷', rateToInr: 0.088 },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', countries: ['Kenya', 'Nairobi'], flag: '🇰🇪', rateToInr: 0.65 },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', countries: ['Nigeria', 'Lagos'], flag: '🇳🇬', rateToInr: 0.053 },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', countries: ['Ghana', 'Accra'], flag: '🇬🇭', rateToInr: 5.35 },
  { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', countries: ['Morocco', 'Marrakech', 'Casablanca'], flag: '🇲🇦', rateToInr: 8.50 },
  { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar', countries: ['Taiwan', 'Taipei'], flag: '🇹🇼', rateToInr: 2.62 },
];

export const getCurrencySymbol = (code: string): string => {
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === code.toUpperCase());
  return found?.symbol || code;
};

export const getExchangeRateToInr = (code: string): number => {
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === code.toUpperCase());
  return found?.rateToInr || 1;
};

export const convertToGroupCurrency = (
  foreignAmount: number,
  foreignCurrency: string,
  groupCurrency = 'INR',
  customExchangeRate?: number
): { convertedAmount: number; rateUsed: number } => {
  if (foreignCurrency.toUpperCase() === groupCurrency.toUpperCase()) {
    return { convertedAmount: foreignAmount, rateUsed: 1 };
  }

  const rate = customExchangeRate || getExchangeRateToInr(foreignCurrency);
  const converted = Math.round(foreignAmount * rate * 100) / 100;
  return { convertedAmount: converted, rateUsed: rate };
};
