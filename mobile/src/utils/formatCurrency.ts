import { getCurrencyOption } from '../constants/currencies';

/**
 * Formatters are keyed by `${locale}|${currency}|${variant}`. `Intl.NumberFormat`
 * construction on Hermes is non-trivial, so we avoid rebuilding it for the
 * common case of long expense lists re-rendering.
 */
type FormatterVariant = 'standard' | 'compact';
const formatterCache = new Map<string, Intl.NumberFormat>();

const getFormatter = (
  currency: string,
  variant: FormatterVariant
): Intl.NumberFormat | null => {
  const key = `${currency}|${variant}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;
  try {
    const options: Intl.NumberFormatOptions = {
      style: 'currency',
      currency,
    };
    if (variant === 'compact') {
      (options as any).notation = 'compact';
      options.maximumFractionDigits = 1;
    }
    // `undefined` locale asks Intl to use the device default — numbers stay in
    // the user's native format (e.g. `1.234,56 €` on a German device).
    const fmt = new Intl.NumberFormat(undefined, options);
    formatterCache.set(key, fmt);
    return fmt;
  } catch {
    return null;
  }
};

const normalizeCurrency = (currency?: string | null): string => {
  if (!currency) return 'USD';
  const upper = currency.toUpperCase();
  return upper.length === 3 ? upper : 'USD';
};

export const formatCurrency = (amount: number, currency?: string | null): string => {
  const code = normalizeCurrency(currency);
  const fmt = getFormatter(code, 'standard');
  if (fmt) {
    try {
      return fmt.format(amount);
    } catch {
      /* fall through to manual fallback */
    }
  }
  const symbol = getCurrencyOption(code).symbol;
  return `${amount < 0 ? '-' : ''}${symbol}${Math.abs(amount).toFixed(2)}`;
};

export const formatCompactCurrency = (amount: number, currency?: string | null): string => {
  const code = normalizeCurrency(currency);
  const fmt = getFormatter(code, 'compact');
  if (fmt) {
    try {
      const formatted = fmt.format(amount);
      // Some JS runtimes silently ignore `notation: 'compact'` and return a full
      // currency string. Detect that and fall back to our manual formatter.
      const abs = Math.abs(amount);
      if (abs < 1000 || /[KMB]/i.test(formatted)) {
        return formatted;
      }
    } catch {
      /* fall through */
    }
  }
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const symbol = getCurrencyOption(code).symbol;
  const fmtNum = (n: number) => n.toFixed(1).replace(/\.0$/, '');
  if (abs >= 1_000_000_000) return `${sign}${symbol}${fmtNum(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${symbol}${fmtNum(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${fmtNum(abs / 1_000)}K`;
  return `${sign}${symbol}${fmtNum(abs)}`;
};
