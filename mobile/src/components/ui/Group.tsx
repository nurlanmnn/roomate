import React from 'react';
import {
  AccessibilityRole,
  AccessibilityState,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
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
  /** Sets the title in the interactive colour: the row is a command, not a destination. */
  action?: boolean;
  disabled?: boolean;
  /** Replaces the trailing element with a spinner and blocks presses. */
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  /** Defaults to `button` for pressable rows; use `switch` for toggle rows. */
  accessibilityRole?: AccessibilityRole;
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
  action,
  disabled,
  loading,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  accessibilityRole = 'button',
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
          style={[
            styles.rowTitle,
            { color: destructive ? colors.danger : action ? colors.primary : colors.text },
          ]}
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
      {loading ? (
        <ActivityIndicator size="small" color={destructive ? colors.danger : colors.primary} />
      ) : trailing ? (
        <View style={styles.trailing}>{trailing}</View>
      ) : null}
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
      disabled={disabled || loading}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading), ...accessibilityState }}
      style={({ pressed }) => [
        styles.row,
        disabled && styles.disabled,
        pressed && { backgroundColor: colors.primaryUltraSoft },
      ]}
    >
      {content}
    </Pressable>
  );
};

type FieldRowProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Trailing element after the value, e.g. a lock glyph on a read-only field. */
  trailing?: React.ReactNode;
};

/**
 * A `Group` row that is edited in place: label on the left, value beside it.
 * With `editable={false}` it is a plain label and value pair in the same columns.
 */
export const FieldRow: React.FC<FieldRowProps> = ({ label, trailing, editable = true, value, ...input }) => {
  const colors = useThemeColors();
  const inputRef = React.useRef<TextInput>(null);

  if (!editable) {
    return (
      <View style={styles.fieldRow}>
        <AppText style={[styles.fieldLabel, { color: colors.text }]} numberOfLines={2}>
          {label}
        </AppText>
        <AppText style={[styles.fieldValue, { color: colors.textSecondary }]}>{value || '—'}</AppText>
        {trailing}
      </View>
    );
  }

  // The whole row is the target: tapping the label puts the cursor in the field.
  return (
    <Pressable style={styles.fieldRow} onPress={() => inputRef.current?.focus()} accessible={false}>
      <AppText style={[styles.fieldLabel, { color: colors.text }]} numberOfLines={2}>
        {label}
      </AppText>
      <TextInput
        ref={inputRef}
        value={value}
        accessibilityLabel={label}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.primary}
        style={[styles.fieldInput, { color: colors.text }]}
        {...input}
      />
      {trailing}
    </Pressable>
  );
};

type GroupFooterProps = {
  children: React.ReactNode;
  tone?: 'default' | 'danger';
};

/** Explanatory text under a `Group`, set on the ground and aligned with the row text. */
export const GroupFooter: React.FC<GroupFooterProps> = ({ children, tone = 'default' }) => {
  const colors = useThemeColors();
  return (
    <AppText
      style={[styles.footer, { color: tone === 'danger' ? colors.danger : colors.textSecondary }]}
      accessibilityLiveRegion={tone === 'danger' ? 'polite' : undefined}
    >
      {children}
    </AppText>
  );
};

/** Label column shared by `FieldRow` and any custom row that sits in the same group. */
export const FIELD_LABEL_WIDTH = '42%';

const styles = StyleSheet.create({
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  fieldLabel: {
    width: FIELD_LABEL_WIDTH,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    paddingVertical: spacing.sm,
  },
  fieldInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    fontSize: fontSizes.md,
    paddingVertical: spacing.sm,
  },
  fieldValue: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSizes.md,
    paddingVertical: spacing.sm,
  },
  footer: {
    fontSize: fontSizes.sm - 1,
    lineHeight: 18,
    paddingHorizontal: spacing.xl + spacing.xs,
    paddingTop: spacing.xs,
  },
  disabled: {
    opacity: 0.45,
  },
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
