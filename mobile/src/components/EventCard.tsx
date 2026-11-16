import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { Event } from '../api/eventsApi';
import { formatDateTime, formatTime } from '../utils/dateHelpers';
import { getDateFnsLocale } from '../utils/dateLocales';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

interface EventCardProps {
  event: Event;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const colors = useThemeColors();
  const { language } = useLanguage();
  const dateLocale = React.useMemo(() => getDateFnsLocale(language), [language]);
  const typeIcons: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
    bill: 'receipt-outline',
    cleaning: 'sparkles-outline',
    social: 'people-outline',
    meal: 'restaurant-outline',
    meeting: 'calendar-outline',
    maintenance: 'hammer-outline',
    shopping: 'cart-outline',
    trip: 'car-outline',
    birthday: 'gift-outline',
    reminder: 'alarm-outline',
    other: 'ellipsis-horizontal-outline',
  };

  const styles = React.useMemo(() => StyleSheet.create({
    card: {
      padding: spacing.md,
      minHeight: 60,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    iconWell: {
      width: 36,
      height: 36,
      borderRadius: radii.sm,
      backgroundColor: colors.primaryUltraSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      minWidth: 0,
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
        <View style={styles.iconWell}>
          <Ionicons name={typeIcons[event.type] || 'calendar-outline'} size={22} color={colors.primary} />
        </View>
        <View style={styles.content}>
          <AppText style={styles.title}>{event.title}</AppText>
          <AppText style={styles.time}>
            {formatDateTime(event.date, dateLocale)}
            {event.endDate && ` - ${formatTime(event.endDate, dateLocale)}`}
          </AppText>
          {event.description ? <AppText style={styles.description}>{event.description}</AppText> : null}
        </View>
      </View>
    </View>
  );
};
