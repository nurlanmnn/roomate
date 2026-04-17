import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { SUPPORTED_CURRENCIES, getCurrencyOption, CurrencyOption } from '../constants/currencies';
import { useLanguage } from '../context/LanguageContext';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../theme';

interface CurrencyPickerProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  /** Shown inline under the picker when the currency is locked. */
  lockedHint?: string;
}

export const CurrencyPicker: React.FC<CurrencyPickerProps> = ({
  value,
  onChange,
  disabled,
  lockedHint,
}) => {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selected = getCurrencyOption(value);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SUPPORTED_CURRENCIES;
    return SUPPORTED_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [search]);

  const open = () => {
    if (disabled) return;
    setSearch('');
    setModalVisible(true);
  };

  const handleSelect = (code: string) => {
    setModalVisible(false);
    if (code !== value) {
      onChange(code);
    }
  };

  const renderRow = ({ item }: { item: CurrencyOption }) => {
    const isSelected = item.code === value;
    return (
      <TouchableOpacity
        style={[styles.row, isSelected && styles.rowSelected]}
        onPress={() => handleSelect(item.code)}
        activeOpacity={0.7}
      >
        <View style={styles.symbolBadge}>
          <AppText style={styles.symbolText}>{item.symbol}</AppText>
        </View>
        <View style={styles.rowText}>
          <AppText style={styles.rowName}>{item.name}</AppText>
          <AppText style={styles.rowCode}>{item.code}</AppText>
        </View>
        {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.pickerButton, disabled && styles.pickerDisabled]}
        onPress={open}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <View style={styles.selectedRow}>
          <View style={styles.symbolBadge}>
            <AppText style={styles.symbolText}>{selected.symbol}</AppText>
          </View>
          <View style={styles.rowText}>
            <AppText style={styles.rowName}>{selected.name}</AppText>
            <AppText style={styles.rowCode}>{selected.code}</AppText>
          </View>
          {!disabled && (
            <Ionicons name="chevron-down-outline" size={20} color={colors.textSecondary} />
          )}
          {disabled && <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />}
        </View>
      </TouchableOpacity>

      {disabled && lockedHint ? <AppText style={styles.lockedHint}>{lockedHint}</AppText> : null}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>{t('currency.pickerTitle')}</AppText>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close-outline" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t('currency.searchPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="characters"
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              renderItem={renderRow}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              initialNumToRender={15}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    pickerButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      minHeight: 48,
      justifyContent: 'center',
      ...(shadows.sm as object),
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
      height: 36,
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
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      height: '82%',
      paddingTop: spacing.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    modalTitle: {
      fontSize: fontSizes.xl,
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
      fontSize: fontSizes.md,
      color: colors.text,
      paddingVertical: spacing.xs,
    },
    listContent: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      paddingBottom: spacing.xl,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
      gap: spacing.md,
      minHeight: 52,
    },
    rowSelected: {
      backgroundColor: colors.primaryUltraSoft,
    },
  });
