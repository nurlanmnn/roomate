import React from 'react';
import { StyleSheet, ActivityIndicator, Pressable, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  style?: ViewStyle;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
}) => {
  const colors = useThemeColors();
  const styles = React.useMemo(() => StyleSheet.create({
    buttonBase: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44, // Minimum touch target for accessibility
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
      ...(shadows.sm as object),
    },
    buttonSecondary: {
      backgroundColor: colors.accent,
      ...(shadows.sm as object),
    },
    buttonDanger: {
      backgroundColor: colors.danger,
      ...(shadows.sm as object),
    },
    buttonOutline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonPressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.9,
    },
    buttonText: {
      color: colors.surface,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      letterSpacing: 0.2,
    },
    buttonTextOutline: {
      color: colors.primary,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      letterSpacing: 0.2,
    },
  }), [colors]);

  const variantStyle =
    variant === 'secondary'
      ? styles.buttonSecondary
      : variant === 'danger'
        ? styles.buttonDanger
        : variant === 'outline'
          ? styles.buttonOutline
          : styles.buttonPrimary;

  const textStyle =
    variant === 'outline'
      ? styles.buttonTextOutline
      : styles.buttonText;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.buttonBase,
        variantStyle,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !(disabled || loading) && styles.buttonPressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : colors.surface} />
      ) : (
        <AppText style={textStyle}>{title}</AppText>
      )}
    </Pressable>
  );
};
