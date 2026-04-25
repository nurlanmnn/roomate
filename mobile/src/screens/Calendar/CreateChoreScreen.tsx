import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
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
import { PrimaryButton } from '../../components/PrimaryButton';
import { useThemeColors, useTheme, fontSizes, fontWeights, spacing, radii, shadows } from '../../theme';
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
            animated: true,
          });
        }
      });
    },
    [insets.bottom]
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

  const canSubmit = name.trim().length > 0 && rotationOrder.length > 0;

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
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
        <FormTextInput
          label={t('chores.choreName')}
          value={name}
          onChangeText={setName}
          placeholder={t('chores.choreNamePlaceholder')}
          autoCapitalize="words"
        />

        <View style={styles.field}>
          <Text style={styles.label}>{t('chores.frequency')}</Text>
          <View style={styles.frequencyRow}>
            <TouchableOpacity
              style={[styles.freqButton, frequency === 'weekly' && styles.freqButtonActive]}
              onPress={() => setFrequency('weekly')}
            >
              <Text style={[styles.freqText, frequency === 'weekly' && styles.freqTextActive]}>
                {t('chores.weekly')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.freqButton, frequency === 'biweekly' && styles.freqButtonActive]}
              onPress={() => setFrequency('biweekly')}
            >
              <Text style={[styles.freqText, frequency === 'biweekly' && styles.freqTextActive]}>
                {t('chores.biweekly')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('chores.rotationOrder')}</Text>
          <Text style={styles.hint}>{t('chores.rotationOrderHint')}</Text>
          {rotationOrder.length === 0 ? (
            <Text style={styles.mutedText}>{t('chores.addMembersFirst')}</Text>
          ) : (
            rotationOrder.map((member, index) => (
              <View key={member._id} style={styles.orderRow}>
                <Text style={styles.orderNumber}>{index + 1}.</Text>
                <Text style={styles.orderName}>{member.name}</Text>
                <View style={styles.orderActions}>
                  <TouchableOpacity
                    onPress={() => moveMember(index, 'up')}
                    disabled={index === 0}
                    style={[styles.orderBtn, index === 0 && styles.orderBtnDisabled]}
                  >
                    <Ionicons name="chevron-up" size={20} color={index === 0 ? colors.muted : colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveMember(index, 'down')}
                    disabled={index === rotationOrder.length - 1}
                    style={[styles.orderBtn, index === rotationOrder.length - 1 && styles.orderBtnDisabled]}
                  >
                    <Ionicons name="chevron-down" size={20} color={index === rotationOrder.length - 1 ? colors.muted : colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View
          ref={(r) => {
            fieldRefs.current.startDate = r;
          }}
          style={styles.field}
        >
          <Text style={styles.label}>{t('chores.startDate')}</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker((prev) => !prev)}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.dateButtonText}>
              {format(startDate, 'EEEE, MMM d, yyyy', { locale: dateFnsLocale })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant={theme}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setStartDate(date);
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

        <PrimaryButton
          title={isEditing ? t('common.save') : t('chores.addChore')}
          onPress={() => {
            Keyboard.dismiss();
            handleSave();
          }}
          disabled={!canSubmit || saving}
        />
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </SanctuaryScreenShell>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    field: {
      marginBottom: spacing.xl,
    },
    label: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    hint: {
      fontSize: fontSizes.xs,
      color: colors.muted,
      marginBottom: spacing.sm,
    },
    frequencyRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    freqButton: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    freqButtonActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryUltraSoft,
    },
    freqText: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
    },
    freqTextActive: {
      color: colors.primary,
      fontWeight: fontWeights.semibold,
    },
    orderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    orderNumber: {
      fontSize: fontSizes.sm,
      color: colors.muted,
      width: 24,
    },
    orderName: {
      flex: 1,
      fontSize: fontSizes.md,
      color: colors.text,
    },
    orderActions: {
      flexDirection: 'row',
    },
    orderBtn: {
      padding: spacing.xs,
    },
    orderBtnDisabled: {
      opacity: 0.5,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...(shadows.sm as object),
    },
    dateButtonText: {
      fontSize: fontSizes.md,
      color: colors.text,
    },
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
    mutedText: {
      fontSize: fontSizes.sm,
      color: colors.muted,
    },
  });
