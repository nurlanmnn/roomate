import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AppText } from './AppText';
import { useThemeColors, fontSizes, fontWeights, spacing, radii } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import { getDateFnsLocale } from '../utils/dateLocales';

interface CalendarViewProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  eventDates: string[]; // Array of ISO date strings that have events
  /** ISO date strings (yyyy-MM-dd or full ISO) where the current user is on chore duty. */
  choreDates?: string[];
  onAddEvent?: (date: Date) => void;
  /** When true, sits inside a grouped list without outer margins. */
  embedded?: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  selectedDate,
  onSelectDate,
  eventDates,
  choreDates = [],
  onAddEvent,
  embedded = false,
}) => {
  const colors = useThemeColors();
  const { t, language } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // The header's Today action brings its selected day back into view.
  useEffect(() => { if (isToday(selectedDate)) setCurrentMonth(selectedDate); }, [selectedDate]);
  const [gridWidth, setGridWidth] = useState(7 * 44);
  const dateFnsLocale = useMemo(() => getDateFnsLocale(language), [language]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing.md,
          marginHorizontal: spacing.md,
          marginBottom: spacing.md,
        },
        containerEmbedded: {
          backgroundColor: colors.surface,
          marginHorizontal: 0,
          marginBottom: 0,
          borderWidth: 0,
          paddingHorizontal: spacing.xxs,
          paddingVertical: spacing.xs,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.md,
          paddingHorizontal: spacing.xs,
        },
        monthTitle: {
          flex: 1,
          textAlign: 'center',
          fontSize: 20,
          fontWeight: fontWeights.bold,
          color: colors.text,
        },
        navButton: {
          minWidth: 44,
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radii.pill,
          backgroundColor: colors.surfaceAlt,
        },
        weekDays: {
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginBottom: spacing.sm,
        },
        weekDayText: {
          flexShrink: 1,
          width: '14.285714%',
          textAlign: 'center',
          fontSize: fontSizes.sm,
          fontWeight: fontWeights.semibold,
          color: colors.textSecondary,
        },
        daysGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
        },
        dayCell: {
          width: '14.285714%',
          minHeight: 52,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xxs,
        },
        dayButton: {
          width: '100%',
          minHeight: 48,
          paddingVertical: spacing.xs,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radii.pill,
        },
        dayButtonSelected: {
          backgroundColor: colors.enamel,
        },
        dayButtonToday: {
          borderWidth: 2,
          borderColor: colors.primary,
        },
        dayText: {
          fontSize: fontSizes.md,
          fontWeight: fontWeights.medium,
          color: colors.text,
        },
        dayTextOtherMonth: {
          color: colors.textTertiary,
        },
        dayTextSelected: {
          color: colors.onEnamel,
          fontWeight: fontWeights.bold,
        },
        dayTextToday: {
          color: colors.primary,
          fontWeight: fontWeights.bold,
        },
        dotsRow: {
          position: 'absolute',
          bottom: spacing.xxs,
          flexDirection: 'row',
          gap: spacing.xxs,
        },
        eventDot: {
          width: 5,
          height: 5,
          borderRadius: radii.pill,
          backgroundColor: colors.primary,
        },
        eventDotSelected: {
          backgroundColor: colors.onEnamel,
        },
        choreDot: {
          width: 7,
          height: 7,
          borderWidth: 1,
          borderColor: colors.textSecondary,
          borderRadius: radii.pill,
          backgroundColor: colors.marigold,
        },
        choreDotSelected: {
          backgroundColor: colors.marigold,
        },

      }),
    [colors]
  );

  const containerStyles = [styles.container, embedded && styles.containerEmbedded];

  // Build event dates set for quick lookup
  const eventDatesSet = useMemo(() => {
    const set = new Set<string>();
    eventDates.forEach((dateStr) => {
      const d = parseISO(dateStr);
      set.add(format(d, 'yyyy-MM-dd'));
    });
    return set;
  }, [eventDates]);

  const choreDatesSet = useMemo(() => {
    const set = new Set<string>();
    choreDates.forEach((dateStr) => {
      // Accept either yyyy-MM-dd or a full ISO string.
      const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
        ? parseISO(`${dateStr}T00:00:00`)
        : parseISO(dateStr);
      if (!Number.isNaN(d.getTime())) set.add(format(d, 'yyyy-MM-dd'));
    });
    return set;
  }, [choreDates]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDayPress = (day: Date) => {
    onSelectDate(day);
  };

  const handleDayLongPress = (day: Date) => {
    onAddEvent?.(day);
  };

  const weekDays = [
    t('weekDays.sun'),
    t('weekDays.mon'),
    t('weekDays.tue'),
    t('weekDays.wed'),
    t('weekDays.thu'),
    t('weekDays.fri'),
    t('weekDays.sat'),
  ];

  return (
    <View style={containerStyles}>
      {/* Header with month navigation */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={goToPrevMonth}
          accessibilityRole="button"
          accessibilityLabel={format(subMonths(currentMonth, 1), 'MMMM yyyy', { locale: dateFnsLocale })}
        >
          <Ionicons name="chevron-back-outline" size={20} color={colors.text} />
        </TouchableOpacity>
        <AppText style={styles.monthTitle}>
          {format(currentMonth, 'MMMM yyyy', { locale: dateFnsLocale })}
        </AppText>
        <TouchableOpacity
          style={styles.navButton}
          onPress={goToNextMonth}
          accessibilityRole="button"
          accessibilityLabel={format(addMonths(currentMonth, 1), 'MMMM yyyy', { locale: dateFnsLocale })}
        >
          <Ionicons name="chevron-forward-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View onLayout={(event) => setGridWidth(Math.max(7 * 44, event.nativeEvent.layout.width))}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ width: gridWidth }}>
            {/* Week day headers */}
            <View style={styles.weekDays}>
              {weekDays.map((day) => (
                <AppText key={day} style={styles.weekDayText}>
                  {day}
                </AppText>
              ))}
            </View>

            {/* Days grid */}
            <View style={styles.daysGrid}>
              {calendarDays.map((day, index) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = isSameDay(day, selectedDate);
                const isDayToday = isToday(day);
                const hasEvent = eventDatesSet.has(dayKey);
                const hasChore = choreDatesSet.has(dayKey);

                return (
                  <View key={index} style={styles.dayCell}>
                    <TouchableOpacity
                      style={[
                        styles.dayButton,
                        isSelected && styles.dayButtonSelected,
                        isDayToday && !isSelected && styles.dayButtonToday,
                      ]}
                      onPress={() => handleDayPress(day)}
                      onLongPress={() => handleDayLongPress(day)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={[
                        format(day, 'PPPP', { locale: dateFnsLocale }),
                        isDayToday ? t('calendar.today') : '',
                        hasEvent ? t('home.events') : '',
                        hasChore ? t('chores.yourTurn') : '',
                      ].filter(Boolean).join(', ')}
                      accessibilityHint={onAddEvent ? t('calendar.longPressToAdd') : undefined}
                      hitSlop={{ left: 2, right: 2 }}
                      delayLongPress={300}
                    >
                      <AppText
                        style={[
                          styles.dayText,
                          !isCurrentMonth && styles.dayTextOtherMonth,
                          isSelected && styles.dayTextSelected,
                          isDayToday && !isSelected && styles.dayTextToday,
                        ]}
                      >
                        {format(day, 'd')}
                      </AppText>
                      {(hasEvent || hasChore) && (
                        <View style={styles.dotsRow}>
                          {hasEvent && (
                            <View
                              style={[
                                styles.eventDot,
                                isSelected && styles.eventDotSelected,
                              ]}
                            />
                          )}
                          {hasChore && (
                            <View
                              style={[
                                styles.choreDot,
                                isSelected && styles.choreDotSelected,
                              ]}
                            />
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};
