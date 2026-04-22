import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../context/ThemeContext';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../theme';

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon, label, onPress }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const colors = useThemeColors();
  const styles = React.useMemo(() => StyleSheet.create({
    button: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(30, 38, 52, 0.88)' : 'rgba(255, 255, 255, 0.72)',
      padding: spacing.lg,
      borderRadius: radii.lg + 4,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 110,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(74, 222, 128, 0.28)' : 'rgba(34, 197, 94, 0.2)',
      gap: spacing.sm,
      shadowColor: colors.primary,
      shadowOpacity: isDark ? 0.22 : 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    pressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.9,
    },
    label: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  }), [colors, isDark]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {icon}
      <AppText style={styles.label}>{label}</AppText>
    </Pressable>
  );
};


