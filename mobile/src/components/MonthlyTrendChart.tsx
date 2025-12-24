import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii, shadows } from '../theme';
import { formatCurrency } from '../utils/formatCurrency';

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

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({ monthlyTrend }) => {
  const [selectedRange, setSelectedRange] = useState<MonthRange>(6);
  const [barAnimations, setBarAnimations] = useState<Animated.Value[]>([]);

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
    if (value === 0) return '$0';
    const rounded = Math.round(value);
    return `$${rounded.toLocaleString()}`;
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
          <Text style={styles.sectionTitle}>Monthly Trend</Text>
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
                <Text
                  style={[
                    styles.rangeButtonText,
                    selectedRange === range && styles.rangeButtonTextActive,
                  ]}
                >
                  {range}M
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No spending data for this period</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.chartSection}>
      {/* HeaderRow: Title + Range Selector */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Monthly Trend</Text>
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
              <Text
                style={[
                  styles.rangeButtonText,
                  selectedRange === range && styles.rangeButtonTextActive,
                ]}
              >
                {range}M
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* SubheaderRow: Range label + Summary */}
      <View style={styles.subheaderRow}>
        <Text style={styles.rangeLabelText}>
          {selectedRange === 1 ? 'Last month' : `Last ${selectedRange} months`}
        </Text>
        {summaryData.total > 0 && (
          <Text style={styles.summaryText}>
            Total: {formatCurrency(summaryData.total)}
          </Text>
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
                <Text style={styles.yAxisText}>{formatYAxisValue(tickValue)}</Text>
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
                  <Text
                    style={[
                      styles.monthLabel,
                      isCurrentMonth && styles.monthLabelCurrent,
                    ]}
                  >
                    {formatMonthLabel(data.month)}
                  </Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    borderRadius: radii.md,
    padding: spacing.xxs,
    gap: spacing.xxs,
  },
  rangeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    minWidth: 44,
    alignItems: 'center',
  },
  rangeButtonActive: {
    backgroundColor: colors.primary,
  },
  rangeButtonText: {
    fontSize: fontSizes.xs,
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
});
