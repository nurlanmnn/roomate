import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { fonts, fontSizes, fontWeights, radii, spacing, useThemeColors } from '../theme';
import { AppText } from './AppText';
import { Amount } from './ui/Amount';
import { formatCurrency } from '../utils/formatCurrency';
import { useHouseholdCurrency } from '../utils/useHouseholdCurrency';

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
  const finalIconColor = Object.values(colors).some(token => token === iconColor) ? iconColor : colors.primary;
  const valueText = typeof value === 'number' ? String(value) : value;
  const isLongValue = valueText.length >= 9;
  const currency = useHouseholdCurrency();
  // The public value prop also accepts already formatted amounts. Only decode an
  // exact currency-format round trip; arbitrary labels and counts stay untouched.
  const moneyValue = React.useMemo(() => {
    if (typeof value !== 'string') return null;
    const parts = new Intl.NumberFormat().formatToParts(1234.5);
    const group = parts.find(part => part.type === 'group')?.value ?? ',';
    const decimal = parts.find(part => part.type === 'decimal')?.value ?? '.';
    const parsed = Number(value.split(group).join('').replace(decimal, '.').replace(/[^0-9.+-]/g, ''));
    return Number.isFinite(parsed) && formatCurrency(parsed, currency) === value ? parsed : null;
  }, [value, currency]);

  const styles = React.useMemo(() => StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: radii.lg,
      alignItems: 'center',
      marginHorizontal: spacing.xxs,
      borderWidth: 0,
      borderColor: colors.borderLight,

    },
    pressable: {
      flex: 1,
    },
    iconContainer: {
      width: 28,
      height: 28,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    icon: {
      // Icon wrapper for proper centering
    },
    value: {
      fontSize: isLongValue ? fontSizes.lg : fontSizes.xl,
      ...(typeof value === 'number' ? { fontFamily: fonts.displayBold } : { fontWeight: fontWeights.bold }),
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
  }), [colors, isLongValue, value]);

  const Content = (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.icon}>{React.isValidElement<{ color?: string; }>(icon) ? React.cloneElement(icon, { color: finalIconColor }) : icon}</View>
      </View>
      {moneyValue !== null ? <Amount value={moneyValue} currency={currency} size={28} fit /> : <AppText
        style={styles.value}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {valueText}
      </AppText>}
      <AppText style={styles.label}>
        {label}
      </AppText>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.pressable, { minHeight: 44 }]}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${valueText}`}
      >
        {Content}
      </TouchableOpacity>
    );
  }

  return Content;
};
