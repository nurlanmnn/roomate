import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppText } from '../../components/AppText';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { eventsApi, Event } from '../../api/eventsApi';
import { expensesApi, PairwiseBalance, Expense } from '../../api/expensesApi';
import { goalsApi, Goal } from '../../api/goalsApi';
import { shoppingApi, ShoppingItem } from '../../api/shoppingApi';
import { EventCard } from '../../components/EventCard';
import { BalanceSummary } from '../../components/BalanceSummary';
import { GoalCard } from '../../components/GoalCard';
import { StatsCard } from '../../components/StatsCard';
import { QuickActionButton } from '../../components/QuickActionButton';
import { SpendingChart } from '../../components/SpendingChart';
import { formatDate } from '../../utils/dateHelpers';
import { formatCompactCurrency, formatCurrency } from '../../utils/formatCurrency';
import { useThemeColors, fontSizes, fontWeights, spacing, lineHeights, radii, shadows, TAB_BAR_HEIGHT } from '../../theme';
import { scale } from '../../utils/scaling';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSkeleton, SkeletonCard } from '../../components/LoadingSkeleton';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { selectedHousehold, setSelectedHousehold } = useHousehold();
  const { user } = useAuth();
  const colors = useThemeColors();
  const [events, setEvents] = useState<Event[]>([]);
  const [balances, setBalances] = useState<PairwiseBalance[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [insights, setInsights] = useState<any>(null);
  const [spendingRange, setSpendingRange] = useState<'week' | 'month' | 'year' | 'all'>('month');

  const styles = React.useMemo(() => StyleSheet.create({
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
      padding: spacing.xxl,
    },
    emptyText: {
      fontSize: fontSizes.md,
      color: colors.muted,
    },
    skeletonStatCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    skeletonStatContent: {
      flex: 1,
    },
    header: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: fontSizes.xxxl,
      fontWeight: fontWeights.extrabold,
      color: colors.text,
      marginBottom: spacing.xs,
      lineHeight: lineHeights.xxxl,
      letterSpacing: -0.5,
    },
    address: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      lineHeight: lineHeights.sm,
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      gap: spacing.sm,
    },
    section: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.lg,
    },
    sectionTitleContainer: {
      flex: 1,
      flexShrink: 1,
      paddingRight: spacing.md,
    },
    sectionTitle: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: colors.text,
      letterSpacing: -0.3,
      marginBottom: spacing.xs,
    },
    sectionDescription: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      lineHeight: lineHeights.sm,
    },
    seeAllText: {
      fontSize: fontSizes.sm,
      color: colors.primary,
      fontWeight: fontWeights.semibold,
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
    tipCard: {
      flexDirection: 'row',
      backgroundColor: colors.accentUltraSoft,
      borderRadius: radii.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.accentSoft,
      gap: spacing.md,
      ...(shadows.xs as object),
    },
    tipContent: {
      flex: 1,
      flexShrink: 1,
    },
    tipTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    tipText: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      lineHeight: lineHeights.sm,
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
    try {
      // Get all shopping lists first
      const shoppingLists = await shoppingApi.getShoppingLists(selectedHousehold._id);
      
      // Get items from all lists
      const shoppingItemsPromises = shoppingLists.map(list => 
        shoppingApi.getShoppingItems(list._id, false)
      );
      const shoppingItemsArrays = await Promise.all(shoppingItemsPromises);
      const allShoppingItems = shoppingItemsArrays.flat();

      const [eventsData, balancesData, goalsData, expensesData, insightsData] = await Promise.all([
        eventsApi.getEvents(selectedHousehold._id),
        expensesApi.getBalances(selectedHousehold._id),
        goalsApi.getGoals(selectedHousehold._id),
        expensesApi.getExpenses(selectedHousehold._id),
        expensesApi.getInsights(selectedHousehold._id).catch(() => null),
      ]);

      // Get upcoming events (next 5)
      const upcomingEvents = eventsData
        .filter(e => new Date(e.date) >= new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);

      // Get active goals (non-done, sorted by upvotes)
      const activeGoals = goalsData
        .filter(g => g.status !== 'done')
        .sort((a, b) => b.upvotes.length - a.upvotes.length)
        .slice(0, 3);

      setEvents(upcomingEvents);
      setBalances(balancesData);
      setGoals(activeGoals);
      setExpenses(expensesData);
      setShoppingItems(allShoppingItems);
      setInsights(insightsData);
    } catch (error: any) {
      console.error('Failed to load home data:', error);
      // If we get a 403, the user is no longer a member of this household
      // Clear the selection and they'll be redirected to household select
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
  const hasData = expenses.length > 0 || events.length > 0 || goals.length > 0 || shoppingItems.length > 0;

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
          <AppText style={styles.emptyText}>Please select a household</AppText>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading skeleton on initial load
  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <LoadingSkeleton width={200} height={28} style={{ marginBottom: spacing.xs }} />
            <LoadingSkeleton width={150} height={16} />
          </View>
          <View style={styles.statsContainer}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.skeletonStatCard}>
                <LoadingSkeleton width={40} height={40} borderRadius={20} />
                <View style={styles.skeletonStatContent}>
                  <LoadingSkeleton width={80} height={14} style={{ marginBottom: spacing.xs }} />
                  <LoadingSkeleton width={60} height={18} />
                </View>
              </View>
            ))}
          </View>
          <View style={styles.section}>
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
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + spacing.xl }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      >
      <View style={styles.header}>
        <AppText style={styles.title}>{selectedHousehold.name}</AppText>
        {selectedHousehold.address && (
          <AppText style={styles.address}>{selectedHousehold.address}</AppText>
        )}
      </View>

      {/* Quick Stats Cards */}
      {hasData && (
        <View style={styles.statsContainer}>
          <StatsCard
            icon={<Ionicons name="cash-outline" size={24} color={colors.primary} />}
            label="This Month"
            value={formatCompactCurrency(stats.monthlyExpenses)}
            iconColor={colors.primary}
            iconBgColor={colors.primaryUltraSoft}
            onPress={() => navigation.navigate('Expenses')}
          />
          <StatsCard
            icon={<Ionicons name="cart-outline" size={24} color={colors.accent} />}
            label="Shopping"
            value={stats.pendingShopping}
            iconColor={colors.accent}
            iconBgColor={colors.accentUltraSoft}
            onPress={() => navigation.navigate('Shopping')}
          />
          <StatsCard
            icon={<Ionicons name="calendar-outline" size={24} color={colors.teal} />}
            label="Events"
            value={stats.upcomingEventsCount}
            iconColor={colors.teal}
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
            <AppText style={styles.welcomeTitle}>Welcome to {selectedHousehold.name}! 👋</AppText>
            <AppText style={styles.welcomeText}>
              Get started by adding your first expense, creating a shopping list, or setting up a goal.
            </AppText>
            {selectedHousehold.members.length === 1 && selectedHousehold.joinCode && (
              <View style={styles.inviteMessageContainer}>
                <Ionicons name="people-outline" size={20} color={colors.primary} />
                <AppText style={styles.inviteMessage}>
                  Invite your roommates using the code:{' '}
                </AppText>
                <TouchableOpacity
                  onPress={async () => {
                    await Clipboard.setStringAsync(selectedHousehold.joinCode);
                    Alert.alert('Copied!', 'Join code copied to clipboard');
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
                label="Add Expense"
                onPress={() => {
                  navigation.getParent()?.navigate('CreateExpense');
                }}
              />
              <QuickActionButton
                icon={<Ionicons name="cart-outline" size={24} color={colors.primary} />}
                label="Shopping List"
                onPress={() => navigation.navigate('Shopping')}
              />
            </View>
            <View style={styles.quickActionsRow}>
              <QuickActionButton
                icon={<Ionicons name="flag-outline" size={24} color={colors.primary} />}
                label="New Goal"
                onPress={() => navigation.navigate('Goals')}
              />
              <QuickActionButton
                icon={<Ionicons name="calendar-outline" size={24} color={colors.primary} />}
                label="Add Event"
                onPress={() => navigation.navigate('Calendar')}
              />
            </View>
          </View>
        </View>
      )}
      {/* Balance Summary */}
      {user && balances.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <AppText style={styles.sectionTitle}>Your Balances</AppText>
              <AppText style={styles.sectionDescription}>
                Track who owes what and settle up with your roommates
              </AppText>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.getParent()?.navigate('SettleUp')}
          >
            <BalanceSummary
              balances={balances}
              currentUserId={user._id}
              getUserName={getUserName}
              getUserAvatar={getUserAvatar}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Spending Insights & Charts */}
      {(spendingByCategory.length > 0 || (insights && insights.byCategory.length > 0)) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <AppText style={styles.sectionTitle}>Spending Insights</AppText>
              <AppText style={styles.sectionDescription}>
                Track your spending patterns and see where your money goes each month
              </AppText>
            </View>
          </View>
          <SpendingChart
            byCategory={spendingByCategory.length > 0 ? spendingByCategory : insights.byCategory}
            monthlyTrend={insights?.monthlyTrend || []}
            predictions={insights?.predictions}
            selectedRange={spendingRange}
            onChangeRange={setSpendingRange}
          />
          {/* Spending Summary Card */}
          {insights.monthlyTrend && insights.monthlyTrend.length > 1 && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Ionicons name="trending-up-outline" size={20} color={colors.primary} />
                  <View style={styles.summaryTextContainer}>
                    <AppText style={styles.summaryLabel}>This Month</AppText>
                    <AppText style={styles.summaryValue}>
                      {formatCurrency(stats.monthlyExpenses)}
                    </AppText>
                  </View>
                </View>
                {insights.monthlyTrend.length >= 2 && (
                  <View style={styles.summaryItem}>
                    <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                    <View style={styles.summaryTextContainer}>
                      <AppText style={styles.summaryLabel}>Last Month</AppText>
                      <AppText style={styles.summaryValue}>
                        {formatCurrency(insights.monthlyTrend[insights.monthlyTrend.length - 2]?.amount || 0)}
                      </AppText>
                    </View>
                  </View>
                )}
              </View>
              {insights.monthlyTrend.length >= 2 && (() => {
                const thisMonth = stats.monthlyExpenses;
                const lastMonth = insights.monthlyTrend[insights.monthlyTrend.length - 2]?.amount || 0;
                const difference = thisMonth - lastMonth;
                const percentChange = lastMonth > 0 ? ((difference / lastMonth) * 100).toFixed(1) : 0;
                const isIncrease = difference > 0;
                
                if (lastMonth > 0) {
                  return (
                    <View style={styles.trendIndicator}>
                      <Ionicons 
                        name={isIncrease ? "arrow-up" : "arrow-down"} 
                        size={16} 
                        color={isIncrease ? colors.danger : colors.success} 
                      />
                      <AppText style={[
                        styles.trendText,
                        { color: isIncrease ? colors.danger : colors.success }
                      ]}>
                        {isIncrease ? '+' : ''}{formatCurrency(Math.abs(difference))} ({isIncrease ? '+' : ''}{percentChange}%) 
                        {isIncrease ? 'more' : 'less'} than last month
                      </AppText>
                    </View>
                  );
                }
                return null;
              })()}
            </View>
          )}
        </View>
      )}

      {/* Upcoming Events */}
      {events.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <AppText style={styles.sectionTitle}>Upcoming Events</AppText>
              <AppText style={styles.sectionDescription}>
                Don't miss important dates and shared activities
              </AppText>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
              <AppText style={styles.seeAllText}>See All</AppText>
            </TouchableOpacity>
          </View>
          {events.slice(0, 3).map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </View>
      )}

      {/* Active Goals */}
      {goals.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <AppText style={styles.sectionTitle}>Active Goals</AppText>
              <AppText style={styles.sectionDescription}>
                Shared goals and ideas for your household
              </AppText>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Goals')}>
              <AppText style={styles.seeAllText}>See All</AppText>
            </TouchableOpacity>
          </View>
          {goals.map((goal) => (
            <GoalCard
              key={goal._id}
              goal={goal}
              onUpvote={async () => {
                try {
                  await goalsApi.upvoteGoal(goal._id);
                  loadData();
                } catch (error) {
                  console.error('Failed to upvote:', error);
                }
              }}
              currentUserId={user?._id || ''}
            />
          ))}
        </View>
      )}

      {/* Quick Tip Card */}
      {hasData && (
        <View style={styles.section}>
          <View style={styles.tipCard}>
            <Ionicons name="bulb-outline" size={24} color={colors.accent} />
            <View style={styles.tipContent}>
              <AppText style={styles.tipTitle}>Quick Tip</AppText>
              <AppText style={styles.tipText}>
                {stats.monthlyExpenses > 0 
                  ? "Review your spending by category to identify areas where you can save money."
                  : "Start tracking expenses to get personalized insights and better manage your household budget."}
              </AppText>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
};
