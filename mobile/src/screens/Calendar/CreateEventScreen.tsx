import React, { useEffect, useMemo, useState } from 'react';
import {
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
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useThemeColors, useTheme, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme';
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
      <SanctuaryScreenShell edges={['top', 'bottom']} innerStyle={styles.container}>
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
    <SanctuaryScreenShell edges={['top']} innerStyle={styles.container}>
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
          <ScreenHeader
            title={isEditing ? t('events.editEvent') : t('events.addEvent')}
            subtitle={selectedHousehold.name}
            showTitle={false}
            rightText={t('common.close')}
            onRightPress={() => navigation.goBack()}
          />

          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
              <View style={[styles.card, styles.inputCard]}>
                <FormTextInput
                  label={t('events.eventTitle')}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('events.titlePlaceholder')}
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>

              <View style={styles.card}>
                <TouchableOpacity style={styles.summaryRow} onPress={() => setActiveSheet('type')}>
                  <View style={styles.summaryIcon}>
                    <Ionicons name={selectedEventType.icon as any} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.summaryCopy}>
                    <AppText style={styles.summaryLabel}>{t('events.eventType')}</AppText>
                    <AppText style={styles.summaryValue}>{t(selectedEventType.labelKey)}</AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.summaryRow}
                  onPress={() => {
                    setPickerPart('date');
                    setActiveSheet('start');
                  }}
                >
                  <View style={styles.summaryIcon}>
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.summaryCopy}>
                    <AppText style={styles.summaryLabel}>{t('events.date')}</AppText>
                    <AppText style={styles.summaryValue} numberOfLines={1}>{startSummary}</AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.summaryRow, styles.summaryRowLast]}
                  onPress={() => {
                    setPickerPart('date');
                    setActiveSheet('end');
                  }}
                >
                  <View style={styles.summaryIcon}>
                    <Ionicons name="flag-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.summaryCopy}>
                    <AppText style={styles.summaryLabel}>{t('events.endDate')}</AppText>
                    <AppText style={[styles.summaryValue, !endDate && styles.placeholderText]} numberOfLines={1}>
                      {endSummary}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <TouchableOpacity
                  style={[styles.summaryRow, !showDescription && styles.summaryRowLast]}
                  onPress={() => setShowDescription((current) => !current)}
                >
                  <View style={styles.summaryIcon}>
                    <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.summaryCopy}>
                    <AppText style={styles.summaryLabel}>{t('common.optional')}</AppText>
                    <AppText style={styles.summaryValue}>{t('events.eventDescription')}</AppText>
                  </View>
                  <Ionicons
                    name={showDescription ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
                {showDescription ? (
                  <View style={styles.descriptionField}>
                    <FormTextInput
                      value={description}
                      onChangeText={setDescription}
                      placeholder={t('events.descriptionPlaceholder')}
                      multiline
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                ) : null}
              </View>
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

      <Modal visible={activeSheet !== null} transparent animationType="slide" onRequestClose={() => setActiveSheet(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setActiveSheet(null)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <AppText style={styles.sheetTitle}>
                {activeSheet === 'type'
                  ? t('events.eventType')
                  : activeSheet === 'end'
                    ? t('events.endDate')
                    : t('events.date')}
              </AppText>
              <TouchableOpacity style={styles.closeButton} onPress={() => setActiveSheet(null)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {activeSheet === 'type' ? (
              <ScrollView contentContainerStyle={styles.typeList}>
                {EVENT_TYPES.map((eventType) => {
                  const selected = type === eventType.id;
                  return (
                    <TouchableOpacity
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
                      {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}

            {activeSheet === 'start' || activeSheet === 'end' ? (
              <View style={styles.pickerBody}>
                <View style={styles.segment}>
                  <TouchableOpacity
                    style={[styles.segmentOption, pickerPart === 'date' && styles.segmentOptionActive]}
                    onPress={() => setPickerPart('date')}
                  >
                    <AppText style={[styles.segmentText, pickerPart === 'date' && styles.segmentTextActive]}>
                      {t('events.date')}
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segmentOption, pickerPart === 'time' && styles.segmentOptionActive]}
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
          </Pressable>
        </Pressable>
      </Modal>
    </SanctuaryScreenShell>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  keyboardAvoid: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyText: { fontSize: fontSizes.md, color: colors.muted },
  card: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...(shadows.sm as object),
    overflow: 'hidden',
  },
  inputCard: { padding: spacing.lg },
  summaryRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  summaryRowLast: { borderBottomWidth: 0 },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    backgroundColor: colors.primaryUltraSoft,
  },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    marginTop: 2,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  placeholderText: { color: colors.muted },
  descriptionField: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  actionButton: { flex: 1 },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '86%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: spacing.xl,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  sheetTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  typeList: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  typeRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  typeRowActive: { backgroundColor: colors.primaryUltraSoft },
  typeIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    backgroundColor: colors.background,
  },
  typeIconActive: { backgroundColor: colors.surface },
  typeText: { flex: 1, fontSize: fontSizes.md, color: colors.text },
  typeTextActive: { color: colors.primary, fontWeight: fontWeights.semibold },
  pickerBody: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  segmentOption: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  segmentOptionActive: {
    backgroundColor: colors.surface,
    ...(shadows.sm as object),
  },
  segmentText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  segmentTextActive: { color: colors.primary, fontWeight: fontWeights.semibold },
  clearEndButton: { alignItems: 'center', paddingVertical: spacing.md },
  clearEndText: { color: colors.danger, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold },
});




