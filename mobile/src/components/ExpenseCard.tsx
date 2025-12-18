import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Expense } from '../api/expensesApi';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/dateHelpers';

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
        <Text style={styles.description}>{expense.description}</Text>
        <Text style={styles.amount}>{formatCurrency(expense.totalAmount)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.paidBy}>
          Paid by {paidByName} • {formatDate(expense.date)}
        </Text>
        {canDelete && onDelete && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
      {expense.category && (
        <Text style={styles.category}>{expense.category}</Text>
      )}
      <Text style={styles.participants}>
        Split among {expense.participants.length} {expense.participants.length === 1 ? 'person' : 'people'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  paidBy: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
    paddingHorizontal: 8,
  },
  deleteText: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '600',
  },
  category: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  participants: {
    fontSize: 12,
    color: '#999',
  },
});

