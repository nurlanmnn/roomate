import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { AppText } from '../AppText';
import { PrimaryButton } from '../PrimaryButton';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme';

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

  useEffect(() => {
    if (!visible) {
      setPassword('');
      setPhrase('');
    }
  }, [visible]);

  const canSubmit =
    password.trim().length > 0 && phrase.trim().toUpperCase() === DELETE_PHRASE && !loading;

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          padding: spacing.lg,
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing.xl,
          borderWidth: 1,
          borderColor: colors.borderLight,
          ...(shadows.lg as object),
        },
        title: {
          fontSize: fontSizes.xl,
          fontWeight: fontWeights.bold,
          color: colors.text,
          marginBottom: spacing.sm,
        },
        body: {
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          lineHeight: 20,
          marginBottom: spacing.lg,
        },
        label: {
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.semibold,
          color: colors.textSecondary,
          marginBottom: spacing.xs,
        },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          fontSize: fontSizes.md,
          color: colors.text,
          backgroundColor: colors.background,
          marginBottom: spacing.md,
        },
        phraseInput: {
          letterSpacing: 1,
          fontWeight: fontWeights.semibold,
        },
        hint: {
          fontSize: fontSizes.xs,
          color: colors.textTertiary,
          marginBottom: spacing.lg,
        },
        actions: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        flex: {
          flex: 1,
        },
      }),
    [colors]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <AppText style={styles.title}>{title}</AppText>
            <AppText style={styles.body}>{body}</AppText>

            <AppText style={styles.label}>{passwordLabel}</AppText>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              editable={!loading}
            />

            <AppText style={styles.label}>{typePhraseLabel}</AppText>
            <TextInput
              style={[styles.input, styles.phraseInput]}
              value={phrase}
              onChangeText={setPhrase}
              placeholder={DELETE_PHRASE}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
            />
            <AppText style={styles.hint}>{typePhraseHint}</AppText>

            <View style={styles.actions}>
              <View style={styles.flex}>
                <PrimaryButton title={cancelLabel} onPress={onClose} variant="outline" />
              </View>
              <View style={styles.flex}>
                <PrimaryButton
                  title={confirmLabel}
                  onPress={() => onConfirm(password)}
                  variant="danger"
                  disabled={!canSubmit}
                  loading={loading}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};
