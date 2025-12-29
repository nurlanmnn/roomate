import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
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
import { formatCurrency } from '../../utils/formatCurrency';
import { colors, fontSizes, fontWeights, spacing, lineHeights, radii, shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [balances, setBalances] = useState<PairwiseBalance[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [insights, setInsights] = useState<any>(null);

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
    } catch (error) {
      console.error('Failed to load home data:', error);
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

  if (!selectedHousehold) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please select a household</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading indicator on initial load
  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
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
      <View style={styles.header}>
        <Text style={styles.title}>{selectedHousehold.name}</Text>
        {selectedHousehold.address && (
          <Text style={styles.address}>{selectedHousehold.address}</Text>
        )}
      </View>

      {/* Quick Stats Cards */}
      {hasData && (
        <View style={styles.statsContainer}>
          <StatsCard
            icon={<Ionicons name="cash-outline" size={24} color={colors.primary} />}
            label="This Month"
            value={formatCurrency(stats.monthlyExpenses)}
            iconColor={colors.primary}
            iconBgColor={colors.primaryUltraSoft}
          />
          <StatsCard
            icon={<Ionicons name="cart-outline" size={24} color={colors.accent} />}
            label="Shopping"
            value={stats.pendingShopping}
            iconColor={colors.accent}
            iconBgColor={colors.accentUltraSoft}
          />
          <StatsCard
            icon={<Ionicons name="calendar-outline" size={24} color={colors.teal} />}
            label="Events"
            value={stats.upcomingEventsCount}
            iconColor={colors.teal}
            iconBgColor={colors.tealUltraSoft}
          />
        </View>
      )}

      {/* Welcome Message & Quick Actions for New Users */}
      {!hasData && (
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome to {selectedHousehold.name}! 👋</Text>
          <Text style={styles.welcomeText}>
            Get started by adding your first expense, creating a shopping list, or setting up a goal.
          </Text>
          <View style={styles.quickActionsContainer}>
            <QuickActionButton
              icon={<Ionicons name="add-circle-outline" size={22} color={colors.primary} />}
              label="Add Expense"
              onPress={() => {
                navigation.getParent()?.navigate('CreateExpense');
              }}
            />
            <QuickActionButton
              icon={<Ionicons name="cart-outline" size={22} color={colors.primary} />}
              label="Shopping List"
              onPress={() => navigation.navigate('Shopping')}
            />
            <QuickActionButton
              icon={<Ionicons name="flag-outline" size={22} color={colors.primary} />}
              label="New Goal"
              onPress={() => navigation.navigate('Goals')}
            />
            <QuickActionButton
              icon={<Ionicons name="calendar-outline" size={22} color={colors.primary} />}
              label="Add Event"
              onPress={() => navigation.navigate('Calendar')}
            />
          </View>
        </View>
      )}

      {/* Spending Insights & Charts */}
      {insights && insights.byCategory.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Spending Insights</Text>
          </View>
          <SpendingChart
            byCategory={insights.byCategory}
            monthlyTrend={insights.monthlyTrend}
            predictions={insights.predictions}
          />
        </View>
      )}

      {/* Balance Summary */}
      {user && balances.length > 0 && (
        <View style={styles.section}>
          <BalanceSummary
            balances={balances}
            currentUserId={user._id}
            getUserName={getUserName}
            getUserAvatar={getUserAvatar}
          />
        </View>
      )}

      {/* Upcoming Events */}
      {events.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
              <Text style={styles.seeAllText}>See All</Text>
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
            <Text style={styles.sectionTitle}>Active Goals</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Goals')}>
              <Text style={styles.seeAllText}>See All</Text>
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
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.muted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
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
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },
  welcomeSection: {
    padding: spacing.xxl,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...(shadows.sm as object),
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
    marginBottom: spacing.xl,
    lineHeight: lineHeights.md,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

