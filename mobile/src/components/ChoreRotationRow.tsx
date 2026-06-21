import React, { useMemo } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isSameDay } from 'date-fns';
import type { Locale } from 'date-fns';
import { AppText } from './AppText';
import { Avatar } from './ui/Avatar';
import type { ChoreRotation } from '../api/choresApi';
import {
  getChoreAssigneeAt,
  getChoreCompletionForDate,
  getChorePeriodBounds,
  formatChorePeriodRange,
  isChorePeriodOverdue,
} from '../utils/choreSchedule';
import { fontSizes, fontWeights, spacing, radii } from '../theme';
import type { getColors } from '../theme/colors';

export type ThemeColors = ReturnType<typeof getColors>;

export type ChoreRotationRowProps = {
  chore: ChoreRotation;
  user: { _id: string } | null;
  referenceDate: Date;
  onToggleComplete: (chore: ChoreRotation, forDate: Date) => void;
  onGiveTo?: (chore: ChoreRotation, referenceDate: Date) => void;
  dateFnsLocale?: Locale;
  t: (key: string, params?: Record<string, string>) => string;
  colors: ThemeColors;
  showPeriodRange?: boolean;
  showFrequency?: boolean;
  showDoneBy?: boolean;
  variant?: 'full' | 'compact';
  isLast?: boolean;
  style?: ViewStyle;
};

export const ChoreRotationRow: React.FC<ChoreRotationRowProps> = ({
  chore,
  user,
  referenceDate,
  onToggleComplete,
  onGiveTo,
  dateFnsLocale,
  t,
  colors,
  showPeriodRange = false,
  showFrequency = false,
  showDoneBy = false,
  variant = 'full',
  isLast = false,
  style,
}) => {
  const styles = useMemo(() => createRowStyles(colors, variant), [colors, variant]);

  const assignee =
    getChoreAssigneeAt(chore, referenceDate) ??
    (isSameDay(referenceDate, new Date()) ? chore.currentAssignee : null);
  const completion = getChoreCompletionForDate(chore, referenceDate);
  const isCompleted = completion !== null;
  const isOverdue = isChorePeriodOverdue(chore, referenceDate) && !isCompleted;
  const isMyTurn = !!user && assignee?._id === user._id;

  const bounds = showPeriodRange ? getChorePeriodBounds(chore, referenceDate) : null;
  const periodLabel =
    bounds && showPeriodRange
      ? t('chores.periodRange', {
          range: formatChorePeriodRange(bounds.start, bounds.end, dateFnsLocale),
        })
      : null;

  const memberData = assignee
    ? chore.rotationOrder.find((m) => m._id === assignee._id)
    : null;

  const completedByMember = completion
    ? chore.rotationOrder.find((m) => m._id === completion.completedBy)
    : null;
  const completedByName = completedByMember?.name ?? t('chores.noAssignee');

  const assigneeText = isCompleted
    ? showDoneBy
      ? t('chores.doneBy', { name: completedByName })
      : t('chores.done')
    : isMyTurn
      ? t('chores.youreOn')
      : assignee?.name ?? t('chores.noAssignee');

  const frequencyText =
    chore.frequency === 'biweekly' ? t('chores.biweekly') : t('chores.weekly');

  return (
    <View
      style={[
        styles.choreRow,
        isMyTurn && !isCompleted && styles.choreRowMine,
        isCompleted && styles.choreRowDone,
        !isLast && !isCompleted && !isMyTurn && styles.choreRowBorder,
        style,
      ]}
    >
      <View
        style={[
          styles.choreRowIcon,
          isMyTurn && !isCompleted && styles.choreRowIconMine,
          isCompleted && styles.choreRowIconDone,
        ]}
      >
        <Ionicons
          name={isCompleted ? 'checkmark' : 'sparkles'}
          size={variant === 'compact' ? 16 : 18}
          color={
            isCompleted ? colors.success : isMyTurn ? colors.accent : colors.primary
          }
        />
      </View>
      <View style={styles.choreRowBody}>
        <AppText
          style={[styles.choreRowName, isCompleted && styles.choreRowNameDone]}
          numberOfLines={1}
        >
          {chore.name}
        </AppText>
        <View style={styles.choreRowAssigneeRow}>
          {assignee && !isCompleted ? (
            <Avatar name={assignee.name} uri={memberData?.avatarUrl} size={18} />
          ) : null}
          <AppText
            style={[
              styles.choreRowAssigneeName,
              isCompleted && styles.choreRowAssigneeNameDone,
            ]}
            numberOfLines={2}
          >
            {assigneeText}
            {periodLabel ? (
              <>
                {'  ·  '}
                {periodLabel}
              </>
            ) : null}
          </AppText>
          {isOverdue ? (
            <View style={styles.choreOverdueBadge}>
              <AppText style={styles.choreOverdueBadgeText}>{t('chores.overdue')}</AppText>
            </View>
          ) : null}
        </View>
        {showFrequency ? (
          <AppText style={styles.choreRowFrequency}>{frequencyText}</AppText>
        ) : null}
        {isMyTurn && !isCompleted && onGiveTo && (variant === 'full' || variant === 'compact') ? (
          <TouchableOpacity
            onPress={() => onGiveTo(chore, referenceDate)}
            activeOpacity={0.7}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <AppText style={styles.choreGiveToButton}>{t('chores.giveTo')}</AppText>
          </TouchableOpacity>
        ) : null}
      </View>
      {isMyTurn ? (
        <TouchableOpacity
          onPress={() => onToggleComplete(chore, referenceDate)}
          activeOpacity={0.8}
          style={[
            styles.choreDoneButton,
            isCompleted && styles.choreDoneButtonCompleted,
          ]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons
            name={isCompleted ? 'arrow-undo' : 'checkmark-circle'}
            size={16}
            color={isCompleted ? colors.textSecondary : colors.surface}
          />
          <AppText
            style={[
              styles.choreDoneButtonText,
              isCompleted && styles.choreDoneButtonTextCompleted,
            ]}
          >
            {isCompleted ? t('chores.undo') : t('chores.markDone')}
          </AppText>
        </TouchableOpacity>
      ) : isCompleted ? (
        <View style={styles.choreDoneBadge}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <AppText style={styles.choreDoneBadgeText}>{t('chores.done')}</AppText>
        </View>
      ) : null}
    </View>
  );
};

const createRowStyles = (colors: ThemeColors, variant: 'full' | 'compact') =>
  StyleSheet.create({
    choreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: variant === 'compact' ? spacing.xs : spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
      backgroundColor: 'transparent',
    },
    choreRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
      borderRadius: 0,
    },
    choreRowMine: {
      backgroundColor: colors.accentUltraSoft,
      borderBottomWidth: 0,
      borderRadius: radii.md,
    },
    choreRowIcon: {
      width: variant === 'compact' ? 32 : 36,
      height: variant === 'compact' ? 32 : 36,
      borderRadius: variant === 'compact' ? 16 : 18,
      backgroundColor: colors.primaryUltraSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    choreRowIconMine: {
      backgroundColor: colors.surface,
    },
    choreRowBody: {
      flex: 1,
      minWidth: 0,
    },
    choreRowName: {
      fontSize: variant === 'compact' ? fontSizes.sm : fontSizes.md,
      color: colors.text,
      fontWeight: fontWeights.semibold,
    },
    choreRowAssigneeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: 2,
    },
    choreRowAssigneeName: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    choreRowAssigneeNameDone: {
      color: colors.success,
      fontWeight: fontWeights.semibold,
    },
    choreRowFrequency: {
      fontSize: fontSizes.xs,
      color: colors.textTertiary,
      marginTop: 2,
    },
    choreGiveToButton: {
      fontSize: fontSizes.xs,
      color: colors.primary,
      fontWeight: fontWeights.semibold,
      marginTop: 4,
    },
    choreRowDone: {
      backgroundColor: colors.successSoft,
      borderRadius: radii.md,
    },
    choreRowIconDone: {
      backgroundColor: colors.surface,
    },
    choreRowNameDone: {
      color: colors.textSecondary,
      textDecorationLine: 'line-through',
    },
    choreDoneButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      paddingVertical: 6,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.success,
      borderRadius: radii.pill,
    },
    choreDoneButtonCompleted: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    choreDoneButtonText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.bold,
      color: colors.surface,
    },
    choreDoneButtonTextCompleted: {
      color: colors.textSecondary,
    },
    choreDoneBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.successSoft,
    },
    choreDoneBadgeText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.success,
    },
    choreOverdueBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 2,
      paddingHorizontal: spacing.xs,
      backgroundColor: colors.dangerSoft,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.dangerSoft,
    },
    choreOverdueBadgeText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.danger,
    },
  });
