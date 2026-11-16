import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../AppText';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../../theme';

export type RoleBadgeVariant = 'owner' | 'member';

interface RoleBadgeProps {
  variant: RoleBadgeVariant;
  label: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ variant, label }) => {
  const colors = useThemeColors();
  const owner = variant === 'owner';

  return (
    <View style={[styles.wrap, { backgroundColor: owner ? colors.primaryUltraSoft : colors.background }]}>
      <AppText style={[styles.text, { color: owner ? colors.primary : colors.textSecondary }]}>{label}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radii.sm,
  },
  text: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    flexShrink: 1,
  },
});
