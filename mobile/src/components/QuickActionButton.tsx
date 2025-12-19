import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
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
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.xs,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadows.sm as object),
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.96,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    textAlign: 'center',
  },
});


