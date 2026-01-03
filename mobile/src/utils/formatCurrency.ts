export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatCompactCurrency = (amount: number): string => {
  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    } as any).format(amount);
    // Some JS runtimes silently ignore `notation: 'compact'` and return a full currency string.
    // If that happens for values >= 1000, fall back to our manual compact formatter.
    const abs = Math.abs(amount);
    if (abs >= 1000 && !/[KMB]/i.test(formatted)) {
      throw new Error('Intl compact notation ignored');
    }
    return formatted;
  } catch {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    const fmt = (n: number) => n.toFixed(1).replace(/\.0$/, '');
    if (abs >= 1_000_000_000) return `${sign}$${fmt(abs / 1_000_000_000)}B`;
    if (abs >= 1_000_000) return `${sign}$${fmt(abs / 1_000_000)}M`;
    if (abs >= 1_000) return `${sign}$${fmt(abs / 1_000)}K`;
    return `${sign}$${fmt(abs)}`;
  }
};

