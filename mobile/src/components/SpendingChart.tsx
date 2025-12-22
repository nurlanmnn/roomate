import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { colors, fontSizes, fontWeights, spacing, radii, shadows } from '../theme';
import { formatCurrency } from '../utils/formatCurrency';

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

// Color palette for categories
const categoryColors = [
  '#4A90E2', // Blue
  '#50C878', // Green
  '#FF6B6B', // Red
  '#FFD93D', // Yellow
  '#9B59B6', // Purple
  '#FF8C42', // Orange
  '#1ABC9C', // Teal
  '#E74C3C', // Dark Red
  '#95A5A6', // Gray
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
    color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: radii.md,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary,
    },
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
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Monthly Trend</Text>
          <View style={styles.barChartContainer}>
            <BarChart
              data={barData}
              width={screenWidth - spacing.xl * 2}
              height={220}
              chartConfig={chartConfig}
              verticalLabelRotation={0}
              showValuesOnTopOfBars
              fromZero
            />
          </View>
        </View>
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
    padding: spacing.md,
    ...(shadows.md as object),
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
  barChartContainer: {
    alignItems: 'center',
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
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
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

