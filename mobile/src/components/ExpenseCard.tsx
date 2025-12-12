import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Expense } from '../api/expensesApi';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/dateHelpers';

interface ExpenseCardProps {
  expense: Expense;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({ expense }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.description}>{expense.description}</Text>
        <Text style={styles.amount}>{formatCurrency(expense.totalAmount)}</Text>
      </View>
      <Text style={styles.paidBy}>
        Paid by {expense.paidBy.name} • {formatDate(expense.date)}
      </Text>
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
  paidBy: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
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

