import React from 'react';
import { StyleSheet, ActivityIndicator, Pressable, ViewStyle, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /**
   * primary: enamel fill, the default action.
   * ink: strongest fill, at most one per screen (Home hero).
   * secondary / outline: surface with a border.
   * danger: destructive confirmation.
   */
  variant?: 'primary' | 'ink' | 'secondary' | 'danger' | 'outline';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  icon,
  style,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const colors = useThemeColors();
  const inactive = Boolean(disabled || loading);

  const palette = React.useMemo(() => {
    switch (variant) {
      case 'ink':
        return { bg: colors.ink, fg: colors.onInk, border: colors.ink };
      case 'danger':
        return { bg: colors.danger, fg: colors.surface, border: colors.danger };
      case 'secondary':
      case 'outline':
        return { bg: colors.surface, fg: colors.primary, border: colors.border };
      default:
        return { bg: colors.primary, fg: colors.onPrimary, border: colors.primary };
    }
  }, [variant, colors]);

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={20} color={palette.fg} /> : null}
          <AppText style={[styles.label, { color: palette.fg }]} numberOfLines={2}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    textAlign: 'center',
    flexShrink: 1,
  },
  inactive: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
  },
});
