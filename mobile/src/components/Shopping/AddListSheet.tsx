import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShoppingMotion } from './useShoppingMotion';
import { AppText } from '../AppText';
import { FormTextInput } from '../FormTextInput';
import { PrimaryButton } from '../PrimaryButton';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, fontWeights, spacing, radii } from '../../theme';

interface AddListSheetProps {
  visible: boolean;
  title: string;
  name: string;
  onNameChange: (value: string) => void;
  placeholder: string;
  submitLabel: string;
  cancelLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
  onClose: () => void;
  isEditing?: boolean;
}

export const AddListSheet: React.FC<AddListSheetProps> = ({
  visible,
  title,
  name,
  onNameChange,
  placeholder,
  submitLabel,
  cancelLabel,
  onSubmit,
  onCancel,
  onClose,
}) => {
  const colors = useThemeColors();
  const reduceMotion = useShoppingMotion();
  const insets = useSafeAreaInsets();
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
      paddingTop: spacing.md,
      paddingBottom: insets.bottom + spacing.lg,
      paddingHorizontal: spacing.md,
      maxHeight: '90%',
    },
    handle: {
      width: 36,
      height: spacing.xxs,
      borderRadius: radii.pill,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xl,
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
    inputWrap: {
      marginBottom: spacing.xl,
    },
    row: {
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    rowButton: {
      alignSelf: 'stretch',
    },
  }), [colors, insets.bottom]);

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? 'none' : 'slide'}
      transparent
      onRequestClose={() => {
        Keyboard.dismiss();
        onClose();
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            onPress={() => { Keyboard.dismiss(); onClose(); }}
          />
          <View style={styles.sheet} accessibilityViewIsModal>
            <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.handle} />
              <View style={styles.header}>
                <AppText accessibilityRole="header" style={styles.sheetTitle}>{title}</AppText>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={cancelLabel}
                  style={styles.closeBtn}
                  onPress={() => {
                    Keyboard.dismiss();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrap}>
                <FormTextInput
                  value={name}
                  onChangeText={onNameChange}
                  label={placeholder}
                  placeholder={placeholder}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.row}>
                <View style={styles.rowButton}>
                  <PrimaryButton
                    title={cancelLabel}
                    onPress={() => {
                      Keyboard.dismiss();
                      onCancel();
                    }}
                    variant="outline"
                  />
                </View>
                <View style={styles.rowButton}>
                  <PrimaryButton
                    title={submitLabel}
                    onPress={() => {
                      Keyboard.dismiss();
                      onSubmit();
                    }}
                    disabled={!name.trim()}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
