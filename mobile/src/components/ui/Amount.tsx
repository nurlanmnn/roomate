import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
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
  /** Shrinks as one piece to stay on one line inside narrow containers (default on). */
  fit?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/** Keeps currency placement and number separators from the device's locale. */
const splitAmount = (formatted: string) => {
  const parts = formatted.match(/^([^\p{Nd}]*)([\s\S]*\p{Nd})([^\p{Nd}]*)$/u);
  const number = parts?.[2] ?? formatted;
  const decimals = number.match(/^(.*\p{Nd})([.,٫]\p{Nd}{2})$/u);
  return {
    leadingCurrency: parts?.[1].trim() ?? '',
    head: decimals?.[1] ?? number,
    cents: decimals?.[2] ?? '',
    trailingCurrency: parts?.[3].trim() ?? '',
  };
};

/** Never draw money smaller than this fraction of the requested size. */
const MIN_SCALE = 0.3;
/** Headroom so rounding in glyph metrics never tips a fitted amount into truncation. */
const FIT_SAFETY = 0.97;

type FitState = { key: string; natural: number; available: number };

const computeScale = (natural: number, available: number) =>
  natural > 0 && available > 0 && available < natural - 0.5
    ? Math.max(MIN_SCALE, (available / natural) * FIT_SAFETY)
    : 1;

/**
 * Money in the signage face: large whole number, smaller raised cents.
 * Small sizes (under 24pt) render on one baseline for legibility.
 *
 * With `fit` (the default) the amount shrinks as one piece to stay on a single
 * line: currency, whole number and cents keep their proportions, and the number
 * is never cut off with an ellipsis.
 */
export const Amount: React.FC<AmountProps> = ({
  value,
  currency,
  size = 22,
  direction = 'neutral',
  color,
  weight = 'bold',
  fit = true,
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
  const label = accessibilityLabel ?? `${sign}${formatted}`;
  const split = size >= 24;

  // Split layout: an off-screen copy at full size gives the natural width, the
  // outer view reports the room it gets, and every part scales by the same factor.
  const fitKey = `${sign}|${formatted}|${size}|${weight}`;
  const [fitState, setFitState] = useState<FitState>({ key: fitKey, natural: 0, available: 0 });
  const state = fitState.key === fitKey ? fitState : { key: fitKey, natural: 0, available: 0 };
  // Both layouts scale from measured widths. iOS's own adjustsFontSizeToFit is not used:
  // in rows that hug their content it can shrink far below minimumFontScale.
  const scale = fit ? computeScale(state.natural, state.available) : 1;

  const onMeasure = useCallback(
    (e: LayoutChangeEvent) => {
      const natural = e.nativeEvent.layout.width;
      setFitState((prev) => {
        // A new amount starts over: its first outer layout is unscaled again.
        const base = prev.key === fitKey ? prev : { key: fitKey, natural: 0, available: 0 };
        return Math.abs(base.natural - natural) < 0.5 ? base : { ...base, natural };
      });
    },
    [fitKey]
  );

  const onOuterLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const width = e.nativeEvent.layout.width;
      setFitState((prev) => {
        const base = prev.key === fitKey ? prev : { key: fitKey, natural: 0, available: 0 };
        // The outer view hugs its content, so once scaled it reports the scaled width.
        // Only record a width while unscaled, or when the room squeezes the scaled amount further.
        if (base.available > 0 && base.natural > 0) {
          const drawn = base.natural * computeScale(base.natural, base.available);
          if (width >= drawn - 1) return base;
        }
        return Math.abs(base.available - width) < 0.5 ? base : { ...base, available: width };
      });
    },
    [fitKey]
  );

  const base: TextStyle = {
    fontFamily: family,
    color: tint,
    fontVariant: size < 40 ? ['tabular-nums'] : undefined,
  };

  if (!split) {
    const renderSingle = (k: number, measuring: boolean) => (
      <AppText
        style={[base, measuring ? styles.noShrink : styles.head, { fontSize: size * k, lineHeight: Math.round(size * k * 1.2) }]}
        numberOfLines={1}
        maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}
      >
        {sign ? `${sign} ` : ''}
        {formatted}
      </AppText>
    );
    return (
      <View
        style={[styles.single, style]}
        accessible
        accessibilityLabel={label}
        onLayout={fit ? onOuterLayout : undefined}
      >
        {renderSingle(scale, false)}
        {fit ? (
          <View
            style={styles.measureBox}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <View style={styles.measureRow} onLayout={onMeasure}>
              {renderSingle(1, true)}
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  const parts = splitAmount(formatted);
  const renderParts = (k: number, measuring: boolean) => {
    const s = size * k;
    const small = s * 0.45;
    const currencySize = s * 0.42;
    const raise = s * 0.09;
    const currencyGap = Math.max(1, s * 0.04);
    const currencyStyle: TextStyle = {
      ...base,
      fontFamily: fonts.displaySemibold,
      fontSize: currencySize,
      lineHeight: Math.ceil(currencySize * 1.2),
      marginTop: raise,
      opacity: 0.8,
    };
    // The sign leads the whole amount ("−€98", never "€ −98").
    const signFirst = sign && parts.leadingCurrency;
    return (
      <>
        {signFirst ? (
          <AppText
            style={[base, styles.noShrink, { fontSize: s, lineHeight: Math.ceil(s * 1.02), marginRight: currencyGap }]}
            numberOfLines={1}
            maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}
          >
            {sign}
          </AppText>
        ) : null}
        {parts.leadingCurrency ? (
          <AppText
            style={[currencyStyle, styles.noShrink, { marginRight: currencyGap }]}
            numberOfLines={1}
            maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}
          >
            {parts.leadingCurrency}
          </AppText>
        ) : null}
        <AppText
          style={[base, measuring ? styles.noShrink : styles.head, { fontSize: s, lineHeight: Math.ceil(s * 1.02) }]}
          numberOfLines={1}
          // Last-resort guard for the frame before the first measurement lands.
          adjustsFontSizeToFit={fit && !measuring}
          minimumFontScale={0.5}
          maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}
        >
          {sign && !signFirst ? `${sign} ` : ''}
          {parts.head}
        </AppText>
        {parts.cents ? (
          <AppText
            style={[base, styles.noShrink, { fontSize: small, lineHeight: Math.ceil(small * 1.2), marginTop: raise }]}
            numberOfLines={1}
            maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}
          >
            {parts.cents}
          </AppText>
        ) : null}
        {parts.trailingCurrency ? (
          <AppText
            style={[currencyStyle, styles.noShrink, { marginLeft: currencyGap }]}
            numberOfLines={1}
            maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}
          >
            {parts.trailingCurrency}
          </AppText>
        ) : null}
      </>
    );
  };

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={label}
      onLayout={fit ? onOuterLayout : undefined}
    >
      {renderParts(scale, false)}
      {fit ? (
        <View
          style={styles.measureBox}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={styles.measureRow} onLayout={onMeasure}>
            {renderParts(1, true)}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexShrink: 1,
    minWidth: 0,
  },
  single: {
    flexShrink: 1,
    minWidth: 0,
  },
  head: {
    flexShrink: 1,
  },
  noShrink: {
    flexShrink: 0,
  },
  measureBox: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4000,
    opacity: 0,
    alignItems: 'flex-start',
  },
  measureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
