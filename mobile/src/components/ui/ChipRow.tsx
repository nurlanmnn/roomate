import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { AppText } from '../AppText';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../../theme';

type Chip<T extends string | number> = { value: T; label: string; accessibilityLabel?: string };

type ChipRowProps<T extends string | number> = {
  options: Chip<T>[];
  selected: T;
  onSelect: (value: T) => void;
  /** Horizontal inset of the first and last chip; match the screen's gutter. */
  inset?: number;
  style?: ViewStyle;
};

/**
 * Single-choice filter as a row of pills. Each pill is as wide as its label and never wraps
 * inside a word ("Last 3 months" stays on one line in every language); when the set is wider
 * than the screen, whole pills wrap onto the next line. Nothing scrolls or hides off-screen.
 */
export function ChipRow<T extends string | number>({ options, selected, onSelect, inset = spacing.md, style }: ChipRowProps<T>) {
  const colors = useThemeColors();
  return (
    <View style={[styles.row, { paddingHorizontal: inset }, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === selected;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onSelect(o.value)}
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.accessibilityLabel ?? o.label}
            style={({ pressed }) => [
              styles.chip,
              active
                ? { backgroundColor: colors.ink, borderColor: colors.ink }
                : { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && !active && { backgroundColor: colors.primaryUltraSoft },
            ]}
          >
            <AppText
              numberOfLines={1}
              style={[styles.label, { color: active ? colors.onInk : colors.text }, active && styles.labelActive]}
            >
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: spacing.md - 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
  labelActive: {
    fontWeight: fontWeights.semibold,
  },
});
