import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Event } from '../api/eventsApi';
import { formatDateTime, formatTime } from '../utils/dateHelpers';

interface EventCardProps {
  event: Event;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const typeIcons: Record<string, string> = {
    bill: '💰',
    cleaning: '🧹',
    social: '🎉',
    other: '📅',
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>{typeIcons[event.type] || '📅'}</Text>
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  time: {
    fontSize: 14,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});

