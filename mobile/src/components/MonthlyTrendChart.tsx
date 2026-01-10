import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { AppText } from './AppText';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../theme';
import { formatCompactCurrency, formatCurrency } from '../utils/formatCurrency';
import { useLanguage } from '../context/LanguageContext';

const screenWidth = Dimensions.get('window').width;
const PLOT_HEIGHT = 200;
const Y_AXIS_LABEL_WIDTH = 50;
const PLOT_PADDING_LEFT = 8;
const PLOT_PADDING_RIGHT = 20; // Increased to prevent clipping
const PLOT_PADDING_TOP = 8;
const PLOT_PADDING_BOTTOM = 28;
const MIN_BAR_WIDTH = 32;
const MAX_BAR_WIDTH = 60;

interface MonthlyTrend {
  month: string;
  amount: number;
}

interface MonthlyTrendChartProps {
  monthlyTrend: MonthlyTrend[];
}

type MonthRange = 1 | 3 | 6;

// Helper function to clamp values
const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const MonthlyTrendChartComponent = ({ monthlyTrend }: MonthlyTrendChartProps) => {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const [selectedRange, setSelectedRange] = useState<MonthRange>(6);
  const [barAnimations, setBarAnimations] = useState<Animated.Value[]>([]);

  const styles = React.useMemo(() => StyleSheet.create({
    chartSection: {
      marginBottom: spacing.xl,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.sm as object),
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      letterSpacing: -0.3,
    },
    rangeSelector: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: radii.pill,
      padding: 2,
      gap: 2,
    },
    rangeButton: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 6,
      borderRadius: radii.pill,
      minWidth: 36,
      alignItems: 'center',
    },
    rangeButtonActive: {
      backgroundColor: colors.primary,
    },
    rangeButtonText: {
      fontSize: 11,
      fontWeight: fontWeights.medium,
      color: colors.textSecondary,
    },
    rangeButtonTextActive: {
      color: colors.surface,
      fontWeight: fontWeights.semibold,
    },
    subheaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    rangeLabelText: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      fontWeight: fontWeights.medium,
    },
    summaryText: {
      fontSize: fontSizes.sm,
      color: colors.text,
      fontWeight: fontWeights.semibold,
    },
    plotArea: {
      height: PLOT_HEIGHT,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    yAxisContainer: {
      width: Y_AXIS_LABEL_WIDTH,
      position: 'relative',
    },
    yAxisLabel: {
      position: 'absolute',
      right: spacing.xs,
      alignItems: 'flex-end',
    },
    yAxisText: {
      fontSize: fontSizes.xs,
      color: colors.textTertiary,
      fontWeight: fontWeights.medium,
    },
    plotInner: {
      flex: 1,
      position: 'relative',
      paddingLeft: PLOT_PADDING_LEFT,
      paddingRight: PLOT_PADDING_RIGHT,
      paddingTop: PLOT_PADDING_TOP,
      paddingBottom: PLOT_PADDING_BOTTOM,
    },
    gridLines: {
      position: 'absolute',
      top: PLOT_PADDING_TOP,
      left: 0,
      right: PLOT_PADDING_RIGHT,
      bottom: PLOT_PADDING_BOTTOM,
    },
    gridLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: colors.borderLight,
      opacity: 0.15,
    },
    barWrapper: {
      position: 'absolute',
      bottom: PLOT_PADDING_BOTTOM,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    bar: {
      borderRadius: radii.md,
      minHeight: 0,
      ...(shadows.xs as object),
    },
    barCurrent: {
      ...(shadows.sm as object),
    },
    monthLabelWrapper: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      width: 50, // Fixed width for centering
      transform: [{ translateX: -25 }], // Center the label (half of width)
    },
    monthLabel: {
      fontSize: fontSizes.xs,
      color: colors.textTertiary,
      fontWeight: fontWeights.medium,
    },
    monthLabelCurrent: {
      color: colors.text,
      fontWeight: fontWeights.semibold,
    },
    emptyState: {
      paddingVertical: spacing.xxl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  }), [colors]);

  // Get the last N months based on selected range
  const displayedData = useMemo(() => {
    if (monthlyTrend.length === 0) return [];
    const endIndex = monthlyTrend.length;
    const startIndex = Math.max(0, endIndex - selectedRange);
    return monthlyTrend.slice(startIndex, endIndex);
  }, [monthlyTrend, selectedRange]);

  // Initialize animations when displayedData changes
  React.useEffect(() => {
    const newAnimations = displayedData.map(() => new Animated.Value(0));
    setBarAnimations(newAnimations);
  }, [displayedData.length]);

  // Value scale: Calculate Y-axis max with headroom
  const yMax = useMemo(() => {
    if (displayedData.length === 0) return 1;
    const max = Math.max(...displayedData.map(d => d.amount));
    if (max <= 0) return 1;
    return max * 1.15; // 15% headroom
  }, [displayedData]);

  // Compute plot bounds once and reuse for everything
  const containerWidth = screenWidth - spacing.xl * 2 - spacing.lg * 2;
  const plotLeft = Y_AXIS_LABEL_WIDTH + PLOT_PADDING_LEFT;
  const plotRight = PLOT_PADDING_RIGHT;
  let innerWidth = containerWidth - plotLeft - plotRight;

  // Add edge padding for rounded bars (so first/last bars don't touch edges)
  const slotCount = displayedData.length || 1;
  const tempSlotWidth = innerWidth / slotCount;
  const tempBarWidth = clamp(tempSlotWidth * 0.55, MIN_BAR_WIDTH, MAX_BAR_WIDTH);
  const edgePad = Math.max(tempBarWidth / 2, 14);
  
  // Apply edge padding
  const finalPlotLeft = Math.round(plotLeft + edgePad);
  innerWidth = Math.round(innerWidth - edgePad * 2);
  
  // Band scale: Calculate slot width and bar width with edge padding
  const slotWidth = Math.round(innerWidth / slotCount);
  const barWidth = Math.round(clamp(slotWidth * 0.55, MIN_BAR_WIDTH, MAX_BAR_WIDTH));
  
  // xCenter calculation: finalPlotLeft is relative to container
  // But bars/labels are inside plotInner which has paddingLeft: PLOT_PADDING_LEFT
  // So xCenter relative to plotInner = finalPlotLeft - Y_AXIS_LABEL_WIDTH
  const plotInnerXStart = finalPlotLeft - Y_AXIS_LABEL_WIDTH;
  
  const plotInnerHeight = PLOT_HEIGHT - PLOT_PADDING_TOP - PLOT_PADDING_BOTTOM;

  // Calculate summary values
  const summaryData = useMemo(() => {
    const total = displayedData.reduce((sum, d) => sum + d.amount, 0);
    const average = displayedData.length > 0 ? total / displayedData.length : 0;
    const max = Math.max(...displayedData.map(d => d.amount), 0);
    return { total, average, max };
  }, [displayedData]);

  // Get current month index
  const currentMonthIndex = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return displayedData.findIndex(d => d.month === currentMonthKey);
  }, [displayedData]);

  // Animate bars on mount or range change
  React.useEffect(() => {
    if (barAnimations.length !== displayedData.length) return;
    
    const plotInnerHeight = PLOT_HEIGHT - PLOT_PADDING_TOP - PLOT_PADDING_BOTTOM;
    const animations = displayedData.map((_, index) => {
      const amount = displayedData[index].amount;
      const barHeight = amount > 0 
        ? (amount / yMax) * plotInnerHeight 
        : 0;
      return Animated.timing(barAnimations[index], {
        toValue: barHeight,
        duration: 600,
        delay: index * 50,
        useNativeDriver: false,
      });
    });

    Animated.parallel(animations).start();
  }, [displayedData, yMax, barAnimations.length]);

  const formatMonthLabel = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  // Format Y-axis values (no decimals unless needed)
  const formatYAxisValue = (value: number): string => {
    const rounded = Math.round(value);
    if (!rounded) return '$0';

    const sign = rounded < 0 ? '-' : '';
    const abs = Math.abs(rounded);

    const formatWithSuffix = (divisor: number, suffix: string) => {
      const n = abs / divisor;
      // 1 decimal for small compact numbers, 0 decimals for larger ones
      const decimals = n < 100 ? 1 : 0;
      const formatted = n.toFixed(decimals).replace(/\.0$/, '');
      return `${sign}$${formatted}${suffix}`;
    };

    if (abs >= 1_000_000_000) return formatWithSuffix(1_000_000_000, 'B');
    if (abs >= 1_000_000) return formatWithSuffix(1_000_000, 'M');
    if (abs >= 1_000) return formatWithSuffix(1_000, 'K');

    return `${sign}$${abs.toLocaleString()}`;
  };

  // Generate Y-axis ticks (4-5 including 0)
  const yAxisTicks = useMemo(() => {
    const ticks: number[] = [];
    const tickCount = 5;
    for (let i = 0; i < tickCount; i++) {
      const ratio = i / (tickCount - 1);
      ticks.push(yMax * ratio);
    }
    return ticks;
  }, [yMax]);

  if (displayedData.length === 0) {
    return (
      <View style={styles.chartSection}>
        <View style={styles.headerRow}>
          <AppText style={styles.sectionTitle}>{t('monthlyTrend.title')}</AppText>
          <View style={styles.rangeSelector}>
            {([1, 3, 6] as MonthRange[]).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.rangeButton,
                  selectedRange === range && styles.rangeButtonActive,
                ]}
                onPress={() => setSelectedRange(range)}
              >
                <AppText
                  style={[
                    styles.rangeButtonText,
                    selectedRange === range && styles.rangeButtonTextActive,
                  ]}
                >
                  {range}M
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.emptyState}>
          <AppText style={styles.emptyText}>{t('monthlyTrend.noSpendingPeriod')}</AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.chartSection}>
      {/* HeaderRow: Title + Range Selector */}
      <View style={styles.headerRow}>
        <AppText style={styles.sectionTitle}>{t('monthlyTrend.title')}</AppText>
        <View style={styles.rangeSelector}>
          {([1, 3, 6] as MonthRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.rangeButton,
                selectedRange === range && styles.rangeButtonActive,
              ]}
              onPress={() => setSelectedRange(range)}
            >
              <AppText
                style={[
                  styles.rangeButtonText,
                  selectedRange === range && styles.rangeButtonTextActive,
                ]}
              >
                {range}M
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* SubheaderRow: Range label + Summary */}
      <View style={styles.subheaderRow}>
        <AppText style={styles.rangeLabelText}>
          {selectedRange === 1 ? t('monthlyTrend.lastMonth') : t('monthlyTrend.lastNMonths').replace('{{count}}', String(selectedRange))}
        </AppText>
        {summaryData.total > 0 && (
          <AppText style={styles.summaryText}>
            {t('spendingChart.total')}: {formatCompactCurrency(summaryData.total)}
          </AppText>
        )}
      </View>

      {/* PlotArea: Chart only */}
      <View style={styles.plotArea}>
        {/* Y-axis labels */}
        <View style={styles.yAxisContainer}>
          {yAxisTicks.map((tickValue, index) => {
            const plotInnerHeight = PLOT_HEIGHT - PLOT_PADDING_TOP - PLOT_PADDING_BOTTOM;
            return (
              <View 
                key={`tick-${index}-${yMax}`} 
                style={[
                  styles.yAxisLabel,
                  { 
                    top: PLOT_PADDING_TOP + (1 - index / (yAxisTicks.length - 1)) * plotInnerHeight - 8,
                  },
                ]}
              >
                <AppText style={styles.yAxisText}>{formatYAxisValue(tickValue)}</AppText>
              </View>
            );
          })}
        </View>

        {/* Chart plot */}
        <View style={styles.plotInner}>
          {/* Grid lines */}
          <View style={styles.gridLines}>
            {yAxisTicks.map((tickValue, index) => {
              const plotInnerHeight = PLOT_HEIGHT - PLOT_PADDING_TOP - PLOT_PADDING_BOTTOM;
              const yPosition = (1 - index / (yAxisTicks.length - 1)) * plotInnerHeight;
              return (
                <View
                  key={`grid-${index}-${yMax}`}
                  style={[
                    styles.gridLine,
                    { top: yPosition },
                  ]}
                />
              );
            })}
          </View>

          {/* Bars and labels using shared xCenter calculation */}
          {displayedData.map((data, index) => {
            const plotInnerHeight = PLOT_HEIGHT - PLOT_PADDING_TOP - PLOT_PADDING_BOTTOM;
            const barHeight = data.amount > 0 
              ? (data.amount / yMax) * plotInnerHeight 
              : 0;
            const isCurrentMonth = index === currentMonthIndex;
            const isActive = data.amount > 0;
            
            // Single xCenter for both bar and label - computed once per index
            // plotInnerXStart accounts for the coordinate system shift
            const xCenter = plotInnerXStart + (index + 0.5) * slotWidth;
            const barX = Math.round(xCenter - barWidth / 2);
            const labelX = Math.round(xCenter); // Will be centered with translateX

            return (
              <React.Fragment key={data.month}>
                {/* Bar */}
                <View
                  style={[
                    styles.barWrapper,
                    {
                      left: barX,
                      width: barWidth,
                    },
                  ]}
                >
                  {isActive && (
                    <Animated.View
                      style={[
                        styles.bar,
                        {
                          width: barWidth,
                          height: barAnimations[index],
                          backgroundColor: isCurrentMonth 
                            ? colors.primary 
                            : '#A8D5BA',
                        },
                        isCurrentMonth && styles.barCurrent,
                      ]}
                    />
                  )}
                </View>

                {/* Month label - same xCenter as bar */}
                <View
                  style={[
                    styles.monthLabelWrapper,
                    { 
                      left: labelX,
                      bottom: 0,
                    },
                  ]}
                >
                  <AppText
                    style={[
                      styles.monthLabel,
                      isCurrentMonth && styles.monthLabelCurrent,
                    ]}
                  >
                    {formatMonthLabel(data.month)}
                  </AppText>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export const MonthlyTrendChart = MonthlyTrendChartComponent;
