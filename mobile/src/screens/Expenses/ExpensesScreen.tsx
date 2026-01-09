import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { expensesApi, Expense, PairwiseBalance } from '../../api/expensesApi';
import { ExpenseCard } from '../../components/ExpenseCard';
import { BalanceSummary } from '../../components/BalanceSummary';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ExpenseFilters, ExpenseFilters as ExpenseFiltersType, SortOption, GroupByOption } from '../../components/ExpenseFilters';
import { EXPENSE_CATEGORIES, getCategoryById, getCategoryByName } from '../../constants/expenseCategories';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows, TAB_BAR_HEIGHT } from '../../theme';
import { LoadingSkeleton, SkeletonCard } from '../../components/LoadingSkeleton';
import { AppText } from '../../components/AppText';
import { parseISO } from 'date-fns';

export const ExpensesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold, setSelectedHousehold } = useHousehold();
  const { user } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        infoBanner: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          backgroundColor: colors.primarySoft,
          marginHorizontal: spacing.md,
          marginBottom: spacing.md,
          padding: spacing.md,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.primary,
          gap: spacing.sm,
        },
        infoText: {
          flex: 1,
          fontSize: fontSizes.sm,
          color: colors.text,
          lineHeight: 20,
        },
        filteredCount: {
          fontSize: fontSizes.md,
          color: colors.textSecondary,
          fontWeight: fontWeights.normal,
        },
        groupSection: {
          marginBottom: spacing.lg,
        },
        groupTitle: {
          fontSize: fontSizes.lg,
          fontWeight: fontWeights.bold,
          color: colors.text,
          marginBottom: spacing.md,
          marginTop: spacing.sm,
        },
      }),
    [colors]
  );
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<PairwiseBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ExpenseFiltersType>({
    search: '',
    sortBy: 'newest',
    groupBy: 'none',
  });

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
    } catch (error: any) {
      console.error('Failed to load expenses:', error);
      if (error?.response?.status === 403) {
        setSelectedHousehold(null);
      }
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

  const handleEditExpense = (expense: Expense) => {
    navigation.navigate('CreateExpense', { expense, mode: 'edit' });
  };

  const handleQuickSettle = () => {
    navigation.navigate('SettleUp');
  };

  const getExpenseCategoryId = (category?: string): string | undefined => {
    if (!category) return undefined;
    // Some legacy data might store category as the category id (e.g. 'groceries')
    if (EXPENSE_CATEGORIES.some((c) => c.id === category)) return category;
    // Newer data stores category as the category name (e.g. 'Groceries')
    return getCategoryByName(category)?.id;
  };

  const getExpenseCategoryName = (category?: string): string | undefined => {
    if (!category) return undefined;
    if (EXPENSE_CATEGORIES.some((c) => c.id === category)) return getCategoryById(category)?.name;
    return category;
  };

  // Filter and sort expenses
  const filteredAndSortedExpenses = useMemo(() => {
    let filtered = [...expenses];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((e) => {
        const description = (e.description || '').toLowerCase();
        const category = (e.category || '').toLowerCase();
        return description.includes(searchLower) || category.includes(searchLower);
      });
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(e => parseISO(e.date) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => parseISO(e.date) <= toDate);
    }

    // Category filter
    if (filters.category) {
      const desiredCategoryId = filters.category;
      filtered = filtered.filter((e) => getExpenseCategoryId(e.category) === desiredCategoryId);
    }

    // Person filter
    if (filters.personId) {
      filtered = filtered.filter((e) => {
        const paidById =
          typeof (e as any).paidBy === 'string'
            ? (e as any).paidBy
            : e.paidBy && typeof e.paidBy === 'object'
              ? e.paidBy._id
              : null;

        // Users typically expect this filter to mean "involves this person"
        const isPayer = paidById === filters.personId;
        const isParticipant = Array.isArray(e.participants) && e.participants.some((p) => p._id === filters.personId);
        return isPayer || isParticipant;
      });
    }

    // Amount range filter
    if (filters.amountMin) {
      const min = parseFloat(filters.amountMin);
      if (!isNaN(min)) {
        filtered = filtered.filter(e => e.totalAmount >= min);
      }
    }
    if (filters.amountMax) {
      const max = parseFloat(filters.amountMax);
      if (!isNaN(max)) {
        filtered = filtered.filter(e => e.totalAmount <= max);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'oldest':
          return parseISO(a.date).getTime() - parseISO(b.date).getTime();
        case 'amount':
          return b.totalAmount - a.totalAmount;
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'newest':
        default:
          return parseISO(b.date).getTime() - parseISO(a.date).getTime();
      }
    });

    return filtered;
  }, [expenses, filters]);

  // Group expenses
  const groupedExpenses = useMemo(() => {
    if (filters.groupBy === 'none') {
      return { 'All': filteredAndSortedExpenses };
    }

    const groups: Record<string, Expense[]> = {};

    filteredAndSortedExpenses.forEach(expense => {
      let key = 'Other';
      
      if (filters.groupBy === 'date') {
        const date = parseISO(expense.date);
        key = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      } else if (filters.groupBy === 'category') {
        key = getExpenseCategoryName(expense.category) || 'Uncategorized';
      } else if (filters.groupBy === 'person') {
        const paidById =
          typeof expense.paidBy === 'string'
            ? expense.paidBy
            : expense.paidBy && typeof expense.paidBy === 'object'
              ? expense.paidBy._id
              : '';
        key = getUserName(paidById);
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(expense);
    });

    return groups;
  }, [filteredAndSortedExpenses, filters.groupBy]);

  const memberNames = selectedHousehold?.members.map(m => ({ id: m._id, name: m.name })) || [];

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
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + spacing.xl }}
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

      {/* Category reminder message */}
      {expenses.length > 0 && expenses.some(e => !e.category) && (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            For better insights into your spending trends, consider adding categories to your expenses when creating them.
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: spacing.sm }]}>
          {filters.groupBy === 'none' ? 'Recent Expenses' : 'Expenses'}
          {filteredAndSortedExpenses.length !== expenses.length && (
            <Text style={styles.filteredCount}> ({filteredAndSortedExpenses.length})</Text>
          )}
        </Text>

        {/* Filters are for expenses, so keep them right above the expense list */}
        <View style={{ marginHorizontal: -spacing.md, marginBottom: spacing.sm }}>
          <ExpenseFilters
            filters={filters}
            onFiltersChange={setFilters}
            memberNames={memberNames}
          />
        </View>

        {loading && expenses.length === 0 ? (
          <>
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} lines={3} showAvatar={true} />
            ))}
          </>
        ) : filteredAndSortedExpenses.length === 0 ? (
          <Text style={styles.emptyText}>
            {expenses.length === 0 ? 'No expenses yet' : 'No expenses match your filters'}
          </Text>
        ) : filters.groupBy === 'none' ? (
          filteredAndSortedExpenses.map((expense) => (
            (() => {
              const creatorId =
                (expense as any).createdBy && typeof (expense as any).createdBy === 'object'
                  ? (expense as any).createdBy?._id
                  : (expense as any).createdBy;
              const canEdit =
                !!user &&
                ((creatorId && creatorId === user._id) ||
                  (!creatorId && (expense as any).paidBy?._id === user._id)); // legacy fallback
              const canDelete = canEdit;

              return (
            <ExpenseCard
              key={expense._id}
              expense={expense}
              onDelete={handleDeleteExpense}
              onQuickSettle={handleQuickSettle}
              canDelete={canDelete}
              canEdit={canEdit}
              onEdit={handleEditExpense}
            />
              );
            })()
          ))
        ) : (
          Object.entries(groupedExpenses).map(([groupKey, groupExpenses]) => (
            <View key={groupKey} style={styles.groupSection}>
              <AppText style={styles.groupTitle}>{groupKey}</AppText>
              {groupExpenses.map((expense) => (
                (() => {
                  const creatorId =
                    (expense as any).createdBy && typeof (expense as any).createdBy === 'object'
                      ? (expense as any).createdBy?._id
                      : (expense as any).createdBy;
                  const canEdit =
                    !!user &&
                    ((creatorId && creatorId === user._id) ||
                      (!creatorId && (expense as any).paidBy?._id === user._id)); // legacy fallback
                  const canDelete = canEdit;

                  return (
                <ExpenseCard
                  key={expense._id}
                  expense={expense}
                  onDelete={handleDeleteExpense}
                  onQuickSettle={handleQuickSettle}
                  canDelete={canDelete}
                  canEdit={canEdit}
                  onEdit={handleEditExpense}
                />
                  );
                })()
              ))}
            </View>
          ))
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};