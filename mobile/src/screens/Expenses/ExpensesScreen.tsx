import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  Alert,
  FlatList,
  ActivityIndicator,
  ListRenderItem,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { expensesApi, Expense, PairwiseBalance } from '../../api/expensesApi';

/** Smaller first page = faster initial load; more “load more” as you scroll. */
const EXPENSES_PAGE_SIZE = 5;

type ExpenseListRow =
  | { kind: 'groupHeader'; title: string }
  | { kind: 'expense'; expense: Expense };
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
        listFooter: {
          paddingVertical: spacing.md,
          alignItems: 'center',
        },
        loadMoreButton: {
          alignItems: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          marginBottom: spacing.sm,
        },
        loadMoreText: {
          fontSize: fontSizes.sm,
          fontWeight: fontWeights.semibold,
          color: colors.primary,
        },
      }),
    [colors]
  );
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [balances, setBalances] = useState<PairwiseBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<ExpenseFiltersType>({
    search: '',
    sortBy: 'newest',
    groupBy: 'none',
  });
  const listRef = useRef<FlatList>(null);

  /** Full list is required for search/filters/grouping/non-default sort (client-side). */
  const needsFullExpenseList = useMemo(() => {
    const f = filters;
    return (
      Boolean(f.search?.trim()) ||
      f.dateFrom != null ||
      f.dateTo != null ||
      Boolean(f.category) ||
      Boolean(f.personId) ||
      Boolean(f.amountMin) ||
      Boolean(f.amountMax) ||
      f.groupBy !== 'none' ||
      f.sortBy !== 'newest'
    );
  }, [filters]);

  const hasMorePages = !needsFullExpenseList && expenses.length < totalCount;

  useFocusEffect(
    React.useCallback(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, [])
  );

  const loadData = useCallback(async () => {
    if (!selectedHousehold) return;

    setLoading(true);
    try {
      const expensesPromise = needsFullExpenseList
        ? expensesApi.getExpenses(selectedHousehold._id)
        : expensesApi.getExpenses(selectedHousehold._id, {
            limit: EXPENSES_PAGE_SIZE,
            skip: 0,
          });

      const [expensesRaw, balancesData] = await Promise.all([
        expensesPromise,
        expensesApi.getBalances(selectedHousehold._id),
      ]);

      let nextExpenses: Expense[];
      let nextTotal: number;
      if (Array.isArray(expensesRaw)) {
        nextExpenses = expensesRaw;
        nextTotal = expensesRaw.length;
      } else {
        nextExpenses = expensesRaw.items;
        nextTotal = expensesRaw.total;
      }

      setExpenses(nextExpenses);
      setTotalCount(nextTotal);
      setBalances(balancesData);
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load expenses:', error);
      if (error?.response?.status === 403) {
        setSelectedHousehold(null);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedHousehold, needsFullExpenseList, setSelectedHousehold]);

  const loadMore = useCallback(async () => {
    if (!selectedHousehold || needsFullExpenseList || !hasMorePages || loading || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const raw = await expensesApi.getExpenses(selectedHousehold._id, {
        limit: EXPENSES_PAGE_SIZE,
        skip: expenses.length,
      });
      if (Array.isArray(raw)) return;
      const { items, total } = raw;
      setExpenses((prev) => [...prev, ...items]);
      setTotalCount(total);
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load more expenses:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [
    selectedHousehold,
    needsFullExpenseList,
    hasMorePages,
    loading,
    loadingMore,
    expenses.length,
  ]);

  useEffect(() => {
    if (!selectedHousehold) return;
    loadData();
  }, [selectedHousehold, needsFullExpenseList, loadData]);

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

  const listRows: ExpenseListRow[] = useMemo(() => {
    if (filters.groupBy === 'none') {
      return filteredAndSortedExpenses.map((e) => ({ kind: 'expense' as const, expense: e }));
    }
    const rows: ExpenseListRow[] = [];
    Object.entries(groupedExpenses).forEach(([title, group]) => {
      rows.push({ kind: 'groupHeader', title });
      group.forEach((e) => rows.push({ kind: 'expense', expense: e }));
    });
    return rows;
  }, [filteredAndSortedExpenses, groupedExpenses, filters.groupBy]);

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
        expense={expense}
        onDelete={handleDeleteExpense}
        onQuickSettle={handleQuickSettle}
        canDelete={canDelete}
        canEdit={canEdit}
        onEdit={handleEditExpense}
      />
    );
  };

  const renderItem: ListRenderItem<ExpenseListRow> = ({ item }) => {
    if (item.kind === 'groupHeader') {
      return (
        <View style={{ paddingHorizontal: spacing.xl }}>
          <AppText style={styles.groupTitle}>{item.title}</AppText>
        </View>
      );
    }
    return <View style={{ paddingHorizontal: spacing.xl }}>{renderExpenseCard(item.expense)}</View>;
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
  const paginationHint =
    !needsFullExpenseList && totalCount > 0 && expenses.length < totalCount
      ? String(t('expenses.listPaginationHint', { loaded: expenses.length, total: totalCount }))
      : null;

  const listHeader = (
    <>
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
        {paginationHint ? (
          <AppText style={styles.filteredCount}>{paginationHint}</AppText>
        ) : filteredCount != null ? (
          <AppText style={styles.filteredCount}>
            {filteredCount} / {expenses.length}
          </AppText>
        ) : null}
      </View>

      <SettingsGroupCard style={{ marginHorizontal: spacing.xl, marginBottom: spacing.md }}>
        <ExpenseFilters
          filters={filters}
          onFiltersChange={setFilters}
          memberNames={memberNames}
          embedded
        />
      </SettingsGroupCard>
    </>
  );

  const listEmpty = loading && expenses.length === 0 && (
    <View style={styles.expenseListPad}>
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={i} lines={3} showAvatar={true} />
      ))}
    </View>
  );

  const listEmptyNoData =
    !loading && filteredAndSortedExpenses.length === 0 ? (
      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }}>
        <EmptyState
          icon="receipt-outline"
          title={expenses.length === 0 ? t('expenses.noExpenses') : t('common.noResults')}
          message={
            expenses.length === 0 ? t('expenses.noExpensesDescription') : t('expenses.adjustFiltersHint')
          }
          variant="minimal"
          actionLabel={expenses.length === 0 ? t('expenses.addExpense') : undefined}
          onAction={expenses.length === 0 ? () => navigation.navigate('CreateExpense') : undefined}
        />
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        ref={listRef}
        data={listRows}
        keyExtractor={(item, index) =>
          item.kind === 'groupHeader' ? `h-${item.title}-${index}` : `e-${item.expense._id}`
        }
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <>
            {listEmpty}
            {listEmptyNoData}
          </>
        }
        ListFooterComponent={
          hasMorePages && !needsFullExpenseList ? (
            loadingMore ? (
              <View style={styles.listFooter}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={loadMore}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={t('common.loadMore')}
              >
                <AppText style={styles.loadMoreText}>
                  {t('common.loadMore')} ({expenses.length}/{totalCount})
                </AppText>
              </TouchableOpacity>
            )
          ) : null
        }
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={10}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
};
