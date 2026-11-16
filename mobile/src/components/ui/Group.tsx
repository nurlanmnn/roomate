import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../AppText';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../../theme';

type SectionHeadingProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
};

/** Sentence-case section heading with an optional text action on the right. */
export const SectionHeading: React.FC<SectionHeadingProps> = ({ title, actionLabel, onAction, style }) => {
  const colors = useThemeColors();
  return (
    <View style={[styles.heading, style]}>
      <AppText accessibilityRole="header" style={[styles.headingText, { color: colors.text }]} numberOfLines={2}>
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={12}
          style={({ pressed }) => [styles.headingAction, pressed && styles.pressed]}
        >
          <AppText style={[styles.headingActionText, { color: colors.primary }]}>{actionLabel}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
};

type GroupProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

/** Inset grouped list container. Children are `GroupRow`s; separators are drawn between them. */
export const Group: React.FC<GroupProps> = ({ children, style }) => {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const rows = React.Children.toArray(children).filter(Boolean);

  return (
    <View
      style={[
        styles.group,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          borderWidth: theme === 'dark' ? StyleSheet.hairlineWidth : 0,
        },
        style,
      ]}
    >
      {rows.map((row, index) => (
        <React.Fragment key={(row as React.ReactElement).key ?? index}>
          {index > 0 ? <View style={[styles.separator, { backgroundColor: colors.borderLight }]} /> : null}
          {row}
        </React.Fragment>
      ))}
    </View>
  );
};

type GroupRowProps = {
  title: string;
  subtitle?: string;
  /** Ionicon shown in a tinted well on the left. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** `marigold` marks something that is the current user's to do. */
  iconTone?: 'primary' | 'marigold' | 'neutral' | 'danger';
  /** Custom leading element (e.g. an `Avatar`); replaces `icon`. */
  leading?: React.ReactNode;
  /** Trailing element: an amount, a count, a switch, a checkbox. */
  trailing?: React.ReactNode;
  /** Shows a chevron when the row navigates somewhere. */
  chevron?: boolean;
  onPress?: () => void;
  destructive?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  titleLines?: number;
};

/** One row of a `Group`: at least 56pt tall, grows with Dynamic Type instead of truncating. */
export const GroupRow: React.FC<GroupRowProps> = ({
  title,
  subtitle,
  icon,
  iconTone = 'primary',
  leading,
  trailing,
  chevron,
  onPress,
  destructive,
  accessibilityLabel,
  accessibilityHint,
  titleLines = 2,
}) => {
  const colors = useThemeColors();

  const tone = {
    primary: { bg: colors.primaryUltraSoft, fg: colors.primary },
    marigold: { bg: colors.marigoldSoft, fg: colors.warning },
    neutral: { bg: colors.tealUltraSoft, fg: colors.textSecondary },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  }[iconTone];

  const content = (
    <>
      {leading ??
        (icon ? (
          <View style={[styles.iconWell, { backgroundColor: tone.bg }]}>
            <Ionicons name={icon} size={20} color={tone.fg} />
          </View>
        ) : null)}
      <View style={styles.rowText}>
        <AppText
          style={[styles.rowTitle, { color: destructive ? colors.danger : colors.text }]}
          numberOfLines={titleLines}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText style={[styles.rowSubtitle, { color: colors.textSecondary }]} numberOfLines={3}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.primaryUltraSoft }]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headingText: {
    flex: 1,
    fontSize: 20,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.2,
  },
  headingAction: {
    minHeight: 28,
    justifyContent: 'flex-end',
  },
  headingActionText: {
    fontSize: fontSizes.md - 1,
    fontWeight: fontWeights.medium,
  },
  group: {
    marginHorizontal: spacing.md,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  rowSubtitle: {
    fontSize: fontSizes.sm - 1,
    marginTop: 2,
  },
  trailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
    maxWidth: '45%',
  },
  pressed: {
    opacity: 0.6,
  },
});
