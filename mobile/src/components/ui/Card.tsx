import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors, radii, spacing } from '../../theme';

type CardProps = ViewProps & {
  variant?: 'default' | 'soft';
  style?: ViewStyle | ViewStyle[];
};

export const Card: React.FC<CardProps> = ({ variant = 'default', style, ...props }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const colors = useThemeColors();
  const styles = React.useMemo(() => StyleSheet.create({
    base: {
      backgroundColor: isDark ? 'rgba(30, 38, 52, 0.72)' : 'rgba(255, 255, 255, 0.78)',
      borderRadius: radii.lg + 4,
      padding: spacing.lg,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(74, 222, 128, 0.2)' : 'rgba(34, 197, 94, 0.18)',
      shadowColor: colors.primary,
      shadowOpacity: isDark ? 0.12 : 0.1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    soft: {
      backgroundColor: isDark ? 'rgba(26, 32, 44, 0.65)' : 'rgba(255, 255, 255, 0.62)',
    },
  }), [colors, isDark]);

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




