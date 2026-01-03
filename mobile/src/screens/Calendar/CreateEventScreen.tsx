import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { eventsApi } from '../../api/eventsApi';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme';

export const CreateEventScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold } = useHousehold();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => title.trim().length > 0, [title]);

  const handleCreate = async () => {
    if (!selectedHousehold) return;
    if (!canSubmit) {
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
      setSaving(true);
      await eventsApi.createEvent({
        householdId: selectedHousehold._id,
        title: title.trim(),
        description: description || undefined,
        type,
        date: dateTime.toISOString(),
        endDate: endDateTime?.toISOString(),
      });
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create event');
    } finally {
      setSaving(false);
    }
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          <ScreenHeader title="Add Event" subtitle={selectedHousehold.name} />

          <View style={styles.card}>
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
                  style={[styles.option, type === eventType && styles.optionActive]}
                  onPress={() => setType(eventType)}
                >
                  <Text style={[styles.optionText, type === eventType && styles.optionTextActive]}>
                    {eventType.charAt(0).toUpperCase() + eventType.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker((prev) => !prev)}
              >
                <Text style={styles.dateText}>
                  {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) setDate(selectedDate);
                  }}
                />
              )}
              {Platform.OS === 'ios' && showDatePicker && (
                <View style={styles.datePickerActions}>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(false)}
                    activeOpacity={0.7}
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
                onPress={() => setShowTimePicker((prev) => !prev)}
              >
                <Text style={styles.dateText}>
                  {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={time}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedTime) => {
                    setShowTimePicker(Platform.OS === 'ios');
                    if (selectedTime) setTime(selectedTime);
                  }}
                />
              )}
              {Platform.OS === 'ios' && showTimePicker && (
                <View style={styles.datePickerActions}>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowTimePicker(false)}
                    activeOpacity={0.7}
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
                onPress={() => setShowEndDatePicker((prev) => !prev)}
              >
                <Text style={[styles.dateText, !endDate && styles.placeholderText]}>
                  {endDate
                    ? endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'Select end date'}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowEndDatePicker(Platform.OS === 'ios');
                    if (selectedDate) setEndDate(selectedDate);
                  }}
                />
              )}
              {Platform.OS === 'ios' && showEndDatePicker && (
                <View style={styles.datePickerActions}>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowEndDatePicker(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.datePickerButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>End Time (Optional)</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndTimePicker((prev) => !prev)}
                disabled={!endDate}
              >
                <Text style={[styles.dateText, (!endDate || !endTime) && styles.placeholderText]}>
                  {!endDate
                    ? 'Select end date first'
                    : endTime
                      ? endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                      : 'Select end time'}
                </Text>
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker
                  value={endTime || new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedTime) => {
                    setShowEndTimePicker(Platform.OS === 'ios');
                    if (selectedTime) setEndTime(selectedTime);
                  }}
                />
              )}
              {Platform.OS === 'ios' && showEndTimePicker && (
                <View style={styles.datePickerActions}>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowEndTimePicker(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.datePickerButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.actions}>
              <PrimaryButton title="Cancel" onPress={() => navigation.goBack()} variant="secondary" />
              <View style={styles.spacer} />
              <PrimaryButton title="Create" onPress={handleCreate} disabled={!canSubmit} loading={saving} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardAvoid: { flex: 1 },
  scrollView: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyText: { fontSize: fontSizes.md, color: colors.muted },
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadows.sm as object),
  },
  field: { marginBottom: spacing.md },
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textSecondary, marginBottom: spacing.xs },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  optionActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  optionText: { fontSize: fontSizes.md, color: colors.text },
  optionTextActive: { color: colors.text, fontWeight: fontWeights.semibold },
  dateButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dateText: { fontSize: fontSizes.md, color: colors.text },
  placeholderText: { color: colors.muted },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  datePickerButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    minWidth: 80,
    alignItems: 'center',
    ...(shadows.xs as object),
  },
  datePickerButtonText: {
    color: colors.surface,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.2,
  },
  actions: { flexDirection: 'row', marginTop: spacing.md },
  spacer: { width: spacing.sm },
});




