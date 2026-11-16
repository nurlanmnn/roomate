import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { useFocusEffect } from '@react-navigation/native';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { eventsApi, Event } from '../../api/eventsApi';
import { choresApi, ChoreRotation } from '../../api/choresApi';
import { EventCard } from '../../components/EventCard';
import { EnamelHeader, HeaderIconButton } from '../../components/ui/EnamelHeader';
import { Sheet } from '../../components/ui/Sheet';
import { Group, GroupRow, SectionHeading } from '../../components/ui/Group';
import { CalendarView } from '../../components/CalendarView';
import { EmptyState } from '../../components/ui/EmptyState';
import { AppText } from '../../components/AppText';
import { formatCalendarListDateHeader } from '../../utils/dateHelpers';
import { getDateFnsLocale } from '../../utils/dateLocales';
import { useThemeColors, fontSizes, fontWeights, spacing, radii } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  getCached,
  dedupedFetch,
  invalidateCache,
  subscribe as subscribeCache,
  DEFAULT_STALE_TIME_MS,
} from '../../utils/queryCache';
import { ChoreRotationRow } from '../../components/ChoreRotationRow';
import { useChoreCompletion } from '../../hooks/useChoreCompletion';
import {
  getChoreAssigneeAt,
  getChorePeriodBounds,
  getChoreCompletionForDate,
  getChorePeriodStart,
  isPeriodCompleted,
} from '../../utils/choreSchedule';

type CalendarSnapshot = { events: Event[]; chores: ChoreRotation[] };
const calendarKey = (householdId: string, weekKey: string) =>
  `calendar:${householdId}:${weekKey}`;
const calendarInvalidatePrefix = (householdId: string) => `calendar:${householdId}`;

type ViewMode = 'upcoming' | 'past' | 'all';

const VIEW_MODES: ViewMode[] = ['upcoming', 'past', 'all'];

const CALENDAR_LIST_PAGE_SIZE = 5;

export const CalendarScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold, setSelectedHousehold } = useHousehold();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [reduceMotion, setReduceMotion] = useState(true);
  const reduceMotionRef = useRef(true);
  reduceMotionRef.current = reduceMotion;
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  const dateFnsLocale = useMemo(() => getDateFnsLocale(language), [language]);
  const listRelativeDayLabels = useMemo(
    () => ({
      today: t('time.today'),
      yesterday: t('time.yesterday'),
      tomorrow: t('time.tomorrow'),
    }),
    [t]
  );
  const [events, setEvents] = useState<Event[]>([]);
  const [chores, setChores] = useState<ChoreRotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('upcoming');
  const [calendarListVisibleCount, setCalendarListVisibleCount] = useState(CALENDAR_LIST_PAGE_SIZE);
  const scrollRef = useRef<ScrollView>(null);
  const loadEventsRef = useRef<((opts?: { allowStale?: boolean }) => void) | undefined>(undefined);
  const loadRequestIdRef = useRef(0);

  const isCreator = (event: Event) => event.createdBy?._id === user?._id;

  useEffect(() => {
    setCalendarListVisibleCount(CALENDAR_LIST_PAGE_SIZE);
  }, [viewMode, events.length]);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: !reduceMotionRef.current });
      loadEventsRef.current?.({ allowStale: true });
    }, [])
  );

  const loadEvents = useCallback(async (opts?: { allowStale?: boolean }) => {
    if (!selectedHousehold) return;
    const requestId = ++loadRequestIdRef.current;
    const householdId = selectedHousehold._id;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    const key = calendarKey(householdId, weekKey);

    // Paint from cache synchronously; only show the spinner if we truly
    // have nothing yet for this household + week.
    const cached = getCached<CalendarSnapshot>(key);
    if (cached) {
      setEvents(cached.events);
      setChores(cached.chores);
    } else {
      setLoading(true);
    }
    try {
      const snapshot = await dedupedFetch<CalendarSnapshot>(key, async () => {
        const [eventsRaw, choresData] = await Promise.all([
          eventsApi.getEvents(householdId),
          choresApi.getChores(householdId, weekKey).catch(() => []),
        ]);
        const eventsData = Array.isArray(eventsRaw) ? eventsRaw : eventsRaw.items;
        return { events: eventsData, chores: choresData };
      }, { staleTime: opts?.allowStale ? DEFAULT_STALE_TIME_MS : 0 });
      if (requestId !== loadRequestIdRef.current) return;
      setEvents(snapshot.events);
      setChores(snapshot.chores);
    } catch (error: any) {
      if (requestId !== loadRequestIdRef.current) return;
      if (__DEV__) console.error('Failed to load events:', error);
      if (error?.response?.status === 403) {
        setSelectedHousehold(null);
      }
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [selectedHousehold, setSelectedHousehold]);

  useEffect(() => {
    loadEventsRef.current = loadEvents;
  }, [loadEvents]);

  useEffect(() => {
    if (selectedHousehold) loadEvents();
  }, [selectedHousehold, loadEvents]);

  /**
   * Keep the list in sync with the shared query cache. When CreateEventScreen
   * patches the cache after saving, this subscription fires and copies the
   * updated snapshot into local state — so the new event is visible the
   * instant we pop back, without waiting for the focus refetch to round-trip.
   */
  useEffect(() => {
    if (!selectedHousehold) return;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const key = calendarKey(selectedHousehold._id, format(weekStart, 'yyyy-MM-dd'));
    const sync = () => {
      const snapshot = getCached<CalendarSnapshot>(key);
      if (!snapshot) return;
      setEvents(snapshot.events);
      setChores(snapshot.chores);
    };
    return subscribeCache(key, sync);
  }, [selectedHousehold?._id]);

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
          // Optimistic remove.
          const prev = events;
          setEvents((curr) => curr.filter((e) => e._id !== event._id));
          try {
            await eventsApi.deleteEvent(event._id);
            if (selectedHousehold) {
              invalidateCache(calendarInvalidatePrefix(selectedHousehold._id));
              invalidateCache(`home:dashboard:${selectedHousehold._id}`);
            }
          } catch (error: any) {
            setEvents(prev); // rollback
            Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
          }
        },
      },
    ]);
  };

  const handleAddEventOnDate = (date: Date) => {
    navigation.navigate('CreateEvent', { preselectedDate: date.toISOString() });
  };

  const { handleToggleChoreComplete } = useChoreCompletion({
    selectedHousehold,
    user,
    setChores,
    t,
    cacheKeyPrefix: 'calendar',
  });

  const handleGiveToChore = useCallback(
    (chore: ChoreRotation, referenceDate: Date) => {
      if (!selectedHousehold || !user) return;

      const periodStart = getChorePeriodStart(chore, referenceDate);
      if (!periodStart) return;

      const otherMembers = chore.rotationOrder.filter((m) => m._id !== user._id);
      if (otherMembers.length === 0) return;

      const periodStartIso = periodStart.toISOString();

      Alert.alert(
        t('chores.giveTo'),
        undefined,
        [
          { text: t('common.cancel'), style: 'cancel' },
          ...otherMembers.map((member) => ({
            text: t('chores.swapWeek', { name: member.name }),
            onPress: () => {
              Alert.alert(
                t('chores.giveTo'),
                t('chores.overrideConfirm', { name: member.name }),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('common.confirm'),
                    onPress: async () => {
                      try {
                        await choresApi.setOverride(chore._id, periodStartIso, member._id);
                        invalidateCache(`calendar:${selectedHousehold._id}`);
                        invalidateCache(`chores:${selectedHousehold._id}`);
                        invalidateCache(`home:dashboard:${selectedHousehold._id}`);
                        loadEvents();
                      } catch (error: any) {
                        Alert.alert(
                          t('common.error'),
                          error?.response?.data?.error || t('alerts.somethingWentWrong')
                        );
                      }
                    },
                  },
                ]
              );
            },
          })),
        ],
        { cancelable: true }
      );
    },
    [selectedHousehold, user, t, loadEvents]
  );

  const eventDates = useMemo(() => events.map((e) => e.date), [events]);

  /**
   * Pre-compute the ISO dates (yyyy-MM-dd) across the visible calendar window
   * where the current user is the chore assignee. We scan a ~3 month range
   * (prev / current / next) so scrolling the calendar to adjacent months
   * still shows the indicator without another pass. Cheap — at most
   * ~90 days * chores.length iterations of a constant-time modulo.
   */
  const userChoreDates = useMemo(() => {
    if (!user || chores.length === 0) return [] as string[];
    const today = new Date();
    const rangeStart = startOfWeek(startOfMonth(subMonths(today, 1)), { weekStartsOn: 0 });
    const rangeEnd = endOfWeek(endOfMonth(addMonths(today, 1)), { weekStartsOn: 0 });
    const set = new Set<string>();
    for (let d = rangeStart; d <= rangeEnd; d = addDays(d, 1)) {
      for (const chore of chores) {
        const assignee = getChoreAssigneeAt(chore, d);
        if (assignee?._id !== user._id) continue;
        // Once the period is ticked off, stop painting it on the calendar —
        // that's the whole point of "done": out of sight, out of mind.
        if (isPeriodCompleted(chore, d)) continue;
        set.add(format(d, 'yyyy-MM-dd'));
        break;
      }
    }
    return Array.from(set);
  }, [chores, user]);

  const selectedDateEvents = useMemo(() => {
    return events.filter((e) => isSameDay(parseISO(e.date), selectedDate));
  }, [events, selectedDate]);

  /** Chores whose current period contains the selected date, with the
   *  assignee resolved for that period. Powers the "Selected Day" section so
   *  tapping a future date tells you who's on duty that week. */
  const selectedDateChores = useMemo(() => {
    if (chores.length === 0) return [] as Array<{
      chore: ChoreRotation;
      assignee: ReturnType<typeof getChoreAssigneeAt>;
      periodStart: Date;
      periodEnd: Date;
      completion: ReturnType<typeof getChoreCompletionForDate>;
      isCompleted: boolean;
    }>;
    return chores
      .map((chore) => {
        const bounds = getChorePeriodBounds(chore, selectedDate);
        const assignee = getChoreAssigneeAt(chore, selectedDate);
        if (!bounds || !assignee) return null;
        const completion = getChoreCompletionForDate(chore, selectedDate);
        return {
          chore,
          assignee,
          periodStart: bounds.start,
          periodEnd: bounds.end,
          completion,
          isCompleted: completion !== null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [chores, selectedDate]);

  const filteredEvents = useMemo(() => {
    // Compare full date+time so today's events move to Past after they occur (not at midnight).
    const now = new Date();

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

  const pagedListEvents = useMemo(
    () => filteredEvents.slice(0, calendarListVisibleCount),
    [filteredEvents, calendarListVisibleCount]
  );

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    pagedListEvents.forEach((event) => {
      const dateKey = format(parseISO(event.date), 'yyyy-MM-dd');
      (grouped[dateKey] ||= []).push(event);
    });
    return grouped;
  }, [pagedListEvents]);

  const hasMoreCalendarEvents = calendarListVisibleCount < filteredEvents.length;

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

  const renderEvent = (event: Event) => (
    <View key={event._id}>
      <EventCard event={event} />
      {isCreator(event) ? (
        <View style={styles.eventActions}>
          <TouchableOpacity style={styles.action} onPress={() => handleEditEvent(event)} accessibilityRole="button">
            <Ionicons name="pencil-outline" size={22} color={colors.primary} />
            <AppText style={styles.actionText}>{t('common.edit')}</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.action} onPress={() => handleDeleteEvent(event)} accessibilityRole="button">
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
            <AppText style={[styles.actionText, { color: colors.danger }]}>{t('common.delete')}</AppText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  return (
    <SanctuaryScreenShell edges={[]} innerStyle={styles.container}>
      <EnamelHeader
        title={t('tabs.calendar')}
        subtitle={selectedHousehold ? `${selectedHousehold.name} · ${format(new Date(), 'MMMM yyyy', { locale: dateFnsLocale })}` : undefined}
        right={selectedHousehold ? <>
          <HeaderIconButton
            icon="today-outline"
            accessibilityLabel={t('calendar.today')}
            onPress={() => setSelectedDate(new Date())}
          />
          <HeaderIconButton
            icon="add-outline"
            accessibilityLabel={t('calendar.addEvent')}
            onPress={() => navigation.navigate('CreateEvent')}
          />
        </> : undefined}
      />
      <Sheet>
        {!selectedHousehold ? (
          <View style={styles.emptyContainer}><AppText style={styles.emptyText}>{t('alerts.selectHousehold')}</AppText></View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadEvents} tintColor={colors.primary} />}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            showsVerticalScrollIndicator={false}
          >
            <Group style={styles.calendarGroup}>
              <View>
                <CalendarView
                  embedded
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  eventDates={eventDates}
                  choreDates={userChoreDates}
                  onAddEvent={handleAddEventOnDate}
                />
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.eventDot, { backgroundColor: colors.primary }]} />
                    <AppText style={styles.legendText}>{t('home.events')}</AppText>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.choreDot, { backgroundColor: colors.marigold }]} />
                    <AppText style={styles.legendText}>{t('chores.yourTurn')}</AppText>
                  </View>
                </View>
                <AppText style={styles.hint}>{t('calendar.longPressToAdd')}</AppText>
              </View>
            </Group>

            <SectionHeading title={t('calendar.sectionSelectedDay')} />
            <Group>
              <GroupRow
                title={format(selectedDate, 'EEEE, MMM d', { locale: dateFnsLocale })}
                trailing={
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleAddEventOnDate(selectedDate)}
                    accessibilityRole="button"
                    accessibilityLabel={t('calendar.addEvent')}
                  >
                    <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
                  </TouchableOpacity>
                }
              />
              {selectedDateChores.map(({ chore }, index) => (
                <ChoreRotationRow
                  key={`sel-${chore._id}`}
                  chore={chore}
                  user={user}
                  referenceDate={selectedDate}
                  onToggleComplete={handleToggleChoreComplete}
                  onGiveTo={handleGiveToChore}
                  dateFnsLocale={dateFnsLocale}
                  t={t}
                  colors={colors}
                  showDoneBy
                  isLast={index === selectedDateChores.length - 1}
                />
              ))}
              {selectedDateEvents.map(renderEvent)}
              {selectedDateEvents.length === 0 && selectedDateChores.length === 0 ? (
                <GroupRow
                  title={t('chores.noChoresOnDay')}
                  subtitle={t('calendar.addEvent')}
                  icon="add-circle-outline"
                  onPress={() => handleAddEventOnDate(selectedDate)}
                  chevron
                />
              ) : null}
            </Group>

            <SectionHeading
              title={t('chores.choreRotation')}
              actionLabel={chores.length > 0 ? t('chores.manage') : t('chores.setUp')}
              onAction={() => navigation.getParent()?.navigate('ChoreRotation')}
            />
            <Group>
              <GroupRow
                title={chores.length > 0 ? t('chores.currentPeriod') : t('chores.setUpDescription')}
                subtitle={chores.length > 0 ? `${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d', { locale: dateFnsLocale })} – ${format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6), 'MMM d', { locale: dateFnsLocale })}` : undefined}
                icon="repeat-outline"
                chevron
                onPress={() => navigation.getParent()?.navigate('ChoreRotation')}
              />
              {chores.map((chore, index) => (
                <ChoreRotationRow
                  key={chore._id}
                  chore={chore}
                  user={user}
                  referenceDate={new Date()}
                  onToggleComplete={handleToggleChoreComplete}
                  onGiveTo={handleGiveToChore}
                  dateFnsLocale={dateFnsLocale}
                  t={t}
                  colors={colors}
                  showPeriodRange
                  isLast={index === chores.length - 1}
                />
              ))}
            </Group>

            <SectionHeading title={t('calendar.sectionShow')} />
            <View style={styles.filterRow} accessibilityRole="tablist">
              {VIEW_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.filterChip, viewMode === mode && styles.filterChipActive]}
                  onPress={() => setViewMode(mode)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: viewMode === mode }}
                >
                  <AppText style={[styles.filterText, viewMode === mode && styles.filterTextActive]}>{filterLabel(mode)}</AppText>
                </TouchableOpacity>
              ))}
            </View>
            <AppText style={styles.eventCount}>{filteredEvents.length} {t('home.events')}</AppText>
            <SectionHeading title={listSectionTitle} />
            {loading && events.length === 0 ? (
              <View style={styles.emptyContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : Object.keys(eventsByDate).length === 0 ? (
              <Group><EmptyState
                icon="calendar-outline"
                title={t('calendar.noEvents')}
                message={t('calendar.longPressToAdd')}
                variant="minimal"
              /></Group>
            ) : Object.entries(eventsByDate).map(([dateKey, dateEvents]) => (
              <Group key={dateKey} style={styles.dateGroup}>
                <GroupRow
                  title={formatCalendarListDateHeader(dateKey, dateFnsLocale, listRelativeDayLabels)}
                  icon="calendar-clear-outline"
                />
                {dateEvents.map(renderEvent)}
              </Group>
            ))}
            {hasMoreCalendarEvents ? (
              <TouchableOpacity
                style={styles.loadMore}
                onPress={() => setCalendarListVisibleCount((n) => n + CALENDAR_LIST_PAGE_SIZE)}
                accessibilityRole="button"
              >
                <AppText style={styles.actionText}>{t('common.loadMore')} ({pagedListEvents.length}/{filteredEvents.length})</AppText>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        )}
      </Sheet>
    </SanctuaryScreenShell>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  calendarGroup: { marginTop: spacing.md },
  emptyContainer: { padding: spacing.xxl, alignItems: 'center' },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center'
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: '100%'
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill
  },
  choreDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.textSecondary
  },
  legendText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    flexShrink: 1
  },
  hint: {
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  eventActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm
  },
  action: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
    maxWidth: '100%'
  },
  actionText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
    flexShrink: 1
  },
  filterRow: {
    marginHorizontal: spacing.md,
    padding: spacing.xxs,
    flexDirection: 'row',
    gap: spacing.xxs,
    backgroundColor: colors.surface,
    borderRadius: radii.md
  },
  filterChip: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    borderRadius: radii.sm
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center'
  },
  filterTextActive: { color: colors.onPrimary, fontWeight: fontWeights.semibold },
  eventCount: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs
  },
  dateGroup: { marginBottom: spacing.md },
  loadMore: {
    minHeight: 44,
    padding: spacing.md,
    alignItems: 'center'
  },
});
