import React, { useState, useEffect } from 'react';
import {
  AccessibilityInfo,
  Modal,
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { AppText } from '../AppText';
import { PrimaryButton } from '../PrimaryButton';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../../theme';

const DELETE_PHRASE = 'DELETE';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  loading: boolean;
  title: string;
  body: string;
  passwordLabel: string;
  typePhraseLabel: string;
  typePhraseHint: string;
  cancelLabel: string;
  confirmLabel: string;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onClose,
  onConfirm,
  loading,
  title,
  body,
  passwordLabel,
  typePhraseLabel,
  typePhraseHint,
  cancelLabel,
  confirmLabel,
}) => {
  const colors = useThemeColors();
  const [password, setPassword] = useState('');
  const [phrase, setPhrase] = useState('');
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!visible) {
      setPassword('');
      setPhrase('');
    }
  }, [visible]);

  const canSubmit =
    password.trim().length > 0 && phrase.trim().toUpperCase() === DELETE_PHRASE && !loading;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.shadowStrong }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
          pointerEvents="box-none"
        >
          <ScrollView
            style={[styles.card, { backgroundColor: colors.surface }]}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            accessibilityViewIsModal
          >
            <AppText accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</AppText>
            <AppText style={[styles.body, { color: colors.textSecondary }]}>{body}</AppText>

            <AppText style={[styles.label, { color: colors.textSecondary }]}>{passwordLabel}</AppText>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              accessibilityLabel={passwordLabel}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              editable={!loading}
            />

            <AppText style={[styles.label, { color: colors.textSecondary }]}>{typePhraseLabel}</AppText>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={phrase}
              onChangeText={setPhrase}
              placeholder={DELETE_PHRASE}
              accessibilityLabel={typePhraseLabel}
              accessibilityHint={typePhraseHint}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
            />
            <AppText style={[styles.hint, { color: colors.textSecondary }]}>{typePhraseHint}</AppText>

            <View style={styles.actions}>
              <PrimaryButton
                title={confirmLabel}
                onPress={() => onConfirm(password)}
                variant="danger"
                disabled={!canSubmit}
                loading={loading}
              />
              <PrimaryButton title={cancelLabel} onPress={onClose} variant="outline" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    flexGrow: 0,
    maxHeight: '100%',
    borderRadius: radii.lg,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
    marginBottom: spacing.md,
  },
  hint: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
  },
});
