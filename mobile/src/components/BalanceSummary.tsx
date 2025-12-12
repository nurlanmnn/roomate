import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PairwiseBalance } from '../api/expensesApi';
import { formatCurrency } from '../utils/formatCurrency';

interface BalanceSummaryProps {
  balances: PairwiseBalance[];
  currentUserId: string;
  getUserName: (userId: string) => string;
}

export const BalanceSummary: React.FC<BalanceSummaryProps> = ({
  balances,
  currentUserId,
  getUserName,
}) => {
  const userBalances = balances.filter(b => b.fromUserId === currentUserId || b.toUserId === currentUserId);

  if (userBalances.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>All settled up! 🎉</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Balances</Text>
      {userBalances.map((balance, index) => {
        const isOwed = balance.toUserId === currentUserId;
        const otherUserId = isOwed ? balance.fromUserId : balance.toUserId;
        
        return (
          <View key={index} style={styles.balanceRow}>
            <Text style={styles.balanceText}>
              {isOwed ? (
                <>
                  <Text style={styles.userName}>{getUserName(otherUserId)}</Text>
                  {' owes you '}
                  <Text style={styles.amountPositive}>{formatCurrency(balance.amount)}</Text>
                </>
              ) : (
                <>
                  You owe <Text style={styles.userName}>{getUserName(otherUserId)}</Text>
                  {' '}
                  <Text style={styles.amountNegative}>{formatCurrency(balance.amount)}</Text>
                </>
              )}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  balanceRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  balanceText: {
    fontSize: 16,
    color: '#333',
  },
  userName: {
    fontWeight: '600',
  },
  amountPositive: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  amountNegative: {
    color: '#f44336',
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 16,
  },
});

