import React, { useEffect, useState, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { eventsApi, Event } from '../../api/eventsApi';
import { EventCard } from '../../components/EventCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { CalendarView } from '../../components/CalendarView';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../utils/dateHelpers';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { format, isSameDay, parseISO } from 'date-fns';

type ViewMode = 'upcoming' | 'past' | 'all';

export const CalendarScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('upcoming');

  const isCreator = (event: Event) => event.createdBy?._id === user?._id;

  useEffect(() => {
    if (selectedHousehold) loadEvents();
  }, [selectedHousehold]);

  // Reload events when screen comes into focus
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

  const handleAddEventOnDate = (date: Date) => {
    navigation.navigate('CreateEvent', { preselectedDate: date.toISOString() });
  };

  // Get all event dates for calendar dots
  const eventDates = useMemo(() => events.map((e) => e.date), [events]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    return events.filter((e) => isSameDay(parseISO(e.date), selectedDate));
  }, [events, selectedDate]);

  // Get filtered events based on view mode
  const filteredEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch (viewMode) {
      case 'upcoming':
        return events.filter((e) => new Date(e.date) >= now).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case 'past':
        return events.filter((e) => new Date(e.date) < now).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'all':
      default:
        return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  }, [events, viewMode]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    filteredEvents.forEach((event) => {
      const dateKey = formatDate(event.date);
      (grouped[dateKey] ||= []).push(event);
    });
    return grouped;
  }, [filteredEvents]);

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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadEvents} />}
      >
        {/* Header with view mode selector */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => {
              const modes: ViewMode[] = ['upcoming', 'past', 'all'];
              const currentIndex = modes.indexOf(viewMode);
              setViewMode(modes[(currentIndex + 1) % modes.length]);
            }}
          >
            <Text style={styles.viewModeText}>
              {viewMode === 'upcoming' ? 'Upcoming' : viewMode === 'past' ? 'Past' : 'All'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.eventCount}>{filteredEvents.length} Total</Text>
        </View>

        {/* Calendar */}
        <CalendarView
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          eventDates={eventDates}
          onAddEvent={handleAddEventOnDate}
        />

        {/* Selected date events */}
        {selectedDateEvents.length > 0 && (
          <View style={styles.selectedDateSection}>
            <View style={styles.selectedDateHeader}>
              <Text style={styles.selectedDateTitle}>
                {format(selectedDate, 'EEEE, MMM d')}
              </Text>
              <TouchableOpacity
                style={styles.addOnDateButton}
                onPress={() => handleAddEventOnDate(selectedDate)}
              >
                <Ionicons name="add-circle" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {selectedDateEvents.map((event) => (
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
        )}

        {/* Quick add event hint */}
        {selectedDateEvents.length === 0 && (
          <View style={styles.emptyDateHint}>
            <Ionicons name="calendar-outline" size={32} color={colors.textTertiary} />
            <Text style={styles.emptyDateTitle}>
              {format(selectedDate, 'EEEE, MMM d')}
            </Text>
            <Text style={styles.emptyDateText}>
              No events on this day
            </Text>
            <TouchableOpacity
              style={styles.addEventHintButton}
              onPress={() => handleAddEventOnDate(selectedDate)}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.addEventHintText}>Add Event</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* All events list */}
        <View style={styles.allEventsSection}>
          <View style={styles.allEventsHeader}>
            <Text style={styles.sectionTitle}>
              {viewMode === 'upcoming' ? 'Upcoming Events' : viewMode === 'past' ? 'Past Events' : 'All Events'}
            </Text>
            <PrimaryButton
              title="+ Add Event"
              onPress={() => navigation.navigate('CreateEvent')}
            />
          </View>

          {Object.keys(eventsByDate).length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title={viewMode === 'upcoming' ? 'No upcoming events' : viewMode === 'past' ? 'No past events' : 'No events yet'}
              message="Tap on any date to add an event, or use the button above."
              variant="minimal"
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    viewModeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    viewModeText: {
      fontSize: fontSizes.xxl,
      fontWeight: fontWeights.extrabold,
      color: colors.text,
    },
    eventCount: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
      fontWeight: fontWeights.medium,
    },
    emptyContainer: {
      padding: spacing.xxl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: fontSizes.md,
      color: colors.muted,
    },
    selectedDateSection: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    selectedDateHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    selectedDateTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    addOnDateButton: {
      padding: spacing.xs,
    },
    emptyDateHint: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.md,
      marginHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.xs as object),
    },
    emptyDateTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      marginTop: spacing.sm,
    },
    emptyDateText: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
    },
    addEventHintButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.primaryUltraSoft,
      borderRadius: radii.md,
    },
    addEventHintText: {
      fontSize: fontSizes.sm,
      color: colors.primary,
      fontWeight: fontWeights.semibold,
    },
    allEventsSection: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    allEventsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    dateSection: {
      marginBottom: spacing.md,
    },
    dateHeader: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      marginBottom: spacing.sm,
      color: colors.textSecondary,
    },
    eventWrapper: {
      marginBottom: spacing.sm,
    },
    eventActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.md,
      marginTop: spacing.xs,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      padding: spacing.xs,
    },
    editText: {
      color: colors.primary,
      fontSize: fontSizes.sm,
    },
    deleteText: {
      color: colors.danger,
      fontSize: fontSizes.sm,
    },
  });
