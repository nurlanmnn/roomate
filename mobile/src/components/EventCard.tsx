import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Event } from '../api/eventsApi';
import { formatDateTime, formatTime } from '../utils/dateHelpers';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '../theme';
import { Ionicons } from '@expo/vector-icons';

interface EventCardProps {
  event: Event;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const typeIcons: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
    bill: 'cash-outline',
    cleaning: 'sparkles-outline',
    social: 'balloon-outline',
    other: 'calendar-outline',
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name={typeIcons[event.type] || 'calendar-outline'} size={22} color={colors.muted} />
        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.time}>
            {formatDateTime(event.date)}
            {event.endDate && ` - ${formatTime(event.endDate)}`}
          </Text>
        </View>
      </View>
      {event.description && (
        <Text style={styles.description}>{event.description}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadows.sm as object),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  time: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  description: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});

