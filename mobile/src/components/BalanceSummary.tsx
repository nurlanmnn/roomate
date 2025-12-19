import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PairwiseBalance } from '../api/expensesApi';
import { formatCurrency } from '../utils/formatCurrency';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '../theme';

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
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadows.sm as object),
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  balanceRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  balanceText: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  userName: {
    fontWeight: fontWeights.semibold,
  },
  amountPositive: {
    color: colors.success,
    fontWeight: fontWeights.extrabold,
  },
  amountNegative: {
    color: colors.danger,
    fontWeight: fontWeights.extrabold,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
  },
});

