import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { eventsApi, Event } from '../../api/eventsApi';
import { choresApi, ChoreRotation } from '../../api/choresApi';
import { EventCard } from '../../components/EventCard';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { CalendarView } from '../../components/CalendarView';
import { EmptyState } from '../../components/ui/EmptyState';
import { AppText } from '../../components/AppText';
import { SettingsSection } from '../../components/Settings/SettingsSection';
import { SettingsGroupCard } from '../../components/Settings/SettingsGroupCard';
import { formatDate } from '../../utils/dateHelpers';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, TAB_BAR_HEIGHT } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { format, isSameDay, parseISO, startOfWeek } from 'date-fns';

type ViewMode = 'upcoming' | 'past' | 'all';

const VIEW_MODES: ViewMode[] = ['upcoming', 'past', 'all'];

export const CalendarScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold, setSelectedHousehold } = useHousehold();
  const { user } = useAuth();
  const { t } = useLanguage();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [events, setEvents] = useState<Event[]>([]);
  const [chores, setChores] = useState<ChoreRotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('upcoming');
  const scrollRef = useRef<ScrollView>(null);

  const isCreator = (event: Event) => event.createdBy?._id === user?._id;

  useEffect(() => {
    if (selectedHousehold) loadEvents();
  }, [selectedHousehold]);

  useFocusEffect(
    useCallback(() => {
      if (selectedHousehold) {
        loadEvents();
      }
    }, [selectedHousehold])
  );

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, [])
  );

  const loadEvents = async () => {
    if (!selectedHousehold) return;
    setLoading(true);
    try {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const [eventsData, choresData] = await Promise.all([
        eventsApi.getEvents(selectedHousehold._id),
        choresApi.getChores(selectedHousehold._id, weekKey).catch(() => []),
      ]);
      setEvents(eventsData);
      setChores(choresData);
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load events:', error);
      if (error?.response?.status === 403) {
        setSelectedHousehold(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvent = (event: Event) => {
    navigation.navigate('CreateEvent', { editingEvent: event });
  };

  const handleDeleteEvent = (event: Event) => {
    Alert.alert(t('common.delete'), t('calendar.deleteEventConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await eventsApi.deleteEvent(event._id);
            loadEvents();
          } catch (error: any) {
            Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
          }
        },
      },
    ]);
  };

  const handleAddEventOnDate = (date: Date) => {
    navigation.navigate('CreateEvent', { preselectedDate: date.toISOString() });
  };

  const eventDates = useMemo(() => events.map((e) => e.date), [events]);

  const selectedDateEvents = useMemo(() => {
    return events.filter((e) => isSameDay(parseISO(e.date), selectedDate));
  }, [events, selectedDate]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch (viewMode) {
      case 'upcoming':
        return events
          .filter((e) => new Date(e.date) >= now)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case 'past':
        return events
          .filter((e) => new Date(e.date) < now)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'all':
      default:
        return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  }, [events, viewMode]);

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    filteredEvents.forEach((event) => {
      const dateKey = formatDate(event.date);
      (grouped[dateKey] ||= []).push(event);
    });
    return grouped;
  }, [filteredEvents]);

  const listSectionTitle =
    viewMode === 'upcoming'
      ? t('home.upcomingEvents')
      : viewMode === 'past'
        ? t('calendar.past')
        : t('home.events');

  const filterLabel = (mode: ViewMode) => {
    if (mode === 'upcoming') return t('calendar.upcoming');
    if (mode === 'past') return t('calendar.past');
    return t('time.all');
  };

  if (!selectedHousehold) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>{t('alerts.selectHousehold')}</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadEvents} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title={t('calendar.title')}
          subtitle={selectedHousehold.name}
          rightText={t('calendar.addEvent')}
          onRightPress={() => navigation.navigate('CreateEvent')}
        />

        <SettingsSection title={t('calendar.sectionShow')}>
          <SettingsGroupCard>
            <View style={styles.filterBlock}>
              <View style={styles.filterRow}>
                {VIEW_MODES.map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.filterChip, viewMode === mode && styles.filterChipActive]}
                    onPress={() => setViewMode(mode)}
                    activeOpacity={0.85}
                  >
                    <AppText
                      style={[styles.filterChipText, viewMode === mode && styles.filterChipTextActive]}
                      numberOfLines={1}
                    >
                      {filterLabel(mode)}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
              <AppText style={styles.eventCountLine}>
                {filteredEvents.length} {t('home.events')}
              </AppText>
            </View>
          </SettingsGroupCard>
        </SettingsSection>

        <SettingsSection title={t('calendar.sectionCalendar')}>
          <SettingsGroupCard>
            <CalendarView
              embedded
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              eventDates={eventDates}
              onAddEvent={handleAddEventOnDate}
            />
            <View style={styles.calendarHint}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
              <AppText style={styles.calendarHintText}>{t('calendar.longPressToAdd')}</AppText>
            </View>
          </SettingsGroupCard>
        </SettingsSection>

        <SettingsSection title={t('chores.choreRotation')}>
          <SettingsGroupCard>
            <View style={styles.choreInner}>
              <View style={styles.choreSectionHeader}>
                <View style={styles.choreTitleRow}>
                  <View style={styles.choreIconWrap}>
                    <Ionicons name="repeat-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.choreTitleBlock}>
                    <AppText style={styles.choreSectionDescription}>
                      {chores.length > 0 ? t('chores.thisWeekAssignments') : t('chores.setUpDescription')}
                    </AppText>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.getParent()?.navigate('ChoreRotation')}
                  style={styles.choreActionButton}
                  activeOpacity={0.8}
                >
                  <AppText style={styles.choreActionLabel}>
                    {chores.length > 0 ? t('chores.manage') : t('chores.setUp')}
                  </AppText>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
              {chores.length > 0 ? (
                <View style={styles.choreChips}>
                  {chores.slice(0, 5).map((chore) => (
                    <View key={chore._id} style={styles.choreChip}>
                      <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                      <AppText style={styles.choreChipText} numberOfLines={1}>
                        {chore.name}: {chore.currentAssignee?.name ?? '—'}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </SettingsGroupCard>
        </SettingsSection>

        <SettingsSection title={t('calendar.sectionSelectedDay')}>
          <SettingsGroupCard>
            <View style={styles.selectedDayHeader}>
              <AppText style={styles.selectedDateTitle}>{format(selectedDate, 'EEEE, MMM d')}</AppText>
              <TouchableOpacity
                style={styles.addOnDateButton}
                onPress={() => handleAddEventOnDate(selectedDate)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add-circle" size={28} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {selectedDateEvents.length > 0 ? (
              selectedDateEvents.map((event) => (
                <View key={event._id} style={styles.eventBlock}>
                  <EventCard event={event} />
                  {isCreator(event) ? (
                    <View style={styles.eventActions}>
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleEditEvent(event)}>
                        <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                        <AppText style={styles.editText}>{t('common.edit')}</AppText>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteEvent(event)}>
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        <AppText style={styles.deleteText}>{t('common.delete')}</AppText>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ))
            ) : (
              <View style={styles.emptyDayInner}>
                <Ionicons name="calendar-outline" size={36} color={colors.textTertiary} />
                <AppText style={styles.emptyDateText}>{t('calendar.noEvents')}</AppText>
                <TouchableOpacity
                  style={styles.addEventHintButton}
                  onPress={() => handleAddEventOnDate(selectedDate)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <AppText style={styles.addEventHintText}>{t('calendar.addEvent')}</AppText>
                </TouchableOpacity>
              </View>
            )}
          </SettingsGroupCard>
        </SettingsSection>

        <SettingsSection title={listSectionTitle}>
          <SettingsGroupCard>
            {Object.keys(eventsByDate).length === 0 ? (
              <View style={styles.emptyListPad}>
                <EmptyState
                  icon="calendar-outline"
                  title={t('calendar.noEvents')}
                  message={t('calendar.longPressToAdd')}
                  variant="minimal"
                />
              </View>
            ) : (
              Object.entries(eventsByDate).map(([dateKey, dateEvents]) => (
                <View key={dateKey} style={styles.dateSection}>
                  <AppText style={styles.dateHeader}>{dateKey}</AppText>
                  {dateEvents.map((event) => (
                    <View key={event._id} style={styles.eventBlock}>
                      <EventCard event={event} />
                      {isCreator(event) ? (
                        <View style={styles.eventActions}>
                          <TouchableOpacity style={styles.actionButton} onPress={() => handleEditEvent(event)}>
                            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                            <AppText style={styles.editText}>{t('common.edit')}</AppText>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteEvent(event)}>
                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                            <AppText style={styles.deleteText}>{t('common.delete')}</AppText>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))
            )}
          </SettingsGroupCard>
        </SettingsSection>
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
    scrollContent: {
      paddingBottom: TAB_BAR_HEIGHT + spacing.xl,
    },
    emptyContainer: {
      padding: spacing.xxl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: fontSizes.md,
      color: colors.muted,
      textAlign: 'center',
    },
    filterBlock: {
      padding: spacing.md,
      gap: spacing.sm,
    },
    filterRow: {
      flexDirection: 'row',
      padding: spacing.xxs,
      gap: spacing.xxs,
      backgroundColor: colors.background,
      borderRadius: radii.md,
    },
    filterChip: {
      flex: 1,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 0,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
    },
    filterChipText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: colors.surface,
      fontWeight: fontWeights.semibold,
    },
    eventCountLine: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      fontWeight: fontWeights.medium,
      textAlign: 'center',
    },
    calendarHint: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      paddingTop: 0,
    },
    calendarHintText: {
      flex: 1,
      fontSize: fontSizes.xs,
      color: colors.textTertiary,
      lineHeight: 18,
    },
    choreInner: {
      padding: spacing.md,
    },
    choreSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    choreTitleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      minWidth: 0,
    },
    choreIconWrap: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
      backgroundColor: colors.primaryUltraSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    choreTitleBlock: {
      flex: 1,
      minWidth: 0,
    },
    choreSectionDescription: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    choreActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.primaryUltraSoft,
      borderRadius: radii.pill,
      marginLeft: spacing.sm,
    },
    choreActionLabel: {
      fontSize: fontSizes.sm,
      color: colors.primary,
      fontWeight: fontWeights.semibold,
    },
    choreChips: {
      marginTop: spacing.md,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    choreChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.background,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.borderLight,
      maxWidth: '100%',
    },
    choreChipText: {
      fontSize: fontSizes.sm,
      color: colors.text,
      flex: 1,
    },
    selectedDayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    selectedDateTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.bold,
      color: colors.text,
      flex: 1,
    },
    addOnDateButton: {
      padding: spacing.xs,
    },
    emptyDayInner: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    emptyDateText: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    addEventHintButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.primaryUltraSoft,
      borderRadius: radii.lg,
    },
    addEventHintText: {
      fontSize: fontSizes.sm,
      color: colors.primary,
      fontWeight: fontWeights.semibold,
    },
    eventBlock: {
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    eventActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.md,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.xs,
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
      fontWeight: fontWeights.medium,
    },
    deleteText: {
      color: colors.danger,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
    },
    emptyListPad: {
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.md,
      paddingTop: spacing.xs,
    },
    dateSection: {
      marginBottom: spacing.md,
    },
    dateHeader: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
  });
