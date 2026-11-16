import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Expense } from '../../api/expensesApi';
import { Settlement } from '../../api/settlementsApi';
import { AppText } from '../../components/AppText';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { Amount } from '../../components/ui/Amount';
import { EmptyState } from '../../components/ui/EmptyState';
import { Group, GroupRow, SectionHeading } from '../../components/ui/Group';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage } from '../../context/LanguageContext';
import { fontSizes, fontWeights, spacing, useThemeColors } from '../../theme';
import {
  balanceHistoryExpensesKey,
  balanceHistorySettlementsKey,
  revalidateBalanceHistoryData,
  type BalanceHistoryExpensesSnapshot,
  type SettlementsAllSnapshot,
} from '../../utils/balanceHistoryDataCache';
import { formatDate } from '../../utils/dateHelpers';
import { getDateFnsLocale } from '../../utils/dateLocales';
import { formatCurrency } from '../../utils/formatCurrency';
import { getCached } from '../../utils/queryCache';
import { useHouseholdCurrency } from '../../utils/useHouseholdCurrency';

type BalanceHistoryEntry = {
  id: string;
  kind: 'expense' | 'settlement';
  date: string;
  title: string;
  subtitle: string;
  /** Net “balance favor” shown on the right (same sign convention as before). */
  delta: number;
  /** Per-event change: you owe others more (+) or less (−). */
  debtDelta: number;
  /** Per-event change: others owe you more (+) or less (−). */
  loanDelta: number;
  /** Running totals after this row using pairwise net balances. */
  runningOwe: number;
  runningOwed: number;
};

const toUserId = (user: { _id: string; } | string | null | undefined): string | null =>
  typeof user === 'string' ? user : user?._id ?? null;

const BALANCE_HISTORY_PAGE_SIZE = 5;

export const BalanceHistoryScreen: React.FC = () => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const colors = useThemeColors();
  const currency = useHouseholdCurrency();
  const dateLocale = useMemo(() => getDateFnsLocale(language), [language]);
  const relativeDayLabels = useMemo(
    () => ({
      today: t('time.today'),
      yesterday: t('time.yesterday'),
      tomorrow: t('time.tomorrow'),
    }),
    [t]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        scrollView: { flex: 1 },
        scrollContent: { flexGrow: 1, paddingBottom: spacing.xxl },
        introHintText: {
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          lineHeight: 20,
        },
        chipLabel: {
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.semibold,
          color: colors.textTertiary,
        },
        date: {
          fontSize: fontSizes.xs,
          color: colors.textTertiary,
        },
        // Match ExpensesScreen activity list — text-only control, no bordered box.
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

  const [allEntries, setAllEntries] = useState<BalanceHistoryEntry[]>([]);
  const [visibleCount, setVisibleCount] = useState(BALANCE_HISTORY_PAGE_SIZE);
  /** True until we have something to show (from cache or network). */
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadRequestIdRef = useRef(0);

  const displayedEntries = useMemo(
    () => allEntries.slice(0, visibleCount),
    [allEntries, visibleCount]
  );
  const hasMore = allEntries.length > visibleCount;

  useEffect(() => {
    setAllEntries([]);
    setVisibleCount(BALANCE_HISTORY_PAGE_SIZE);
    setInitialLoading(true);
    setLoadError(false);
  }, [selectedHousehold?._id]);

  const mergeToEntries = useCallback(
    (
      expenses: Expense[],
      settlements: Settlement[],
      userId: string,
      members: NonNullable<typeof selectedHousehold>['members']
    ) => {
      const expenseEntries: BalanceHistoryEntry[] = expenses
        .map((expense): BalanceHistoryEntry | null => {
          const payerId = toUserId(expense.paidBy);
          const userShare =
            expense.shares.find((share) => toUserId(share.userId as { _id: string; } | string) === userId)
              ?.amount ?? 0;
          let delta = 0;
          let debtDelta = 0;
          let loanDelta = 0;
          if (payerId === userId) {
            const covered = expense.totalAmount - userShare;
            delta = covered;
            loanDelta = covered;
          } else if (userShare > 0) {
            delta = -userShare;
            debtDelta = userShare;
          }
          if (Math.abs(delta) < 0.001) return null;
          return {
            id: `exp-${expense._id}`,
            kind: 'expense',
            date: expense.date || expense.createdAt,
            title: expense.description,
            subtitle:
              delta > 0
                ? t('expenses.balanceHistoryYouCovered', { amount: formatCurrency(delta, currency) })
                : t('expenses.balanceHistoryYourShare', {
                  amount: formatCurrency(Math.abs(delta), currency),
                }),
            delta,
            debtDelta,
            loanDelta,
            runningOwe: 0,
            runningOwed: 0,
          };
        })
        .filter((entry): entry is BalanceHistoryEntry => entry !== null);

      const settlementEntries: BalanceHistoryEntry[] = settlements
        .map((settlement): BalanceHistoryEntry | null => {
          const fromId = toUserId(settlement.fromUserId);
          const toId = toUserId(settlement.toUserId);
          let delta = 0;
          let debtDelta = 0;
          let loanDelta = 0;
          if (fromId === userId) {
            delta = -settlement.amount;
            debtDelta = -settlement.amount;
          }
          if (toId === userId) {
            delta = settlement.amount;
            loanDelta = -settlement.amount;
          }
          if (Math.abs(delta) < 0.001) return null;

          const otherUserId = fromId === userId ? toId : fromId;
          const otherName =
            members.find((member) => member._id === otherUserId)?.name || t('common.someone');
          return {
            id: `set-${settlement._id}`,
            kind: 'settlement',
            date: settlement.date || settlement.createdAt,
            title: t('expenses.balanceHistoryWithUser', { name: otherName }),
            subtitle:
              delta > 0
                ? t('expenses.balanceHistoryYouReceived', {
                  amount: formatCurrency(delta, currency),
                })
                : t('expenses.balanceHistoryYouPaid', {
                  amount: formatCurrency(Math.abs(delta), currency),
                }),
            delta,
            debtDelta,
            loanDelta,
            runningOwe: 0,
            runningOwed: 0,
          };
        })
        .filter((entry): entry is BalanceHistoryEntry => entry !== null);
      const merged = [...expenseEntries, ...settlementEntries].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const expenseByEntryId = new Map(expenses.map((e) => [`exp-${e._id}`, e]));
      const settlementByEntryId = new Map(settlements.map((s) => [`set-${s._id}`, s]));

      // Pairwise running ledger (same model as /balances summary):
      // +value => that user owes you, -value => you owe that user.
      const pairwise = new Map<string, number>();
      for (const entry of merged) {
        if (entry.kind === 'expense') {
          const exp = expenseByEntryId.get(entry.id);
          if (exp) {
            const payerId = toUserId(exp.paidBy);
            if (payerId === userId) {
              for (const share of exp.shares) {
                const shareUserId = toUserId(share.userId as { _id: string; } | string);
                if (!shareUserId || shareUserId === userId || share.amount <= 0) continue;
                const prev = pairwise.get(shareUserId) ?? 0;
                pairwise.set(shareUserId, prev + share.amount);
              }
            } else if (payerId) {
              const myShare =
                exp.shares.find((s) => toUserId(s.userId as { _id: string; } | string) === userId)?.amount ?? 0;
              if (myShare > 0) {
                const prev = pairwise.get(payerId) ?? 0;
                pairwise.set(payerId, prev - myShare);
              }
            }
          }
        } else {
          const set = settlementByEntryId.get(entry.id);
          if (set) {
            const fromId = toUserId(set.fromUserId);
            const toId = toUserId(set.toUserId);
            if (fromId === userId && toId) {
              // You paid someone: reduce what you owe them (or increase they owe you).
              const prev = pairwise.get(toId) ?? 0;
              pairwise.set(toId, prev + set.amount);
            } else if (toId === userId && fromId) {
              // You received payment: reduce what they owe you.
              const prev = pairwise.get(fromId) ?? 0;
              pairwise.set(fromId, prev - set.amount);
            }
          }
        }

        let runningOwe = 0;
        let runningOwed = 0;
        pairwise.forEach((v) => {
          if (v > 0) runningOwed += v;
          if (v < 0) runningOwe += -v;
        });
        entry.runningOwe = runningOwe;
        entry.runningOwed = runningOwed;
      }

      return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    [t, currency]
  );

  const loadHistory = useCallback(
    async (fromPullRefresh = false) => {
      if (!selectedHousehold?._id || !user?._id) {
        setInitialLoading(false);
        return;
      }
      const requestId = ++loadRequestIdRef.current;
      const hid = selectedHousehold._id;
      const userId = user._id;
      const members = selectedHousehold.members;
      const expKey = balanceHistoryExpensesKey(hid);
      const setKey = balanceHistorySettlementsKey(hid);

      const cachedExp = getCached<BalanceHistoryExpensesSnapshot>(expKey);
      const cachedSet = getCached<SettlementsAllSnapshot>(setKey);
      const canPaintStale = Boolean(cachedExp?.expenses && cachedSet?.settlements);

      if (fromPullRefresh) {
        setRefreshing(true);
      } else if (canPaintStale) {
        setAllEntries(mergeToEntries(cachedExp!.expenses, cachedSet!.settlements, userId, members));
        setVisibleCount(BALANCE_HISTORY_PAGE_SIZE);
        setInitialLoading(false);
      } else {
        setInitialLoading(true);
      }
      setLoadError(false);

      try {
        const [expSnap, setSnap] = await revalidateBalanceHistoryData(hid, (expenses, settlements) => {
          if (requestId !== loadRequestIdRef.current) return;
          setAllEntries(mergeToEntries(expenses, settlements, userId, members));
          setVisibleCount(BALANCE_HISTORY_PAGE_SIZE);
          setInitialLoading(false);
        });
        if (requestId !== loadRequestIdRef.current) return;
        setAllEntries(mergeToEntries(expSnap.expenses, setSnap.settlements, userId, members));
        setVisibleCount(BALANCE_HISTORY_PAGE_SIZE);
      } catch (error) {
        if (requestId !== loadRequestIdRef.current) return;
        if (__DEV__) console.error('Failed to load balance history', error);
        setLoadError(true);
        if (!canPaintStale) {
          setAllEntries([]);
        }
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setInitialLoading(false);
          if (fromPullRefresh) {
            setRefreshing(false);
          }
        }
      }
    },
    [mergeToEntries, selectedHousehold?._id, selectedHousehold?.members, user?._id]
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (!selectedHousehold || !user) {
    return (
      <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
          <AppText>{t('alerts.selectHousehold')}</AppText>
        </View>
      </SanctuaryScreenShell>
    );
  }

  return (
    <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadHistory(true)} />
        }
      >
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <AppText style={styles.introHintText}>{t('expenses.balanceHistorySubtitle')}</AppText>
        </View>

        {!initialLoading && loadError && allEntries.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
            <EmptyState
              icon="cloud-offline-outline"
              title={t('common.error')}
              message={t('expenses.balanceHistoryLoadError')}
              variant="minimal"
            />
          </View>
        ) : !initialLoading && allEntries.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
            <EmptyState
              icon="swap-horizontal-outline"
              title={t('expenses.balanceHistoryNoData')}
              message={t('expenses.balanceHistoryNoDataDescription')}
              variant="minimal"
            />
          </View>
        ) : (
          <>
            <SectionHeading title={t('expenses.sectionList')} />
            {initialLoading && displayedEntries.length === 0 ? (
              <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : null}
            <Group>
              {displayedEntries.map(entry => (
                <View key={entry.id}>
                  <GroupRow
                    title={entry.title}
                    titleLines={0}
                    subtitle={entry.subtitle}
                    icon={entry.kind === 'expense' ? 'receipt-outline' : 'swap-horizontal-outline'}
                    trailing={<Amount value={entry.delta} direction={entry.delta >= 0 ? 'owed' : 'owe'} currency={currency} size={22} fit />}
                  />
                  <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
                      <View style={{ flexGrow: 1, gap: spacing.xxs }}>
                        <AppText style={styles.chipLabel}>{t('expenses.balanceHistoryOweShort')}</AppText>
                        {Math.abs(entry.runningOwe) < 0.005 ? <AppText style={{ color: colors.textTertiary }}>—</AppText> : <Amount value={entry.runningOwe} direction="owe" currency={currency} size={20} fit />}
                      </View>
                      <View style={{ flexGrow: 1, gap: spacing.xxs }}>
                        <AppText style={styles.chipLabel}>{t('expenses.balanceHistoryOwedShort')}</AppText>
                        {Math.abs(entry.runningOwed) < 0.005 ? <AppText style={{ color: colors.textTertiary }}>—</AppText> : <Amount value={entry.runningOwed} direction="owed" currency={currency} size={20} fit />}
                      </View>
                    </View>
                    <AppText style={styles.date}>{formatDate(entry.date, dateLocale, relativeDayLabels)}</AppText>
                  </View>
                </View>
              ))}
            </Group>
            {hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => setVisibleCount((c) => c + BALANCE_HISTORY_PAGE_SIZE)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={t('common.loadMore')}
              >
                <AppText style={styles.loadMoreText}>
                  {t('common.loadMore')} ({displayedEntries.length}/{allEntries.length})
                </AppText>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </ScrollView>
    </SanctuaryScreenShell>
  );
};
