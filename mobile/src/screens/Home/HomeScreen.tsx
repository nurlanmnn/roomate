import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppText } from '../../components/AppText';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { eventsApi, Event } from '../../api/eventsApi';
import { expensesApi, PairwiseBalance, Expense } from '../../api/expensesApi';
import { shoppingApi, ShoppingItem } from '../../api/shoppingApi';
import { EventCard } from '../../components/EventCard';
import { BalanceSummary } from '../../components/BalanceSummary';
import { QuickActionButton } from '../../components/QuickActionButton';
import { SpendingChart } from '../../components/SpendingChart';
import { DashboardHero } from '../../components/Home/DashboardHero';
import { SectionBlock } from '../../components/ui/SectionBlock';
import { SummaryStatCard } from '../../components/Home/SummaryStatCard';
import { InsightCard } from '../../components/Home/InsightCard';
import { SmartTipCard } from '../../components/Home/SmartTipCard';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatCurrency';
import { useThemeColors, fontSizes, fontWeights, spacing, lineHeights, radii, shadows, TAB_BAR_HEIGHT } from '../../theme';
import { scale } from '../../utils/scaling';
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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [insights, setInsights] = useState<any>(null);
  const [spendingRange, setSpendingRange] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [loadError, setLoadError] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

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
      paddingTop: spacing.lg,
    },
    welcomeSection: {
      padding: spacing.xxl,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      alignItems: 'center',
      marginBottom: spacing.xl,
      ...(shadows.sm as object),
    },
    welcomeIconContainer: {
      width: scale(80),
      height: scale(80),
      borderRadius: scale(40),
      backgroundColor: colors.primaryUltraSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    welcomeTitle: {
      fontSize: fontSizes.xxl,
      fontWeight: fontWeights.extrabold,
      color: colors.text,
      marginBottom: spacing.md,
      textAlign: 'center',
      lineHeight: lineHeights.xxl,
    },
    welcomeText: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: lineHeights.md,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    inviteMessageContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryUltraSoft,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      marginTop: spacing.md,
      gap: spacing.xs,
      flexWrap: 'wrap',
    },
    inviteMessage: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    joinCodeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.primary,
      gap: spacing.xs,
    },
    joinCode: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.bold,
      color: colors.primary,
      letterSpacing: 1,
    },
    copyIcon: {
      marginLeft: spacing.xxs,
    },
    quickActionsContainer: {
      gap: spacing.md,
    },
    quickActionsRow: {
      flexDirection: 'row',
      gap: spacing.md,
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
  }), [colors]);

  useEffect(() => {
    if (selectedHousehold) {
      loadData();
    }
  }, [selectedHousehold]);

  // Reload data when screen comes into focus (e.g., after creating an event)
  useFocusEffect(
    React.useCallback(() => {
      if (selectedHousehold) {
        loadData();
      }
    }, [selectedHousehold])
  );

  const loadData = async () => {
    if (!selectedHousehold) return;

    setLoading(true);
    setLoadError(false);
    try {
      // Get all shopping lists first
      const shoppingLists = await shoppingApi.getShoppingLists(selectedHousehold._id);
      
      // Get items from all lists
      const shoppingItemsPromises = shoppingLists.map(list => 
        shoppingApi.getShoppingItems(list._id, false)
      );
      const shoppingItemsArrays = await Promise.all(shoppingItemsPromises);
      const allShoppingItems = shoppingItemsArrays.flat();

      const [eventsData, balancesData, expensesData, insightsData] = await Promise.all([
        eventsApi.getEvents(selectedHousehold._id),
        expensesApi.getBalances(selectedHousehold._id),
        expensesApi.getExpenses(selectedHousehold._id),
        expensesApi.getInsights(selectedHousehold._id).catch(() => null),
      ]);

      // Get upcoming events (next 5)
      const upcomingEvents = eventsData
        .filter(e => new Date(e.date) >= new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);

      setEvents(upcomingEvents);
      setBalances(balancesData);
      setExpenses(expensesData);
      setShoppingItems(allShoppingItems);
      setInsights(insightsData);
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load home data:', error);
      const isNetworkError =
        error?.code === 'ERR_NETWORK' ||
        error?.message === 'Network Error' ||
        !error?.response;
      if (isNetworkError) setLoadError(true);
      // If we get a 403, the user is no longer a member of this household
      if (error?.response?.status === 403) {
        setSelectedHousehold(null);
      }
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Monthly expenses
    const monthlyExpenses = expenses
      .filter(e => new Date(e.date) >= startOfMonth)
      .reduce((sum, e) => sum + e.totalAmount, 0);

    // Pending shopping items
    const pendingShopping = shoppingItems.filter(item => !item.completed).length;

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
  const hasData = expenses.length > 0 || events.length > 0 || shoppingItems.length > 0;

  const spendingRangeStart = React.useMemo(() => {
    const now = new Date();
    if (spendingRange === 'week') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    }
    if (spendingRange === 'month') {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    if (spendingRange === 'year') {
      return new Date(now.getFullYear(), 0, 1);
    }
    return null; // all time
  }, [spendingRange]);

  const spendingByCategory = React.useMemo(() => {
    const start = spendingRangeStart;
    const filtered = start
      ? expenses.filter((e) => {
          const d = new Date(e.date);
          return d >= start;
        })
      : expenses;

    const totals: Record<string, number> = {};
    filtered.forEach((e) => {
      const key = (e.category || 'Uncategorized').trim();
      totals[key] = (totals[key] || 0) + (e.totalAmount || 0);
    });
    const totalAmount = Object.values(totals).reduce((sum, v) => sum + v, 0);
    return Object.entries(totals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
        count: 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, spendingRangeStart]);

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

      {/* Welcome Message & Quick Actions for New Users */}
      {!hasData && (
        <View style={styles.emptyStateContainer}>
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeIconContainer}>
              <Ionicons name="home-outline" size={48} color={colors.primary} />
            </View>
            <AppText style={styles.welcomeTitle}>{t('home.welcomeTo')} {selectedHousehold.name}! 👋</AppText>
            <AppText style={styles.welcomeText}>
              {t('home.getStarted')}
            </AppText>
            {selectedHousehold.members.length === 1 && selectedHousehold.joinCode && (
              <View style={styles.inviteMessageContainer}>
                <Ionicons name="people-outline" size={20} color={colors.primary} />
                <AppText style={styles.inviteMessage}>
                  {t('home.inviteRoommates')}{' '}
                </AppText>
                <TouchableOpacity
                  onPress={async () => {
                    await Clipboard.setStringAsync(selectedHousehold.joinCode);
                    Alert.alert(t('common.copied'), t('householdSettingsScreen.codeCopied'));
                  }}
                  style={styles.joinCodeContainer}
                >
                  <AppText style={styles.joinCode}>{selectedHousehold.joinCode}</AppText>
                  <Ionicons name="copy-outline" size={16} color={colors.primary} style={styles.copyIcon} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.quickActionsContainer}>
            <View style={styles.quickActionsRow}>
              <QuickActionButton
                icon={<Ionicons name="add-circle-outline" size={24} color={colors.primary} />}
                label={t('home.addExpense')}
                onPress={() => {
                  navigation.getParent()?.navigate('CreateExpense');
                }}
              />
              <QuickActionButton
                icon={<Ionicons name="cart-outline" size={24} color={colors.primary} />}
                label={t('home.shoppingList')}
                onPress={() => navigation.navigate('Shopping')}
              />
            </View>
            <View style={styles.quickActionsRow}>
              <QuickActionButton
                icon={<Ionicons name="calendar-outline" size={24} color={colors.primary} />}
                label={t('home.addEvent')}
                onPress={() => navigation.navigate('Calendar')}
              />
            </View>
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

      {(spendingByCategory.length > 0 || (insights && insights.byCategory?.length > 0)) && (
        <SectionBlock
          title={t('home.spendingInsights')}
          description={t('home.spendingDescription')}
        >
          <SpendingChart
            byCategory={spendingByCategory.length > 0 ? spendingByCategory : insights.byCategory}
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
          {events.slice(0, 3).map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
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
