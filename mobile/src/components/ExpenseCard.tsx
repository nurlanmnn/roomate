import React from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Expense } from '../api/expensesApi';
import { getCategoryById, getCategoryByName, getExpenseCategoryLabel } from '../constants/expenseCategories';
import { useLanguage } from '../context/LanguageContext';
import { fontSizes, fontWeights, radii, spacing, useThemeColors } from '../theme';
import { formatDate } from '../utils/dateHelpers';
import { getDateFnsLocale } from '../utils/dateLocales';
import { useHouseholdCurrency } from '../utils/useHouseholdCurrency';
import { AppText } from './AppText';
import { SwipeableRow } from './SwipeableRow';
import { Amount } from './ui/Amount';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/formatCurrency';
import { GroupRow } from './ui/Group';

interface ExpenseCardProps {
  expense: Expense;
  onDelete?: (expenseId: string) => void;
  onQuickSettle?: () => void;
  canDelete?: boolean;
  canEdit?: boolean;
  onEdit?: (expense: Expense) => void;
}

const ExpenseCardInner: React.FC<ExpenseCardProps> = ({
  expense,
  onDelete,
  onQuickSettle,
  canDelete = false,
  canEdit = false,
  onEdit,
}) => {
  const colors = useThemeColors();
  const [expanded, setExpanded] = React.useState(false);
  const { t, language } = useLanguage();
  const dateLocale = React.useMemo(() => getDateFnsLocale(language), [language]);
  const relativeDayLabels = React.useMemo(
    () => ({
      today: t('time.today'),
      yesterday: t('time.yesterday'),
      tomorrow: t('time.tomorrow'),
    }),
    [t]
  );
  const currency = useHouseholdCurrency();
  const paidByName = expense.paidBy?.name || t('common.someone');
  const shareBreakdown = React.useMemo(() => {
    if (!expense.shares?.length) return [];
    const memberNameById = new Map(
      (expense.participants || []).map((participant) => [participant._id, participant.name] as const)
    );
    return expense.shares
      .map((share) => {
        const name = memberNameById.get(share.userId) || '—';
        return { name, amount: share.amount, userId: share.userId };
      });
  }, [expense.shares, expense.participants, currency, t]);

  const styles = React.useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      paddingVertical: spacing.xs,
      borderRadius: 0,

      borderWidth: 0,
      borderColor: colors.border,

    },
    trailingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    details: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    detailLine: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
    },
    shareRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xxs,
    },
    shareName: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: fontSizes.sm,
    },
    actionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    deleteButton: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.sm,
      backgroundColor: colors.dangerSoft,
    },
    editButton: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.sm,
      backgroundColor: colors.surfaceAlt,
    },
    deleteText: {
      fontSize: fontSizes.sm,
      color: colors.danger,
      fontWeight: fontWeights.semibold,
    },
    editText: {
      fontSize: fontSizes.sm,
      color: colors.text,
      fontWeight: fontWeights.semibold,
    },
    breakdownWrap: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    breakdownLabel: {
      fontSize: fontSizes.xs,
      color: colors.textTertiary,
      marginBottom: spacing.xxs,
    },
  }), [colors]);

  const handleDelete = () => {
    Alert.alert(
      t('expenses.deleteExpense'),
      t('alerts.deleteExpenseConfirm', { description: expense.description }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => onDelete?.(expense._id),
        },
      ]
    );
  };

  const category = getCategoryById(expense.category ?? '') ?? getCategoryByName(expense.category ?? '');

  return (
    <SwipeableRow
      onSwipeLeft={canDelete && onDelete ? handleDelete : undefined}
      onSwipeRight={onQuickSettle}
      leftActionLabel={t('common.delete')}
      rightActionLabel={t('expenses.settleUp')}
      leftActionIcon="trash-outline"
      rightActionIcon="cash-outline"
    >
      <View style={styles.card}>
        <GroupRow
          title={expense.description}
          subtitle={`${t('expenses.paidBy')} ${paidByName}`}
          icon={category?.icon ?? 'receipt-outline'}
          trailing={
            <View style={styles.trailingRow}>
              <Amount value={expense.totalAmount} currency={currency} size={20} fit />
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
            </View>
          }
          onPress={() => setExpanded((v) => !v)}
          accessibilityLabel={`${expense.description}, ${t('expenses.paidBy')} ${paidByName}, ${formatCurrency(expense.totalAmount, currency)}`}
          accessibilityState={{ expanded }}
        />
        {expanded ? (
          <View style={styles.details}>
            <AppText style={styles.detailLine}>
              {[
                expense.category ? getExpenseCategoryLabel(t, expense.category) : null,
                formatDate(expense.date, dateLocale, relativeDayLabels),
                t('expenses.splitAmong', { count: expense.participants.length }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
            {shareBreakdown.length > 0 ? (
              <View style={styles.breakdownWrap}>
                <AppText style={styles.breakdownLabel}>{t('expenses.shareBreakdown')}</AppText>
                {shareBreakdown.map((share, index) => (
                  <View key={`${share.userId}-${index}`} style={styles.shareRow}>
                    <AppText style={styles.shareName}>{share.name}</AppText>
                    <Amount value={share.amount} currency={currency} size={16} weight="semibold" fit style={{ maxWidth: '50%' }} />
                  </View>
                ))}
              </View>
            ) : null}
            {(canEdit || canDelete || onQuickSettle) && (
              <View style={styles.actionsRow}>
                {onQuickSettle && (
                  <TouchableOpacity accessibilityRole="button" onPress={onQuickSettle} style={styles.editButton}>
                    <AppText style={[styles.editText, { color: colors.primary }]}>{t('expenses.settleUp')}</AppText>
                  </TouchableOpacity>
                )}
                {canEdit && onEdit && (
                  <TouchableOpacity accessibilityRole="button" onPress={() => onEdit(expense)} style={styles.editButton}>
                    <AppText style={styles.editText}>{t('common.edit')}</AppText>
                  </TouchableOpacity>
                )}
                {canDelete && onDelete && (
                  <TouchableOpacity accessibilityRole="button" onPress={handleDelete} style={styles.deleteButton}>
                    <AppText style={styles.deleteText}>{t('common.delete')}</AppText>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ) : null}
      </View>
    </SwipeableRow>
  );
};

/**
 * Memoized so that re-renders of the parent `FlatList` (e.g. a filter
 * keystroke) don't re-render every card — only the ones whose props actually
 * change. Callbacks passed in must be stable (wrap with `useCallback`).
 */
export const ExpenseCard = React.memo(ExpenseCardInner);
