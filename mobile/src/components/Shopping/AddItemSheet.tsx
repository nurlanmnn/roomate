import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShoppingMotion } from './useShoppingMotion';
import { AppText } from '../AppText';
import { FormTextInput } from '../FormTextInput';
import { PrimaryButton } from '../PrimaryButton';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, fontWeights, spacing, radii } from '../../theme';
import { Group } from '../ui/Group';
import { HouseholdMember } from '../../api/householdsApi';
import { UnitPickerModal } from './UnitPickerModal';

interface AddItemSheetProps {
  visible: boolean;
  title: string;
  name: string;
  onNameChange: (v: string) => void;
  quantity: string;
  onQuantityChange: (v: string) => void;
  weight: string;
  onWeightChange: (v: string) => void;
  weightUnit: string;
  onWeightUnitChange: (v: string) => void;
  weightUnits: string[];
  isShared: boolean;
  onSharedChange: (shared: boolean) => void;
  ownerId: string;
  onOwnerSelect: (id: string) => void;
  members: HouseholdMember[];
  namePlaceholder: string;
  quantityPlaceholder: string;
  weightPlaceholder: string;
  unitPlaceholder: string;
  /** Modal title for unit list (defaults to unitPlaceholder) */
  unitPickerTitle?: string;
  /** Label for “clear unit” row (e.g. localized “None”) */
  noneUnitLabel?: string;
  sharedLabel: string;
  personalLabel: string;
  assignedToLabel: string;
  selectPersonLabel?: string;
  submitLabel: string;
  cancelLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
  onClose: () => void;
  submitting?: boolean;
  submitDisabled?: boolean;
}

export const AddItemSheet: React.FC<AddItemSheetProps> = (props) => {
  const {
    visible,
    title,
    name,
    onNameChange,
    quantity,
    onQuantityChange,
    weight,
    onWeightChange,
    weightUnit,
    onWeightUnitChange,
    weightUnits,
    isShared,
    onSharedChange,
    ownerId,
    onOwnerSelect,
    members,
    namePlaceholder,
    quantityPlaceholder,
    weightPlaceholder,
    unitPlaceholder,
    unitPickerTitle,
    noneUnitLabel,
    sharedLabel,
    personalLabel,
    assignedToLabel,
    selectPersonLabel,
    submitLabel,
    cancelLabel,
    onSubmit,
    onCancel,
    onClose,
    submitting = false,
    submitDisabled = false,
  } = props;

  const colors = useThemeColors();
  const reduceMotion = useShoppingMotion();
  const insets = useSafeAreaInsets();
  const [unitModalVisible, setUnitModalVisible] = React.useState(false);

  React.useEffect(() => {
    if (!visible) setUnitModalVisible(false);
  }, [visible]);

  const styles = React.useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: colors.shadowStrong,
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      maxHeight: '88%',
      paddingBottom: insets.bottom + spacing.lg,
      paddingHorizontal: spacing.md,
    },
    handle: {
      width: 36,
      height: spacing.xxs,
      borderRadius: radii.pill,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    sheetTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radii.pill,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingBottom: spacing.xl,
    },
    fieldRow: {
      gap: spacing.md,
    },
    fieldHalf: {
      minWidth: 0,
    },
    segmentLabel: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    segmentRow: {
      flexDirection: 'row',
      borderRadius: radii.lg,
      backgroundColor: colors.background,
      padding: spacing.xxs,
    },
    segmentOption: {
      flexDirection: 'row',
      gap: spacing.xxs,
      flex: 1,
      minHeight: 44,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
    },
    segmentOptionActive: {
      backgroundColor: colors.surface,
    },
    segmentText: {
      textAlign: 'center',
      flexShrink: 1,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: colors.textSecondary,
    },
    segmentTextActive: {
      color: colors.text,
      fontWeight: fontWeights.semibold,
    },
    ownerLabel: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    ownerChip: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
    },
    ownerChipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryUltraSoft,
    },
    ownerChipText: {
      flex: 1,
      fontSize: fontSizes.md,
      color: colors.text,
    },
    ownerChipTextSelected: {
      color: colors.primary,
      fontWeight: fontWeights.semibold,
    },
    unitRow: {
      minHeight: 50,
      gap: spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    unitRowText: {
      flex: 1,
      fontSize: fontSizes.md,
      color: colors.text,
    },
    buttonRow: {
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    buttonHalf: {
      alignSelf: 'stretch',
    },
  }), [colors, insets.bottom]);

  return (
    <Modal visible={visible} animationType={reduceMotion ? 'none' : 'slide'} transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={cancelLabel} onPress={onClose} />
          <View style={styles.sheet} accessibilityViewIsModal>
            <View style={styles.handle} />
            <View style={styles.header}>
              <AppText accessibilityRole="header" style={styles.sheetTitle}>{title}</AppText>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={cancelLabel} style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Ionicons name="close-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <FormTextInput
                value={name}
                onChangeText={onNameChange}
                label={namePlaceholder}
                placeholder={namePlaceholder}
                autoCapitalize="words"
              />
              <View style={[styles.fieldRow, { marginTop: spacing.md }]}>
                <View style={styles.fieldHalf}>
                  <FormTextInput
                    value={quantity}
                    onChangeText={(t) => onQuantityChange(t.replace(/[^0-9]/g, ''))}
                    label={quantityPlaceholder}
                    placeholder={quantityPlaceholder}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <FormTextInput
                    value={weight}
                    onChangeText={(t) => onWeightChange(t.replace(/[^0-9]/g, ''))}
                    label={weightPlaceholder}
                    placeholder={weightPlaceholder}
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`${unitPlaceholder}: ${weightUnit || noneUnitLabel || '—'}`}
                    accessibilityState={{ expanded: unitModalVisible }}
                    style={styles.unitRow}
                    onPress={() => setUnitModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <AppText style={[styles.unitRowText, !weightUnit && { color: colors.textTertiary }]}>
                      {weightUnit || unitPlaceholder}
                    </AppText>
                    <Ionicons name="chevron-down-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ marginTop: spacing.lg }}>
                <AppText style={styles.segmentLabel}>{assignedToLabel}</AppText>
                <View style={styles.segmentRow}>
                  <TouchableOpacity
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isShared }}
                    style={[styles.segmentOption, isShared && styles.segmentOptionActive]}
                    onPress={() => onSharedChange(true)}
                    activeOpacity={0.7}
                  >
                    {isShared ? <Ionicons name="checkmark-outline" size={22} color={colors.text} /> : null}
                    <AppText style={[styles.segmentText, isShared && styles.segmentTextActive]}>
                      {sharedLabel}
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="radio"
                    accessibilityState={{ checked: !isShared }}
                    style={[styles.segmentOption, !isShared && styles.segmentOptionActive]}
                    onPress={() => onSharedChange(false)}
                    activeOpacity={0.7}
                  >
                    {!isShared ? <Ionicons name="checkmark-outline" size={22} color={colors.text} /> : null}
                    <AppText style={[styles.segmentText, !isShared && styles.segmentTextActive]}>
                      {personalLabel}
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
              {!isShared && members.length > 0 && (
                <View>
                  <AppText style={styles.ownerLabel}>{selectPersonLabel ?? assignedToLabel}</AppText>
                  <Group style={{ marginHorizontal: 0 }}>
                    {members.map((m) => (
                      <TouchableOpacity
                        accessibilityRole="radio"
                        accessibilityState={{ checked: ownerId === m._id }}
                        key={m._id}
                        style={[styles.ownerChip, ownerId === m._id && styles.ownerChipSelected]}
                        onPress={() => onOwnerSelect(m._id)}
                        activeOpacity={0.7}
                      >
                        <AppText style={[styles.ownerChipText, ownerId === m._id && styles.ownerChipTextSelected]}>
                          {m.name}
                        </AppText>
                        {ownerId === m._id ? <Ionicons name="checkmark-outline" size={22} color={colors.primary} /> : null}
                      </TouchableOpacity>
                    ))}
                  </Group>
                </View>
              )}
            </ScrollView>
            <View style={styles.buttonRow}>
              <View style={styles.buttonHalf}>
                <PrimaryButton title={cancelLabel} onPress={onCancel} variant="outline" />
              </View>
              <View style={styles.buttonHalf}>
                <PrimaryButton
                  title={submitLabel}
                  loading={submitting}
                  onPress={onSubmit}
                  disabled={submitDisabled || submitting}
                />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      <UnitPickerModal
        visible={unitModalVisible}
        onClose={() => setUnitModalVisible(false)}
        selectedValue={weightUnit}
        onSelect={onWeightUnitChange}
        units={weightUnits}
        title={unitPickerTitle ?? unitPlaceholder}
        noneLabel={noneUnitLabel ?? '—'}
        cancelLabel={cancelLabel}
      />
    </Modal>
  );
};
