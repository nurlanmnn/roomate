import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../AppText';
import { FormTextInput } from '../FormTextInput';
import { PrimaryButton } from '../PrimaryButton';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, fontWeights, spacing, radii } from '../../theme';
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
  const insets = useSafeAreaInsets();
  const [unitModalVisible, setUnitModalVisible] = React.useState(false);

  React.useEffect(() => {
    if (!visible) setUnitModalVisible(false);
  }, [visible]);

  const styles = React.useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '88%',
      paddingBottom: insets.bottom + spacing.lg,
      paddingHorizontal: spacing.xl,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
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
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
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
      flexDirection: 'row',
      gap: spacing.md,
    },
    fieldHalf: {
      flex: 1,
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
      padding: 4,
    },
    segmentOption: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
    },
    segmentOptionActive: {
      backgroundColor: colors.surface,
      ...(colors.shadow ? {} : {}),
    },
    segmentText: {
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
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderLight,
      marginBottom: spacing.xs,
    },
    ownerChipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryUltraSoft,
    },
    ownerChipText: {
      fontSize: fontSizes.md,
      color: colors.text,
    },
    ownerChipTextSelected: {
      color: colors.primary,
      fontWeight: fontWeights.semibold,
    },
    unitRow: {
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
      fontSize: fontSizes.md,
      color: colors.text,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    buttonHalf: {
      flex: 1,
    },
  }), [colors, insets.bottom]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1} onPress={() => {}}>
                <View style={styles.handle} />
                <View style={styles.header}>
                  <AppText style={styles.sheetTitle}>{title}</AppText>
                  <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
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
                    placeholder={namePlaceholder}
                    autoCapitalize="words"
                  />
                  <View style={[styles.fieldRow, { marginTop: spacing.md }]}>
                    <View style={styles.fieldHalf}>
                      <FormTextInput
                        value={quantity}
                        onChangeText={(t) => onQuantityChange(t.replace(/[^0-9]/g, ''))}
                        placeholder={quantityPlaceholder}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.fieldHalf}>
                      <FormTextInput
                        value={weight}
                        onChangeText={(t) => onWeightChange(t.replace(/[^0-9]/g, ''))}
                        placeholder={weightPlaceholder}
                        keyboardType="number-pad"
                      />
                      <TouchableOpacity
                        style={styles.unitRow}
                        onPress={() => setUnitModalVisible(true)}
                        activeOpacity={0.7}
                      >
                        <AppText style={[styles.unitRowText, !weightUnit && { color: colors.textTertiary }]}>
                          {weightUnit || unitPlaceholder}
                        </AppText>
                        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ marginTop: spacing.lg }}>
                    <AppText style={styles.segmentLabel}>{assignedToLabel}</AppText>
                    <View style={styles.segmentRow}>
                      <TouchableOpacity
                        style={[styles.segmentOption, isShared && styles.segmentOptionActive]}
                        onPress={() => onSharedChange(true)}
                        activeOpacity={0.7}
                      >
                        <AppText style={[styles.segmentText, isShared && styles.segmentTextActive]}>
                          {sharedLabel}
                        </AppText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.segmentOption, !isShared && styles.segmentOptionActive]}
                        onPress={() => onSharedChange(false)}
                        activeOpacity={0.7}
                      >
                        <AppText style={[styles.segmentText, !isShared && styles.segmentTextActive]}>
                          {personalLabel}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {!isShared && members.length > 0 && (
                    <View>
                      <AppText style={styles.ownerLabel}>{selectPersonLabel ?? assignedToLabel}</AppText>
                      {members.map((m) => (
                        <TouchableOpacity
                          key={m._id}
                          style={[styles.ownerChip, ownerId === m._id && styles.ownerChipSelected]}
                          onPress={() => onOwnerSelect(m._id)}
                          activeOpacity={0.7}
                        >
                          <AppText style={[styles.ownerChipText, ownerId === m._id && styles.ownerChipTextSelected]}>
                            {m.name}
                          </AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </ScrollView>
                <View style={styles.buttonRow}>
                  <View style={styles.buttonHalf}>
                    <PrimaryButton title={cancelLabel} onPress={onCancel} variant="outline" />
                  </View>
                  <View style={styles.buttonHalf}>
                    <PrimaryButton
                      title={submitting ? '…' : submitLabel}
                      onPress={onSubmit}
                      disabled={submitDisabled || submitting}
                    />
                  </View>
                </View>
          </TouchableOpacity>
        </TouchableOpacity>
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
