import React, { useCallback, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Pressable,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FIELD_LABEL_WIDTH, Group } from './ui/Group';
import {
  SUPPORTED_CURRENCIES,
  getCurrencyOption,
  getLocalizedCurrencyName,
  CurrencyOption,
} from '../constants/currencies';
import { useLanguage, type LanguageCode } from '../context/LanguageContext';
import { useThemeColors, fontSizes, fontWeights, spacing, radii } from '../theme';

interface CurrencyPickerProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  /** Shown inline under the picker when the currency is locked. */
  lockedHint?: string;
  /** `row` renders the trigger as a label and value row for use inside a `Group`. */
  variant?: 'field' | 'row';
  /** Row variant only: shows a spinner in place of the chevron. */
  loading?: boolean;
}

export const CurrencyPicker: React.FC<CurrencyPickerProps> = ({
  value,
  onChange,
  disabled,
  lockedHint,
  variant = 'field',
  loading,
}) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);
  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);
  const { t, language } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selected = getCurrencyOption(value);
  const selectedDisplayName = getLocalizedCurrencyName(selected.code, language);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SUPPORTED_CURRENCIES;
    return SUPPORTED_CURRENCIES.filter((c) => {
      const localized = getLocalizedCurrencyName(c.code, language).toLowerCase();
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        localized.includes(q) ||
        c.symbol.toLowerCase().includes(q)
      );
    });
  }, [search, language]);

  const open = useCallback(() => {
    if (disabled) return;
    setSearch('');
    setModalVisible(true);
  }, [disabled]);

  const handleSelect = useCallback(
    (code: string) => {
      Keyboard.dismiss();
      setModalVisible(false);
      if (code !== value) {
        onChange(code);
      }
    },
    [onChange, value]
  );

  const closeModal = useCallback(() => {
    Keyboard.dismiss();
    setModalVisible(false);
  }, []);

  const renderRow = useCallback(
    ({ item }: { item: CurrencyOption }) => (
      <CurrencyRow
        item={item}
        isSelected={item.code === value}
        language={language}
        colorsPrimary={colors.primary}
        styles={styles}
        onSelect={handleSelect}
      />
    ),
    [colors.primary, handleSelect, language, styles, value]
  );

  return (
    <>
      {variant === 'row' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('currency.label')}: ${selectedDisplayName}, ${selected.code}`}
          accessibilityState={{ disabled: Boolean(disabled), expanded: modalVisible, busy: Boolean(loading) }}
          disabled={disabled}
          onPress={open}
          style={({ pressed }) => [styles.fieldRow, pressed && styles.fieldRowPressed]}
        >
          <AppText style={styles.fieldLabel} numberOfLines={2}>{t('currency.label')}</AppText>
          <AppText style={[styles.fieldValue, disabled && styles.fieldValueLocked]}>
            {selectedDisplayName} · {selected.code}
          </AppText>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : disabled ? (
            <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          )}
        </Pressable>
      ) : (
        <>
      <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${t('currency.label')}: ${selectedDisplayName}, ${selected.code}`}
            accessibilityState={{ disabled: Boolean(disabled), expanded: modalVisible }}
            disabled={disabled}
            style={[styles.pickerButton, disabled && styles.pickerDisabled]}
            onPress={open}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <View style={styles.selectedRow}>
              <View style={styles.symbolBadge}>
                <AppText style={styles.symbolText}>{selected.symbol}</AppText>
              </View>
              <View style={styles.rowText}>
                <AppText style={styles.rowName}>{selectedDisplayName}</AppText>
                <AppText style={styles.rowCode}>{selected.code}</AppText>
              </View>
              {!disabled && (
                <Ionicons name="chevron-down-outline" size={20} color={colors.textSecondary} />
              )}
              {disabled && <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />}
            </View>
          </TouchableOpacity>

          {disabled && lockedHint ? <AppText style={styles.lockedHint}>{lockedHint}</AppText> : null}
        </>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType={reduceMotion ? 'none' : 'slide'}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} style={StyleSheet.absoluteFill} onPress={closeModal} />
          <Pressable accessibilityViewIsModal accessible={false} accessibilityRole="button" accessibilityLabel={t('common.dismissKeyboard')} style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, spacing.md) }]} onPress={Keyboard.dismiss}>
            <View style={styles.modalHeader}>
              <AppText accessibilityRole="header" style={styles.modalTitle}>{t('currency.pickerTitle')}</AppText>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.closeButton} onPress={closeModal}>
                <Ionicons name="close-outline" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View
              style={styles.searchWrap}
              onTouchEnd={(event) => {
                event.stopPropagation();
              }}
            >
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                accessibilityLabel={t('currency.searchPlaceholder')}
                value={search}
                onChangeText={setSearch}
                placeholder={t('currency.searchPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="characters"
              />
            </View>
            <Group style={styles.listGroup}>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              renderItem={renderRow}
              extraData={value}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              initialNumToRender={15}
            />
            </Group>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const CurrencyRow = React.memo(function CurrencyRow({
  item,
  isSelected,
  language,
  colorsPrimary,
  styles,
  onSelect,
}: {
  item: CurrencyOption;
  isSelected: boolean;
  language: LanguageCode;
  colorsPrimary: string;
  styles: ReturnType<typeof createStyles>;
  onSelect: (code: string) => void;
}) {
  const displayName = getLocalizedCurrencyName(item.code, language);
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected, checked: isSelected }}
      style={[styles.row, isSelected && styles.rowSelected]}
      onPress={() => onSelect(item.code)}
      activeOpacity={0.7}
    >
      <View style={styles.symbolBadge}>
        <AppText style={styles.symbolText}>{item.symbol}</AppText>
      </View>
      <View style={styles.rowText}>
        <AppText style={styles.rowName}>{displayName}</AppText>
        <AppText style={styles.rowCode}>{item.code}</AppText>
      </View>
      {isSelected && <Ionicons name="checkmark-circle-outline" size={22} color={colorsPrimary} />}
    </TouchableOpacity>
  );
});

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    fieldRowPressed: {
      backgroundColor: colors.primaryUltraSoft,
    },
    fieldLabel: {
      width: FIELD_LABEL_WIDTH,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    fieldValue: {
      flex: 1,
      minWidth: 0,
      fontSize: fontSizes.md,
      color: colors.text,
    },
    fieldValueLocked: {
      color: colors.textSecondary,
    },
    pickerButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      minHeight: 48,
      justifyContent: 'center',
    },
    pickerDisabled: {
      backgroundColor: colors.surfaceAlt,
      opacity: 0.9,
    },
    selectedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    symbolBadge: {
      minWidth: 36,
      paddingHorizontal: spacing.sm,
      minHeight: 36,
      paddingVertical: spacing.xxs,
      borderRadius: radii.sm,
      backgroundColor: colors.primaryUltraSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    symbolText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.bold,
      color: colors.primary,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
    },
    rowName: {
      fontSize: fontSizes.md,
      color: colors.text,
      fontWeight: fontWeights.medium,
    },
    rowCode: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    lockedHint: {
      fontSize: fontSizes.xs,
      color: colors.textTertiary,
      marginTop: spacing.xs,
      lineHeight: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.shadowStrong,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      height: '82%',
      paddingTop: spacing.lg,
    },
    modalHeader: {
      gap: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    closeButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    searchWrap: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.background,
    },
    searchInput: {
      flex: 1,
      minHeight: 44,
      fontSize: fontSizes.md,
      color: colors.text,
      paddingVertical: spacing.xs,
    },
    listGroup: {
      flex: 1,
      marginTop: spacing.md,
    },
    listContent: {
      paddingBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
      gap: spacing.sm,
      minHeight: 60,
    },
    rowSelected: {
      backgroundColor: colors.primaryUltraSoft,
    },
  });
