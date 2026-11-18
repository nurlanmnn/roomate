import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EXPENSE_CATEGORIES, getExpenseCategoryLabel } from '../constants/expenseCategories';
import { useLanguage } from '../context/LanguageContext';
import { fontSizes, fontWeights, radii, spacing, useTheme, useThemeColors } from '../theme';
import { toBcp47Locale } from '../utils/dateLocales';
import { AppText } from './AppText';
import { FormTextInput } from './FormTextInput';
import { SearchBar } from './ui/SearchBar';
import { PrimaryButton } from './PrimaryButton';

export type SortOption = 'newest' | 'oldest' | 'amount' | 'category';
export type GroupByOption = 'none' | 'date' | 'category' | 'person';

export interface ExpenseFilters {
  search: string;
  dateFrom?: Date;
  dateTo?: Date;
  category?: string;
  personId?: string;
  amountMin?: string;
  amountMax?: string;
  sortBy: SortOption;
  groupBy: GroupByOption;
}

interface ExpenseFiltersProps {
  filters: ExpenseFilters;
  onFiltersChange: (filters: ExpenseFilters) => void;
  memberNames: { id: string; name: string; }[];
  /** Lighter bar when nested inside a group card */
  embedded?: boolean;
}

export const ExpenseFilters: React.FC<ExpenseFiltersProps> = ({
  filters,
  onFiltersChange,
  memberNames,
  embedded = false,
}) => {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const filterScrollRef = useRef<ScrollView>(null);
  const filterScrollYRef = useRef(0);
  const dateRangeFieldRef = useRef<View | null>(null);

  const scrollDateRangeIntoView = useCallback(() => {
    if (Platform.OS !== 'ios') return;
    const node = dateRangeFieldRef.current;
    if (!node || !filterScrollRef.current) return;
    node.measureInWindow((_x, y, _w, h) => {
      const windowH = Dimensions.get('window').height;
      const safeBottom = windowH - insets.bottom - 28;
      const viewBottom = y + h;
      let delta = viewBottom - safeBottom + 24;
      delta = Math.max(delta, 220);
      if (delta > 6) {
        filterScrollRef.current?.scrollTo({
          y: Math.max(0, filterScrollYRef.current + delta),
          animated: false,
        });
      }
    });
  }, [insets.bottom]);

  const [showFilters, setShowFilters] = useState(false);
  const [showDateFromPicker, setShowDateFromPicker] = useState(false); // Android dialog
  const [showDateToPicker, setShowDateToPicker] = useState(false); // Android dialog
  const [iosActiveDatePicker, setIosActiveDatePicker] = useState<'from' | 'to' | null>(null);
  const [showSortPicker, setShowSortPicker] = useState(false);
  const [activePicker, setActivePicker] = useState<null | 'category' | 'person' | 'groupBy'>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !iosActiveDatePicker) return;
    const id = setTimeout(() => scrollDateRangeIntoView(), 200);
    return () => clearTimeout(id);
  }, [iosActiveDatePicker, scrollDateRangeIntoView]);

  const filterScrollPaddingBottom =
    Platform.OS === 'ios' && iosActiveDatePicker ? 340 : spacing.lg;

  const closeFiltersModal = () => {
    Keyboard.dismiss();
    setActivePicker(null);
    setIosActiveDatePicker(null);
    setShowDateFromPicker(false);
    setShowDateToPicker(false);
    setShowFilters(false);
  };

  const closeSortModal = () => {
    Keyboard.dismiss();
    setShowSortPicker(false);
  };

  const styles = useMemo(() => StyleSheet.create({
    filterBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    filterBarEmbedded: {
      backgroundColor: 'transparent',
      borderBottomWidth: 0,
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    filterButton: {
      minHeight: 44,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterButtonText: {
      flexShrink: 1,
      fontSize: fontSizes.sm,
      color: colors.text,
      fontWeight: fontWeights.semibold,
    },
    filterButtonTextActive: {
      color: colors.onPrimary,
    },
    sortButton: {
      minHeight: 44,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.sm,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    sortButtonText: {
      flexShrink: 1,
      fontSize: fontSizes.sm,
      color: colors.text,
      fontWeight: fontWeights.semibold,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.shadowStrong,
    },
    modalOverlayInner: {
      flex: 1,
      justifyContent: 'flex-end',
      pointerEvents: 'box-none',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      maxHeight: '90%',
      paddingTop: spacing.lg,

    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    modalHeaderLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: radii.sm,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      flexShrink: 1,
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    filterContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    filterSection: {
      marginBottom: spacing.lg,
    },
    filterLabel: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    dateRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    iosDatePickerContainer: {
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      overflow: 'hidden',
      backgroundColor: colors.background,
    },
    iosDatePickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.surface,
    },
    iosDatePickerTitle: {
      flexShrink: 1,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    iosDatePickerDone: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.primary,
    },
    dateButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.background,
    },
    dateButtonText: {
      flexShrink: 1,
      fontSize: fontSizes.md,
      color: colors.text,
    },
    pickerButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.background,
    },
    pickerButtonText: {
      flexShrink: 1,
      fontSize: fontSizes.md,
      color: colors.text,
    },
    amountRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    amountInput: {
      flex: 1,
    },
    optionItem: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
      marginBottom: spacing.xs,
      gap: spacing.sm,
    },
    optionText: {
      flex: 1,
      fontSize: fontSizes.md,
      color: colors.text,
    },
    modalActions: {
      flexWrap: 'wrap',
      gap: spacing.xs,
      flexDirection: 'row',
      marginTop: spacing.lg,
      marginBottom: spacing.md,
    },
    spacer: {
      width: spacing.sm,
    },
  }), [colors]);

  const updateFilter = (key: keyof ExpenseFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      sortBy: 'newest',
      groupBy: 'none',
    });
  };

  const hasActiveFilters = filters.search || filters.dateFrom || filters.dateTo ||
    filters.category || filters.personId || filters.amountMin || filters.amountMax ||
    filters.sortBy !== 'newest' || filters.groupBy !== 'none';

  return (
    <>
      <View style={[styles.filterBar, embedded && styles.filterBarEmbedded]}>
        <TouchableOpacity accessibilityRole="button" hitSlop={8}
          accessibilityState={{ selected: Boolean(hasActiveFilters), expanded: showFilters }}
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={hasActiveFilters ? colors.onPrimary : colors.text}
          />
          <AppText style={[styles.filterButtonText, hasActiveFilters && styles.filterButtonTextActive]}>
            {t('expenses.filters')}
          </AppText>
          {hasActiveFilters && <Ionicons name="checkmark-outline" size={18} color={colors.onPrimary} />}
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" hitSlop={8}
          accessibilityState={{ expanded: showSortPicker }}
          style={styles.sortButton}
          onPress={() => setShowSortPicker(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="swap-vertical-outline" size={18} color={colors.text} />
          <AppText style={styles.sortButtonText}>
            {filters.sortBy === 'newest' ? t('expenses.newest') :
              filters.sortBy === 'oldest' ? t('expenses.oldest') :
                filters.sortBy === 'amount' ? t('expenses.amount') : t('expenses.category')}
          </AppText>
          <Ionicons name="chevron-down-outline" size={14} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="none"
        onRequestClose={closeFiltersModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={StyleSheet.absoluteFillObject}
            onPress={closeFiltersModal}
          />
          <View style={styles.modalOverlayInner}>
            <View style={styles.modalContent}>
              <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
                <View>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderLeft}>
                      {activePicker && (
                        <TouchableOpacity accessibilityRole="button" hitSlop={8}
                          accessibilityLabel={t('common.back')}
                          style={styles.backButton}
                          onPress={() => {
                            Keyboard.dismiss();
                            setActivePicker(null);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="chevron-back-outline" size={20} color={colors.text} />
                        </TouchableOpacity>
                      )}
                      <AppText style={styles.modalTitle}>
                        {activePicker === 'category'
                          ? t('expenses.selectCategory')
                          : activePicker === 'person'
                            ? t('expenses.selectPerson')
                            : activePicker === 'groupBy'
                              ? t('expenses.groupBy')
                              : t('expenses.filters')}
                      </AppText>
                    </View>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={12} onPress={closeFiltersModal} activeOpacity={0.7}>
                      <Ionicons name="close-outline" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  {activePicker ? (
                    <ScrollView
                      style={styles.filterContent}
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="on-drag"
                    >
                      {activePicker === 'category' && (
                        <>
                          <TouchableOpacity accessibilityRole="button" hitSlop={8}
                            accessibilityState={{ selected: !filters.category }}
                            style={styles.optionItem}
                            activeOpacity={0.7}
                            onPress={() => {
                              updateFilter('category', undefined);
                              setActivePicker(null);
                            }}
                          >
                            <AppText style={styles.optionText}>{t('expenses.allCategories')}</AppText>
                          </TouchableOpacity>
                          {EXPENSE_CATEGORIES.map((cat) => (
                            <TouchableOpacity accessibilityRole="button" hitSlop={8}
                              accessibilityState={{ selected: filters.category === cat.id }}
                              key={cat.id}
                              style={styles.optionItem}
                              activeOpacity={0.7}
                              onPress={() => {
                                updateFilter('category', cat.id);
                                setActivePicker(null);
                              }}
                            >
                              <Ionicons name={cat.icon} size={20} color={colors.primary} />
                              <AppText style={styles.optionText}>{getExpenseCategoryLabel(t, cat.id)}</AppText>
                              {filters.category === cat.id && (
                                <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                              )}
                            </TouchableOpacity>
                          ))}
                        </>
                      )}

                      {activePicker === 'person' && (
                        <>
                          <TouchableOpacity accessibilityRole="button" hitSlop={8}
                            accessibilityState={{ selected: !filters.personId }}
                            style={styles.optionItem}
                            activeOpacity={0.7}
                            onPress={() => {
                              updateFilter('personId', undefined);
                              setActivePicker(null);
                            }}
                          >
                            <AppText style={styles.optionText}>{t('expenses.allPeople')}</AppText>
                          </TouchableOpacity>
                          {memberNames.map((member) => (
                            <TouchableOpacity accessibilityRole="button" hitSlop={8}
                              accessibilityState={{ selected: filters.personId === member.id }}
                              key={member.id}
                              style={styles.optionItem}
                              activeOpacity={0.7}
                              onPress={() => {
                                updateFilter('personId', member.id);
                                setActivePicker(null);
                              }}
                            >
                              <AppText style={styles.optionText}>{member.name}</AppText>
                              {filters.personId === member.id && (
                                <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                              )}
                            </TouchableOpacity>
                          ))}
                        </>
                      )}

                      {activePicker === 'groupBy' && (
                        <>
                          {(['none', 'date', 'category', 'person'] as GroupByOption[]).map((option) => (
                            <TouchableOpacity accessibilityRole="button" hitSlop={8}
                              accessibilityState={{ selected: filters.groupBy === option }}
                              key={option}
                              style={styles.optionItem}
                              activeOpacity={0.7}
                              onPress={() => {
                                updateFilter('groupBy', option);
                                setActivePicker(null);
                              }}
                            >
                              <AppText style={styles.optionText}>
                                {option === 'none' ? t('expenses.none') :
                                  option === 'date' ? t('expenses.byDate') :
                                    option === 'category' ? t('expenses.byCategory') : t('expenses.byPerson')}
                              </AppText>
                              {filters.groupBy === option && (
                                <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                              )}
                            </TouchableOpacity>
                          ))}
                        </>
                      )}
                    </ScrollView>
                  ) : (
                    <ScrollView
                      ref={filterScrollRef}
                      style={styles.filterContent}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="on-drag"
                      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                      contentContainerStyle={{ paddingBottom: filterScrollPaddingBottom }}
                      onScroll={(e) => {
                        filterScrollYRef.current = e.nativeEvent.contentOffset.y;
                      }}
                      scrollEventThrottle={16}
                    >
                      <SearchBar
                        value={filters.search}
                        onChangeText={(text) => updateFilter('search', text)}
                        placeholder={t('expenses.searchExpenses')}
                        style={{ marginBottom: spacing.md }}
                      />

                      <View
                        ref={(r) => {
                          dateRangeFieldRef.current = r;
                        }}
                        style={styles.filterSection}
                      >
                        <AppText style={styles.filterLabel}>{t('expenses.dateRange')}</AppText>
                        <View style={styles.dateRow}>
                          <TouchableOpacity accessibilityRole="button" hitSlop={8}
                            accessibilityState={{ expanded: iosActiveDatePicker === 'from' || showDateFromPicker }}
                            style={styles.dateButton}
                            onPress={() => {
                              if (Platform.OS === 'ios') {
                                // Tap again toggles (undo) / and clears if a value is set & picker is closed
                                if (iosActiveDatePicker === 'from') {
                                  setIosActiveDatePicker(null);
                                  return;
                                }
                                if (!iosActiveDatePicker && filters.dateFrom) {
                                  updateFilter('dateFrom', undefined);
                                  return;
                                }
                                setIosActiveDatePicker('from');
                                return;
                              }

                              if (showDateFromPicker) {
                                setShowDateFromPicker(false);
                              } else {
                                setShowDateFromPicker(true);
                              }
                            }}
                          >
                            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                            <AppText style={styles.dateButtonText}>
                              {filters.dateFrom
                                ? filters.dateFrom.toLocaleDateString(toBcp47Locale(language))
                                : t('time.from')}
                            </AppText>
                          </TouchableOpacity>
                          <TouchableOpacity accessibilityRole="button" hitSlop={8}
                            accessibilityState={{ expanded: iosActiveDatePicker === 'to' || showDateToPicker }}
                            style={styles.dateButton}
                            onPress={() => {
                              if (Platform.OS === 'ios') {
                                if (iosActiveDatePicker === 'to') {
                                  setIosActiveDatePicker(null);
                                  return;
                                }
                                if (!iosActiveDatePicker && filters.dateTo) {
                                  updateFilter('dateTo', undefined);
                                  return;
                                }
                                setIosActiveDatePicker('to');
                                return;
                              }

                              if (showDateToPicker) {
                                setShowDateToPicker(false);
                              } else {
                                setShowDateToPicker(true);
                              }
                            }}
                          >
                            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                            <AppText style={styles.dateButtonText}>
                              {filters.dateTo
                                ? filters.dateTo.toLocaleDateString(toBcp47Locale(language))
                                : t('time.to')}
                            </AppText>
                          </TouchableOpacity>
                        </View>

                        {/* iOS date picker must be inside the modal, otherwise it renders behind it */}
                        {Platform.OS === 'ios' && iosActiveDatePicker && (
                          <View style={styles.iosDatePickerContainer}>
                            <View style={styles.iosDatePickerHeader}>
                              <AppText style={styles.iosDatePickerTitle}>
                                {iosActiveDatePicker === 'from' ? t('expenses.fromDate') : t('expenses.toDate')}
                              </AppText>
                              <TouchableOpacity accessibilityRole="button" hitSlop={8} onPress={() => setIosActiveDatePicker(null)} activeOpacity={0.7}>
                                <AppText style={styles.iosDatePickerDone}>{t('common.done')}</AppText>
                              </TouchableOpacity>
                            </View>
                            <DateTimePicker
                              value={
                                iosActiveDatePicker === 'from'
                                  ? filters.dateFrom || new Date()
                                  : filters.dateTo || new Date()
                              }
                              mode="date"
                              display="spinner"
                              themeVariant={theme}
                              onChange={(_event, date) => {
                                if (!date) return;
                                updateFilter(iosActiveDatePicker === 'from' ? 'dateFrom' : 'dateTo', date);
                              }}
                            />
                          </View>
                        )}
                      </View>

                      <View style={styles.filterSection}>
                        <AppText style={styles.filterLabel}>{t('expenses.category')}</AppText>
                        <TouchableOpacity accessibilityRole="button" hitSlop={8}
                          style={styles.pickerButton}
                          activeOpacity={0.7}
                          onPress={() => setActivePicker('category')}
                        >
                          <AppText style={styles.pickerButtonText}>
                            {filters.category
                              ? getExpenseCategoryLabel(t, filters.category)
                              : t('expenses.allCategories')}
                          </AppText>
                          <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.filterSection}>
                        <AppText style={styles.filterLabel}>{t('expenses.person')}</AppText>
                        <TouchableOpacity accessibilityRole="button" hitSlop={8}
                          style={styles.pickerButton}
                          activeOpacity={0.7}
                          onPress={() => setActivePicker('person')}
                        >
                          <AppText style={styles.pickerButtonText}>
                            {filters.personId ? memberNames.find(m => m.id === filters.personId)?.name : t('expenses.allPeople')}
                          </AppText>
                          <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.filterSection}>
                        <AppText style={styles.filterLabel}>{t('expenses.amountRange')}</AppText>
                        <View style={styles.amountRow}>
                          <View style={styles.amountInput}>
                            <FormTextInput
                              value={filters.amountMin || ''}
                              onChangeText={(text) => updateFilter('amountMin', text)}
                              placeholder={t('expenses.min')}
                              keyboardType="decimal-pad"
                              containerStyle={{ marginBottom: 0 }}
                            />
                          </View>
                          <View style={styles.amountInput}>
                            <FormTextInput
                              value={filters.amountMax || ''}
                              onChangeText={(text) => updateFilter('amountMax', text)}
                              placeholder={t('expenses.max')}
                              keyboardType="decimal-pad"
                              containerStyle={{ marginBottom: 0 }}
                            />
                          </View>
                        </View>
                      </View>

                      <View style={styles.filterSection}>
                        <AppText style={styles.filterLabel}>{t('expenses.groupBy')}</AppText>
                        <TouchableOpacity accessibilityRole="button" hitSlop={8}
                          style={styles.pickerButton}
                          activeOpacity={0.7}
                          onPress={() => setActivePicker('groupBy')}
                        >
                          <AppText style={styles.pickerButtonText}>
                            {filters.groupBy === 'none' ? t('expenses.none') :
                              filters.groupBy === 'date' ? t('expenses.byDate') :
                                filters.groupBy === 'category' ? t('expenses.byCategory') : t('expenses.byPerson')}
                          </AppText>
                          <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.modalActions}>
                        <PrimaryButton
                          title={t('expenses.clearAll')}
                          onPress={() => {
                            Keyboard.dismiss();
                            clearFilters();
                          }}
                          variant="outline"
                        />
                        <View style={styles.spacer} />
                        <PrimaryButton title={t('expenses.apply')} onPress={closeFiltersModal} />
                      </View>
                    </ScrollView>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {Platform.OS !== 'ios' && showDateFromPicker && (
        <DateTimePicker
          value={filters.dateFrom || new Date()}
          mode="date"
          display="default"
          themeVariant={theme}
          onChange={(event, date) => {
            setShowDateFromPicker(false);
            if (date) updateFilter('dateFrom', date);
          }}
        />
      )}
      {Platform.OS !== 'ios' && showDateToPicker && (
        <DateTimePicker
          value={filters.dateTo || new Date()}
          mode="date"
          display="default"
          themeVariant={theme}
          onChange={(event, date) => {
            setShowDateToPicker(false);
            if (date) updateFilter('dateTo', date);
          }}
        />
      )}

      {/* Sort Picker Modal */}
      <Modal
        visible={showSortPicker}
        transparent
        animationType="none"
        onRequestClose={closeSortModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={StyleSheet.absoluteFillObject}
            onPress={closeSortModal}
          />
          <View style={styles.modalOverlayInner}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <AppText style={styles.modalTitle}>{t('expenses.sortBy')}</AppText>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={12} onPress={closeSortModal}>
                  <Ionicons name="close-outline" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.filterContent} keyboardShouldPersistTaps="handled">
                {(['newest', 'oldest', 'amount', 'category'] as SortOption[]).map((option) => (
                  <TouchableOpacity accessibilityRole="button" hitSlop={8}
                    accessibilityState={{ selected: filters.sortBy === option }}
                    key={option}
                    style={styles.optionItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      updateFilter('sortBy', option);
                      setShowSortPicker(false);
                    }}
                  >
                    <AppText style={styles.optionText}>
                      {option === 'newest' ? t('expenses.newestFirst') :
                        option === 'oldest' ? t('expenses.oldestFirst') :
                          option === 'amount' ? t('expenses.amountHighToLow') : t('expenses.category')}
                    </AppText>
                    {filters.sortBy === option && (
                      <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

    </>
  );
};
