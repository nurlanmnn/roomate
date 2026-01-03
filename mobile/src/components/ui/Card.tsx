import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { useThemeColors, radii, spacing, shadows } from '../../theme';

type CardProps = ViewProps & {
  variant?: 'default' | 'soft';
  style?: ViewStyle | ViewStyle[];
};

export const Card: React.FC<CardProps> = ({ variant = 'default', style, ...props }) => {
  const colors = useThemeColors();
  const styles = React.useMemo(() => StyleSheet.create({
    base: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...(shadows.sm as object),
    },
    soft: {
      backgroundColor: colors.surfaceAlt,
    },
  }), [colors]);

  return (
    <View
      {...props}
      style={[
        styles.base,
        variant === 'soft' && styles.soft,
        style,
      ]}
    />
  );
};




