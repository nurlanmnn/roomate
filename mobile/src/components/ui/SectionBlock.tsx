import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../AppText';
import { useThemeColors, fontSizes, fontWeights, spacing } from '../../theme';

interface SectionBlockProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
  /** If true, no horizontal padding is applied (caller handles it) */
  noPadding?: boolean;
}

/**
 * Reusable section wrapper: title, optional description, optional "See all" action.
 * Aligns with Shopping SectionHeader and provides consistent section rhythm across app.
 */
export const SectionBlock: React.FC<SectionBlockProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  children,
  noPadding = false,
}) => {
  const colors = useThemeColors();
  const styles = React.useMemo(() => StyleSheet.create({
    section: {
      marginBottom: spacing.xxl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: spacing.md,
      paddingHorizontal: noPadding ? 0 : spacing.xl,
    },
    titleBlock: {
      flex: 1,
      minWidth: 0,
      paddingRight: spacing.md,
    },
    title: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      letterSpacing: -0.3,
      marginBottom: description ? 2 : 0,
    },
    description: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    action: {
      paddingVertical: spacing.xs,
      paddingLeft: spacing.sm,
    },
    actionText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.primary,
    },
    content: {
      paddingHorizontal: noPadding ? 0 : spacing.xl,
    },
  }), [colors, noPadding]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <AppText style={styles.title}>{title}</AppText>
          {description ? (
            <AppText style={styles.description}>{description}</AppText>
          ) : null}
        </View>
        {actionLabel && onAction ? (
          <TouchableOpacity style={styles.action} onPress={onAction} activeOpacity={0.7}>
            <AppText style={styles.actionText}>{actionLabel}</AppText>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
};
