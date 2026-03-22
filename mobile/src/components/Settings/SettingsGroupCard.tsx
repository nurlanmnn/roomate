import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useThemeColors, radii, shadows } from '../../theme';

interface SettingsGroupCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Single grouped card surface for settings rows (soft border + light shadow). */
export const SettingsGroupCard: React.FC<SettingsGroupCardProps> = ({ children, style }) => {
  const colors = useThemeColors();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        card: {
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.borderLight,
          backgroundColor: colors.surface,
          overflow: 'hidden',
          ...(shadows.sm as object),
        },
      }),
    [colors]
  );

  return <View style={[styles.card, style]}>{children}</View>;
};
