import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Share } from 'react-native';
import { AppText } from '../../components/AppText';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { eventsApi, Event } from '../../api/eventsApi';
import { expensesApi, PairwiseBalance, HomeExpenseSummary } from '../../api/expensesApi';
import { shoppingApi } from '../../api/shoppingApi';
import { EventCard } from '../../components/EventCard';
import { BalanceSummary } from '../../components/BalanceSummary';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SpendingChart } from '../../components/SpendingChart';
import { DashboardHero } from '../../components/Home/DashboardHero';
import { HomeInviteCard } from '../../components/Home/HomeInviteCard';
import { HomeSetupStep } from '../../components/Home/HomeSetupStep';
import { SectionBlock } from '../../components/ui/SectionBlock';
import { SummaryStatCard } from '../../components/Home/SummaryStatCard';
import { InsightCard } from '../../components/Home/InsightCard';
import { SmartTipCard } from '../../components/Home/SmartTipCard';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatCurrency';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows, TAB_BAR_HEIGHT } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSkeleton, SkeletonCard } from '../../components/LoadingSkeleton';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { selectedHousehold, setSelectedHousehold } = useHousehold();
  const { user } = useAuth();
  const colors = useThemeColors();
  const { t } = useLanguage();
  const [events, setEvents] = useState<Event[]>([]);
  const [balances, setBalances] = useState<PairwiseBalance[]>([]);
  const [homeSummary, setHomeSummary] = useState<HomeExpenseSummary | null>(null);
  const [shoppingStats, setShoppingStats] = useState({ total: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [insights, setInsights] = useState<any>(null);
  const [spendingRange, setSpendingRange] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [loadError, setLoadError] = useState(false);
  const [homeEventsVisible, setHomeEventsVisible] = useState(5);
  const scrollRef = useRef<ScrollView>(null);
  /** Only the latest home fetch may commit (avoids duplicate effects + out-of-order responses). */
  const loadGenRef = useRef(0);
  const prevHouseholdIdRef = useRef<string | undefined>(undefined);

  useFocusEffect(
    React.useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, [])
  );

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: spacing.lg,
      paddingBottom: TAB_BAR_HEIGHT + spacing.xl,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xxl,
    },
    emptyText: {
      fontSize: fontSizes.md,
      color: colors.muted,
    },
    skeletonStatCard: {
      flex: 1,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    skeletonStatContent: {
      flex: 1,
    },
    skeletonHero: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.lg,
      padding: spacing.xl,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.xl,
      gap: spacing.sm,
    },
    emptyStateContainer: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
    },
    setupStepsCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      paddingHorizontal: spacing.xs,
      paddingBottom: spacing.sm,
      marginBottom: spacing.lg,
      ...(shadows.sm as object),
    },
    setupStepsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
      gap: spacing.sm,
    },
    setupStepsTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      flex: 1,
    },
    setupProgressBadge: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.primary,
      backgroundColor: colors.primaryUltraSoft,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: radii.sm,
      overflow: 'hidden',
    },
    primaryCta: {
      marginBottom: spacing.md,
    },
    secondaryRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    secondaryBtn: {
      flex: 1,
    },
    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginTop: spacing.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.sm as object),
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: spacing.md,
    },
    summaryItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    summaryTextContainer: {
      flex: 1,
    },
    summaryLabel: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      marginBottom: spacing.xxs,
    },
    summaryValue: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    trendIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      gap: spacing.xs,
    },
    trendText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
    },
    insightRow: {
      marginTop: spacing.lg,
    },
    tipSection: {
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.xxl,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      marginHorizontal: spacing.xl,
      marginTop: spacing.md,
      borderRadius: radii.md,
    },
    errorBannerText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      flex: 1,
    },
    homeEventsLoadMore: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      marginTop: spacing.xs,
    },
    homeEventsLoadMoreText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.primary,
    },
  }), [colors]);

  const householdId = selectedHousehold?._id;

  // Drop stale dashboard data when switching households; invalidate any in-flight fetch.
  useEffect(() => {
    const hid = selectedHousehold?._id;
    if (!hid) {
      prevHouseholdIdRef.current = undefined;
      return;
    }
    if (prevHouseholdIdRef.current !== hid) {
      prevHouseholdIdRef.current = hid;
      loadGenRef.current += 1;
      setEvents([]);
      setBalances([]);
      setHomeSummary(null);
      setShoppingStats({ total: 0, pending: 0 });
      setInsights(null);
      setInitialLoading(true);
    }
  }, [selectedHousehold?._id]);

  useEffect(() => {
    setHomeEventsVisible(5);
  }, [events.length]);

  const loadData = React.useCallback(async () => {
    if (!householdId) return;

    const gen = ++loadGenRef.current;
    setLoading(true);
    setLoadError(false);
    try {
      const [homeData, balancesData, eventsRaw, shoppingStatsData] = await Promise.all([
        expensesApi.getHomeExpenseSummary(householdId),
        expensesApi.getBalances(householdId),
        eventsApi.getEvents(householdId, { upcoming: true, limit: 40 }),
        shoppingApi.getHouseholdItemStats(householdId),
      ]);

      const eventsData = Array.isArray(eventsRaw) ? eventsRaw : eventsRaw.items;

      const upcomingEvents = eventsData
        .filter((e) => new Date(e.date) >= new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (gen !== loadGenRef.current) return;

      setEvents(upcomingEvents);
      setBalances(balancesData);
      setHomeSummary(homeData);
      setInsights(homeData.insights);
      setShoppingStats(shoppingStatsData);
    } catch (error: any) {
      if (gen !== loadGenRef.current) return;
      const status = error?.response?.status;
      if (status === 403) {
        if (__DEV__) {
          console.warn(
            '[Home] 403: no access to this household — clearing selection (rejoin or pick another).'
          );
        }
        setSelectedHousehold(null);
      } else {
        if (__DEV__) console.error('Failed to load home data:', error);
      }
      const isNetworkError =
        error?.code === 'ERR_NETWORK' ||
        error?.message === 'Network Error' ||
        !error?.response;
      if (isNetworkError) setLoadError(true);
    } finally {
      if (gen === loadGenRef.current) {
        setLoading(false);
        setInitialLoading(false);
      }
    }
  }, [householdId, setSelectedHousehold]);

  /** Load on mount and when household changes — not on every tab focus (keeps tab switches instant). Pull-to-refresh still calls loadData. */
  useEffect(() => {
    if (householdId) {
      loadData();
    }
  }, [householdId, loadData]);

  const getUserName = (userId: string): string => {
    if (!selectedHousehold) return 'Unknown';
    const member = selectedHousehold.members.find(m => m._id === userId);
    return member?.name || 'Unknown';
  };

  const getUserAvatar = (userId: string): string | undefined => {
    if (!selectedHousehold) return undefined;
    const member = selectedHousehold.members.find(m => m._id === userId);
    return member?.avatarUrl;
  };

  // Calculate stats
  const calculateStats = () => {
    const monthlyExpenses = homeSummary?.calendarMonthTotal ?? 0;

    const pendingShopping = shoppingStats.pending;

    // Upcoming events count
    const upcomingEventsCount = events.length;

    // Net balance for current user
    let netBalance = 0;
    if (user) {
      const userOwed = balances
        .filter(b => b.fromUserId === user._id)
        .reduce((sum, b) => sum + b.amount, 0);
      const userOwedTo = balances
        .filter(b => b.toUserId === user._id)
        .reduce((sum, b) => sum + b.amount, 0);
      netBalance = userOwedTo - userOwed;
    }

    return {
      monthlyExpenses,
      pendingShopping,
      upcomingEventsCount,
      netBalance,
    };
  };

  const stats = calculateStats();
  const hasData =
    (homeSummary?.expenseCount ?? 0) > 0 ||
    events.length > 0 ||
    shoppingStats.total > 0 ||
    balances.length > 0;

  const setupInviteDone = (selectedHousehold?.members?.length ?? 0) > 1;
  const setupExpenseDone = (homeSummary?.expenseCount ?? 0) > 0;
  const setupShoppingDone = shoppingStats.total > 0;
  const setupDoneCount = [setupInviteDone, setupExpenseDone, setupShoppingDone].filter(Boolean).length;

  const handleShareInvite = async () => {
    if (!selectedHousehold?.joinCode) {
      navigation.getParent()?.navigate('HouseholdSettings');
      return;
    }
    try {
      await Share.share({
        message: String(
          t('householdSettingsScreen.shareMessage', { code: selectedHousehold.joinCode })
        ),
        title: selectedHousehold.name,
      });
    } catch {
      /* dismissed */
    }
  };

  const spendingByCategory = React.useMemo(() => {
    if (!homeSummary) return [];
    const map = {
      week: homeSummary.categoryTotals.week,
      month: homeSummary.categoryTotals.month,
      year: homeSummary.categoryTotals.year,
      all: homeSummary.categoryTotals.all,
    } as const;
    return map[spendingRange] ?? [];
  }, [homeSummary, spendingRange]);

  if (!selectedHousehold) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>{t('home.pleaseSelectHousehold')}</AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.skeletonHero}>
            <LoadingSkeleton width={220} height={28} style={{ marginBottom: spacing.xs }} />
            <LoadingSkeleton width={120} height={14} />
            <LoadingSkeleton width={100} height={20} style={{ marginTop: spacing.md }} />
          </View>
          <View style={styles.statsRow}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonStatCard}>
                <LoadingSkeleton width={44} height={44} borderRadius={radii.md} />
                <LoadingSkeleton width={60} height={18} style={{ marginTop: spacing.sm }} />
                <LoadingSkeleton width={50} height={12} style={{ marginTop: spacing.xs }} />
              </View>
            ))}
          </View>
          <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
            <LoadingSkeleton width={150} height={20} style={{ marginBottom: spacing.md }} />
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} lines={2} showAvatar={true} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      >
      {loadError && (
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerSoft }]}>
          <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
          <AppText style={[styles.errorBannerText, { color: colors.danger }]}>
            {t('home.couldNotConnect')}
          </AppText>
        </View>
      )}

      <DashboardHero
        householdName={selectedHousehold.name}
        address={selectedHousehold.address}
        metricLabel={hasData ? t('home.thisMonth') : undefined}
        metricValue={hasData ? formatCompactCurrency(stats.monthlyExpenses) : undefined}
        tagline={!hasData ? t('home.setupHeroTagline') : undefined}
      />

      {hasData && (
        <View style={styles.statsRow}>
          <SummaryStatCard
            icon={<Ionicons name="cash-outline" size={22} color={colors.primary} />}
            label={t('home.thisMonth')}
            value={formatCompactCurrency(stats.monthlyExpenses)}
            iconBgColor={colors.primaryUltraSoft}
            onPress={() => navigation.navigate('Expenses')}
          />
          <SummaryStatCard
            icon={<Ionicons name="cart-outline" size={22} color={colors.accent} />}
            label={t('tabs.shopping')}
            value={stats.pendingShopping}
            iconBgColor={colors.accentUltraSoft}
            onPress={() => navigation.navigate('Shopping')}
          />
          <SummaryStatCard
            icon={<Ionicons name="calendar-outline" size={22} color={colors.teal} />}
            label={t('home.events')}
            value={stats.upcomingEventsCount}
            iconBgColor={colors.tealUltraSoft}
            onPress={() => navigation.navigate('Calendar')}
          />
        </View>
      )}

      {/* Guided household setup when there is no activity yet */}
      {!hasData && (
        <View style={styles.emptyStateContainer}>
          {selectedHousehold.joinCode ? (
            <HomeInviteCard joinCode={selectedHousehold.joinCode} householdName={selectedHousehold.name} />
          ) : null}

          <View style={styles.setupStepsCard}>
            <View style={styles.setupStepsHeader}>
              <AppText style={styles.setupStepsTitle}>{t('home.setupStepsHeading')}</AppText>
              <AppText style={styles.setupProgressBadge}>
                {t('home.setupProgress', { done: setupDoneCount, total: 3 })}
              </AppText>
            </View>
            <HomeSetupStep
              stepNumber={1}
              title={t('home.setupStep1Title')}
              subtitle={t('home.setupStep1Subtitle')}
              completed={setupInviteDone}
              onPress={handleShareInvite}
            />
            <HomeSetupStep
              stepNumber={2}
              title={t('home.setupStep2Title')}
              subtitle={t('home.setupStep2Subtitle')}
              completed={setupExpenseDone}
              onPress={() => navigation.getParent()?.navigate('CreateExpense')}
            />
            <HomeSetupStep
              stepNumber={3}
              title={t('home.setupStep3Title')}
              subtitle={t('home.setupStep3Subtitle')}
              completed={setupShoppingDone}
              onPress={() => navigation.navigate('Shopping')}
              isLast
            />
          </View>

          <PrimaryButton
            title={t('home.primaryFirstExpense')}
            onPress={() => navigation.getParent()?.navigate('CreateExpense')}
            style={styles.primaryCta}
          />
          <View style={styles.secondaryRow}>
            <PrimaryButton
              variant="outline"
              title={t('home.shoppingList')}
              onPress={() => navigation.navigate('Shopping')}
              style={styles.secondaryBtn}
            />
            <PrimaryButton
              variant="outline"
              title={t('home.addEvent')}
              onPress={() => navigation.navigate('Calendar')}
              style={styles.secondaryBtn}
            />
          </View>
        </View>
      )}
      {user && balances.length > 0 && (
        <SectionBlock
          title={t('home.balanceSummary')}
          description={t('home.balanceDescription')}
          actionLabel={t('common.seeAll')}
          onAction={() => navigation.getParent()?.navigate('SettleUp')}
        >
          <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.getParent()?.navigate('SettleUp')}>
            <BalanceSummary
              balances={balances}
              currentUserId={user._id}
              getUserName={getUserName}
              getUserAvatar={getUserAvatar}
              hideTitle
            />
          </TouchableOpacity>
        </SectionBlock>
      )}

      {((homeSummary?.expenseCount ?? 0) > 0 ||
        Boolean(insights?.monthlyTrend?.some((m: { amount: number }) => m.amount > 0))) && (
        <SectionBlock
          title={t('home.spendingInsights')}
          description={t('home.spendingDescription')}
        >
          <SpendingChart
            byCategory={spendingByCategory}
            monthlyTrend={insights?.monthlyTrend || []}
            predictions={insights?.predictions}
            selectedRange={spendingRange}
            onChangeRange={setSpendingRange}
            hidePrediction
          />
          {insights?.monthlyTrend && insights.monthlyTrend.length >= 2 && (() => {
            const thisMonth = stats.monthlyExpenses;
            const lastMonth = insights.monthlyTrend[insights.monthlyTrend.length - 2]?.amount || 0;
            const difference = thisMonth - lastMonth;
            const percentChange = lastMonth > 0 ? ((difference / lastMonth) * 100).toFixed(1) : '0';
            const isIncrease = difference > 0;
            const trendText = lastMonth > 0
              ? `${isIncrease ? '+' : ''}${formatCurrency(Math.abs(difference))} (${isIncrease ? '+' : ''}${percentChange}%) ${isIncrease ? t('home.moreThanLastMonth') : t('home.lessThanLastMonth')}`
              : t('home.thisMonth');
            return (
              <View style={styles.insightRow}>
                <InsightCard
                  title={t('home.thisMonth')}
                  value={formatCurrency(thisMonth)}
                  trend={lastMonth > 0 ? { direction: isIncrease ? 'increasing' : 'decreasing', text: trendText } : undefined}
                  variant="primary"
                />
              </View>
            );
          })()}
          {insights?.predictions && (
            <View style={styles.insightRow}>
              <InsightCard
                title={t('spendingChart.nextMonthPrediction')}
                value={formatCurrency(insights.predictions.nextMonth)}
                trend={{
                  direction: insights.predictions.trend,
                  text: insights.predictions.trend === 'increasing' ? t('spendingChart.increasing') : insights.predictions.trend === 'decreasing' ? t('spendingChart.decreasing') : t('spendingChart.stable'),
                }}
                variant="teal"
              />
            </View>
          )}
        </SectionBlock>
      )}

      {events.length > 0 && (
        <SectionBlock
          title={t('home.upcomingEvents')}
          description={t('home.upcomingEventsDescription')}
          actionLabel={t('common.seeAll')}
          onAction={() => navigation.navigate('Calendar')}
        >
          {events.slice(0, homeEventsVisible).map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
          {events.length > homeEventsVisible ? (
            <TouchableOpacity
              style={styles.homeEventsLoadMore}
              onPress={() => setHomeEventsVisible((n) => n + 5)}
              activeOpacity={0.75}
            >
              <AppText style={styles.homeEventsLoadMoreText}>
                {t('common.loadMore')} ({Math.min(homeEventsVisible, events.length)}/{events.length})
              </AppText>
            </TouchableOpacity>
          ) : null}
        </SectionBlock>
      )}

      {hasData && (
        <View style={styles.tipSection}>
          <SmartTipCard
            title={t('home.quickTip')}
            message={stats.monthlyExpenses > 0 ? t('home.tipReview') : t('home.tipStart')}
          />
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
};
