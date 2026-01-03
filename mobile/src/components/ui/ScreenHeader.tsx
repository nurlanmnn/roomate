import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../AppText';
import { useThemeColors, fontSizes, fontWeights, spacing } from '../../theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  variant?: 'screen' | 'stack';
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightText?: string;
  onRightPress?: () => void;
};

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  variant = 'screen',
  showBackButton,
  onBackPress,
  rightText,
  onRightPress,
}) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => StyleSheet.create({
    // "Screen" variant (big title, used inside scroll views)
    container: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
    },
    // "Stack" variant (matches React Navigation native stack header look)
    containerStack: {
      paddingHorizontal: spacing.md,
      paddingTop: insets.top,
      height: insets.top + 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    left: {
      flex: 1,
      paddingRight: spacing.md,
      flexShrink: 1,
    },
    leftRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    backButton: {
      minHeight: 44,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -spacing.sm, // pull icon slightly to the left like native headers
    },
    backButtonStack: {
      position: 'absolute',
      left: spacing.xs,
      top: insets.top + 2,
      height: 40,
      width: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    title: {
      fontSize: fontSizes.xxl,
      fontWeight: fontWeights.extrabold,
      color: colors.text,
      flexShrink: 1,
    },
    titleStack: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.extrabold,
      color: colors.text,
      maxWidth: '70%',
      textAlign: 'center',
    },
    subtitle: {
      marginTop: spacing.xxs,
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
    },
    right: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      minHeight: 44, // Minimum touch target
      justifyContent: 'center',
    },
    rightStack: {
      position: 'absolute',
      right: spacing.xs,
      top: insets.top,
      height: 44,
      justifyContent: 'center',
    },
    rightText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.primary,
    },
  }), [colors, insets.top]);

  if (variant === 'stack') {
    return (
      <View style={styles.containerStack}>
        {!!showBackButton && !!onBackPress && (
          <Pressable
            onPress={onBackPress}
            style={styles.backButtonStack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        )}
        <AppText style={styles.titleStack} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </AppText>
        {!!rightText && !!onRightPress && (
          <Pressable onPress={onRightPress} style={styles.rightStack}>
            <AppText style={styles.rightText}>{rightText}</AppText>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.leftRow}>
          {!!showBackButton && !!onBackPress && (
            <Pressable
              onPress={onBackPress}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          )}
          <AppText style={styles.title} numberOfLines={2} ellipsizeMode="tail">
            {title}
          </AppText>
        </View>
        {!!subtitle && <AppText style={styles.subtitle}>{subtitle}</AppText>}
      </View>
      {!!rightText && !!onRightPress && (
        <Pressable onPress={onRightPress} style={styles.right}>
          <AppText style={styles.rightText}>{rightText}</AppText>
        </Pressable>
      )}
    </View>
  );
};
