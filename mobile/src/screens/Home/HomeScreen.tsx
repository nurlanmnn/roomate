import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import { formatDate } from '../../utils/dateHelpers';
import { formatCurrency } from '../../utils/formatCurrency';

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

  useEffect(() => {
    if (selectedHousehold) {
      loadData();
    }
  }, [selectedHousehold]);

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

      const [eventsData, balancesData, goalsData, expensesData] = await Promise.all([
        eventsApi.getEvents(selectedHousehold._id),
        expensesApi.getBalances(selectedHousehold._id),
        goalsApi.getGoals(selectedHousehold._id),
        expensesApi.getExpenses(selectedHousehold._id),
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
    } catch (error) {
      console.error('Failed to load home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId: string): string => {
    if (!selectedHousehold) return 'Unknown';
    const member = selectedHousehold.members.find(m => m._id === userId);
    return member?.name || 'Unknown';
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
            icon="💰"
            label="This Month"
            value={formatCurrency(stats.monthlyExpenses)}
          />
          <StatsCard
            icon="🛒"
            label="Shopping"
            value={stats.pendingShopping}
          />
          <StatsCard
            icon="📅"
            label="Events"
            value={stats.upcomingEventsCount}
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
              icon="💰"
              label="Add Expense"
              onPress={() => {
                navigation.getParent()?.navigate('CreateExpense');
              }}
            />
            <QuickActionButton
              icon="🛒"
              label="Shopping List"
              onPress={() => navigation.navigate('Shopping')}
            />
            <QuickActionButton
              icon="🎯"
              label="New Goal"
              onPress={() => navigation.navigate('Goals')}
            />
            <QuickActionButton
              icon="📅"
              label="Add Event"
              onPress={() => navigation.navigate('Calendar')}
            />
          </View>
        </View>
      )}

      {/* Balance Summary */}
      {user && balances.length > 0 && (
        <View style={styles.section}>
          <BalanceSummary
            balances={balances}
            currentUserId={user._id}
            getUserName={getUserName}
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
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  welcomeSection: {
    padding: 24,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

