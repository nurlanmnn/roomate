import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from './AppText';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../theme';

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconColor?: string;
  iconBgColor?: string;
  onPress?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({ 
  icon, 
  label, 
  value,
  iconColor,
  iconBgColor,
  onPress,
}) => {
  const colors = useThemeColors();
  const finalIconColor = iconColor || colors.primary;
  const finalIconBgColor = iconBgColor || colors.primaryUltraSoft;
  const valueText = typeof value === 'number' ? String(value) : value;
  const isLongValue = valueText.length >= 9;
  
  const styles = React.useMemo(() => StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: radii.lg,
      alignItems: 'center',
      marginHorizontal: spacing.xxs,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.sm as object),
    },
    pressable: {
      flex: 1,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    icon: {
      // Icon wrapper for proper centering
    },
    value: {
      fontSize: isLongValue ? fontSizes.lg : fontSizes.xl,
      fontWeight: fontWeights.extrabold,
      color: colors.text,
      marginBottom: spacing.xxs,
      fontVariant: ['tabular-nums'],
      textAlign: 'center',
      alignSelf: 'stretch',
    },
    label: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      textAlign: 'center',
      fontWeight: fontWeights.medium,
      flexShrink: 1,
    },
  }), [colors, isLongValue]);

  const Content = (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: finalIconBgColor }]}>
        <View style={styles.icon}>{icon}</View>
      </View>
<<<<<<< HEAD
      <AppText
        style={styles.value}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {valueText}
      </AppText>
      <AppText style={styles.label} numberOfLines={2} ellipsizeMode="tail">
        {label}
      </AppText>
=======
      <AppText style={styles.value}>{value}</AppText>
      <AppText style={styles.label} numberOfLines={2} ellipsizeMode="tail">{label}</AppText>
>>>>>>> 1df1ba5d13d9522aa065c910c9295011455d243d
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.pressable}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        {Content}
      </TouchableOpacity>
    );
  }

  return Content;
};

<<<<<<< HEAD
=======
const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginHorizontal: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...(shadows.sm as object),
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    // Icon wrapper for proper centering
  },
  value: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  label: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: fontWeights.medium,
    flexShrink: 1,
  },
});

>>>>>>> 1df1ba5d13d9522aa065c910c9295011455d243d

