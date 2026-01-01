import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '../theme';

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon, label, onPress }) => {
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

const styles = StyleSheet.create({
  button: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...(shadows.sm as object),
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
});


