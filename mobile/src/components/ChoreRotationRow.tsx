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
import { useThemeColors, fontSizes, fontWeights, spacing, radii } from '../theme';
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
  colors: _colors,
  showPeriodRange = false,
  showFrequency = false,
  showDoneBy = false,
  variant = 'full',
  isLast = false,
  style,
}) => {
  const colors = useThemeColors();
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
    <View style={[styles.row, !isLast && styles.separator, style]}>
      <View style={styles.main}>
        {assignee ? (
          <Avatar name={assignee.name} uri={memberData?.avatarUrl} size={36} />
        ) : (
          <View style={styles.iconWell}>
            <Ionicons name="repeat-outline" size={22} color={colors.primary} />
          </View>
        )}
        <View style={styles.body}>
          <AppText style={[styles.name, isCompleted && styles.nameDone]}>{chore.name}</AppText>
          <AppText style={styles.secondary}>{assigneeText}</AppText>
          {periodLabel ? <AppText style={styles.secondary}>{periodLabel}</AppText> : null}
          {showFrequency ? <AppText style={styles.secondary}>{frequencyText}</AppText> : null}
          <View style={styles.badges}>
            {isMyTurn && !isCompleted ? (
              <View style={styles.turnBadge}>
                <AppText style={styles.turnText}>{t('chores.yourTurn')}</AppText>
              </View>
            ) : null}
            {isOverdue ? (
              <View style={styles.overdueBadge}>
                <AppText style={styles.overdueText}>{t('chores.overdue')}</AppText>
              </View>
            ) : null}
            {isCompleted ? (
              <View style={styles.doneBadge}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                <AppText style={styles.doneText}>{t('chores.done')}</AppText>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      {isMyTurn ? (
        <View style={styles.actions}>
          {!isCompleted && onGiveTo ? (
            <TouchableOpacity
              onPress={() => onGiveTo(chore, referenceDate)}
              accessibilityRole="button"
              activeOpacity={0.7}
              style={styles.action}
            >
              <AppText style={styles.actionText}>{t('chores.giveTo')}</AppText>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => onToggleComplete(chore, referenceDate)}
            accessibilityRole="checkbox"
            accessibilityLabel={`${chore.name}, ${isCompleted ? t('chores.undo') : t('chores.markDone')}`}
            accessibilityState={{ checked: isCompleted }}
            activeOpacity={0.7}
            style={styles.action}
          >
            <Ionicons name={isCompleted ? 'arrow-undo-outline' : 'checkmark-circle-outline'} size={22} color={colors.primary} />
            <AppText style={styles.actionText}>{isCompleted ? t('chores.undo') : t('chores.markDone')}</AppText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const createRowStyles = (colors: ThemeColors, variant: 'full' | 'compact') =>
  StyleSheet.create({
    row: { minHeight: 60, paddingVertical: variant === 'compact' ? spacing.sm : spacing.md, paddingHorizontal: spacing.md },
    separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    main: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    body: { flex: 1, minWidth: 0 },
    iconWell: { width: 36, height: 36, borderRadius: radii.sm, backgroundColor: colors.primaryUltraSoft, alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text },
    nameDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
    secondary: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.xxs },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
    turnBadge: { borderRadius: radii.sm, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, backgroundColor: colors.marigold },
    turnText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.onMarigold },
    overdueBadge: { borderRadius: radii.sm, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, backgroundColor: colors.dangerSoft },
    overdueText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.danger },
    doneBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
    doneText: { fontSize: fontSizes.sm, color: colors.success },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
    action: { minHeight: 44, minWidth: 44, paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, maxWidth: '100%' },
    actionText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.primary, flexShrink: 1 },
  });
