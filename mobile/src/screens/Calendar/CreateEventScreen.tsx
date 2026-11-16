import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { useHousehold } from '../../context/HouseholdContext';
import { eventsApi, Event } from '../../api/eventsApi';
import { ChoreRotation } from '../../api/choresApi';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Group, GroupRow } from '../../components/ui/Group';
import { useThemeColors, useTheme, fontSizes, fontWeights, radii, spacing } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { invalidateCache, updateCached } from '../../utils/queryCache';
import { toBcp47Locale } from '../../utils/dateLocales';
import { format, startOfWeek } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';

/** Mirrors the snapshot shape cached by CalendarScreen — keep in sync. */
type CalendarSnapshot = { events: Event[]; chores: ChoreRotation[] };

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
  const { t, language } = useLanguage();
  const intlLocale = useMemo(() => toBcp47Locale(language), [language]);
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('other');
  const [date, setDate] = useState(preselectedDate ? new Date(preselectedDate) : new Date());
  const [time, setTime] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeSheet, setActiveSheet] = useState<'type' | 'start' | 'end' | null>(null);
  const [pickerPart, setPickerPart] = useState<'date' | 'time'>('date');
  const [showDescription, setShowDescription] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDescription(editingEvent.description || '');
      setShowDescription(!!editingEvent.description);
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
      const saved = isEditing && editingEvent
        ? await eventsApi.updateEvent(editingEvent._id, eventData)
        : await eventsApi.createEvent(eventData);

      // Patch the cached CalendarScreen snapshot so the list reflects the
      // change the instant we pop back — the subscribe() on that screen
      // runs its sync() handler synchronously. The focus-refetch that
      // follows reconciles any server-side tweaks (timestamps, creator
      // population, etc.).
      const weekKey = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const cacheKey = `calendar:${selectedHousehold._id}:${weekKey}`;
      updateCached<CalendarSnapshot>(cacheKey, (prev) => {
        if (isEditing && editingEvent) {
          return {
            ...prev,
            events: prev.events.map((e) => (e._id === saved._id ? saved : e)),
          };
        }
        if (prev.events.some((e) => e._id === saved._id)) return prev;
        return { ...prev, events: [saved, ...prev.events] };
      });

      // Home dashboard aggregates need the server to recompute — drop so
      // the next focus refetches fresh numbers.
      invalidateCache(`home:dashboard:${selectedHousehold._id}`);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
    } finally {
      setSaving(false);
    }
  };

  if (!selectedHousehold) {
    return (
      <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>{t('alerts.selectHousehold')}</AppText>
        </View>
      </SanctuaryScreenShell>
    );
  }

  const selectedEventType = EVENT_TYPES.find((eventType) => eventType.id === type) ?? EVENT_TYPES[EVENT_TYPES.length - 1];
  const startSummary = `${date.toLocaleDateString(intlLocale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} • ${time.toLocaleTimeString(intlLocale, { hour: 'numeric', minute: '2-digit' })}`;
  const endSummary =
    endDate && endTime
      ? `${endDate.toLocaleDateString(intlLocale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })} • ${endTime.toLocaleTimeString(intlLocale, { hour: 'numeric', minute: '2-digit' })}`
      : t('common.optional');

  return (
    <SanctuaryScreenShell edges={[]} innerStyle={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        enabled={Platform.OS === 'android'}
        behavior={Platform.OS === 'android' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
        >
          <AppText style={styles.householdName}>{selectedHousehold.name}</AppText>

          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
            accessibilityRole="button"
            accessibilityLabel={t('common.dismissKeyboard')}
          >
            <View>
              <Group style={styles.inputCard}><View style={styles.inputPadding}>
                <FormTextInput
                  label={t('events.eventTitle')}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('events.titlePlaceholder')}
                  containerStyle={{ marginBottom: 0 }}
                />
              </View></Group>

              <Group style={styles.group}>
                <GroupRow
                  title={t('events.eventType')}
                  subtitle={t(selectedEventType.labelKey)}
                  icon={selectedEventType.icon}
                  chevron
                  onPress={() => setActiveSheet('type')}
                />
                <GroupRow
                  title={t('events.date')}
                  subtitle={startSummary}
                  icon="calendar-outline"
                  chevron
                  onPress={() => { setPickerPart('date'); setActiveSheet('start'); }}
                />
                <GroupRow
                  title={t('events.endDate')}
                  subtitle={endSummary}
                  icon="flag-outline"
                  chevron
                  onPress={() => { setPickerPart('date'); setActiveSheet('end'); }}
                />
              </Group>

              <Group style={styles.group}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showDescription }}
                  onPress={() => setShowDescription((current) => !current)}
                >
                  <GroupRow
                    title={t('events.eventDescription')}
                    subtitle={t('common.optional')}
                    icon="document-text-outline"
                    trailing={
                      <Ionicons
                        name={showDescription ? 'chevron-up-outline' : 'chevron-down-outline'}
                        size={22}
                        color={colors.textTertiary}
                      />
                    }
                  />
                </TouchableOpacity>
                {showDescription ? (
                  <View style={styles.descriptionField}>
                    <FormTextInput
                      label={t('events.eventDescription')}
                      value={description}
                      onChangeText={setDescription}
                      placeholder={t('events.descriptionPlaceholder')}
                      multiline
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                ) : null}
              </Group>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>

        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.actionButton}>
            <PrimaryButton
              title={t('common.cancel')}
              onPress={() => {
                Keyboard.dismiss();
                navigation.goBack();
              }}
              variant="secondary"
            />
          </View>
          <View style={styles.actionButton}>
            <PrimaryButton
              title={isEditing ? t('common.save') : t('common.create')}
              onPress={() => {
                Keyboard.dismiss();
                handleSave();
              }}
              disabled={!canSubmit}
              loading={saving}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={activeSheet !== null}
        transparent
        animationType={reduceMotion ? 'none' : 'fade'}
        onRequestClose={() => setActiveSheet(null)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setActiveSheet(null)}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]} accessibilityViewIsModal>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <AppText style={styles.sheetTitle}>
                {activeSheet === 'type'
                  ? t('events.eventType')
                  : activeSheet === 'end'
                    ? t('events.endDate')
                    : t('events.date')}
              </AppText>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                style={styles.closeButton}
                onPress={() => setActiveSheet(null)}
              >
                <Ionicons name="close-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {activeSheet === 'type' ? (
              <ScrollView contentContainerStyle={styles.typeList}>
                <Group style={{ marginHorizontal: 0 }}>
                  {EVENT_TYPES.map((eventType) => {
                    const selected = type === eventType.id;
                    return (
                      <TouchableOpacity
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        key={eventType.id}
                        style={[styles.typeRow, selected && styles.typeRowActive]}
                        onPress={() => {
                          setType(eventType.id);
                          setActiveSheet(null);
                        }}
                      >
                        <View style={[styles.typeIcon, selected && styles.typeIconActive]}>
                          <Ionicons
                            name={eventType.icon as any}
                            size={20}
                            color={selected ? colors.primary : colors.textSecondary}
                          />
                        </View>
                        <AppText style={[styles.typeText, selected && styles.typeTextActive]}>
                          {t(eventType.labelKey)}
                        </AppText>
                        {selected ? <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </Group>
              </ScrollView>
            ) : null}

            {activeSheet === 'start' || activeSheet === 'end' ? (
              <View style={styles.pickerBody}>
                <View style={styles.segment}>
                  <TouchableOpacity
                    style={[styles.segmentOption, pickerPart === 'date' && styles.segmentOptionActive]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: pickerPart === 'date' }}
                    onPress={() => setPickerPart('date')}
                  >
                    <AppText style={[styles.segmentText, pickerPart === 'date' && styles.segmentTextActive]}>
                      {t('events.date')}
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segmentOption, pickerPart === 'time' && styles.segmentOptionActive]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: pickerPart === 'time' }}
                    onPress={() => setPickerPart('time')}
                  >
                    <AppText style={[styles.segmentText, pickerPart === 'time' && styles.segmentTextActive]}>
                      {t('events.time')}
                    </AppText>
                  </TouchableOpacity>
                </View>

                <DateTimePicker
                  value={
                    activeSheet === 'end'
                      ? pickerPart === 'date'
                        ? endDate || date
                        : endTime || time
                      : pickerPart === 'date'
                        ? date
                        : time
                  }
                  mode={pickerPart}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant={theme}
                  onChange={(event, selectedValue) => {
                    if (!selectedValue) return;
                    if (activeSheet === 'end') {
                      if (pickerPart === 'date') {
                        setEndDate(selectedValue);
                        setEndTime((current) => current || new Date(time));
                      } else {
                        setEndTime(selectedValue);
                        setEndDate((current) => current || new Date(date));
                      }
                    } else if (pickerPart === 'date') {
                      setDate(selectedValue);
                    } else {
                      setTime(selectedValue);
                    }
                  }}
                />

                {activeSheet === 'end' ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.clearEndButton}
                    onPress={() => {
                      setEndDate(null);
                      setEndTime(null);
                      setActiveSheet(null);
                    }}
                  >
                    <AppText style={styles.clearEndText}>{t('events.clearEnd')}</AppText>
                  </TouchableOpacity>
                ) : null}
                <PrimaryButton title={t('common.done')} onPress={() => setActiveSheet(null)} />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </SanctuaryScreenShell>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardAvoid: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
  householdName: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl
  },
  emptyText: { fontSize: fontSizes.md, color: colors.textSecondary },
  group: { marginTop: spacing.md },
  inputCard: { marginTop: spacing.md },
  inputPadding: { padding: spacing.md },
  descriptionField: { padding: spacing.md },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors.background
  },
  actionButton: { flex: 1, minWidth: 120 },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.shadowStrong
  },
  sheet: {
    maxHeight: '86%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: spacing.xl,
    overflow: 'hidden'
  },
  sheetHandle: {
    width: 36,
    height: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.sm
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  sheetTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: fontWeights.bold,
    color: colors.text
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface
  },
  typeList: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  typeRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface
  },
  typeRowActive: { backgroundColor: colors.primaryUltraSoft },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.background
  },
  typeIconActive: { backgroundColor: colors.surface },
  typeText: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.text
  },
  typeTextActive: { color: colors.primary, fontWeight: fontWeights.semibold },
  pickerBody: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  segment: {
    flexDirection: 'row',
    padding: spacing.xxs,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm
  },
  segmentOption: {
    flex: 1,
    minHeight: 44,
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm
  },
  segmentOptionActive: { backgroundColor: colors.primary },
  segmentText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    textAlign: 'center'
  },
  segmentTextActive: { color: colors.onPrimary, fontWeight: fontWeights.semibold },
  clearEndButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md
  },
  clearEndText: {
    color: colors.danger,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold
  },
});
