import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
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
  updateCached,
} from '../../utils/queryCache';
import { Avatar } from '../../components/ui/Avatar';
import {
  getChoreAssigneeAt,
  getChorePeriodBounds,
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
  const { t } = useLanguage();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [events, setEvents] = useState<Event[]>([]);
  const [chores, setChores] = useState<ChoreRotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('upcoming');
  const [calendarListVisibleCount, setCalendarListVisibleCount] = useState(CALENDAR_LIST_PAGE_SIZE);
  const scrollRef = useRef<ScrollView>(null);
  const loadEventsRef = useRef<(() => void) | undefined>(undefined);

  const isCreator = (event: Event) => event.createdBy?._id === user?._id;

  useEffect(() => {
    setCalendarListVisibleCount(CALENDAR_LIST_PAGE_SIZE);
  }, [viewMode, events.length]);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      loadEventsRef.current?.();
    }, [])
  );

  const loadEvents = useCallback(async () => {
    if (!selectedHousehold) return;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    const key = calendarKey(selectedHousehold._id, weekKey);

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
          eventsApi.getEvents(selectedHousehold._id),
          choresApi.getChores(selectedHousehold._id, weekKey).catch(() => []),
        ]);
        const eventsData = Array.isArray(eventsRaw) ? eventsRaw : eventsRaw.items;
        return { events: eventsData, chores: choresData };
      });
      setEvents(snapshot.events);
      setChores(snapshot.chores);
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load events:', error);
      if (error?.response?.status === 403) {
        setSelectedHousehold(null);
      }
    } finally {
      setLoading(false);
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

  /**
   * Toggle completion for the chore's current period. We flip local state
   * (and the shared cache) immediately, then reconcile with the server.
   * On failure we roll back so the UI doesn't lie.
   */
  const handleToggleChoreComplete = useCallback(
    async (chore: ChoreRotation) => {
      if (!selectedHousehold || !user) return;

      const wasCompleted = chore.currentPeriodCompleted === true;
      const periodStartIso =
        chore.currentPeriodStart ??
        new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

      const patchOne = (c: ChoreRotation): ChoreRotation => {
        if (c._id !== chore._id) return c;
        const existing = c.completions ?? [];
        const withoutThis = existing.filter(
          (rec) =>
            new Date(rec.periodStart).getTime() !==
            new Date(periodStartIso).getTime()
        );
        return {
          ...c,
          currentPeriodCompleted: !wasCompleted,
          completions: wasCompleted
            ? withoutThis
            : [
                ...withoutThis,
                {
                  periodStart: periodStartIso,
                  completedBy: user._id,
                  completedAt: new Date().toISOString(),
                },
              ],
        };
      };

      // Optimistic: local + cache.
      setChores((prev) => prev.map(patchOne));
      const weekKey = format(
        startOfWeek(new Date(), { weekStartsOn: 1 }),
        'yyyy-MM-dd'
      );
      const cacheKey = calendarKey(selectedHousehold._id, weekKey);
      updateCached<CalendarSnapshot>(cacheKey, (prev) => ({
        ...prev,
        chores: prev.chores.map(patchOne),
      }));

      try {
        const updated = wasCompleted
          ? await choresApi.markIncomplete(chore._id, periodStartIso)
          : await choresApi.markComplete(chore._id, periodStartIso);

        // Replace with the authoritative server record (keeps completions
        // array fully in sync, not just the currentPeriod flag).
        const replaceOne = (c: ChoreRotation): ChoreRotation =>
          c._id === updated._id ? { ...c, ...updated } : c;
        setChores((prev) => prev.map(replaceOne));
        updateCached<CalendarSnapshot>(cacheKey, (prev) => ({
          ...prev,
          chores: prev.chores.map(replaceOne),
        }));
        invalidateCache(`home:dashboard:${selectedHousehold._id}`);
      } catch (error: any) {
        // Rollback to the pre-toggle state.
        const rollback = (c: ChoreRotation): ChoreRotation =>
          c._id === chore._id ? chore : c;
        setChores((prev) => prev.map(rollback));
        updateCached<CalendarSnapshot>(cacheKey, (prev) => ({
          ...prev,
          chores: prev.chores.map(rollback),
        }));
        Alert.alert(
          t('common.error'),
          error?.response?.data?.error || t('alerts.somethingWentWrong')
        );
      }
    },
    [selectedHousehold, user, t]
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
    }>;
    return chores
      .map((chore) => {
        const bounds = getChorePeriodBounds(chore, selectedDate);
        const assignee = getChoreAssigneeAt(chore, selectedDate);
        if (!bounds || !assignee) return null;
        // Hide completed chores from the selected-day list — same rationale as
        // the calendar dots: the user has already taken care of it.
        if (isPeriodCompleted(chore, selectedDate)) return null;
        return {
          chore,
          assignee,
          periodStart: bounds.start,
          periodEnd: bounds.end,
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
      const dateKey = formatDate(event.date);
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

  if (!selectedHousehold) {
    return (
      <SanctuaryScreenShell edges={['top', 'bottom']} innerStyle={styles.container}>
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>{t('alerts.selectHousehold')}</AppText>
        </View>
      </SanctuaryScreenShell>
    );
  }

  return (
    <SanctuaryScreenShell edges={['top']} innerStyle={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadEvents} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title={t('calendar.title')}
          subtitle={selectedHousehold.name}
          rightText={t('calendar.addEvent')}
          onRightPress={() => navigation.navigate('CreateEvent')}
        />

        <SettingsSection title={t('calendar.sectionCalendar')}>
          <SettingsGroupCard>
            <CalendarView
              embedded
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              eventDates={eventDates}
              choreDates={userChoreDates}
              onAddEvent={handleAddEventOnDate}
            />
            <View style={styles.calendarLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <AppText style={styles.legendText}>{t('home.events')}</AppText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                <AppText style={styles.legendText}>{t('chores.yourTurn')}</AppText>
              </View>
            </View>
            <View style={styles.calendarHint}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
              <AppText style={styles.calendarHintText}>{t('calendar.longPressToAdd')}</AppText>
            </View>
          </SettingsGroupCard>
        </SettingsSection>

        <SettingsSection title={t('chores.choreRotation')}>
          <SettingsGroupCard>
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate('ChoreRotation')}
              activeOpacity={0.7}
              style={styles.choreHeader}
            >
              <View style={styles.choreHeaderTitleRow}>
                <View style={styles.choreHeaderIcon}>
                  <Ionicons name="repeat" size={18} color={colors.primary} />
                </View>
                <View style={styles.choreHeaderText}>
                  <AppText style={styles.choreHeaderTitle}>
                    {chores.length > 0
                      ? t('chores.thisWeek')
                      : t('chores.setUpDescription')}
                  </AppText>
                  {chores.length > 0 ? (
                    <AppText style={styles.choreHeaderSubtitle}>
                      {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d')}
                      {' – '}
                      {format(
                        addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6),
                        'MMM d'
                      )}
                    </AppText>
                  ) : null}
                </View>
              </View>
              <View style={styles.choreManageButton} pointerEvents="none">
                <AppText style={styles.choreManageLabel}>
                  {chores.length > 0 ? t('chores.manage') : t('chores.setUp')}
                </AppText>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </View>
            </TouchableOpacity>

            {chores.length > 0 ? (
              <View style={styles.choreList}>
                {chores.map((chore, index) => {
                  const assignee = chore.currentAssignee;
                  const isMyTurn = !!user && assignee?._id === user._id;
                  const isCompleted = chore.currentPeriodCompleted === true;
                  const memberData = assignee
                    ? chore.rotationOrder.find((m) => m._id === assignee._id)
                    : null;
                  const isLast = index === chores.length - 1;
                  return (
                    <View
                      key={chore._id}
                      style={[
                        styles.choreRow,
                        isMyTurn && !isCompleted && styles.choreRowMine,
                        isCompleted && styles.choreRowDone,
                        !isLast && !isCompleted && !isMyTurn && styles.choreRowBorder,
                      ]}
                    >
                      <View
                        style={[
                          styles.choreRowIcon,
                          isMyTurn && !isCompleted && styles.choreRowIconMine,
                          isCompleted && styles.choreRowIconDone,
                        ]}
                      >
                        <Ionicons
                          name={isCompleted ? 'checkmark' : 'sparkles'}
                          size={18}
                          color={
                            isCompleted
                              ? colors.success
                              : isMyTurn
                                ? colors.accent
                                : colors.primary
                          }
                        />
                      </View>
                      <View style={styles.choreRowBody}>
                        <AppText
                          style={[
                            styles.choreRowName,
                            isCompleted && styles.choreRowNameDone,
                          ]}
                          numberOfLines={1}
                        >
                          {chore.name}
                        </AppText>
                        <View style={styles.choreRowAssigneeRow}>
                          {assignee && !isCompleted ? (
                            <Avatar
                              name={assignee.name}
                              uri={memberData?.avatarUrl}
                              size={18}
                            />
                          ) : null}
                          <AppText
                            style={[
                              styles.choreRowAssigneeName,
                              isCompleted && styles.choreRowAssigneeNameDone,
                            ]}
                            numberOfLines={1}
                          >
                            {isCompleted
                              ? t('chores.done')
                              : isMyTurn
                                ? t('chores.youreOn')
                                : assignee?.name ?? t('chores.noAssignee')}
                            {'  ·  '}
                            {chore.frequency === 'biweekly'
                              ? t('chores.biweekly')
                              : t('chores.weekly')}
                          </AppText>
                        </View>
                      </View>
                      {isMyTurn ? (
                        <TouchableOpacity
                          onPress={() => handleToggleChoreComplete(chore)}
                          activeOpacity={0.8}
                          style={[
                            styles.choreDoneButton,
                            isCompleted && styles.choreDoneButtonCompleted,
                          ]}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons
                            name={isCompleted ? 'arrow-undo' : 'checkmark-circle'}
                            size={16}
                            color={isCompleted ? colors.textSecondary : colors.surface}
                          />
                          <AppText
                            style={[
                              styles.choreDoneButtonText,
                              isCompleted && styles.choreDoneButtonTextCompleted,
                            ]}
                          >
                            {isCompleted ? t('chores.undo') : t('chores.markDone')}
                          </AppText>
                        </TouchableOpacity>
                      ) : isCompleted ? (
                        <View style={styles.choreDoneBadge}>
                          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                          <AppText style={styles.choreDoneBadgeText}>
                            {t('chores.done')}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}
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

            {selectedDateChores.length > 0 ? (
              <View style={styles.selectedDayChores}>
                {selectedDateChores.map(({ chore, assignee }) => {
                  const isMyTurn = !!user && assignee?._id === user._id;
                  return (
                    <View
                      key={`sel-${chore._id}`}
                      style={[
                        styles.selectedDayChoreRow,
                        isMyTurn && styles.selectedDayChoreRowMine,
                      ]}
                    >
                      <Ionicons
                        name={isMyTurn ? 'sparkles' : 'sparkles-outline'}
                        size={16}
                        color={isMyTurn ? colors.accent : colors.primary}
                      />
                      <AppText
                        style={[
                          styles.selectedDayChoreText,
                          isMyTurn && styles.selectedDayChoreTextMine,
                        ]}
                        numberOfLines={1}
                      >
                        {chore.name}
                        {' · '}
                        {isMyTurn ? t('chores.youreOn') : assignee?.name ?? '—'}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            ) : null}

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
            {hasMoreCalendarEvents ? (
              <TouchableOpacity
                style={styles.calendarLoadMore}
                onPress={() =>
                  setCalendarListVisibleCount((n) => n + CALENDAR_LIST_PAGE_SIZE)
                }
                activeOpacity={0.75}
              >
                <AppText style={styles.calendarLoadMoreText}>
                  {t('common.loadMore')} ({pagedListEvents.length}/{filteredEvents.length})
                </AppText>
              </TouchableOpacity>
            ) : null}
          </SettingsGroupCard>
        </SettingsSection>
      </ScrollView>
    </SanctuaryScreenShell>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
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
      backgroundColor: colors.primaryUltraSoft,
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
    calendarLegend: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.xs,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      fontWeight: fontWeights.medium,
    },
    choreHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
      gap: spacing.md,
    },
    choreHeaderTitleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minWidth: 0,
    },
    choreHeaderIcon: {
      width: 36,
      height: 36,
      borderRadius: radii.md,
      backgroundColor: colors.primaryUltraSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    choreHeaderText: {
      flex: 1,
      minWidth: 0,
    },
    choreHeaderTitle: {
      fontSize: fontSizes.md,
      color: colors.text,
      fontWeight: fontWeights.semibold,
    },
    choreHeaderSubtitle: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    choreManageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.primaryUltraSoft,
      borderRadius: radii.pill,
    },
    choreManageLabel: {
      fontSize: fontSizes.sm,
      color: colors.primary,
      fontWeight: fontWeights.semibold,
    },
    choreList: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.xs,
    },
    choreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
      backgroundColor: 'transparent',
    },
    choreRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
      borderRadius: 0,
    },
    choreRowMine: {
      backgroundColor: colors.accentUltraSoft,
      borderBottomWidth: 0,
      borderRadius: radii.md,
    },
    choreRowIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryUltraSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    choreRowIconMine: {
      backgroundColor: colors.surface,
    },
    choreRowBody: {
      flex: 1,
      minWidth: 0,
    },
    choreRowName: {
      fontSize: fontSizes.md,
      color: colors.text,
      fontWeight: fontWeights.semibold,
    },
    choreRowAssigneeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: 2,
    },
    choreRowAssigneeName: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    choreRowAssigneeNameDone: {
      color: colors.success,
      fontWeight: fontWeights.semibold,
    },
    choreRowFrequency: {
      fontSize: fontSizes.xs,
      color: colors.textTertiary,
    },
    choreRowBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      backgroundColor: colors.accent,
      borderRadius: radii.pill,
    },
    choreRowBadgeText: {
      fontSize: fontSizes.xs,
      color: colors.surface,
      fontWeight: fontWeights.bold,
    },
    choreRowDone: {
      backgroundColor: colors.successSoft,
      borderRadius: radii.md,
    },
    choreRowIconDone: {
      backgroundColor: colors.surface,
    },
    choreRowNameDone: {
      color: colors.textSecondary,
      textDecorationLine: 'line-through',
    },
    choreDoneButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      paddingVertical: 6,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.success,
      borderRadius: radii.pill,
    },
    choreDoneButtonCompleted: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    choreDoneButtonText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.bold,
      color: colors.surface,
    },
    choreDoneButtonTextCompleted: {
      color: colors.textSecondary,
    },
    choreDoneBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.successSoft,
    },
    choreDoneBadgeText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.success,
    },
    selectedDayChores: {
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    selectedDayChoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
      backgroundColor: colors.primaryUltraSoft,
    },
    selectedDayChoreRowMine: {
      backgroundColor: colors.accentUltraSoft,
    },
    selectedDayChoreText: {
      flex: 1,
      fontSize: fontSizes.sm,
      color: colors.text,
      fontWeight: fontWeights.medium,
    },
    selectedDayChoreTextMine: {
      color: colors.text,
      fontWeight: fontWeights.bold,
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
      paddingHorizontal: spacing.md,
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
    calendarLoadMore: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    calendarLoadMoreText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.primary,
    },
  });
