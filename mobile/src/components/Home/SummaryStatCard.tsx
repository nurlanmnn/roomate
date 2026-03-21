import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from '../AppText';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../../theme';

interface SummaryStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  iconBgColor?: string;
  onPress?: () => void;
}

/**
 * Premium stat card for dashboard: icon, value, label, optional subtitle.
 * Matches app card style (surface, radius, border, shadow).
 */
export const SummaryStatCard: React.FC<SummaryStatCardProps> = ({
  icon,
  label,
  value,
  subtitle,
  iconBgColor,
  onPress,
}) => {
  const colors = useThemeColors();
  const bgColor = iconBgColor ?? colors.primaryUltraSoft;
  const valueStr = typeof value === 'number' ? String(value) : value;
  const isLongValue = valueStr.length >= 9;

  const styles = React.useMemo(() => StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.sm as object),
      minWidth: 0,
    },
    pressable: {
      flex: 1,
      minWidth: 0,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    value: {
      fontSize: isLongValue ? fontSizes.lg : fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: colors.text,
      fontVariant: ['tabular-nums'],
      marginBottom: 2,
    },
    label: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      fontWeight: fontWeights.medium,
    },
    subtitle: {
      fontSize: 11,
      color: colors.textTertiary,
      marginTop: 2,
    },
  }), [colors, isLongValue]);

  const content = (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: bgColor }]}>{icon}</View>
      <AppText
        style={styles.value}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {valueStr}
      </AppText>
      <AppText style={styles.label} numberOfLines={1}>{label}</AppText>
      {subtitle ? <AppText style={styles.subtitle} numberOfLines={1}>{subtitle}</AppText> : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.pressable} onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};
