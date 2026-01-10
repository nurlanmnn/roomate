import React from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { AppText } from './AppText';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../theme';
import { formatCompactCurrency, formatCurrency } from '../utils/formatCurrency';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { DonutChart } from './DonutChart';
import { useLanguage } from '../context/LanguageContext';

const screenWidth = Dimensions.get('window').width;

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
}

// Modern, softer color palette for categories
const categoryColors = [
  '#3B82F6', // Soft Blue
  '#22C55E', // Soft Green
  '#F59E0B', // Warm Amber
  '#8B5CF6', // Soft Purple
  '#EC4899', // Soft Pink
  '#14B8A6', // Teal
  '#F97316', // Warm Orange
  '#6366F1', // Indigo
  '#64748B', // Slate Gray
];

const getCategoryColor = (index: number): string => {
  return categoryColors[index % categoryColors.length];
};

export const SpendingChart: React.FC<SpendingChartProps> = ({
  byCategory,
  monthlyTrend,
  predictions,
  selectedRange = 'month',
  onChangeRange,
}) => {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const cardInnerWidth = screenWidth - spacing.xl * 2 - spacing.md * 2 - spacing.lg * 2;
  const pieSize = Math.min(240, cardInnerWidth - spacing.lg);
  const rangeOptions: { key: 'week' | 'month' | 'year' | 'all'; label: string }[] = [
    { key: 'week', label: '1W' },
    { key: 'month', label: '1M' },
    { key: 'year', label: '1Y' },
    { key: 'all', label: 'All' },
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
    [topCategories, t]
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
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.sm as object),
    },
    rangeRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    rangeChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
      borderWidth: 1,
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
      color: colors.primaryDark,
      fontWeight: fontWeights.semibold,
    },
    sectionTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    pieChartContainer: {
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    barChartWrapper: {
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    barChartContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    barChart: {
      marginVertical: 0,
    },
    categoryList: {
      marginTop: spacing.sm,
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
      gap: spacing.xs,
    },
    colorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
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
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.xs,
      flexShrink: 0,
    },
    categoryAmount: {
      fontSize: fontSizes.sm,
      color: colors.text,
      fontWeight: fontWeights.semibold,
      textAlign: 'right',
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
      borderWidth: 1,
      borderColor: colors.tealSoft,
      ...(shadows.xs as object),
    },
    predictionTitle: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    predictionAmount: {
      fontSize: fontSizes.xxl,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    predictionTrend: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
    },
  }), [colors]);

  const hasData = byCategory.length > 0 && monthlyTrend.some(m => m.amount > 0);

  if (!hasData) {
    return (
      <View style={styles.emptyContainer}>
        <AppText style={styles.emptyText}>{t('spendingChart.noSpendingData')}</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Category Breakdown - Pie Chart */}
      {topCategories.length > 0 && (
        <View style={styles.chartSection}>
          <AppText style={styles.sectionTitle}>{t('spendingChart.spendingByCategory')}</AppText>
          <View style={styles.rangeRow}>
            {rangeOptions.map((opt) => {
              const active = selectedRange === opt.key;
              return (
                <TouchableOpacity
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
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.pieChartContainer}>
            <DonutChart
              data={donutData}
              size={pieSize}
              strokeWidth={28}
              centerContent={
                <View style={{ alignItems: 'center' }}>
                  <AppText style={{ fontSize: fontSizes.sm, color: colors.textSecondary }}>
                    {t('spendingChart.total')}
                  </AppText>
                  <AppText
                    style={{
                      fontSize: fontSizes.xl,
                      fontWeight: fontWeights.extrabold,
                      color: colors.text,
                    }}
                  >
                    {formatCurrency(topCategories.reduce((sum, c) => sum + c.amount, 0))}
                  </AppText>
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
                <AppText style={styles.categoryName} numberOfLines={1} ellipsizeMode="tail">
                  {displayName}
                </AppText>
                <View style={styles.categoryRight}>
                  <AppText style={styles.categoryAmount}>{formatCompactCurrency(cat.amount)}</AppText>
                  <AppText style={styles.categoryPercentage}>({cat.percentage.toFixed(1)}%)</AppText>
                </View>
              </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Monthly Trend - Bar Chart */}
      {monthlyTrend.length > 0 && (
        <MonthlyTrendChart monthlyTrend={monthlyTrend} />
      )}

      {/* Predictions */}
      {predictions && (
        <View style={styles.predictionContainer}>
          <AppText style={styles.predictionTitle}>{t('spendingChart.nextMonthPrediction')}</AppText>
          <AppText style={styles.predictionAmount}>{formatCurrency(predictions.nextMonth)}</AppText>
          <AppText style={styles.predictionTrend}>
            {t('spendingChart.trend')}: {predictions.trend === 'increasing' ? `📈 ${t('spendingChart.increasing')}` : 
                   predictions.trend === 'decreasing' ? `📉 ${t('spendingChart.decreasing')}` : 
                   `➡️ ${t('spendingChart.stable')}`}
          </AppText>
        </View>
      )}
    </View>
  );
};

