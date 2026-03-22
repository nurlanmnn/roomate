import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '../AppText';
import { useThemeColors, useTheme, fontSizes, fontWeights, spacing, radii, shadows } from '../../theme';

interface DashboardHeroProps {
  householdName: string;
  address?: string;
  /** Main metric shown in hero (e.g. monthly spending total) */
  metricLabel?: string;
  metricValue?: string;
  /** Optional tagline under address (e.g. onboarding hint when no metric) */
  tagline?: string;
}

/**
 * Hero section for dashboard: household identity + optional key metric.
 * Uses a soft gradient/tint to create depth and anchor the page.
 */
export const DashboardHero: React.FC<DashboardHeroProps> = ({
  householdName,
  address,
  metricLabel,
  metricValue,
  tagline,
}) => {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gradientColors = isDark
    ? [colors.surfaceElevated, colors.surface]
    : [colors.surface, colors.background];

  const styles = React.useMemo(() => StyleSheet.create({
    wrapper: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.lg,
      borderRadius: radii.lg,
      overflow: 'hidden',
      ...(shadows.sm as object),
    },
    gradient: {
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.xl,
    },
    title: {
      fontSize: fontSizes.xxl,
      fontWeight: fontWeights.extrabold,
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: spacing.xs,
      lineHeight: 34,
    },
    address: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: metricValue ? spacing.lg : tagline ? spacing.sm : 0,
    },
    tagline: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      lineHeight: 22,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    metricRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    metricLabel: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      fontWeight: fontWeights.medium,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    metricValue: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
  }), [colors, metricValue, tagline, address]);

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={gradientColors as [string, string]}
        style={styles.gradient}
      >
        <AppText style={styles.title} numberOfLines={2}>{householdName}</AppText>
        {address ? (
          <AppText style={styles.address} numberOfLines={1}>{address}</AppText>
        ) : null}
        {tagline && !metricValue ? (
          <AppText style={styles.tagline}>{tagline}</AppText>
        ) : null}
        {metricLabel != null && metricValue != null ? (
          <View style={styles.metricRow}>
            <AppText style={styles.metricLabel}>{metricLabel}</AppText>
            <AppText style={styles.metricValue}>{metricValue}</AppText>
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
};
