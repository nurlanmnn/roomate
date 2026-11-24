import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../AppText';
import { useThemeColors, fonts, fontSizes, spacing, DISPLAY_MAX_FONT_SCALE } from '../../theme';

type AmountFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  /** ISO code shown under the figure, e.g. EUR. */
  currency: string;
  /** Currency sign set beside the figure, e.g. €. */
  symbol: string;
  /** Spoken label, e.g. "Total amount". Shown as the caption above the figure. */
  label: string;
  autoFocus?: boolean;
  /** Extra context after the currency code, e.g. the household name. */
  meta?: string;
  /** Owe / owed tint for a payment figure; neutral by default. */
  tone?: 'neutral' | 'owe' | 'owed';
};

/** Size steps so long amounts stay on one line at 375pt without the caret jumping. */
const sizeFor = (length: number) => (length <= 6 ? 64 : length <= 8 ? 52 : length <= 10 ? 42 : 34);

/**
 * The money figure of an entry form: a centred signage-numeral input with the currency sign
 * beside it, the same voice as the key figure on the Home plaque. The whole block is the
 * tap target, so the keypad opens wherever the figure is touched.
 */
export const AmountField: React.FC<AmountFieldProps> = ({
  value,
  onChangeText,
  currency,
  symbol,
  label,
  autoFocus,
  meta,
  tone = 'neutral',
}) => {
  const colors = useThemeColors();
  const inputRef = React.useRef<TextInput>(null);
  const size = sizeFor(Math.max(value.length, 4));
  const figureColor = tone === 'owe' ? colors.owe : tone === 'owed' ? colors.owed : colors.text;
  const empty = value.length === 0;

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessible={false}
      style={styles.block}
    >
      <AppText style={[styles.caption, { color: colors.textSecondary }]}>{label}</AppText>
      <View style={styles.figureRow}>
        <AppText
          style={[
            styles.symbol,
            { color: empty ? colors.textTertiary : colors.textSecondary, fontSize: Math.round(size * 0.48) },
          ]}
          maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}
        >
          {symbol}
        </AppText>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(text) => onChangeText(text.replace(',', '.').replace(/[^0-9.]/g, ''))}
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          keyboardType="decimal-pad"
          autoFocus={autoFocus}
          accessibilityLabel={`${label} (${currency})`}
          maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}
          style={[styles.input, { color: figureColor, fontSize: size, lineHeight: Math.round(size * 1.04) }]}
        />
      </View>
      <AppText style={[styles.code, { color: colors.textSecondary }]}>{meta ? `${currency} · ${meta}` : currency}</AppText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  caption: {
    fontSize: fontSizes.sm,
  },
  figureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    maxWidth: '100%',
    marginTop: spacing.xxs,
  },
  symbol: {
    fontFamily: fonts.displaySemibold,
  },
  input: {
    fontFamily: fonts.displayExtrabold,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    minWidth: 48,
    maxWidth: '90%',
    paddingVertical: 0,
  },
  code: {
    fontSize: fontSizes.xs,
    letterSpacing: 0.4,
  },
});
