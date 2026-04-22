import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  isEditing = false,
}) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
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
      paddingTop: spacing.md,
      paddingBottom: insets.bottom + spacing.lg,
      paddingHorizontal: spacing.xl,
      minHeight: 260,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
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
    inputWrap: {
      marginBottom: spacing.xl,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    rowButton: {
      flex: 1,
    },
  }), [colors, insets.bottom]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
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
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <View style={styles.header}>
                <AppText style={styles.sheetTitle}>{title}</AppText>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => {
                    Keyboard.dismiss();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrap}>
                <FormTextInput
                  value={name}
                  onChangeText={onNameChange}
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
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};
