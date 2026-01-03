import { scaleFont } from '../utils/scaling';

// Base font sizes (will be scaled based on device)
const baseFontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 34,
};

export const fontSizes = {
  xs: scaleFont(baseFontSizes.xs),
  sm: scaleFont(baseFontSizes.sm),
  md: scaleFont(baseFontSizes.md),
  lg: scaleFont(baseFontSizes.lg),
  xl: scaleFont(baseFontSizes.xl),
  xxl: scaleFont(baseFontSizes.xxl),
  xxxl: scaleFont(baseFontSizes.xxxl),
};

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

// Base line heights (will be scaled based on device)
const baseLineHeights = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  xxl: 38,
  xxxl: 44,
};

// Line heights for better readability
export const lineHeights = {
  xs: scaleFont(baseLineHeights.xs),
  sm: scaleFont(baseLineHeights.sm),
  md: scaleFont(baseLineHeights.md),
  lg: scaleFont(baseLineHeights.lg),
  xl: scaleFont(baseLineHeights.xl),
  xxl: scaleFont(baseLineHeights.xxl),
  xxxl: scaleFont(baseLineHeights.xxxl),
};




