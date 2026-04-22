import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors, radii } from '../../theme';

interface SettingsGroupCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Single grouped card surface for settings rows (soft border + light shadow). */
export const SettingsGroupCard: React.FC<SettingsGroupCardProps> = ({ children, style }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const colors = useThemeColors();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        card: {
          borderRadius: radii.lg + 4,
          borderWidth: 1.5,
          borderColor: isDark ? 'rgba(74, 222, 128, 0.2)' : 'rgba(34, 197, 94, 0.16)',
          backgroundColor: isDark ? 'rgba(30, 38, 52, 0.72)' : 'rgba(255, 255, 255, 0.78)',
          overflow: 'hidden',
          shadowColor: colors.primary,
          shadowOpacity: isDark ? 0.1 : 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 3,
        },
      }),
    [colors, isDark]
  );

  return <View style={[styles.card, style]}>{children}</View>;
};
