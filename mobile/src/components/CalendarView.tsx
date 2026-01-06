import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { AppText } from './AppText';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../theme';
import { Ionicons } from '@expo/vector-icons';
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

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_SIZE = (SCREEN_WIDTH - spacing.xl * 2 - spacing.xs * 6) / 7;

interface CalendarViewProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  eventDates: string[]; // Array of ISO date strings that have events
  onAddEvent?: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  selectedDate,
  onSelectDate,
  eventDates,
  onAddEvent,
}) => {
  const colors = useThemeColors();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing.md,
          marginHorizontal: spacing.md,
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: colors.borderLight,
          ...(shadows.sm as object),
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.md,
          paddingHorizontal: spacing.xs,
        },
        monthTitle: {
          fontSize: fontSizes.lg,
          fontWeight: fontWeights.bold,
          color: colors.text,
        },
        navButton: {
          padding: spacing.sm,
          borderRadius: radii.full,
          backgroundColor: colors.surfaceAlt,
        },
        weekDays: {
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginBottom: spacing.sm,
        },
        weekDayText: {
          width: DAY_SIZE,
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
          width: DAY_SIZE,
          height: DAY_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xxs,
        },
        dayButton: {
          width: DAY_SIZE - 4,
          height: DAY_SIZE - 4,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radii.full,
        },
        dayButtonSelected: {
          backgroundColor: colors.primary,
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
          color: colors.surface,
          fontWeight: fontWeights.bold,
        },
        dayTextToday: {
          color: colors.primary,
          fontWeight: fontWeights.bold,
        },
        eventDot: {
          position: 'absolute',
          bottom: 2,
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: colors.primary,
        },
        eventDotSelected: {
          backgroundColor: colors.surface,
        },
        addButton: {
          position: 'absolute',
          bottom: 4,
          right: 4,
        },
      }),
    [colors]
  );

  // Build event dates set for quick lookup
  const eventDatesSet = useMemo(() => {
    const set = new Set<string>();
    eventDates.forEach((dateStr) => {
      const d = parseISO(dateStr);
      set.add(format(d, 'yyyy-MM-dd'));
    });
    return set;
  }, [eventDates]);

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

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={styles.container}>
      {/* Header with month navigation */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navButton} onPress={goToPrevMonth}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <AppText style={styles.monthTitle}>
          {format(currentMonth, 'MMMM yyyy')}
        </AppText>
        <TouchableOpacity style={styles.navButton} onPress={goToNextMonth}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

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
                {hasEvent && (
                  <View
                    style={[
                      styles.eventDot,
                      isSelected && styles.eventDotSelected,
                    ]}
                  />
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
};

