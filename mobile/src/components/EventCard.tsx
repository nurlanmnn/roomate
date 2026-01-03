import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { Event } from '../api/eventsApi';
import { formatDateTime, formatTime } from '../utils/dateHelpers';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../theme';
import { Ionicons } from '@expo/vector-icons';

interface EventCardProps {
  event: Event;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const colors = useThemeColors();
  const typeIcons: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
    bill: 'cash-outline',
    cleaning: 'sparkles-outline',
    social: 'balloon-outline',
    other: 'calendar-outline',
  };

  const styles = React.useMemo(() => StyleSheet.create({
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
      flexShrink: 1,
    },
    time: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
    },
    description: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: spacing.sm,
      flexShrink: 1,
    },
  }), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name={typeIcons[event.type] || 'calendar-outline'} size={22} color={colors.muted} />
        <View style={styles.content}>
          <AppText style={styles.title} numberOfLines={2} ellipsizeMode="tail">{event.title}</AppText>
          <AppText style={styles.time}>
            {formatDateTime(event.date)}
            {event.endDate && ` - ${formatTime(event.endDate)}`}
          </AppText>
        </View>
      </View>
      {event.description && (
        <AppText style={styles.description}>{event.description}</AppText>
      )}
    </View>
  );
};

