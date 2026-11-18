import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { fontSizes, fontWeights, radii, spacing, useThemeColors } from '../theme';
import { useHouseholdCurrency } from '../utils/useHouseholdCurrency';
import { AppText } from './AppText';
import { DonutChart } from './DonutChart';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { Amount } from './ui/Amount';

interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

interface MonthlyTrend {
  month: string;
  amount: number;
}

interface SpendingChartProps {
  byCategory: CategorySpending[];
  monthlyTrend: MonthlyTrend[];
  predictions?: {
    nextMonth: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  selectedRange?: 'week' | 'month' | 'year' | 'all';
  onChangeRange?: (range: 'week' | 'month' | 'year' | 'all') => void;
  /** When true, prediction block is not rendered (e.g. when parent shows it via InsightCard) */
  hidePrediction?: boolean;
}

export const SpendingChart: React.FC<SpendingChartProps> = ({
  byCategory,
  monthlyTrend,
  predictions,
  selectedRange = 'month',
  onChangeRange,
  hidePrediction = false,
}) => {
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const { t } = useLanguage();
  const categoryColors = [colors.primary, colors.accent, colors.marigold, colors.teal, colors.success, colors.warning, colors.danger];
  const getCategoryColor = (index: number) => categoryColors[index % categoryColors.length];
  const currency = useHouseholdCurrency();
  const cardInnerWidth = screenWidth - spacing.md * 4;
  const pieSize = Math.min(240, Math.max(120, cardInnerWidth - spacing.lg));
  const rangeOptions: { key: 'week' | 'month' | 'year' | 'all'; label: string; }[] = [
    { key: 'week', label: t('time.week') },
    { key: 'month', label: t('time.month') },
    { key: 'year', label: t('time.year') },
    { key: 'all', label: t('time.all') },
  ];
  // Prepare pie chart data (top 5 categories)
  const topCategories = byCategory.slice(0, 5);
  const donutData = React.useMemo(
    () =>
      topCategories.map((cat, index) => {
        const categoryKey = `categories.${cat.category.toLowerCase().replace(/[^a-z]/g, '')}`;
        const translatedCategory = t(categoryKey);
        const displayName = translatedCategory !== categoryKey ? translatedCategory : (cat.category.charAt(0).toUpperCase() + cat.category.slice(1));
        return {
          value: cat.amount,
          color: getCategoryColor(index),
          label: displayName,
        };
      }),
    [topCategories, t, colors]
  );

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      padding: spacing.md,
    },
    emptyContainer: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
    },
    chartSection: {
      marginBottom: spacing.xl,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
      borderWidth: 0,
      borderColor: colors.borderLight,

    },
    rangeRow: {
      flexWrap: 'wrap',
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    rangeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      minHeight: 44,
      minWidth: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.sm,
      borderWidth: 0,
      borderColor: colors.borderLight,
      backgroundColor: colors.surface,
    },
    rangeChipActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    rangeChipText: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      fontWeight: fontWeights.medium,
    },
    rangeChipTextActive: {
      color: colors.primary,
      fontWeight: fontWeights.semibold,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    pieChartContainer: {
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    categoryList: {
      marginTop: spacing.sm,
    },
    categoryItem: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
      gap: spacing.xs,
    },
    colorDot: {
      width: 12,
      height: 12,
      borderRadius: radii.pill,
    },
    categoryName: {
      flex: 1,
      minWidth: 0,
      flexShrink: 1,
      fontSize: fontSizes.sm,
      color: colors.text,
      fontWeight: fontWeights.medium,
    },
    categoryRight: {
      maxWidth: '48%',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: spacing.xs,
      flexShrink: 0,
    },
    categoryPercentage: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
    },
    predictionContainer: {
      backgroundColor: colors.tealUltraSoft,
      borderRadius: radii.lg,
      padding: spacing.lg,
      alignItems: 'center',
      borderWidth: 0,
      borderColor: colors.tealSoft,

    },
    predictionTitle: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    predictionTrend: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
    },
  }), [colors]);

  const trendHasActivity =
    monthlyTrend.length > 0 && monthlyTrend.some((m) => m.amount > 0);
  const showCharts = trendHasActivity || byCategory.length > 0;

  if (!showCharts) {
    return (
      <View style={styles.emptyContainer}>
        <AppText style={styles.emptyText}>{t('spendingChart.noSpendingData')}</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chartSection}>
        <AppText style={styles.sectionTitle}>{t('spendingChart.spendingByCategory')}</AppText>
        <View style={styles.rangeRow}>
          {rangeOptions.map((opt) => {
            const active = selectedRange === opt.key;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={opt.key}
                style={[
                  styles.rangeChip,
                  active && styles.rangeChipActive,
                ]}
                onPress={() => onChangeRange?.(opt.key)}
                activeOpacity={0.8}
              >
                <AppText
                  style={[
                    styles.rangeChipText,
                    active && styles.rangeChipTextActive,
                  ]}
                >
                  {opt.label}
                </AppText>
                {active && <Ionicons name="checkmark-outline" size={16} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
        {topCategories.length > 0 ? (
          <>
            <View style={styles.pieChartContainer}>
              <DonutChart
                data={donutData}
                size={pieSize}
                strokeWidth={28}
                centerContent={
                  <View style={{ alignItems: 'center', maxWidth: '100%' }}>
                    <AppText style={{ fontSize: fontSizes.sm, color: colors.textSecondary }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      {t('spendingChart.total')}
                    </AppText>
                    <Amount value={topCategories.reduce((sum, c) => sum + c.amount, 0)} currency={currency} size={28} fit />
                  </View>
                }
              />
            </View>
            <View style={styles.categoryList}>
              {topCategories.map((cat, index) => {
                const categoryKey = `categories.${cat.category.toLowerCase().replace(/[^a-z]/g, '')}`;
                const translatedCategory = t(categoryKey);
                const displayName = translatedCategory !== categoryKey ? translatedCategory : (cat.category.charAt(0).toUpperCase() + cat.category.slice(1));
                return (
                  <View key={cat.category} style={styles.categoryItem}>
                    <View style={[styles.colorDot, { backgroundColor: getCategoryColor(index) }]} />
                    <AppText style={styles.categoryName}>
                      {displayName}
                    </AppText>
                    <View style={styles.categoryRight}>
                      <Amount value={cat.amount} currency={currency} size={20} fit />
                      <AppText style={styles.categoryPercentage}>({cat.percentage.toFixed(1)}%)</AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <AppText
            style={{
              fontSize: fontSizes.sm,
              color: colors.textSecondary,
              textAlign: 'center',
              paddingVertical: spacing.lg,
            }}
          >
            {t('monthlyTrend.noSpendingPeriod')}
          </AppText>
        )}
      </View>

      {/* Monthly Trend - Bar Chart */}
      {monthlyTrend.length > 0 && (
        <MonthlyTrendChart monthlyTrend={monthlyTrend} />
      )}

      {/* Predictions */}
      {predictions && !hidePrediction && (
        <View style={styles.predictionContainer}>
          <AppText style={styles.predictionTitle}>{t('spendingChart.nextMonthPrediction')}</AppText>
          <Amount value={predictions.nextMonth} currency={currency} size={32} fit />
          <AppText style={styles.predictionTrend}>
            {t('spendingChart.trend')}: {predictions.trend === 'increasing' ? t('spendingChart.increasing') :
              predictions.trend === 'decreasing' ? t('spendingChart.decreasing') :
                t('spendingChart.stable')}
          </AppText>
        </View>
      )}
    </View>
  );
};
