import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { eventsApi, Event } from '../../api/eventsApi';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useThemeColors, useTheme, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';

// Event types with icons
const EVENT_TYPES = [
  { id: 'bill', labelKey: 'eventTypes.bill', icon: 'receipt-outline' },
  { id: 'cleaning', labelKey: 'eventTypes.cleaning', icon: 'sparkles-outline' },
  { id: 'social', labelKey: 'eventTypes.social', icon: 'people-outline' },
  { id: 'meal', labelKey: 'eventTypes.meal', icon: 'restaurant-outline' },
  { id: 'meeting', labelKey: 'eventTypes.meeting', icon: 'calendar-outline' },
  { id: 'maintenance', labelKey: 'eventTypes.maintenance', icon: 'hammer-outline' },
  { id: 'shopping', labelKey: 'eventTypes.shopping', icon: 'cart-outline' },
  { id: 'trip', labelKey: 'eventTypes.trip', icon: 'car-outline' },
  { id: 'birthday', labelKey: 'eventTypes.birthday', icon: 'gift-outline' },
  { id: 'reminder', labelKey: 'eventTypes.reminder', icon: 'alarm-outline' },
  { id: 'other', labelKey: 'eventTypes.other', icon: 'ellipsis-horizontal-outline' },
] as const;

type EventType = typeof EVENT_TYPES[number]['id'];

export const CreateEventScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const editingEvent: Event | undefined = route.params?.editingEvent;
  const preselectedDate: string | undefined = route.params?.preselectedDate;
  const isEditing = !!editingEvent;
  
  const { selectedHousehold } = useHousehold();
  const colors = useThemeColors();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('other');
  const [date, setDate] = useState(preselectedDate ? new Date(preselectedDate) : new Date());
  const [time, setTime] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDescription(editingEvent.description || '');
      setType(editingEvent.type);
      const eventDate = new Date(editingEvent.date);
      setDate(eventDate);
      setTime(eventDate);
      if (editingEvent.endDate) {
        const eventEndDate = new Date(editingEvent.endDate);
        setEndDate(eventEndDate);
        setEndTime(eventEndDate);
      }
    }
  }, [editingEvent]);

  const canSubmit = useMemo(() => title.trim().length > 0, [title]);

  const handleSave = async () => {
    if (!selectedHousehold) return;
    if (!canSubmit) {
      Alert.alert(t('common.error'), t('events.enterTitle'));
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

    const eventData = {
      householdId: selectedHousehold._id,
      title: title.trim(),
      description: description || undefined,
      type,
      date: dateTime.toISOString(),
      endDate: endDateTime?.toISOString(),
    };

    try {
      setSaving(true);
      if (isEditing && editingEvent) {
        await eventsApi.updateEvent(editingEvent._id, eventData);
      } else {
        await eventsApi.createEvent(eventData);
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
    } finally {
      setSaving(false);
    }
  };

  if (!selectedHousehold) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('alerts.selectHousehold')}</Text>
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
          <ScreenHeader title={isEditing ? t('events.editEvent') : t('events.addEvent')} subtitle={selectedHousehold.name} />

          <View style={styles.card}>
            <FormTextInput
              label={t('events.eventTitle')}
              value={title}
              onChangeText={setTitle}
              placeholder={t('events.titlePlaceholder')}
            />
            <FormTextInput
              label={`${t('events.eventDescription')} (${t('common.optional')})`}
              value={description}
              onChangeText={setDescription}
              placeholder={t('events.descriptionPlaceholder')}
              multiline
            />

            <View style={styles.field}>
              <Text style={styles.label}>{t('events.eventType')}</Text>
              <View style={styles.typeGrid}>
                {EVENT_TYPES.map((eventType) => (
                  <TouchableOpacity
                    key={eventType.id}
                    style={[styles.typeOption, type === eventType.id && styles.typeOptionActive]}
                    onPress={() => setType(eventType.id)}
                  >
                    <Ionicons
                      name={eventType.icon as any}
                      size={20}
                      color={type === eventType.id ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.typeOptionText, type === eventType.id && styles.typeOptionTextActive]}>
                      {t(eventType.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('events.date')}</Text>
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
                  themeVariant={theme}
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
                    <Text style={styles.datePickerButtonText}>{t('common.done')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('events.time')}</Text>
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
                  themeVariant={theme}
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
                    <Text style={styles.datePickerButtonText}>{t('common.done')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('events.endDate')} ({t('common.optional')})</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker((prev) => !prev)}
              >
                <Text style={[styles.dateText, !endDate && styles.placeholderText]}>
                  {endDate
                    ? endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : t('events.selectEndDate')}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant={theme}
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
                    <Text style={styles.datePickerButtonText}>{t('common.done')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('events.endTime')} ({t('common.optional')})</Text>
              <TouchableOpacity
                style={[styles.dateButton, !endDate && styles.dateButtonDisabled]}
                onPress={() => {
                  if (!endDate) {
                    // Auto-set end date to start date if not set
                    setEndDate(date);
                  }
                  setShowEndTimePicker((prev) => !prev);
                }}
              >
                <Text style={[styles.dateText, (!endDate || !endTime) && styles.placeholderText]}>
                  {endTime
                    ? endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    : t('events.selectEndTime')}
                </Text>
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker
                  value={endTime || new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant={theme}
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
                    <Text style={styles.datePickerButtonText}>{t('common.done')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.actions}>
              <PrimaryButton title={t('common.cancel')} onPress={() => navigation.goBack()} variant="secondary" />
              <View style={styles.spacer} />
              <PrimaryButton title={isEditing ? t('common.save') : t('common.create')} onPress={handleSave} disabled={!canSubmit} loading={saving} />
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  typeOptionActive: {
    backgroundColor: colors.primaryUltraSoft,
    borderColor: colors.primary,
  },
  typeOptionText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  typeOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },
  dateButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dateButtonDisabled: {
    opacity: 0.5,
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




