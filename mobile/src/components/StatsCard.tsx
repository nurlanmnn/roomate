import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '../theme';

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

export const StatsCard: React.FC<StatsCardProps> = ({ icon, label, value }) => {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>{icon}</View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
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
    borderColor: colors.border,
    ...(shadows.sm as object),
  },
  icon: {
    marginBottom: spacing.xs,
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
  },
});


