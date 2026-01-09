import React from 'react';
import { TextInput, StyleSheet, Text, View, Platform } from 'react-native';
import { AppText } from './AppText';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../theme';

interface FormTextInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  helperText?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const FormTextInput: React.FC<FormTextInputProps> = ({
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
}) => {
  const colors = useThemeColors();
  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      marginBottom: spacing.md,
    },
    label: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      marginBottom: spacing.xs,
      color: colors.textSecondary,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.select({ ios: spacing.md, android: spacing.sm, default: spacing.md }),
      fontSize: fontSizes.md,
      backgroundColor: colors.surface,
      color: colors.text,
    },
    multilineInput: {
      minHeight: 80,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    inputError: {
      borderColor: colors.danger,
    },
    helperText: {
      color: colors.muted,
      fontSize: fontSizes.xs,
      marginTop: spacing.xs,
    },
    errorText: {
      color: colors.danger,
      fontSize: fontSizes.xs,
      marginTop: spacing.xs,
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      {label && <AppText style={styles.label}>{label}</AppText>}
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          error && styles.inputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : undefined}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={colors.muted}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {!error && !!helperText && <AppText style={styles.helperText}>{helperText}</AppText>}
      {error && <AppText style={styles.errorText}>{error}</AppText>}
    </View>
  );
};
