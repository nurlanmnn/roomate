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
import { Ionicons } from '@expo/vector-icons';
import { useShoppingMotion } from './useShoppingMotion';
import { Group } from '../ui/Group';
import { AppText } from '../AppText';
import { useThemeColors, fontSizes, fontWeights, spacing, radii } from '../../theme';

const ROW_HEIGHT = 56;
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
  const reduceMotion = useShoppingMotion();
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
          backgroundColor: colors.shadowStrong,
          justifyContent: 'flex-end',
        },
        card: {
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
          paddingTop: spacing.md,
          paddingBottom: Math.max(insets.bottom, spacing.md),
          maxHeight: '55%',
        },
        title: {
          fontSize: 20,
          fontWeight: fontWeights.bold,
          color: colors.text,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
        },
        list: {
          maxHeight: MAX_LIST_HEIGHT,
        },
        row: {
          minHeight: ROW_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          justifyContent: 'space-between',
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderLight,
        },
        rowSelected: {
          backgroundColor: colors.primaryUltraSoft,
        },
        rowText: {
          flex: 1,
          fontSize: fontSizes.md,
          color: colors.text,
        },
        rowTextSelected: {
          fontWeight: fontWeights.semibold,
          color: colors.primary,
        },
        cancelRow: {
          minHeight: 44,
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
          accessibilityRole="radio"
          accessibilityState={{ checked: selected }}
          style={[styles.row, selected && styles.rowSelected]}
          onPress={() => {
            onSelect(item.key);
            onClose();
          }}
          activeOpacity={0.7}
        >
          <AppText style={[styles.rowText, selected && styles.rowTextSelected]}>{item.label}</AppText>
          {selected ? <Ionicons name="checkmark-outline" size={22} color={colors.primary} /> : null}
        </TouchableOpacity>
      );
    },
    [selectedValue, onSelect, onClose, styles]
  );

  const keyExtractor = React.useCallback((item: UnitPickerRow) => (item.key === '' ? '__none__' : item.key), []);

  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={cancelLabel} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: colors.background }]} accessibilityViewIsModal>
          <AppText accessibilityRole="header" style={styles.title}>{title}</AppText>
          <Group style={{ maxHeight: MAX_LIST_HEIGHT, flexShrink: 1 }}>
            <FlatList
              data={data}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              style={[styles.list, { height: listHeight }]}
              nestedScrollEnabled={Platform.OS === 'android'}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={Platform.OS === 'android'}
              initialNumToRender={14}
              maxToRenderPerBatch={14}
              windowSize={5}
            />
          </Group>
          <TouchableOpacity accessibilityRole="button" style={styles.cancelRow} onPress={onClose} activeOpacity={0.7}>
            <AppText style={styles.cancelText}>{cancelLabel}</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
