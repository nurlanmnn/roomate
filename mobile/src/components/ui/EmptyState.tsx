import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from '../AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows, lineHeights } from '../../theme';
import { PrimaryButton } from '../PrimaryButton';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'minimal';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'document-text-outline',
  title,
  message,
  actionLabel,
  onAction,
  variant = 'default',
}) => {
  const colors = useThemeColors();
  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxxl,
      paddingHorizontal: spacing.xl,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      marginHorizontal: spacing.md,
      marginVertical: spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.sm as object),
    },
    minimalContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.xl,
    },
    iconContainer: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.primaryUltraSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.sm,
      textAlign: 'center',
      lineHeight: lineHeights.xl,
    },
    minimalTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    message: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: lineHeights.md,
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    minimalMessage: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: lineHeights.sm,
      paddingHorizontal: spacing.lg,
    },
    actionContainer: {
      width: '100%',
      maxWidth: 280,
      marginTop: spacing.md,
    },
  }), [colors]);

  if (variant === 'minimal') {
    return (
      <View style={styles.minimalContainer}>
        <Ionicons name={icon} size={48} color={colors.textTertiary} />
        <AppText style={styles.minimalTitle}>{title}</AppText>
        <AppText style={styles.minimalMessage}>{message}</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={56} color={colors.primary} />
      </View>
      <AppText style={styles.title}>{title}</AppText>
      <AppText style={styles.message}>{message}</AppText>
      {actionLabel && onAction && (
        <View style={styles.actionContainer}>
          <PrimaryButton title={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
};

