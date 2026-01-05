import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { eventsApi, Event } from '../../api/eventsApi';
import { EventCard } from '../../components/EventCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { SearchBar } from '../../components/ui/SearchBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../utils/dateHelpers';
import { useThemeColors, fontSizes, fontWeights, spacing } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export const CalendarScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isCreator = (event: Event) => event.createdBy?._id === user?._id;

  useEffect(() => {
    if (selectedHousehold) loadEvents();
  }, [selectedHousehold]);

  // Reload events when screen comes into focus (e.g., after creating an event)
  useFocusEffect(
    React.useCallback(() => {
      if (selectedHousehold) {
        loadEvents();
      }
    }, [selectedHousehold])
  );

  const loadEvents = async () => {
    if (!selectedHousehold) return;
    setLoading(true);
    try {
      const data = await eventsApi.getEvents(selectedHousehold._id);
      setEvents(data);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvent = (event: Event) => {
    navigation.navigate('CreateEvent', { editingEvent: event });
  };

  const handleDeleteEvent = (event: Event) => {
    Alert.alert('Delete Event', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await eventsApi.deleteEvent(event._id);
            loadEvents();
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to delete event');
          }
        },
      },
    ]);
  };

  if (!selectedHousehold) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please select a household</Text>
        </View>
      </SafeAreaView>
    );
  }

  const q = searchQuery.trim().toLowerCase();
  const filteredEvents = q
    ? events.filter((e) => `${e.title} ${e.description || ''}`.toLowerCase().includes(q))
    : events;

  const eventsByDate: Record<string, Event[]> = {};
  filteredEvents.forEach((event) => {
    const dateKey = formatDate(event.date);
    (eventsByDate[dateKey] ||= []).push(event);
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <ScreenHeader title="Calendar" subtitle={selectedHousehold.name} />
        <View style={styles.topActions}>
          <PrimaryButton title="+ Add Event" onPress={() => navigation.navigate('CreateEvent')} />
        </View>
        <View style={styles.searchWrap}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search events" />
        </View>

        {Object.keys(eventsByDate).length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No events yet"
            message="Add an event so everyone stays in sync. Plan house meetings, bill due dates, or social gatherings."
            actionLabel="+ Add Event"
            onAction={() => navigation.navigate('CreateEvent')}
          />
        ) : (
          Object.entries(eventsByDate).map(([dateKey, dateEvents]) => (
            <View key={dateKey} style={styles.dateSection}>
              <Text style={styles.dateHeader}>{dateKey}</Text>
              {dateEvents.map((event) => (
                <View key={event._id} style={styles.eventWrapper}>
                  <EventCard event={event} />
                  {isCreator(event) && (
                    <View style={styles.eventActions}>
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleEditEvent(event)}>
                        <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                        <Text style={styles.editText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteEvent(event)}>
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        <Text style={styles.deleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  topActions: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  searchWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  emptyContainer: { padding: spacing.xxl, alignItems: 'center' },
  emptyText: { fontSize: fontSizes.md, color: colors.muted },
  dateSection: { padding: spacing.md },
  dateHeader: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, marginBottom: spacing.md, color: colors.text },
  eventWrapper: { marginBottom: spacing.md },
  eventActions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: spacing.md, 
    marginTop: spacing.xs 
  },
  actionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.xxs,
    padding: spacing.xs,
  },
  editText: { color: colors.primary, fontSize: fontSizes.sm },
  deleteText: { color: colors.danger, fontSize: fontSizes.sm },
});




