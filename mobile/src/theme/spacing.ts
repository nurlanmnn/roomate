import { scale } from '../utils/scaling';

// Base spacing values (will be scaled based on device)
const baseSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const spacing = {
  xxs: scale(baseSpacing.xxs),
  xs: scale(baseSpacing.xs),
  sm: scale(baseSpacing.sm),
  md: scale(baseSpacing.md),
  lg: scale(baseSpacing.lg),
  xl: scale(baseSpacing.xl),
  xxl: scale(baseSpacing.xxl),
  xxxl: scale(baseSpacing.xxxl),
};

// Base radii values (will be scaled based on device)
const baseRadii = {
  sm: 10,
  md: 14,
  lg: 16,
  /** Sheet tops and the Home hero; the only large radius in the system. */
  xl: 28,
  pill: 999,
};

export const radii = {
  sm: scale(baseRadii.sm),
  md: scale(baseRadii.md),
  lg: scale(baseRadii.lg),
  xl: scale(baseRadii.xl),
  pill: baseRadii.pill, // Keep pill as-is since it's meant to be very large
};




