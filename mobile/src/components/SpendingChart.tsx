import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { colors, fontSizes, fontWeights, spacing, radii, shadows } from '../theme';
import { formatCurrency } from '../utils/formatCurrency';
import { MonthlyTrendChart } from './MonthlyTrendChart';

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
}) => {
  // Prepare pie chart data (top 5 categories)
  const topCategories = byCategory.slice(0, 5);
  const pieData = topCategories.map((cat, index) => ({
    name: cat.category.charAt(0).toUpperCase() + cat.category.slice(1),
    amount: cat.amount,
    color: getCategoryColor(index),
    legendFontColor: colors.text,
    legendFontSize: 12,
  }));

  // Prepare bar chart data
  const barData = {
    labels: monthlyTrend.map(m => {
      const [year, month] = m.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'short' });
    }),
    datasets: [
      {
        data: monthlyTrend.map(m => m.amount),
      },
    ],
  };

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // Primary green
    labelColor: (opacity = 1) => `rgba(26, 28, 33, ${opacity})`, // Text color
    style: {
      borderRadius: radii.md,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: colors.primary,
    },
    fillShadowGradient: colors.primary,
    fillShadowGradientOpacity: 0.1,
  };

  const hasData = byCategory.length > 0 && monthlyTrend.some(m => m.amount > 0);

  if (!hasData) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No spending data available yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Category Breakdown - Pie Chart */}
      {topCategories.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Spending by Category</Text>
          <View style={styles.pieChartContainer}>
            <PieChart
              data={pieData}
              width={screenWidth - spacing.xl * 2}
              height={220}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
          <View style={styles.categoryList}>
            {topCategories.map((cat, index) => (
              <View key={cat.category} style={styles.categoryItem}>
                <View style={[styles.colorDot, { backgroundColor: getCategoryColor(index) }]} />
                <Text style={styles.categoryName}>
                  {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}
                </Text>
                <Text style={styles.categoryAmount}>{formatCurrency(cat.amount)}</Text>
                <Text style={styles.categoryPercentage}>({cat.percentage.toFixed(1)}%)</Text>
              </View>
            ))}
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
          <Text style={styles.predictionTitle}>Next Month Prediction</Text>
          <Text style={styles.predictionAmount}>{formatCurrency(predictions.nextMonth)}</Text>
          <Text style={styles.predictionTrend}>
            Trend: {predictions.trend === 'increasing' ? '📈 Increasing' : 
                   predictions.trend === 'decreasing' ? '📉 Decreasing' : 
                   '➡️ Stable'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
    fontSize: fontSizes.sm,
    color: colors.text,
    fontWeight: fontWeights.medium,
  },
  categoryAmount: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontWeight: fontWeights.semibold,
    marginRight: spacing.xs,
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
});

