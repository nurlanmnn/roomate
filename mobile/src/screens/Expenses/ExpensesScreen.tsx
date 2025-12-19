import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { expensesApi, Expense, PairwiseBalance } from '../../api/expensesApi';
import { ExpenseCard } from '../../components/ExpenseCard';
import { BalanceSummary } from '../../components/BalanceSummary';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { colors, fontSizes, fontWeights, spacing } from '../../theme';

export const ExpensesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<PairwiseBalance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedHousehold) {
      loadData();
    }
  }, [selectedHousehold]);

  const loadData = async () => {
    if (!selectedHousehold) return;

    setLoading(true);
    try {
      const [expensesData, balancesData] = await Promise.all([
        expensesApi.getExpenses(selectedHousehold._id),
        expensesApi.getBalances(selectedHousehold._id),
      ]);
      setExpenses(expensesData);
      setBalances(balancesData);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId: string): string => {
    if (!selectedHousehold) return 'Unknown';
    const member = selectedHousehold.members.find(m => m._id === userId);
    return member?.name || 'Unknown';
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await expensesApi.deleteExpense(expenseId);
      // Reload expenses and balances after deletion
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete expense');
    }
  };

  if (!selectedHousehold) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please select a household</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      >
      <ScreenHeader title="Expenses" subtitle={selectedHousehold.name} />

      {user && (
        <View style={styles.section}>
          <BalanceSummary
            balances={balances}
            currentUserId={user._id}
            getUserName={getUserName}
          />
        </View>
      )}

      <View style={styles.actions}>
        <PrimaryButton
          title="+ Add Expense"
          onPress={() => navigation.navigate('CreateExpense')}
        />
        <View style={styles.spacer} />
        <PrimaryButton
          variant="secondary"
          title="Settle Up"
          onPress={() => navigation.navigate('SettleUp')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Expenses</Text>
        {expenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses yet</Text>
        ) : (
          expenses.map((expense) => (
            <ExpenseCard
              key={expense._id}
              expense={expense}
              onDelete={handleDeleteExpense}
              canDelete={true}
            />
          ))
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.md,
    color: colors.text,
  },
  actions: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  spacer: {
    height: spacing.sm,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.muted,
    textAlign: 'center',
    padding: spacing.xxl,
  },
});