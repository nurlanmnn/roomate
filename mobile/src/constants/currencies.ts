/**
 * Supported household currencies.
 *
 * Mirrors `backend/src/models/Household.ts#SUPPORTED_CURRENCIES`. The order
 * here is what the picker shows, so the most commonly used ones come first.
 *
 * The symbol is purely cosmetic — actual formatting goes through
 * `Intl.NumberFormat` which picks the localized glyph based on the user's
 * device locale and the ISO code.
 */

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export const SUPPORTED_CURRENCIES: readonly CurrencyOption[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'VND', name: 'Vietnamese Đồng', symbol: '₫' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$' },
  { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$' },
  { code: 'CLP', name: 'Chilean Peso', symbol: 'CLP$' },
  { code: 'COP', name: 'Colombian Peso', symbol: 'COL$' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/.' },
];

const CURRENCY_CODE_SET = new Set(SUPPORTED_CURRENCIES.map((c) => c.code));

export const isSupportedCurrency = (code: string | null | undefined): boolean => {
  if (!code) return false;
  return CURRENCY_CODE_SET.has(code.toUpperCase());
};

export const getCurrencyOption = (code: string | null | undefined): CurrencyOption => {
  if (code) {
    const upper = code.toUpperCase();
    const match = SUPPORTED_CURRENCIES.find((c) => c.code === upper);
    if (match) return match;
  }
  return SUPPORTED_CURRENCIES[0];
};

/**
 * Best-effort guess of the user's preferred currency based on their device
 * locale. Falls back to `USD` when the locale doesn't map to anything we
 * support. Only used as a picker default; the user can always change it.
 */
export const guessDefaultCurrencyFromLocale = (locale?: string | null): string => {
  if (!locale) return 'USD';
  // Locale tags look like `en-US`, `de-DE`, `tr-TR`, `az-Latn-AZ`, ...
  const region = locale.split('-').pop()?.toUpperCase();
  if (!region || region.length !== 2) return 'USD';

  const regionToCurrency: Record<string, string> = {
    US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN',
    GB: 'GBP', IE: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR',
    AT: 'EUR', PT: 'EUR', GR: 'EUR', FI: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR', EE: 'EUR',
    LV: 'EUR', LT: 'EUR', MT: 'EUR', CY: 'EUR',
    CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF',
    TR: 'TRY', AZ: 'AZN', RU: 'RUB', UA: 'UAH',
    JP: 'JPY', CN: 'CNY', KR: 'KRW', SG: 'SGD', HK: 'HKD', TW: 'TWD', IN: 'INR',
    TH: 'THB', ID: 'IDR', PH: 'PHP', VN: 'VND',
    AE: 'AED', SA: 'SAR', IL: 'ILS', EG: 'EGP', ZA: 'ZAR',
    AU: 'AUD', NZ: 'NZD',
  };
  const guess = regionToCurrency[region];
  return guess && CURRENCY_CODE_SET.has(guess) ? guess : 'USD';
};
