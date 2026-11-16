import React from 'react';
import { StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { AppText } from '../AppText';
import { useThemeColors, fonts, DISPLAY_MAX_FONT_SCALE } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';

type AmountProps = {
  value: number;
  currency?: string | null;
  /** Font size of the whole-number part. Cents render at about 45% of this, raised. */
  size?: number;
  /**
   * owed: money coming to the user (prefixed "+"). owe: money the user owes (prefixed "−").
   * neutral: no sign, default colour. Direction is never shown by colour alone.
   */
  direction?: 'owed' | 'owe' | 'neutral';
  /** Overrides the direction colour (e.g. `colors.onEnamel` on the header field). */
  color?: string;
  weight?: 'semibold' | 'bold' | 'extrabold';
  /** Shrinks to stay on one line inside narrow containers. */
  fit?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/** Keeps currency placement and number separators from the device's locale. */
const splitAmount = (formatted: string) => {
  const parts = formatted.match(/^([^\p{Nd}]*)([\s\S]*\p{Nd})([^\p{Nd}]*)$/u);
  const number = parts?.[2] ?? formatted;
  const decimals = number.match(/^(.*\p{Nd})([.,\u066b]\p{Nd}{2})$/u);
  return {
    leadingCurrency: parts?.[1].trim() ?? '',
    head: decimals?.[1] ?? number,
    cents: decimals?.[2] ?? '',
    trailingCurrency: parts?.[3].trim() ?? '',
  };
};

/**
 * Money in the signage face: large whole number, smaller raised cents.
 * Small sizes (under 24pt) render on one baseline for legibility.
 */
export const Amount: React.FC<AmountProps> = ({
  value,
  currency,
  size = 22,
  direction = 'neutral',
  color,
  weight = 'bold',
  fit = false,
  style,
  accessibilityLabel,
}) => {
  const colors = useThemeColors();
  const formatted = formatCurrency(Math.abs(value), currency);
  const sign = direction === 'owed' ? '+' : direction === 'owe' ? '−' : value < 0 ? '−' : '';
  const tint =
    color ?? (direction === 'owed' ? colors.owed : direction === 'owe' ? colors.owe : colors.text);
  const family =
    weight === 'extrabold' ? fonts.displayExtrabold : weight === 'semibold' ? fonts.displaySemibold : fonts.displayBold;

  const base: TextStyle = {
    fontFamily: family,
    color: tint,
    fontVariant: size < 40 ? ['tabular-nums'] : undefined,
  };
  const label = accessibilityLabel ?? `${sign}${formatted}`;

  if (size < 24) {
    return (
      <View style={style} accessible accessibilityLabel={label}>
        <AppText
          style={[base, { fontSize: size, lineHeight: Math.round(size * 1.2) }]}
          numberOfLines={1}
          adjustsFontSizeToFit={fit}
          maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}
        >
          {sign ? `${sign} ` : ''}
          {formatted}
        </AppText>
      </View>
    );
  }

  const { leadingCurrency, head, cents, trailingCurrency } = splitAmount(formatted);
  const small = Math.round(size * 0.45);
  const currencySize = Math.round(size * 0.42);
  const currencyStyle: TextStyle = {
    ...base,
    fontFamily: fonts.displaySemibold,
    fontSize: currencySize,
    lineHeight: Math.round(currencySize * 1.2),
    marginTop: Math.round(size * 0.09),
    opacity: 0.8,
  };
  const currencyGap = Math.max(2, Math.round(size * 0.04));

  return (
    <View style={[styles.row, style]} accessible accessibilityLabel={label}>
      {leadingCurrency ? (
        <AppText
          style={[currencyStyle, { marginRight: currencyGap }]}
          numberOfLines={1}
          maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}
        >
          {leadingCurrency}
        </AppText>
      ) : null}
      <AppText
        style={[base, { fontSize: size, lineHeight: Math.round(size * 1.02) }]}
        numberOfLines={1}
        adjustsFontSizeToFit={fit}
        minimumFontScale={0.5}
        maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}
      >
        {sign ? `${sign} ` : ''}
        {head}
      </AppText>
      {cents ? (
        <AppText
          style={[base, { fontSize: small, lineHeight: Math.round(small * 1.2), marginTop: Math.round(size * 0.09) }]}
          numberOfLines={1}
          maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}
        >
          {cents}
        </AppText>
      ) : null}
      {trailingCurrency ? (
        <AppText
          style={[currencyStyle, { marginLeft: currencyGap }]}
          numberOfLines={1}
          maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}
        >
          {trailingCurrency}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexShrink: 1,
  },
});
