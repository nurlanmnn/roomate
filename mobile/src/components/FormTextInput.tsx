import React from 'react';
import { Platform, Pressable, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useLanguage } from '../context/LanguageContext';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../theme';

type FormTextInputProps = Omit<TextInputProps, 'style' | 'onChangeText' | 'value'> & {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  helperText?: string;
  /**
   * boxed: a standalone field on the porcelain ground (auth, sheets, modals).
   * inset: a row inside a `Group`; the group's white fill is the field, so it carries no border of its own.
   */
  variant?: 'boxed' | 'inset';
  /** Merged with the outer container (e.g. marginBottom: 0 for the last boxed field). */
  containerStyle?: ViewStyle;
};

/**
 * Labelled text field. The label sits above the value so long German and Turkish labels wrap
 * instead of truncating. Focus turns the frame (boxed) or the label (inset) cobalt; an error adds
 * an icon and a message so it never relies on colour alone. Secure fields get a show/hide toggle.
 */
export const FormTextInput = React.forwardRef<TextInput, FormTextInputProps>(function FormTextInput(
  {
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType = 'default',
    error,
    multiline,
    numberOfLines,
    autoCapitalize = 'none',
    helperText,
    onFocus,
    onBlur,
    variant = 'boxed',
    containerStyle,
    editable = true,
    accessibilityLabel,
    ...rest
  },
  ref
) {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const [focused, setFocused] = React.useState(false);
  const [revealed, setRevealed] = React.useState(false);
  const inset = variant === 'inset';
  const hasError = Boolean(error);

  // A placeholder that repeats the label above it is noise; keep only distinct hints.
  const hint = placeholder && placeholder.trim() !== label?.trim() ? placeholder : undefined;

  const frameColor = hasError ? colors.danger : focused ? colors.primary : colors.border;
  const labelColor = hasError ? colors.danger : inset && focused ? colors.primary : colors.textSecondary;

  const field = (
    <View
      style={[
        inset ? styles.insetFrame : styles.boxFrame,
        !inset && { backgroundColor: colors.surface, borderColor: frameColor },
        !editable && styles.readOnly,
      ]}
    >
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={hint}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        secureTextEntry={secureTextEntry && !revealed}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : undefined}
        autoCapitalize={autoCapitalize}
        textAlignVertical={multiline ? 'top' : 'center'}
        editable={editable}
        accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
        accessibilityHint={error || helperText || rest.accessibilityHint}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          inset ? styles.insetInput : styles.boxInput,
          multiline && styles.multiline,
          { color: colors.text },
        ]}
        {...rest}
      />
      {secureTextEntry ? (
        <Pressable
          onPress={() => setRevealed((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={revealed ? t('common.hidePassword') : t('common.showPassword')}
          hitSlop={4}
          style={({ pressed }) => [styles.reveal, pressed && styles.pressed]}
        >
          <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={[inset ? styles.insetContainer : styles.boxContainer, containerStyle]}>
      {label ? (
        <AppText style={[inset ? styles.insetLabel : styles.boxLabel, { color: labelColor }]}>{label}</AppText>
      ) : null}
      {field}
      {hasError ? (
        <View style={styles.messageRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={15} color={colors.danger} style={styles.messageIcon} />
          <AppText style={[styles.message, { color: colors.danger }]}>{error}</AppText>
        </View>
      ) : helperText ? (
        <AppText style={[styles.message, styles.helper, { color: colors.textSecondary }]}>{helperText}</AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  boxContainer: {
    marginBottom: spacing.md,
  },
  insetContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  boxLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.xs,
  },
  insetLabel: {
    fontSize: fontSizes.sm - 1,
    fontWeight: fontWeights.semibold,
  },
  boxFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: radii.md,
  },
  insetFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  readOnly: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSizes.md,
  },
  boxInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.select({ ios: spacing.sm + 2, default: spacing.sm }),
  },
  insetInput: {
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
  },
  multiline: {
    minHeight: 88,
    paddingTop: spacing.sm,
  },
  reveal: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xxs,
  },
  pressed: {
    opacity: 0.6,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xxs + 2,
    marginTop: spacing.xs,
  },
  messageIcon: {
    marginTop: 1,
  },
  message: {
    flex: 1,
    fontSize: fontSizes.xs,
    lineHeight: 16,
  },
  helper: {
    marginTop: spacing.xs,
  },
});
