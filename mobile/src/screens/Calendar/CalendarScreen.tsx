import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Platform, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

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

    // Combine date and time
    const dateTime = new Date(date);
    dateTime.setHours(time.getHours());
    dateTime.setMinutes(time.getMinutes());
    dateTime.setSeconds(0);
    dateTime.setMilliseconds(0);

    // Combine end date and time if both are set
    let endDateTime: Date | undefined;
    if (endDate && endTime) {
      endDateTime = new Date(endDate);
      endDateTime.setHours(endTime.getHours());
      endDateTime.setMinutes(endTime.getMinutes());
      endDateTime.setSeconds(0);
      endDateTime.setMilliseconds(0);
    }

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
      const now = new Date();
      setDate(now);
      setTime(now);
      setEndDate(null);
      setEndTime(null);
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
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please select a household</Text>
        </View>
      </SafeAreaView>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
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
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            style={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
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
            <View style={styles.field}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setDate(selectedDate);
                    }
                  }}
                />
              )}
              {Platform.OS === 'ios' && showDatePicker && (
                <View style={styles.datePickerActions}>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Time</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateText}>
                  {time.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={time}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  is24Hour={false}
                  onChange={(event, selectedTime) => {
                    setShowTimePicker(Platform.OS === 'ios');
                    if (selectedTime) {
                      setTime(selectedTime);
                    }
                  }}
                />
              )}
              {Platform.OS === 'ios' && showTimePicker && (
                <View style={styles.datePickerActions}>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={styles.datePickerButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>End Date (Optional)</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {endDate
                    ? endDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Select end date'}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate || date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={date}
                  onChange={(event, selectedDate) => {
                    setShowEndDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setEndDate(selectedDate);
                    }
                  }}
                />
              )}
              {Platform.OS === 'ios' && showEndDatePicker && (
                <View style={styles.datePickerActions}>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => {
                      setShowEndDatePicker(false);
                      if (!endDate) {
                        setEndDate(null);
                        setEndTime(null);
                      }
                    }}
                  >
                    <Text style={styles.datePickerButtonText}>Clear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowEndDatePicker(false)}
                  >
                    <Text style={styles.datePickerButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
              {endDate && Platform.OS !== 'ios' && (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={() => {
                    setEndDate(null);
                    setEndTime(null);
                  }}
                >
                  <Text style={styles.clearDateText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {endDate && (
              <View style={styles.field}>
                <Text style={styles.label}>End Time (Optional)</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {endTime
                      ? endTime.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })
                      : 'Select end time'}
                  </Text>
                </TouchableOpacity>
                {showEndTimePicker && (
                  <DateTimePicker
                    value={endTime || time}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    is24Hour={false}
                    onChange={(event, selectedTime) => {
                      setShowEndTimePicker(Platform.OS === 'ios');
                      if (selectedTime) {
                        setEndTime(selectedTime);
                      }
                    }}
                  />
                )}
                {Platform.OS === 'ios' && showEndTimePicker && (
                  <View style={styles.datePickerActions}>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => {
                        setShowEndTimePicker(false);
                        if (!endTime) {
                          setEndTime(null);
                        }
                      }}
                    >
                      <Text style={styles.datePickerButtonText}>Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowEndTimePicker(false)}
                    >
                      <Text style={styles.datePickerButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
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
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    paddingTop: 16,
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
  dateButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  datePickerButton: {
    padding: 8,
    paddingHorizontal: 16,
  },
  datePickerButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  clearDateButton: {
    marginTop: 8,
    padding: 8,
    alignSelf: 'flex-end',
  },
  clearDateText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
  },
});

