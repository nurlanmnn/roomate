import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { AppText } from './AppText';
import { Expense } from '../api/expensesApi';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, formatDateShort } from '../utils/dateHelpers';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '../theme';
import { Avatar } from './ui/Avatar';

interface ExpenseCardProps {
  expense: Expense;
  onDelete?: (expenseId: string) => void;
  canDelete?: boolean;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({ expense, onDelete, canDelete = false }) => {
  const paidByName = expense.paidBy?.name || 'Unknown';

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
    <View style={styles.card}>
      <View style={styles.header}>
        <AppText style={styles.description}>{expense.description}</AppText>
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
  );
};

const styles = StyleSheet.create({
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
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  amount: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  paidByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
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
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  deleteText: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    fontWeight: fontWeights.semibold,
  },
  category: {
    fontSize: fontSizes.xs,
    color: colors.muted,
    marginBottom: spacing.xxs,
  },
  participants: {
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
});

