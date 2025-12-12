import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { useHousehold } from '../../context/HouseholdContext';
import { eventsApi, Event } from '../../api/eventsApi';
import { EventCard } from '../../components/EventCard';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { formatDate } from '../../utils/dateHelpers';

export const CalendarScreen: React.FC = () => {
  const { selectedHousehold } = useHousehold();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'bill' | 'cleaning' | 'social' | 'other'>('other');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('12:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (selectedHousehold) {
      loadEvents();
    }
  }, [selectedHousehold]);

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

  const handleCreateEvent = async () => {
    if (!selectedHousehold || !title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    const dateTime = new Date(`${date}T${time}`);
    const endDateTime = endDate && endTime ? new Date(`${endDate}T${endTime}`) : undefined;

    try {
      await eventsApi.createEvent({
        householdId: selectedHousehold._id,
        title: title.trim(),
        description: description || undefined,
        type,
        date: dateTime.toISOString(),
        endDate: endDateTime?.toISOString(),
      });
      setCreateModalVisible(false);
      setTitle('');
      setDescription('');
      setType('other');
      setDate(new Date().toISOString().split('T')[0]);
      setTime('12:00');
      setEndDate('');
      setEndTime('');
      loadEvents();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create event');
    }
  };

  const handleDeleteEvent = async (event: Event) => {
    Alert.alert('Delete Event', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await eventsApi.deleteEvent(event._id);
            loadEvents();
          } catch (error) {
            console.error('Failed to delete event:', error);
          }
        },
      },
    ]);
  };

  if (!selectedHousehold) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Please select a household</Text>
      </View>
    );
  }

  // Group events by date
  const eventsByDate: Record<string, Event[]> = {};
  events.forEach((event) => {
    const dateKey = formatDate(event.date);
    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = [];
    }
    eventsByDate[dateKey].push(event);
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <PrimaryButton
          title="+ Add Event"
          onPress={() => setCreateModalVisible(true)}
        />
      </View>

      {Object.keys(eventsByDate).length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No events scheduled</Text>
        </View>
      ) : (
        Object.entries(eventsByDate).map(([dateKey, dateEvents]) => (
          <View key={dateKey} style={styles.dateSection}>
            <Text style={styles.dateHeader}>{dateKey}</Text>
            {dateEvents.map((event) => (
              <View key={event._id} style={styles.eventWrapper}>
                <EventCard event={event} />
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteEvent(event)}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))
      )}

      {/* Create Event Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Event</Text>
            <FormTextInput
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Rent due"
            />
            <FormTextInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Add details"
              multiline
            />
            <View style={styles.field}>
              <Text style={styles.label}>Type</Text>
              {(['bill', 'cleaning', 'social', 'other'] as const).map((eventType) => (
                <TouchableOpacity
                  key={eventType}
                  style={[styles.radioOption, type === eventType && styles.radioSelected]}
                  onPress={() => setType(eventType)}
                >
                  <Text>{eventType.charAt(0).toUpperCase() + eventType.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <FormTextInput
              label="Date"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
            />
            <FormTextInput
              label="Time"
              value={time}
              onChangeText={setTime}
              placeholder="HH:MM"
            />
            <FormTextInput
              label="End Date (Optional)"
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
            />
            {endDate && (
              <FormTextInput
                label="End Time (Optional)"
                value={endTime}
                onChangeText={setEndTime}
                placeholder="HH:MM"
              />
            )}
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Cancel"
                onPress={() => setCreateModalVisible(false)}
              />
              <View style={styles.spacer} />
              <PrimaryButton title="Create" onPress={handleCreateEvent} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  dateSection: {
    padding: 16,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  eventWrapper: {
    marginBottom: 12,
  },
  deleteButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginTop: 4,
  },
  deleteText: {
    color: '#f44336',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  radioOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  radioSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  spacer: {
    width: 12,
  },
});

