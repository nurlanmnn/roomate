import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { eventsApi, Event } from '../../api/eventsApi';
import { expensesApi, PairwiseBalance } from '../../api/expensesApi';
import { goalsApi, Goal } from '../../api/goalsApi';
import { EventCard } from '../../components/EventCard';
import { BalanceSummary } from '../../components/BalanceSummary';
import { GoalCard } from '../../components/GoalCard';
import { formatDate } from '../../utils/dateHelpers';

export const HomeScreen: React.FC = () => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [balances, setBalances] = useState<PairwiseBalance[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
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
      const [eventsData, balancesData, goalsData] = await Promise.all([
        eventsApi.getEvents(selectedHousehold._id),
        expensesApi.getBalances(selectedHousehold._id),
        goalsApi.getGoals(selectedHousehold._id),
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

  if (!selectedHousehold) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Please select a household</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{selectedHousehold.name}</Text>
        {selectedHousehold.address && (
          <Text style={styles.address}>{selectedHousehold.address}</Text>
        )}
      </View>

      {user && balances.length > 0 && (
        <View style={styles.section}>
          <BalanceSummary
            balances={balances}
            currentUserId={user._id}
            getUserName={getUserName}
          />
        </View>
      )}

      {events.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          {events.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </View>
      )}

      {goals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Goals</Text>
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

      {events.length === 0 && balances.length === 0 && goals.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data to display yet</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

