import React from 'react';
import { TextInput, StyleSheet, Text, View, Platform, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../context/ThemeContext';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../theme';

interface FormTextInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad';
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  helperText?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Merged with the outer container (e.g. marginBottom: 0 for last field in a group). */
  containerStyle?: ViewStyle;
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
  containerStyle,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(74, 222, 128, 0.28)' : 'rgba(34, 197, 94, 0.22)',
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.select({ ios: spacing.md, android: spacing.sm, default: spacing.md }),
      fontSize: fontSizes.md,
      backgroundColor: isDark ? 'rgba(30, 38, 52, 0.85)' : 'rgba(255, 255, 255, 0.72)',
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
  }), [colors, isDark]);

  return (
    <View style={[styles.container, containerStyle]}>
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
