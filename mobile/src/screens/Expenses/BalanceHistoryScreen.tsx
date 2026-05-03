import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Expense } from '../../api/expensesApi';
import { Settlement } from '../../api/settlementsApi';
import { AppText } from '../../components/AppText';
import { EmptyState } from '../../components/ui/EmptyState';
import { SettingsSection } from '../../components/Settings/SettingsSection';
import { SettingsGroupCard } from '../../components/Settings/SettingsGroupCard';
import { useThemeColors, fontSizes, fontWeights, spacing, radii } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { useHouseholdCurrency } from '../../utils/useHouseholdCurrency';
import { formatDate } from '../../utils/dateHelpers';
import { getDateFnsLocale } from '../../utils/dateLocales';
import { getCached } from '../../utils/queryCache';
import {
  balanceHistorySettlementsKey,
  expensesFullCacheKey,
  type ExpensesFullSnapshot,
  type SettlementsAllSnapshot,
  revalidateBalanceHistoryData,
} from '../../utils/balanceHistoryDataCache';

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

const toUserId = (user: { _id: string } | string | null | undefined): string | null =>
  typeof user === 'string' ? user : user?._id ?? null;

const BALANCE_HISTORY_PAGE_SIZE = 5;

const isNegligible = (n: number) => Math.abs(n) < 0.005;

const formatSignedChange = (amount: number, currency: string): string => {
  if (isNegligible(amount)) return '—';
  const sign = amount > 0 ? '+' : '−';
  return `${sign}${formatCurrency(Math.abs(amount), currency)}`;
};

const formatRunningTotal = (amount: number, currency: string): string => {
  if (isNegligible(amount)) return '—';
  return formatCurrency(amount, currency);
};

export const BalanceHistoryScreen: React.FC = () => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
        container: { flex: 1, backgroundColor: 'transparent' },
        scrollView: { flex: 1 },
        scrollContent: { flexGrow: 1, paddingBottom: spacing.xxl },
        introHint: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: radii.lg,
          backgroundColor: isDark ? 'rgba(74, 222, 128, 0.08)' : colors.primaryUltraSoft,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(74, 222, 128, 0.22)' : 'rgba(34, 197, 94, 0.2)',
        },
        introHintText: {
          flex: 1,
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          lineHeight: 20,
        },
        cardPad: {
          padding: spacing.md,
        },
        cardTop: {
          flexDirection: 'row',
          alignItems: 'flex-start',
        },
        iconWrap: {
          width: 44,
          height: 44,
          borderRadius: radii.md,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
        },
        iconWrapExpense: {
          backgroundColor: colors.primaryUltraSoft,
        },
        iconWrapSettlement: {
          backgroundColor: colors.accentUltraSoft,
        },
        body: {
          flex: 1,
          minWidth: 0,
        },
        titleRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: spacing.sm,
        },
        title: {
          flex: 1,
          fontSize: fontSizes.md,
          color: colors.text,
          fontWeight: fontWeights.bold,
          letterSpacing: -0.2,
        },
        netPill: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs + 1,
          borderRadius: radii.md,
          borderWidth: 1,
          maxWidth: '42%',
        },
        netPillPositive: {
          backgroundColor: colors.successSoft,
          borderColor: isDark ? 'rgba(74, 222, 128, 0.35)' : 'rgba(34, 197, 94, 0.35)',
        },
        netPillNegative: {
          backgroundColor: colors.dangerSoft,
          borderColor: isDark ? 'rgba(248, 113, 113, 0.35)' : 'rgba(239, 68, 68, 0.3)',
        },
        netPillText: {
          fontSize: fontSizes.sm,
          fontWeight: fontWeights.extrabold,
          fontVariant: ['tabular-nums'],
          textAlign: 'right',
        },
        sub: {
          marginTop: spacing.xxs,
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          lineHeight: 20,
        },
        chipRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginTop: spacing.sm,
        },
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: colors.borderLight,
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.surfaceAlt,
        },
        chipLabel: {
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.semibold,
          color: colors.textTertiary,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        },
        chipValue: {
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.bold,
          fontVariant: ['tabular-nums'],
        },
        chipValueMuted: {
          color: colors.textTertiary,
        },
        chipValueGood: {
          color: colors.success,
        },
        chipValueBad: {
          color: colors.danger,
        },
        chipValueAccent: {
          color: colors.accent,
        },
        dateRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          marginTop: spacing.sm,
          paddingTop: spacing.sm,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.borderLight,
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
    [colors, isDark]
  );

  const chipValueStyleForDebt = (delta: number) => {
    if (isNegligible(delta)) return styles.chipValueMuted;
    if (delta > 0) return styles.chipValueBad;
    return styles.chipValueGood;
  };

  const chipValueStyleForLoan = (delta: number) => {
    if (isNegligible(delta)) return styles.chipValueMuted;
    if (delta > 0) return styles.chipValueGood;
    return styles.chipValueAccent;
  };

  const chipRunningOweStyle = (total: number) => {
    if (isNegligible(total)) return styles.chipValueMuted;
    return styles.chipValueBad;
  };

  const chipRunningOwedStyle = (total: number) => {
    if (isNegligible(total)) return styles.chipValueMuted;
    return styles.chipValueGood;
  };

  const [allEntries, setAllEntries] = useState<BalanceHistoryEntry[]>([]);
  const [visibleCount, setVisibleCount] = useState(BALANCE_HISTORY_PAGE_SIZE);
  /** True until we have something to show (from cache or network). */
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const displayedEntries = useMemo(
    () => allEntries.slice(0, visibleCount),
    [allEntries, visibleCount]
  );
  const hasMore = allEntries.length > visibleCount;

  useEffect(() => {
    setAllEntries([]);
    setVisibleCount(BALANCE_HISTORY_PAGE_SIZE);
    setInitialLoading(true);
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
          const userShare = expense.shares.find((share) => share.userId === userId)?.amount ?? 0;
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

      // Pairwise running ledger (same model as /balances summary):
      // +value => that user owes you, -value => you owe that user.
      const pairwise = new Map<string, number>();
      for (const entry of merged) {
        if (entry.kind === 'expense') {
          const exp = expenses.find((e) => `exp-${e._id}` === entry.id);
          if (exp) {
            const payerId = toUserId(exp.paidBy);
            if (payerId === userId) {
              for (const share of exp.shares) {
                if (share.userId === userId || share.amount <= 0) continue;
                const prev = pairwise.get(share.userId) ?? 0;
                pairwise.set(share.userId, prev + share.amount);
              }
            } else if (payerId) {
              const myShare = exp.shares.find((s) => s.userId === userId)?.amount ?? 0;
              if (myShare > 0) {
                const prev = pairwise.get(payerId) ?? 0;
                pairwise.set(payerId, prev - myShare);
              }
            }
          }
        } else {
          const set = settlements.find((s) => `set-${s._id}` === entry.id);
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
      if (!selectedHousehold?._id || !user?._id) return;
      const hid = selectedHousehold._id;
      const userId = user._id;
      const members = selectedHousehold.members;
      const expKey = expensesFullCacheKey(hid);
      const setKey = balanceHistorySettlementsKey(hid);

      const cachedExp = getCached<ExpensesFullSnapshot>(expKey);
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

      try {
        const [expSnap, setSnap] = await revalidateBalanceHistoryData(hid);
        setAllEntries(mergeToEntries(expSnap.expenses, setSnap.settlements, userId, members));
        setVisibleCount(BALANCE_HISTORY_PAGE_SIZE);
      } catch (error) {
        if (__DEV__) console.error('Failed to load balance history', error);
        if (!canPaintStale) {
          setAllEntries([]);
        }
      } finally {
        setInitialLoading(false);
        if (fromPullRefresh) {
          setRefreshing(false);
        }
      }
    },
    [mergeToEntries, selectedHousehold?._id, user?._id]
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (!selectedHousehold || !user) {
    return (
      <SanctuaryScreenShell edges={['top', 'bottom']} innerStyle={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
          <AppText>{t('alerts.selectHousehold')}</AppText>
        </View>
      </SanctuaryScreenShell>
    );
  }

  return (
    <SanctuaryScreenShell edges={['top']} innerStyle={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadHistory(true)} />
        }
      >
        <SettingsSection title={t('expenses.balanceHistory')}>
          <View style={styles.introHint}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
            <AppText style={styles.introHintText}>{t('expenses.balanceHistorySubtitle')}</AppText>
          </View>
        </SettingsSection>

        {!initialLoading && allEntries.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
            <EmptyState
              icon="swap-horizontal-outline"
              title={t('expenses.balanceHistoryNoData')}
              message={t('expenses.balanceHistoryNoDataDescription')}
              variant="minimal"
            />
          </View>
        ) : (
          <SettingsSection title={t('expenses.sectionList')}>
            {initialLoading && displayedEntries.length === 0 ? (
              <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : null}
            {displayedEntries.map((entry, index) => (
              <SettingsGroupCard
                key={entry.id}
                style={{ marginBottom: index < displayedEntries.length - 1 ? spacing.md : 0 }}
              >
                <View style={styles.cardPad}>
                  <View style={styles.cardTop}>
                    <View
                      style={[
                        styles.iconWrap,
                        entry.kind === 'expense' ? styles.iconWrapExpense : styles.iconWrapSettlement,
                      ]}
                    >
                      <Ionicons
                        name={entry.kind === 'expense' ? 'receipt-outline' : 'swap-horizontal-outline'}
                        size={22}
                        color={entry.kind === 'expense' ? colors.primary : colors.accent}
                      />
                    </View>
                    <View style={styles.body}>
                      <View style={styles.titleRow}>
                        <AppText style={styles.title} numberOfLines={2}>
                          {entry.title}
                        </AppText>
                        <View
                          style={[
                            styles.netPill,
                            entry.delta >= 0 ? styles.netPillPositive : styles.netPillNegative,
                          ]}
                        >
                          <AppText
                            style={[
                              styles.netPillText,
                              { color: entry.delta >= 0 ? colors.success : colors.danger },
                            ]}
                            numberOfLines={1}
                          >
                            {entry.delta >= 0 ? '+' : '−'}
                            {formatCurrency(Math.abs(entry.delta), currency)}
                          </AppText>
                        </View>
                      </View>
                      <AppText style={styles.sub}>{entry.subtitle}</AppText>
                      <View style={styles.chipRow}>
                        <View style={styles.chip}>
                          <AppText style={styles.chipLabel}>{t('expenses.balanceHistoryOweShort')}</AppText>
                          <AppText style={[styles.chipValue, chipRunningOweStyle(entry.runningOwe)]}>
                            {formatRunningTotal(entry.runningOwe, currency)}
                          </AppText>
                        </View>
                        <View style={styles.chip}>
                          <AppText style={styles.chipLabel}>{t('expenses.balanceHistoryOwedShort')}</AppText>
                          <AppText style={[styles.chipValue, chipRunningOwedStyle(entry.runningOwed)]}>
                            {formatRunningTotal(entry.runningOwed, currency)}
                          </AppText>
                        </View>
                      </View>
                      <View style={styles.dateRow}>
                        <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
                        <AppText style={styles.date}>
                          {formatDate(entry.date, dateLocale, relativeDayLabels)}
                        </AppText>
                      </View>
                    </View>
                  </View>
                </View>
              </SettingsGroupCard>
            ))}
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
          </SettingsSection>
        )}
      </ScrollView>
    </SanctuaryScreenShell>
  );
};

