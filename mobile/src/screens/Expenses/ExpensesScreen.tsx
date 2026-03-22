import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { expensesApi, Expense, PairwiseBalance } from '../../api/expensesApi';
import { ExpenseCard } from '../../components/ExpenseCard';
import { BalanceSummary } from '../../components/BalanceSummary';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ExpenseFilters, ExpenseFilters as ExpenseFiltersType } from '../../components/ExpenseFilters';
import { EXPENSE_CATEGORIES, getCategoryById, getCategoryByName } from '../../constants/expenseCategories';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows, TAB_BAR_HEIGHT } from '../../theme';
import { SkeletonCard } from '../../components/LoadingSkeleton';
import { AppText } from '../../components/AppText';
import { parseISO } from 'date-fns';
import { SettingsSection } from '../../components/Settings/SettingsSection';
import { SettingsGroupCard } from '../../components/Settings/SettingsGroupCard';
import { SettingsRow } from '../../components/Settings/SettingsRow';
import { EmptyState } from '../../components/ui/EmptyState';

export const ExpensesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold, setSelectedHousehold } = useHousehold();
  const { user } = useAuth();
  const { t } = useLanguage();
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
        scrollContent: {
          paddingBottom: TAB_BAR_HEIGHT + spacing.xl,
        },
        emptyContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.xl,
        },
        emptyText: {
          fontSize: fontSizes.md,
          color: colors.muted,
          textAlign: 'center',
        },
        hintCardInner: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.sm,
          padding: spacing.md,
        },
        hintText: {
          flex: 1,
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          lineHeight: 20,
        },
        filteredCount: {
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          fontWeight: fontWeights.medium,
        },
        listHeaderRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.xl,
          marginBottom: spacing.sm,
          marginTop: spacing.xs,
        },
        listTitle: {
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.semibold,
          color: colors.textTertiary,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        },
        groupSection: {
          marginBottom: spacing.lg,
        },
        groupTitle: {
          fontSize: fontSizes.sm,
          fontWeight: fontWeights.bold,
          color: colors.textSecondary,
          marginBottom: spacing.sm,
          marginTop: spacing.md,
        },
        expenseListPad: {
          paddingHorizontal: spacing.xl,
          gap: 0,
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
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    React.useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, [])
  );

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
      if (__DEV__) console.error('Failed to load expenses:', error);
      if (error?.response?.status === 403) {
        setSelectedHousehold(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId: string): string => {
    if (!selectedHousehold) return 'Unknown';
    const member = selectedHousehold.members.find((m) => m._id === userId);
    return member?.name || 'Unknown';
  };

  const getUserAvatar = (userId: string): string | undefined => {
    if (!selectedHousehold) return undefined;
    return selectedHousehold.members.find((m) => m._id === userId)?.avatarUrl;
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await expensesApi.deleteExpense(expenseId);
      await loadData();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
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
    if (EXPENSE_CATEGORIES.some((c) => c.id === category)) return category;
    return getCategoryByName(category)?.id;
  };

  const getExpenseCategoryName = (category?: string): string | undefined => {
    if (!category) return undefined;
    if (EXPENSE_CATEGORIES.some((c) => c.id === category)) return getCategoryById(category)?.name;
    return category;
  };

  const filteredAndSortedExpenses = useMemo(() => {
    let filtered = [...expenses];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((e) => {
        const description = (e.description || '').toLowerCase();
        const category = (e.category || '').toLowerCase();
        return description.includes(searchLower) || category.includes(searchLower);
      });
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((e) => parseISO(e.date) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((e) => parseISO(e.date) <= toDate);
    }

    if (filters.category) {
      const desiredCategoryId = filters.category;
      filtered = filtered.filter((e) => getExpenseCategoryId(e.category) === desiredCategoryId);
    }

    if (filters.personId) {
      filtered = filtered.filter((e) => {
        const paidById =
          typeof (e as any).paidBy === 'string'
            ? (e as any).paidBy
            : e.paidBy && typeof e.paidBy === 'object'
              ? e.paidBy._id
              : null;
        const isPayer = paidById === filters.personId;
        const isParticipant =
          Array.isArray(e.participants) && e.participants.some((p) => p._id === filters.personId);
        return isPayer || isParticipant;
      });
    }

    if (filters.amountMin) {
      const min = parseFloat(filters.amountMin);
      if (!isNaN(min)) {
        filtered = filtered.filter((e) => e.totalAmount >= min);
      }
    }
    if (filters.amountMax) {
      const max = parseFloat(filters.amountMax);
      if (!isNaN(max)) {
        filtered = filtered.filter((e) => e.totalAmount <= max);
      }
    }

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

  const groupedExpenses = useMemo(() => {
    if (filters.groupBy === 'none') {
      return { All: filteredAndSortedExpenses };
    }

    const groups: Record<string, Expense[]> = {};

    filteredAndSortedExpenses.forEach((expense) => {
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

  const memberNames = selectedHousehold?.members.map((m) => ({ id: m._id, name: m.name })) || [];

  const renderExpenseCard = (expense: Expense) => {
    const creatorId =
      (expense as any).createdBy && typeof (expense as any).createdBy === 'object'
        ? (expense as any).createdBy?._id
        : (expense as any).createdBy;
    const canEdit =
      !!user &&
      ((creatorId && creatorId === user._id) ||
        (!creatorId && (expense as any).paidBy?._id === user._id));
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
  };

  if (!selectedHousehold) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>{t('home.pleaseSelectHousehold')}</AppText>
        </View>
      </SafeAreaView>
    );
  }

  const showCategoryHint = expenses.length > 0 && expenses.some((e) => !e.category);
  const filteredCount =
    filteredAndSortedExpenses.length !== expenses.length ? filteredAndSortedExpenses.length : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title={t('expenses.title')}
          subtitle={selectedHousehold.name}
          rightText={t('expenses.settleUp')}
          onRightPress={() => navigation.navigate('SettleUp')}
        />

        {user && (
          <SettingsSection title={t('expenses.sectionBalances')}>
            <SettingsGroupCard>
              <BalanceSummary
                balances={balances}
                currentUserId={user._id}
                getUserName={getUserName}
                getUserAvatar={getUserAvatar}
                hideTitle
                variant="plain"
              />
            </SettingsGroupCard>
          </SettingsSection>
        )}

        <SettingsSection title={t('expenses.sectionActions')}>
          <SettingsGroupCard>
            <SettingsRow
              icon="add-circle-outline"
              iconBackgroundColor={colors.primaryUltraSoft}
              iconColor={colors.primary}
              title={t('expenses.addExpense')}
              subtitle={t('expenses.addExpenseSubtitle')}
              onPress={() => navigation.navigate('CreateExpense')}
            />
            <SettingsRow
              icon="swap-horizontal-outline"
              iconBackgroundColor={colors.accentUltraSoft}
              iconColor={colors.accent}
              title={t('expenses.settleUp')}
              subtitle={t('expenses.settleUpSubtitle')}
              onPress={() => navigation.navigate('SettleUp')}
              isLast
            />
          </SettingsGroupCard>
        </SettingsSection>

        {showCategoryHint && (
          <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.md }}>
            <SettingsGroupCard>
              <View style={styles.hintCardInner}>
                <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
                <AppText style={styles.hintText}>{t('expenses.categoryHintBanner')}</AppText>
              </View>
            </SettingsGroupCard>
          </View>
        )}

        <View style={styles.listHeaderRow}>
          <AppText style={styles.listTitle}>{t('expenses.sectionList')}</AppText>
          {filteredCount != null && (
            <AppText style={styles.filteredCount}>
              {filteredCount} / {expenses.length}
            </AppText>
          )}
        </View>

        <SettingsGroupCard style={{ marginHorizontal: spacing.xl, marginBottom: spacing.md }}>
          <ExpenseFilters
            filters={filters}
            onFiltersChange={setFilters}
            memberNames={memberNames}
            embedded
          />
        </SettingsGroupCard>

        <View style={styles.expenseListPad}>
          {loading && expenses.length === 0 ? (
            <>
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} lines={3} showAvatar={true} />
              ))}
            </>
          ) : filteredAndSortedExpenses.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title={expenses.length === 0 ? t('expenses.noExpenses') : t('common.noResults')}
              message={
                expenses.length === 0
                  ? t('expenses.noExpensesDescription')
                  : t('expenses.adjustFiltersHint')
              }
              variant="minimal"
              actionLabel={expenses.length === 0 ? t('expenses.addExpense') : undefined}
              onAction={expenses.length === 0 ? () => navigation.navigate('CreateExpense') : undefined}
            />
          ) : filters.groupBy === 'none' ? (
            filteredAndSortedExpenses.map((e) => renderExpenseCard(e))
          ) : (
            Object.entries(groupedExpenses).map(([groupKey, groupExpenses]) => (
              <View key={groupKey} style={styles.groupSection}>
                <AppText style={styles.groupTitle}>{groupKey}</AppText>
                {groupExpenses.map((e) => renderExpenseCard(e))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
