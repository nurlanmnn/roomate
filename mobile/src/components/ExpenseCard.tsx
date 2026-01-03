import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { AppText } from './AppText';
import { Expense } from '../api/expensesApi';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, formatDateShort } from '../utils/dateHelpers';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../theme';
import { Avatar } from './ui/Avatar';
import { SwipeableRow } from './SwipeableRow';

interface ExpenseCardProps {
  expense: Expense;
  onDelete?: (expenseId: string) => void;
  onQuickSettle?: () => void;
  canDelete?: boolean;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({ expense, onDelete, onQuickSettle, canDelete = false }) => {
  const colors = useThemeColors();
  const paidByName = expense.paidBy?.name || 'Unknown';

  const styles = React.useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: radii.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...(shadows.sm as object),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    description: {
      flex: 1,
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginRight: spacing.md,
    },
    amount: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.extrabold,
      color: colors.primary,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.xs,
    },
    paidByRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.sm,
    },
    paidByContainer: {
      flex: 1,
    },
    paidBy: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
    },
    sinceDate: {
      fontSize: fontSizes.xs,
      color: colors.textTertiary,
      marginTop: spacing.xxs,
    },
    deleteButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.sm,
      backgroundColor: colors.dangerSoft,
    },
    deleteText: {
      fontSize: fontSizes.sm,
      color: colors.danger,
      fontWeight: fontWeights.semibold,
    },
    category: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    participants: {
      fontSize: fontSizes.sm,
      color: colors.textTertiary,
    },
  }), [colors]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${expense.description}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(expense._id),
        },
      ]
    );
  };

  return (
    <SwipeableRow
      onSwipeLeft={canDelete && onDelete ? handleDelete : undefined}
      onSwipeRight={onQuickSettle}
      leftActionLabel="Delete"
      rightActionLabel="Settle"
      leftActionIcon="trash-outline"
      rightActionIcon="cash-outline"
    >
      <View style={styles.card}>
      <View style={styles.header}>
        <AppText style={styles.description} numberOfLines={2} ellipsizeMode="tail">{expense.description}</AppText>
        <AppText style={styles.amount}>{formatCurrency(expense.totalAmount)}</AppText>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.paidByRow}>
          <Avatar name={paidByName} uri={expense.paidBy?.avatarUrl} size={20} />
          <View style={styles.paidByContainer}>
            <AppText style={styles.paidBy}>
              Paid by {paidByName} • {formatDate(expense.date)}
            </AppText>
            {expense.createdAt && (
              <AppText style={styles.sinceDate}>
                Added since {formatDateShort(expense.createdAt)}
              </AppText>
            )}
          </View>
        </View>
        {canDelete && onDelete && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <AppText style={styles.deleteText}>Delete</AppText>
          </TouchableOpacity>
        )}
      </View>
      {expense.category && (
        <AppText style={styles.category}>{expense.category}</AppText>
      )}
      <AppText style={styles.participants}>
        Split among {expense.participants.length} {expense.participants.length === 1 ? 'person' : 'people'}
      </AppText>
      </View>
    </SwipeableRow>
  );
};

