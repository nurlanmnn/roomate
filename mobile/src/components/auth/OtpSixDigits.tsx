import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../../theme';

const LENGTH = 6;

export type OtpSixDigitsProps = {
  value: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
};

/**
 * Six digit OTP inputs. Does not use maxLength={1} per cell so paste from email works on iOS/Android.
 */
export const OtpSixDigits: React.FC<OtpSixDigitsProps> = ({ value, onChange }) => {
  const colors = useThemeColors();
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const focusAfterPaste = useCallback((startIndex: number, numChars: number) => {
    const focusIdx = Math.min(startIndex + Math.max(numChars - 1, 0), LENGTH - 1);
    setTimeout(() => inputRefs.current[focusIdx]?.focus(), 0);
  }, []);

  const handleOtpChange = useCallback(
    (raw: string, index: number) => {
      const cleaned = raw.replace(/\D/g, '');

      if (cleaned.length === 0) {
        onChange((prev) => {
          const next = [...prev];
          next[index] = '';
          return next;
        });
        return;
      }

      if (cleaned.length > 1) {
        const chars = cleaned.slice(0, LENGTH).split('');
        onChange((prev) => {
          const next = [...prev];
          chars.forEach((char, i) => {
            const idx = index + i;
            if (idx < LENGTH) next[idx] = char;
          });
          return next;
        });
        focusAfterPaste(index, chars.length);
        return;
      }

      onChange((prev) => {
        const next = [...prev];
        next[index] = cleaned;
        return next;
      });
      if (index < LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [focusAfterPaste, onChange]
  );

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && !value[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [value]
  );

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        otpContainer: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: spacing.xl,
          paddingHorizontal: spacing.xs,
        },
        otpInput: {
          width: 50,
          height: 56,
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: radii.md,
          textAlign: 'center',
          fontSize: fontSizes.xxl,
          fontWeight: fontWeights.semibold,
          backgroundColor: colors.surface,
          color: colors.text,
        },
        otpInputFocused: {
          borderColor: colors.primary,
        },
        otpInputFilled: {
          borderColor: colors.primary,
          backgroundColor: colors.primaryUltraSoft,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.otpContainer}>
      {value.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          style={[
            styles.otpInput,
            focusedIndex === index && styles.otpInputFocused,
            digit ? styles.otpInputFilled : null,
          ]}
          value={digit}
          onChangeText={(text) => handleOtpChange(text, index)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(null)}
          keyboardType="number-pad"
          inputMode="numeric"
          selectTextOnFocus
          {...(index === 0
            ? Platform.select({
                ios: { textContentType: 'oneTimeCode' as const },
                android: { autoComplete: 'sms-otp' as const },
                default: {},
              })
            : {})}
        />
      ))}
    </View>
  );
};
