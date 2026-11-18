import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { fontSizes, fontWeights, radii, spacing, useThemeColors } from '../theme';
import { toBcp47Locale } from '../utils/dateLocales';
import { formatCurrency } from '../utils/formatCurrency';
import { useHouseholdCurrency } from '../utils/useHouseholdCurrency';
import { ChipRow } from './ui/ChipRow';
import { AppText } from './AppText';
import { Amount } from './ui/Amount';

interface MonthlyTrend { month: string; amount: number; }
interface MonthlyTrendChartProps { monthlyTrend: MonthlyTrend[]; }
type MonthRange = 1 | 3 | 6;

export const MonthlyTrendChart = ({ monthlyTrend }: MonthlyTrendChartProps) => {
  const colors = useThemeColors();
  const { t, language } = useLanguage();
  const currency = useHouseholdCurrency();
  const [selectedRange, setSelectedRange] = useState<MonthRange>(6);
  const displayedData = useMemo(() => monthlyTrend.slice(-selectedRange), [monthlyTrend, selectedRange]);
  const total = displayedData.reduce((sum, month) => sum + month.amount, 0);
  const maximum = Math.max(1, ...displayedData.map(month => month.amount));
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = (key: string) => {
    const [year, month] = key.split('-').map(Number);
    return new Date(year, month - 1).toLocaleDateString(toBcp47Locale(language), { month: 'short' });
  };

  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <AppText accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{t('monthlyTrend.title')}</AppText>
      <ChipRow
        inset={0}
        options={([1, 3, 6] as MonthRange[]).map(range => ({
          value: range,
          label: range === 1 ? t('monthlyTrend.lastMonth') : t('monthlyTrend.lastNMonths', { count: range }),
        }))}
        selected={selectedRange}
        onSelect={setSelectedRange}
      />
      <View style={styles.summary}>
        <AppText style={[styles.secondary, { color: colors.textSecondary }]}>
          {selectedRange === 1 ? t('monthlyTrend.lastMonth') : t('monthlyTrend.lastNMonths', { count: selectedRange })}
        </AppText>
        {total > 0 && <Amount value={total} currency={currency} size={24} fit accessibilityLabel={`${t('spendingChart.total')}: ${formatCurrency(total, currency)}`} />}
      </View>
      {displayedData.length === 0 ? (
        <AppText style={[styles.empty, { color: colors.textSecondary }]}>{t('monthlyTrend.noSpendingPeriod')}</AppText>
      ) : (
        <>
          <View style={[styles.plot, { borderBottomColor: colors.borderLight }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {displayedData.map(month => (
              <View key={month.month} style={styles.slot}>
                <View style={[styles.bar, { height: Math.max(0, month.amount) / maximum * 150, backgroundColor: month.month === currentMonth ? colors.primary : colors.accentSoft }]} />
                <AppText style={[styles.month, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.4}>{monthLabel(month.month)}</AppText>
              </View>
            ))}
          </View>
          {/* Values stay readable with Dynamic Type and give the chart a text equivalent. */}
          {displayedData.map(month => (
            <View key={month.month} style={[styles.legend, { borderBottomColor: colors.borderLight }]}>
              <AppText style={[styles.secondary, { color: colors.textSecondary }]}>{monthLabel(month.month)}</AppText>
              <Amount value={month.amount} currency={currency} size={18} fit />
            </View>
          ))}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: fontWeights.bold, marginBottom: spacing.md },
  summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.md },
  secondary: { fontSize: fontSizes.sm, flexShrink: 1 },
  plot: { height: 210, flexDirection: 'row', gap: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: spacing.sm },
  slot: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '65%', maxWidth: 48, borderTopLeftRadius: radii.sm, borderTopRightRadius: radii.sm },
  month: { fontSize: 12, marginVertical: spacing.xs, textAlign: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  empty: { fontSize: fontSizes.md, textAlign: 'center', paddingVertical: spacing.xl },
});
