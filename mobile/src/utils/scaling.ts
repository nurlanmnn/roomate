import { Dimensions, PixelRatio } from 'react-native';

// Base width for scaling (iPhone 6/7/8 standard - 375pt)
// This is the reference point for consistent sizing
const BASE_WIDTH = 375;

/**
 * Get the current scale factor based on screen width
 * This is calculated lazily to avoid issues with Dimensions not being ready
 */
const getScaleFactor = (): number => {
  try {
    const { width: SCREEN_WIDTH } = Dimensions.get('window');
    return SCREEN_WIDTH / BASE_WIDTH;
  } catch (error) {
    // Fallback to 1.0 if Dimensions is not available
    return 1.0;
  }
};

/**
 * Normalize size based on screen width
 * This ensures consistent sizing across different devices
 * For devices larger than base, we scale down to prevent things from being too large
 * For devices smaller than base, we scale up proportionally
 */
export const scale = (size: number): number => {
  const scaleFactor = getScaleFactor();
  // For larger devices (scaleFactor > 1), use a more conservative scaling
  // This prevents everything from appearing too large on bigger phones
  if (scaleFactor > 1) {
    // Use a logarithmic scale to reduce the impact on larger devices
    // This means a device 2x wider won't make things 2x larger
    const conservativeScale = 1 + (scaleFactor - 1) * 0.5;
    return Math.round(size * Math.min(conservativeScale, 1.15));
  }
  // For smaller devices, scale proportionally but with a minimum
  return Math.round(size * Math.max(scaleFactor, 0.85));
};

/**
 * Normalize font size based on screen width
 * Uses very conservative scaling for text to prevent it from being too large
 */
export const scaleFont = (size: number): number => {
  const scaleFactor = getScaleFactor();
  // For fonts, be even more conservative
  // On larger devices, keep fonts closer to base size
  if (scaleFactor > 1) {
    // Very conservative scaling for fonts on larger devices
    const fontScale = 1 + (scaleFactor - 1) * 0.3;
    return Math.round(size * Math.min(fontScale, 1.05));
  }
  // For smaller devices, scale fonts proportionally but with a minimum
  return Math.round(size * Math.max(scaleFactor, 0.9));
};

