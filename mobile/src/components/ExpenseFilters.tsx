import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { AppText } from './AppText';
import { FormTextInput } from './FormTextInput';
import { PrimaryButton } from './PrimaryButton';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { EXPENSE_CATEGORIES } from '../constants/expenseCategories';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../theme';
import { Platform } from 'react-native';

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
  memberNames: { id: string; name: string }[];
}

export const ExpenseFilters: React.FC<ExpenseFiltersProps> = ({
  filters,
  onFiltersChange,
  memberNames,
}) => {
  const colors = useThemeColors();
  const [showFilters, setShowFilters] = useState(false);
  const [showDateFromPicker, setShowDateFromPicker] = useState(false); // Android dialog
  const [showDateToPicker, setShowDateToPicker] = useState(false); // Android dialog
  const [iosActiveDatePicker, setIosActiveDatePicker] = useState<'from' | 'to' | null>(null);
  const [showSortPicker, setShowSortPicker] = useState(false);
  const [activePicker, setActivePicker] = useState<null | 'category' | 'person' | 'groupBy'>(null);

  const styles = React.useMemo(() => StyleSheet.create({
    filterBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterButtonText: {
      fontSize: fontSizes.sm,
      color: colors.text,
      fontWeight: fontWeights.medium,
    },
    filterButtonTextActive: {
      color: colors.surface,
    },
    filterBadge: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.danger,
      marginLeft: spacing.xs,
    },
    filterActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    sortButtonText: {
      fontSize: fontSizes.sm,
      color: colors.text,
      fontWeight: fontWeights.medium,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      maxHeight: '90%',
      paddingTop: spacing.lg,
      ...(shadows.lg as object),
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
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
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter-outline" size={18} color={hasActiveFilters ? colors.surface : colors.text} />
          <AppText style={[styles.filterButtonText, hasActiveFilters && styles.filterButtonTextActive]}>
            Filters
          </AppText>
          {hasActiveFilters && <View style={styles.filterBadge} />}
        </TouchableOpacity>
        <View style={styles.filterActions}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortPicker(true)}
          >
            <Ionicons name="swap-vertical-outline" size={18} color={colors.text} />
            <AppText style={styles.sortButtonText}>
              {filters.sortBy === 'newest' ? 'Newest' : 
               filters.sortBy === 'oldest' ? 'Oldest' :
               filters.sortBy === 'amount' ? 'Amount' : 'Category'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setActivePicker(null);
          setShowFilters(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                {activePicker && (
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setActivePicker(null)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={20} color={colors.text} />
                  </TouchableOpacity>
                )}
                <AppText style={styles.modalTitle}>
                  {activePicker === 'category'
                    ? 'Select Category'
                    : activePicker === 'person'
                      ? 'Select Person'
                      : activePicker === 'groupBy'
                        ? 'Group By'
                        : 'Filters'}
                </AppText>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setActivePicker(null);
                  setShowFilters(false);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {activePicker ? (
              <ScrollView style={styles.filterContent} keyboardShouldPersistTaps="handled">
                {activePicker === 'category' && (
                  <>
                    <TouchableOpacity
                      style={styles.optionItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        updateFilter('category', undefined);
                        setActivePicker(null);
                      }}
                    >
                      <AppText style={styles.optionText}>All Categories</AppText>
                    </TouchableOpacity>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={styles.optionItem}
                        activeOpacity={0.7}
                        onPress={() => {
                          updateFilter('category', cat.id);
                          setActivePicker(null);
                        }}
                      >
                        <Ionicons name={cat.icon} size={20} color={cat.color} />
                        <AppText style={styles.optionText}>{cat.name}</AppText>
                        {filters.category === cat.id && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {activePicker === 'person' && (
                  <>
                    <TouchableOpacity
                      style={styles.optionItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        updateFilter('personId', undefined);
                        setActivePicker(null);
                      }}
                    >
                      <AppText style={styles.optionText}>All People</AppText>
                    </TouchableOpacity>
                    {memberNames.map((member) => (
                      <TouchableOpacity
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
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {activePicker === 'groupBy' && (
                  <>
                    {(['none', 'date', 'category', 'person'] as GroupByOption[]).map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={styles.optionItem}
                        activeOpacity={0.7}
                        onPress={() => {
                          updateFilter('groupBy', option);
                          setActivePicker(null);
                        }}
                      >
                        <AppText style={styles.optionText}>
                          {option === 'none' ? 'None' :
                            option === 'date' ? 'Date' :
                              option === 'category' ? 'Category' : 'Person'}
                        </AppText>
                        {filters.groupBy === option && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
            ) : (
              <ScrollView
                style={styles.filterContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <FormTextInput
                  label="Search"
                  value={filters.search}
                  onChangeText={(text) => updateFilter('search', text)}
                  placeholder="Search expenses..."
                  autoCapitalize="none"
                />

                <View style={styles.filterSection}>
                  <AppText style={styles.filterLabel}>Date Range</AppText>
                  <View style={styles.dateRow}>
                    <TouchableOpacity
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
                        {filters.dateFrom ? filters.dateFrom.toLocaleDateString() : 'From'}
                      </AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
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
                        {filters.dateTo ? filters.dateTo.toLocaleDateString() : 'To'}
                      </AppText>
                    </TouchableOpacity>
                  </View>

                  {/* iOS date picker must be inside the modal, otherwise it renders behind it */}
                  {Platform.OS === 'ios' && iosActiveDatePicker && (
                    <View style={styles.iosDatePickerContainer}>
                      <View style={styles.iosDatePickerHeader}>
                        <AppText style={styles.iosDatePickerTitle}>
                          {iosActiveDatePicker === 'from' ? 'From date' : 'To date'}
                        </AppText>
                        <TouchableOpacity onPress={() => setIosActiveDatePicker(null)} activeOpacity={0.7}>
                          <AppText style={styles.iosDatePickerDone}>Done</AppText>
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
                        onChange={(_event, date) => {
                          if (!date) return;
                          updateFilter(iosActiveDatePicker === 'from' ? 'dateFrom' : 'dateTo', date);
                        }}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.filterSection}>
                  <AppText style={styles.filterLabel}>Category</AppText>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    activeOpacity={0.7}
                    onPress={() => setActivePicker('category')}
                  >
                    <AppText style={styles.pickerButtonText}>
                      {filters.category ? EXPENSE_CATEGORIES.find(c => c.id === filters.category)?.name : 'All Categories'}
                    </AppText>
                    <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.filterSection}>
                  <AppText style={styles.filterLabel}>Person</AppText>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    activeOpacity={0.7}
                    onPress={() => setActivePicker('person')}
                  >
                    <AppText style={styles.pickerButtonText}>
                      {filters.personId ? memberNames.find(m => m.id === filters.personId)?.name : 'All People'}
                    </AppText>
                    <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.filterSection}>
                  <AppText style={styles.filterLabel}>Amount Range</AppText>
                  <View style={styles.amountRow}>
                    <FormTextInput
                      value={filters.amountMin || ''}
                      onChangeText={(text) => updateFilter('amountMin', text)}
                      placeholder="Min"
                      keyboardType="numeric"
                      style={styles.amountInput}
                    />
                    <FormTextInput
                      value={filters.amountMax || ''}
                      onChangeText={(text) => updateFilter('amountMax', text)}
                      placeholder="Max"
                      keyboardType="numeric"
                      style={styles.amountInput}
                    />
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <AppText style={styles.filterLabel}>Group By</AppText>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    activeOpacity={0.7}
                    onPress={() => setActivePicker('groupBy')}
                  >
                    <AppText style={styles.pickerButtonText}>
                      {filters.groupBy === 'none' ? 'None' :
                        filters.groupBy === 'date' ? 'Date' :
                          filters.groupBy === 'category' ? 'Category' : 'Person'}
                    </AppText>
                    <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalActions}>
                  <PrimaryButton
                    title="Clear All"
                    onPress={clearFilters}
                    variant="outline"
                  />
                  <View style={styles.spacer} />
                  <PrimaryButton
                    title="Apply"
                    onPress={() => {
                      setActivePicker(null);
                      setShowFilters(false);
                    }}
                  />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {Platform.OS !== 'ios' && showDateFromPicker && (
        <DateTimePicker
          value={filters.dateFrom || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
        animationType="slide"
        onRequestClose={() => setShowSortPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>Sort By</AppText>
              <TouchableOpacity onPress={() => setShowSortPicker(false)}>
                <Ionicons name="close-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.filterContent} keyboardShouldPersistTaps="handled">
              {(['newest', 'oldest', 'amount', 'category'] as SortOption[]).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.optionItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    updateFilter('sortBy', option);
                    setShowSortPicker(false);
                  }}
                >
                  <AppText style={styles.optionText}>
                    {option === 'newest' ? 'Newest First' :
                     option === 'oldest' ? 'Oldest First' :
                     option === 'amount' ? 'Amount (High to Low)' : 'Category'}
                  </AppText>
                  {filters.sortBy === option && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </>
  );
};

