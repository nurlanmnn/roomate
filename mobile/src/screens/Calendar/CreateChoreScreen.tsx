import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage } from '../../context/LanguageContext';
import { choresApi, ChoreRotation, ChoreFrequency } from '../../api/choresApi';
import { HouseholdMember } from '../../api/householdsApi';
import { FormTextInput } from '../../components/FormTextInput';
import { AppText } from '../../components/AppText';
import { Group } from '../../components/ui/Group';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useThemeColors, useTheme, fontSizes, fontWeights, spacing, radii } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { startOfWeek, format } from 'date-fns';
import { getDateFnsLocale } from '../../utils/dateLocales';
import DateTimePicker from '@react-native-community/datetimepicker';
import { invalidateCache } from '../../utils/queryCache';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const CreateChoreScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const editingChore: ChoreRotation | undefined = route.params?.editingChore;
  const isEditing = !!editingChore;

  const { selectedHousehold } = useHousehold();
  const { t, language } = useLanguage();
  const dateFnsLocale = useMemo(() => getDateFnsLocale(language), [language]);
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { theme } = useTheme();
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

  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<ChoreFrequency>('weekly');
  const [rotationOrder, setRotationOrder] = useState<HouseholdMember[]>([]);
  const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const fieldRefs = useRef<Record<string, View | null>>({});

  const scrollPickerFieldIntoView = useCallback(
    (key: string) => {
      if (Platform.OS !== 'ios') return;
      const node = fieldRefs.current[key];
      if (!node || !scrollRef.current) return;
      node.measureInWindow((_x, y, _w, h) => {
        const windowH = Dimensions.get('window').height;
        const safeBottom = windowH - insets.bottom - 28;
        const viewBottom = y + h;
        let delta = viewBottom - safeBottom + 24;
        delta = Math.max(delta, 200);
        if (delta > 6) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, scrollYRef.current + delta),
            animated: !reduceMotion,
          });
        }
      });
    },
    [insets.bottom, reduceMotion]
  );

  useEffect(() => {
    if (Platform.OS !== 'ios' || !showDatePicker) return;
    const id = setTimeout(() => scrollPickerFieldIntoView('startDate'), 200);
    return () => clearTimeout(id);
  }, [showDatePicker, scrollPickerFieldIntoView]);

  const members = selectedHousehold?.members ?? [];

  useEffect(() => {
    if (editingChore) {
      setName(editingChore.name);
      setFrequency(editingChore.frequency);
      setRotationOrder(editingChore.rotationOrder as unknown as HouseholdMember[]);
      setStartDate(new Date(editingChore.startDate));
    }
  }, [editingChore]);

  useEffect(() => {
    if (!editingChore && members.length > 0 && rotationOrder.length === 0) {
      setRotationOrder([...members]);
    }
  }, [editingChore, members]);

  const moveMember = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...rotationOrder];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    setRotationOrder(newOrder);
  };

  const toggleMemberInRotation = (member: HouseholdMember) => {
    setRotationOrder((prev) => {
      const index = prev.findIndex((m) => m._id === member._id);
      if (index >= 0) {
        return prev.filter((m) => m._id !== member._id);
      }
      return [...prev, member];
    });
  };

  const canSubmit = name.trim().length > 0 && rotationOrder.length >= 1;

  const handleSave = async () => {
    if (!selectedHousehold) return;
    if (!canSubmit) {
      Alert.alert(t('common.error'), t('chores.enterName'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        householdId: selectedHousehold._id,
        name: name.trim(),
        rotationOrder: rotationOrder.map((m) => m._id),
        frequency,
        startDate: startDate.toISOString(),
      };

      if (isEditing) {
        await choresApi.updateChore(editingChore._id, {
          name: payload.name,
          rotationOrder: payload.rotationOrder,
          frequency: payload.frequency,
          startDate: payload.startDate,
        });
      } else {
        await choresApi.createChore(payload);
      }
      invalidateCache(`calendar:${selectedHousehold._id}`);
      invalidateCache(`chores:${selectedHousehold._id}`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.response?.data?.error || t('alerts.somethingWentWrong'));
    } finally {
      setSaving(false);
    }
  };

  if (!selectedHousehold) return null;

  const iosPickerOpen = Platform.OS === 'ios' && showDatePicker;
  const scrollBottomPad = iosPickerOpen ? 340 : spacing.xxl;

  return (
    <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        enabled={Platform.OS === 'android'}
        behavior={Platform.OS === 'android' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef} style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
          contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}
        >
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
            accessibilityRole="button"
            accessibilityLabel={t('common.dismissKeyboard')}
          >
            <View>
              <Group>
                <FormTextInput
                  variant="inset"
                  label={t('chores.choreName')}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('chores.choreNamePlaceholder')}
                  autoCapitalize="sentences"
                  returnKeyType="done"
                />
              </Group>

              <AppText style={styles.label} accessibilityRole="header">{t('chores.frequency')}</AppText>
              <View style={styles.frequencyRow} accessibilityRole="tablist">
                {(['weekly', 'biweekly'] as const).map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.freqButton, frequency === value && styles.freqButtonActive]}
                    onPress={() => setFrequency(value)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: frequency === value }}
                  >
                    <AppText style={[styles.freqText, frequency === value && styles.freqTextActive]}>{t(`chores.${value}`)}</AppText>
                  </TouchableOpacity>
                ))}
              </View>

              <AppText style={styles.label} accessibilityRole="header">{t('chores.rotationOrder')}</AppText>
              <AppText style={styles.hint}>{t('chores.rotationMembersHint')}</AppText>
              <AppText style={styles.hint}>{t('chores.rotationOrderHint')}</AppText>
              <Group>
                {members.length === 0 ? <AppText style={styles.mutedText}>{t('chores.addMembersFirst')}</AppText> : members.map((member) => {
                  const orderIndex = rotationOrder.findIndex((m) => m._id === member._id);
                  const isIncluded = orderIndex >= 0;
                  return (
                    <View key={member._id} style={styles.orderRow}>
                      <TouchableOpacity
                        onPress={() => toggleMemberInRotation(member)}
                        style={styles.checkboxBtn}
                        accessibilityLabel={member.name}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isIncluded }}
                      >
                        <Ionicons
                          name={isIncluded ? 'checkbox-outline' : 'square-outline'}
                          size={26}
                          color={isIncluded ? colors.primary : colors.textTertiary}
                        />
                      </TouchableOpacity>
                      {isIncluded ? <AppText style={styles.orderNumber}>{orderIndex + 1}.</AppText> : null}
                      <AppText style={[styles.orderName, !isIncluded && styles.orderNameMuted]}>{member.name}</AppText>
                      {isIncluded ? (
                        <View style={styles.orderActions}>
                          <TouchableOpacity
                            onPress={() => moveMember(orderIndex, 'up')}
                            disabled={orderIndex === 0}
                            style={styles.orderBtn}
                            accessibilityRole="button"
                            accessibilityLabel={`${t('chores.rotationOrder')}: ${member.name}, ${orderIndex + 1} → ${orderIndex}`}
                            accessibilityState={{ disabled: orderIndex === 0 }}
                          >
                            <Ionicons name="chevron-up-outline" size={22} color={orderIndex === 0 ? colors.textTertiary : colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => moveMember(orderIndex, 'down')}
                            disabled={orderIndex === rotationOrder.length - 1}
                            style={styles.orderBtn}
                            accessibilityRole="button"
                            accessibilityLabel={`${t('chores.rotationOrder')}: ${member.name}, ${orderIndex + 1} → ${orderIndex + 2}`}
                            accessibilityState={{ disabled: orderIndex === rotationOrder.length - 1 }}
                          >
                            <Ionicons
                              name="chevron-down-outline"
                              size={22}
                              color={orderIndex === rotationOrder.length - 1 ? colors.textTertiary : colors.primary}
                            />
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </Group>

              <View ref={(r) => { fieldRefs.current.startDate = r; }}>
                <AppText style={styles.label} accessibilityRole="header">{t('chores.startDate')}</AppText>
                <AppText style={styles.hint}>{t('chores.startDateHint')}</AppText>
                <Group>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker((prev) => !prev)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showDatePicker }}
                    accessibilityLabel={`${t('chores.startDate')}, ${format(startDate, 'EEEE, MMM d, yyyy', { locale: dateFnsLocale })}`}
                  >
                    <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                    <AppText style={styles.dateButtonText}>{format(startDate, 'EEEE, MMM d, yyyy', { locale: dateFnsLocale })}</AppText>
                    <Ionicons name={showDatePicker ? 'chevron-up-outline' : 'chevron-down-outline'} size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                  {showDatePicker ? (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      themeVariant={theme}
                      onChange={(_, date) => { setShowDatePicker(Platform.OS === 'ios'); if (date) setStartDate(date); }}
                    />
                  ) : null}
                  {Platform.OS === 'ios' && showDatePicker ? (
                    <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(false)} accessibilityRole="button">
                      <AppText style={styles.datePickerButtonText}>{t('common.done')}</AppText>
                    </TouchableOpacity>
                  ) : null}
                </Group>
              </View>

              <View style={styles.footerButtonsRow}>
                <PrimaryButton
                  title={t('common.cancel')}
                  onPress={() => navigation.goBack()}
                  variant="secondary"
                  style={styles.footerButton}
                />
                <PrimaryButton
                  title={isEditing ? t('common.save') : t('chores.addChore')}
                  onPress={() => { Keyboard.dismiss(); handleSave(); }}
                  disabled={!canSubmit || saving}
                  loading={saving}
                  style={styles.footerButton}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </SanctuaryScreenShell>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: spacing.md, paddingBottom: spacing.xxl },
  label: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg
  },
  hint: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: spacing.xxs,
    padding: spacing.xxs,
    marginHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface
  },
  freqButton: {
    flex: 1,
    minHeight: 44,
    padding: spacing.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  freqButtonActive: { backgroundColor: colors.primary },
  freqText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center'
  },
  freqTextActive: { color: colors.onPrimary, fontWeight: fontWeights.semibold },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs
  },
  checkboxBtn: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  orderNumber: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginRight: spacing.xs
  },
  orderName: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSizes.md,
    color: colors.text
  },
  orderNameMuted: { color: colors.textSecondary },
  orderActions: { flexDirection: 'row', flexShrink: 0 },
  orderBtn: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dateButton: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md
  },
  dateButtonText: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSizes.md,
    color: colors.text
  },
  datePickerButton: {
    minHeight: 44,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  datePickerButtonText: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold
  },
  mutedText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    padding: spacing.md
  },
  footerButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.xl
  },
  footerButton: { flex: 1, minWidth: 120 },
});
