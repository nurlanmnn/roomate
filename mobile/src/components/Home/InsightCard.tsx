import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../../theme';

type TrendType = 'increasing' | 'decreasing' | 'stable';

interface InsightCardProps {
  /** "Next month prediction" or "This month" */
  title: string;
  /** Main value (currency or text) */
  value: string;
  /** Optional trend line, e.g. "↑ 12% vs last month" */
  trend?: {
    direction: TrendType;
    text: string;
  };
  /** Optional subtitle below value */
  subtitle?: string;
  /** Soft background tint: 'teal' | 'primary' | 'neutral' */
  variant?: 'teal' | 'primary' | 'neutral';
}

/**
 * Smart insight card for predictions and trend summary.
 * Uses subtle tint to feel special without being gimmicky.
 */
export const InsightCard: React.FC<InsightCardProps> = ({
  title,
  value,
  trend,
  subtitle,
  variant = 'teal',
}) => {
  const colors = useThemeColors();
  const bg = variant === 'teal' ? colors.tealUltraSoft : variant === 'primary' ? colors.primaryUltraSoft : colors.surfaceAlt;
  const border = variant === 'teal' ? colors.tealSoft : variant === 'primary' ? colors.primarySoft : colors.borderLight;
  const trendColor = trend?.direction === 'increasing' ? colors.danger : trend?.direction === 'decreasing' ? colors.success : colors.textSecondary;

  const styles = React.useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: bg,
      borderRadius: radii.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: border,
      ...(shadows.xs as object),
    },
    title: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      fontWeight: fontWeights.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.xs,
    },
    value: {
      fontSize: fontSizes.xxl,
      fontWeight: fontWeights.bold,
      color: colors.text,
      fontVariant: ['tabular-nums'],
      marginBottom: subtitle ? 2 : 0,
    },
    subtitle: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: trend ? spacing.sm : 0,
    },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: border,
    },
    trendText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
    },
  }), [colors, bg, border]);

  const trendIcon = trend?.direction === 'increasing' ? 'arrow-up' : trend?.direction === 'decreasing' ? 'arrow-down' : 'remove';

  return (
    <View style={styles.card}>
      <AppText style={styles.title}>{title}</AppText>
      <AppText style={styles.value}>{value}</AppText>
      {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
      {trend ? (
        <View style={styles.trendRow}>
          <Ionicons name={trendIcon as any} size={16} color={trendColor} />
          <AppText style={[styles.trendText, { color: trendColor }]}>{trend.text}</AppText>
        </View>
      ) : null}
    </View>
  );
};
