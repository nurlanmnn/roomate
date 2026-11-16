import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors, radii, spacing } from '../../theme';

type CardProps = ViewProps & {
  /** `soft` sits on the ground colour for secondary content. */
  variant?: 'default' | 'soft';
  style?: ViewStyle | ViewStyle[];
};

/** Flat surface. Depth comes from the ground/surface contrast, not shadows. */
export const Card: React.FC<CardProps> = ({ variant = 'default', style, ...props }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const colors = useThemeColors();

  return (
    <View
      {...props}
      style={[
        styles.base,
        {
          backgroundColor: variant === 'soft' ? colors.surfaceAlt : colors.surface,
          borderColor: colors.borderLight,
          borderWidth: isDark || variant === 'soft' ? StyleSheet.hairlineWidth : 0,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    padding: spacing.md,
  },
});
