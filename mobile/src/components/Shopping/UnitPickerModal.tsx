import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../AppText';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../../theme';

const ROW_HEIGHT = 48;
const MAX_LIST_HEIGHT = 320;

export type UnitPickerRow = { key: string; label: string };

interface UnitPickerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Current selection (empty string = none) */
  selectedValue: string;
  onSelect: (value: string) => void;
  units: string[];
  title: string;
  noneLabel: string;
  cancelLabel: string;
}

/**
 * Separate modal for unit selection — avoids nested ScrollViews inside bottom sheets,
 * which causes scroll jank on iOS.
 */
export const UnitPickerModal: React.FC<UnitPickerModalProps> = ({
  visible,
  onClose,
  selectedValue,
  onSelect,
  units,
  title,
  noneLabel,
  cancelLabel,
}) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const data = React.useMemo<UnitPickerRow[]>(
    () => [{ key: '', label: noneLabel }, ...units.map((u) => ({ key: u, label: u }))],
    [units, noneLabel]
  );

  const listHeight = Math.min(data.length * ROW_HEIGHT, MAX_LIST_HEIGHT);

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'flex-end',
        },
        card: {
          borderTopLeftRadius: radii.lg,
          borderTopRightRadius: radii.lg,
          paddingTop: spacing.md,
          paddingBottom: Math.max(insets.bottom, spacing.md),
          maxHeight: '55%',
          borderWidth: 1,
          borderColor: colors.borderLight,
          ...(shadows.lg as object),
        },
        title: {
          fontSize: fontSizes.lg,
          fontWeight: fontWeights.bold,
          color: colors.text,
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.sm,
        },
        list: {
          maxHeight: MAX_LIST_HEIGHT,
        },
        row: {
          height: ROW_HEIGHT,
          paddingHorizontal: spacing.xl,
          justifyContent: 'center',
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderLight,
        },
        rowSelected: {
          backgroundColor: colors.primaryUltraSoft,
        },
        rowText: {
          fontSize: fontSizes.md,
          color: colors.text,
        },
        rowTextSelected: {
          fontWeight: fontWeights.semibold,
          color: colors.primary,
        },
        cancelRow: {
          marginTop: spacing.sm,
          paddingVertical: spacing.md,
          alignItems: 'center',
        },
        cancelText: {
          fontSize: fontSizes.md,
          fontWeight: fontWeights.semibold,
          color: colors.textSecondary,
        },
      }),
    [colors, insets.bottom]
  );

  const renderItem = React.useCallback(
    ({ item }: { item: UnitPickerRow }) => {
      const selected = selectedValue === item.key;
      return (
        <TouchableOpacity
          style={[styles.row, selected && styles.rowSelected]}
          onPress={() => {
            onSelect(item.key);
            onClose();
          }}
          activeOpacity={0.7}
        >
          <AppText style={[styles.rowText, selected && styles.rowTextSelected]}>{item.label}</AppText>
        </TouchableOpacity>
      );
    },
    [selectedValue, onSelect, onClose, styles]
  );

  const keyExtractor = React.useCallback((item: UnitPickerRow) => (item.key === '' ? '__none__' : item.key), []);

  const getItemLayout = React.useCallback(
    (_data: ArrayLike<UnitPickerRow> | null | undefined, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <AppText style={styles.title}>{title}</AppText>
          <FlatList
            data={data}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            style={[styles.list, { height: listHeight }]}
            nestedScrollEnabled={Platform.OS === 'android'}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={Platform.OS === 'android'}
            initialNumToRender={14}
            maxToRenderPerBatch={14}
            windowSize={5}
          />
          <TouchableOpacity style={styles.cancelRow} onPress={onClose} activeOpacity={0.7}>
            <AppText style={styles.cancelText}>{cancelLabel}</AppText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
