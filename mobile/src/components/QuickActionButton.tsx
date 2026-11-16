import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { fontSizes, fontWeights, radii, spacing, useThemeColors } from '../theme';
import { AppText } from './AppText';

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon, label, onPress }) => {
  const colors = useThemeColors();
  const styles = React.useMemo(() => StyleSheet.create({
    button: {
      flex: 1,
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
      borderWidth: 1.5,
      borderColor: colors.border,
      gap: spacing.sm,

    },
    pressed: {
      opacity: 0.9,
    },
    label: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  }), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {icon}
      <AppText style={styles.label}>{label}</AppText>
    </Pressable>
  );
};
