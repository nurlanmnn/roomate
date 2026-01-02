import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '../theme';

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconColor?: string;
  iconBgColor?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ 
  icon, 
  label, 
  value,
  iconColor = colors.primary,
  iconBgColor = colors.primaryUltraSoft,
}) => {
  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <View style={styles.icon}>{icon}</View>
      </View>
      <AppText style={styles.value}>{value}</AppText>
      <AppText style={styles.label} numberOfLines={2} ellipsizeMode="tail">{label}</AppText>
    </View>
  );
};

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


