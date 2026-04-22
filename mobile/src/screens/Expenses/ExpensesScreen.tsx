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
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
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
import { getCached, dedupedFetch, invalidateCache, subscribe as subscribeCache } from '../../utils/queryCache';

type ExpensesSnapshot = {
  expenses: Expense[];
  total: number;
  balances: PairwiseBalance[];
  mode: boolean; // true === full list, false === paginated first page
};

const expensesKey = (householdId: string, fullMode: boolean) =>
  `expenses:${householdId}:${fullMode ? 'full' : 'page0'}`;

/** All cache keys that depend on household expenses — used on mutations. */
const expensesInvalidatePrefix = (householdId: string) => `expenses:${householdId}`;

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
          backgroundColor: 'transparent',
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
  /**
   * Client-side cap when filters/search/sort/group are active. We fetch the
   * full list from the server so the filter searches everything, but only
   * render this many matches at a time — tapping "Load more" reveals the next
   * page of matches.
   */
  const [filteredVisibleCount, setFilteredVisibleCount] = useState(EXPENSES_PAGE_SIZE);
  const listRef = useRef<FlatList>(null);
  /** Mirror of expenses/totalCount so the delete handler can roll back without
   *  taking `expenses` as a dep (which would re-render every memoized row). */
  const expensesRef = useRef<Expense[]>([]);
  const totalCountRef = useRef(0);
  /** Latest `loadData` — lets the focus effect call it without adding it as a
   *  dep and re-subscribing on every render. */
  const loadDataRef = useRef<(() => void) | undefined>(undefined);
  /**
   * Tracks which fetch mode the currently-loaded `expenses` represents so we
   * can show a loading skeleton the moment the mode flips (instead of briefly
   * filtering stale, paginated rows while the full fetch is in flight).
   */
  const lastLoadedModeRef = useRef<boolean | null>(null);
  /**
   * Request-id guard — every `loadData` call bumps this counter and only the
   * newest response is allowed to write to state, so a slow in-flight
   * paginated response can't overwrite a fresh full-list one.
   */
  const loadRequestIdRef = useRef(0);

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

  /** On focus, kick a background revalidation. When the cache is warm the
   *  UI doesn't flinch; when a CreateExpense save invalidated it, we fetch
   *  fresh data automatically instead of making the user pull-to-refresh. */
  useFocusEffect(
    React.useCallback(() => {
      if (selectedHousehold) loadDataRef.current?.();
    }, [selectedHousehold?._id]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  const loadData = useCallback(async () => {
    if (!selectedHousehold) return;

    const requestId = ++loadRequestIdRef.current;
    const fetchMode = needsFullExpenseList;
    const key = expensesKey(selectedHousehold._id, fetchMode);

    // Mode flipped (paginated ↔ full) → try the cache for the new mode first
    // so we paint the list instantly instead of a blank skeleton flash.
    if (lastLoadedModeRef.current !== null && lastLoadedModeRef.current !== fetchMode) {
      const cached = getCached<ExpensesSnapshot>(key);
      if (cached) {
        setExpenses(cached.expenses);
        setTotalCount(cached.total);
        setBalances(cached.balances);
      } else {
        setExpenses([]);
        setTotalCount(0);
      }
    }

    setLoading(true);
    try {
      const snapshot = await dedupedFetch<ExpensesSnapshot>(key, async () => {
        const expensesPromise = fetchMode
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
        return {
          expenses: nextExpenses,
          total: nextTotal,
          balances: balancesData,
          mode: fetchMode,
        };
      });

      // Ignore any response that's been superseded by a newer load.
      if (requestId !== loadRequestIdRef.current) return;

      setExpenses(snapshot.expenses);
      setTotalCount(snapshot.total);
      setBalances(snapshot.balances);
      expensesRef.current = snapshot.expenses;
      totalCountRef.current = snapshot.total;
      lastLoadedModeRef.current = fetchMode;
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load expenses:', error);
      if (requestId !== loadRequestIdRef.current) return;
      if (error?.response?.status === 403) {
        setSelectedHousehold(null);
      }
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
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
      setExpenses((prev) => {
        const next = [...prev, ...items];
        expensesRef.current = next;
        return next;
      });
      setTotalCount(total);
      totalCountRef.current = total;
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
    loadDataRef.current = loadData;
  }, [loadData]);

  useEffect(() => {
    if (!selectedHousehold) return;
    loadData();
  }, [selectedHousehold, needsFullExpenseList, loadData]);

  /**
   * Keep the list in sync with the shared query cache. Other screens (the
   * Create/Edit expense screen, specifically) patch the cached snapshot the
   * moment their API call returns — subscribing here makes that patch visible
   * instantly when the user navigates back, without waiting for the focus
   * refetch to round-trip. We intentionally don't pull balances from the
   * patched snapshot (they need server recomputation); the focus-refetch
   * reconciles them shortly after.
   */
  useEffect(() => {
    if (!selectedHousehold) return;
    const key = expensesKey(selectedHousehold._id, needsFullExpenseList);
    const sync = () => {
      const snapshot = getCached<ExpensesSnapshot>(key);
      if (!snapshot) return;
      setExpenses(snapshot.expenses);
      setTotalCount(snapshot.total);
      expensesRef.current = snapshot.expenses;
      totalCountRef.current = snapshot.total;
    };
    return subscribeCache(key, sync);
  }, [selectedHousehold?._id, needsFullExpenseList]);

  // Any filter / sort / group change → restart the client-side pager and scroll
  // the list back to the top so the user sees the first page of matches.
  useEffect(() => {
    setFilteredVisibleCount(EXPENSES_PAGE_SIZE);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [filters]);

  const getUserName = (userId: string): string => {
    if (!selectedHousehold) return 'Unknown';
    const member = selectedHousehold.members.find((m) => m._id === userId);
    return member?.name || 'Unknown';
  };

  const getUserAvatar = (userId: string): string | undefined => {
    if (!selectedHousehold) return undefined;
    return selectedHousehold.members.find((m) => m._id === userId)?.avatarUrl;
  };

  // Stable handler references are important — they're passed into the
  // memoized ExpenseCard; a new identity on every render would defeat the memo
  // and re-render every row on each filter keystroke.
  const handleDeleteExpense = useCallback(
    async (expenseId: string) => {
      if (!selectedHousehold) return;

      // Snapshot state via refs — using `expenses`/`totalCount` as deps would
      // change this callback's identity on every list update and defeat
      // React.memo on each ExpenseCard row.
      const prevExpenses = expensesRef.current;
      const prevTotal = totalCountRef.current;

      const nextExpenses = prevExpenses.filter((e) => e._id !== expenseId);
      expensesRef.current = nextExpenses;
      totalCountRef.current = Math.max(0, prevTotal - 1);
      setExpenses(nextExpenses);
      setTotalCount(totalCountRef.current);

      try {
        await expensesApi.deleteExpense(expenseId);
        // Balances + home summary depend on this expense — drop any cached
        // snapshots so the next read refetches. loadData() kicks off a fresh
        // fetch in the background; the UI is already correct thanks to the
        // optimistic removal above.
        invalidateCache(expensesInvalidatePrefix(selectedHousehold._id));
        invalidateCache(`home:dashboard:${selectedHousehold._id}`);
        loadData();
      } catch (error: any) {
        // Roll back.
        expensesRef.current = prevExpenses;
        totalCountRef.current = prevTotal;
        setExpenses(prevExpenses);
        setTotalCount(prevTotal);
        Alert.alert(
          t('common.error'),
          error.response?.data?.error || t('alerts.somethingWentWrong')
        );
      }
    },
    [selectedHousehold, loadData, t]
  );

  const handleEditExpense = useCallback(
    (expense: Expense) => {
      navigation.navigate('CreateExpense', { expense, mode: 'edit' });
    },
    [navigation]
  );

  const handleQuickSettle = useCallback(() => {
    navigation.navigate('SettleUp');
  }, [navigation]);

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

  /**
   * When filtering/sorting/grouping is active we fetch the full list and then
   * only render `filteredVisibleCount` matches at a time. This keeps the
   * screen fast and matches the "5 at a time" behaviour of the default view.
   */
  const displayedFilteredExpenses = useMemo(() => {
    if (!needsFullExpenseList) return filteredAndSortedExpenses;
    return filteredAndSortedExpenses.slice(0, filteredVisibleCount);
  }, [filteredAndSortedExpenses, needsFullExpenseList, filteredVisibleCount]);

  const groupedExpenses = useMemo(() => {
    if (filters.groupBy === 'none') {
      return { All: displayedFilteredExpenses };
    }

    const groups: Record<string, Expense[]> = {};

    displayedFilteredExpenses.forEach((expense) => {
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
  }, [displayedFilteredExpenses, filters.groupBy]);

  const listRows: ExpenseListRow[] = useMemo(() => {
    if (filters.groupBy === 'none') {
      return displayedFilteredExpenses.map((e) => ({ kind: 'expense' as const, expense: e }));
    }
    const rows: ExpenseListRow[] = [];
    Object.entries(groupedExpenses).forEach(([title, group]) => {
      rows.push({ kind: 'groupHeader', title });
      group.forEach((e) => rows.push({ kind: 'expense', expense: e }));
    });
    return rows;
  }, [displayedFilteredExpenses, groupedExpenses, filters.groupBy]);

  const memberNames = selectedHousehold?.members.map((m) => ({ id: m._id, name: m.name })) || [];

  const currentUserId = user?._id;

  const renderItem: ListRenderItem<ExpenseListRow> = useCallback(
    ({ item }) => {
      if (item.kind === 'groupHeader') {
        return (
          <View style={{ paddingHorizontal: spacing.xl }}>
            <AppText style={styles.groupTitle}>{item.title}</AppText>
          </View>
        );
      }
      const expense = item.expense;
      const creatorId =
        (expense as any).createdBy && typeof (expense as any).createdBy === 'object'
          ? (expense as any).createdBy?._id
          : (expense as any).createdBy;
      const canEdit =
        !!currentUserId &&
        ((creatorId && creatorId === currentUserId) ||
          (!creatorId && (expense as any).paidBy?._id === currentUserId));
      return (
        <View style={{ paddingHorizontal: spacing.xl }}>
          <ExpenseCard
            expense={expense}
            onDelete={handleDeleteExpense}
            onQuickSettle={handleQuickSettle}
            canDelete={canEdit}
            canEdit={canEdit}
            onEdit={handleEditExpense}
          />
        </View>
      );
    },
    [
      currentUserId,
      handleDeleteExpense,
      handleQuickSettle,
      handleEditExpense,
      styles.groupTitle,
    ]
  );

  if (!selectedHousehold) {
    return (
      <SanctuaryScreenShell edges={['top', 'bottom']} innerStyle={styles.container}>
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>{t('home.pleaseSelectHousehold')}</AppText>
        </View>
      </SanctuaryScreenShell>
    );
  }

  const showCategoryHint = expenses.length > 0 && expenses.some((e) => !e.category);
  const hasMoreFilteredMatches =
    needsFullExpenseList && filteredAndSortedExpenses.length > displayedFilteredExpenses.length;
  /**
   * Header count — when the user isn't filtering, we show the
   * "loaded / total" server-pagination hint; when they are filtering, we show
   * "visible / total matches" so they can tell whether Load more will reveal
   * additional results.
   */
  const paginationHint = needsFullExpenseList
    ? filteredAndSortedExpenses.length > 0
      ? `${displayedFilteredExpenses.length} / ${filteredAndSortedExpenses.length}`
      : null
    : totalCount > 0 && expenses.length < totalCount
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

  const hasAnyExpenses = needsFullExpenseList ? expenses.length > 0 : totalCount > 0;
  const listEmptyNoData =
    !loading && filteredAndSortedExpenses.length === 0 ? (
      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }}>
        <EmptyState
          icon="receipt-outline"
          title={hasAnyExpenses ? t('common.noResults') : t('expenses.noExpenses')}
          message={
            hasAnyExpenses ? t('expenses.adjustFiltersHint') : t('expenses.noExpensesDescription')
          }
          variant="minimal"
          actionLabel={hasAnyExpenses ? undefined : t('expenses.addExpense')}
          onAction={hasAnyExpenses ? undefined : () => navigation.navigate('CreateExpense')}
        />
      </View>
    ) : null;

  return (
    <SanctuaryScreenShell edges={['top']} innerStyle={styles.container}>
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
          ) : hasMoreFilteredMatches ? (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={() =>
                setFilteredVisibleCount((c) => c + EXPENSES_PAGE_SIZE)
              }
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t('common.loadMore')}
            >
              <AppText style={styles.loadMoreText}>
                {t('common.loadMore')} ({displayedFilteredExpenses.length}/
                {filteredAndSortedExpenses.length})
              </AppText>
            </TouchableOpacity>
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
    </SanctuaryScreenShell>
  );
};
