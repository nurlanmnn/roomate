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
  const styles = React.useMemo(() => {
    const owner = variant === 'owner';
    return StyleSheet.create({
      wrap: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radii.sm,
        backgroundColor: owner ? colors.primaryUltraSoft : colors.background,
        borderWidth: 1,
        borderColor: owner ? colors.primarySoft : colors.borderLight,
      },
      text: {
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.semibold,
        color: owner ? colors.primary : colors.textSecondary,
        letterSpacing: 0.3,
      },
    });
  }, [colors, variant]);

  return (
    <View style={styles.wrap}>
      <AppText style={styles.text}>{label}</AppText>
    </View>
  );
};
