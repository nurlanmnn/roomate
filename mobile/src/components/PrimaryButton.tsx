import React from 'react';
import { StyleSheet, ActivityIndicator, Pressable, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from './AppText';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../theme';

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
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        buttonBase: {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: radii.lg,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 48,
          overflow: 'hidden',
        },
        jewelWrap: {
          borderRadius: radii.lg,
          shadowColor: colors.primary,
          shadowOpacity: 0.28,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        },
        buttonSecondary: {
          backgroundColor: colors.accent,
          shadowColor: colors.accentDark,
          shadowOpacity: 0.2,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 4,
        },
        buttonDanger: {
          backgroundColor: colors.danger,
          shadowColor: colors.danger,
          shadowOpacity: 0.22,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 4,
        },
        buttonOutline: {
          backgroundColor: 'rgba(255,255,255,0.55)',
          borderWidth: 2,
          borderColor: colors.primary,
          shadowColor: colors.primary,
          shadowOpacity: 0.12,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        },
        buttonDisabled: {
          opacity: 0.5,
        },
        buttonPressed: {
          transform: [{ scale: 0.98 }],
          opacity: 0.92,
        },
        buttonText: {
          color: colors.surface,
          fontSize: fontSizes.md,
          fontWeight: fontWeights.semibold,
          letterSpacing: 0.2,
        },
        buttonTextOnJewel: {
          color: '#FFFFFF',
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
      }),
    [colors]
  );

  if (variant === 'primary') {
    return (
      <View style={[styles.jewelWrap, style]}>
        <Pressable
          onPress={onPress}
          disabled={disabled || loading}
          style={({ pressed }) => [
            styles.buttonBase,
            (disabled || loading) && styles.buttonDisabled,
            pressed && !(disabled || loading) && styles.buttonPressed,
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <AppText style={styles.buttonTextOnJewel}>{title}</AppText>
          )}
        </Pressable>
      </View>
    );
  }

  const variantStyle =
    variant === 'secondary'
      ? styles.buttonSecondary
      : variant === 'danger'
        ? styles.buttonDanger
        : styles.buttonOutline;

  const textStyle = variant === 'outline' ? styles.buttonTextOutline : styles.buttonText;

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
