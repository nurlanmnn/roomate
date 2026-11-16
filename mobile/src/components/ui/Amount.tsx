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

/** Splits a locale-formatted currency string into the part before the decimals and the rest. */
const splitDecimals = (formatted: string): { head: string; cents: string; tail: string } => {
  const match = formatted.match(/^(.*\d)([.,]\d{2})(\D*)$/);
  if (!match) return { head: formatted, cents: '', tail: '' };
  return { head: match[1], cents: match[2], tail: match[3] };
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
    fontVariant: ['tabular-nums'],
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

  const { head, cents, tail } = splitDecimals(formatted);
  const small = Math.round(size * 0.45);

  return (
    <View style={[styles.row, style]} accessible accessibilityLabel={label}>
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
      {cents || tail ? (
        <AppText
          style={[base, { fontSize: small, lineHeight: Math.round(small * 1.2), marginTop: Math.round(size * 0.09) }]}
          numberOfLines={1}
          maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}
        >
          {cents}
          {tail}
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
