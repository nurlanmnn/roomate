import { getColors, colors as lightColors } from './colors';
import { useTheme as useThemeContext } from '../context/ThemeContext';

export { spacing, radii } from './spacing';
export { fontSizes, fontWeights, lineHeights, fonts, DISPLAY_MAX_FONT_SCALE } from './typography';
export type { ThemeColors } from './colors';
export { shadows } from './shadows';
export { useTheme } from '../context/ThemeContext';

/**
 * Extra bottom padding for tab screens. The tab bar is the standard docked bar, so content
 * is never underneath it; this is only breathing room at the end of a scroll.
 */
export const TAB_BAR_HEIGHT = 8;

// Export a hook to get theme-aware colors
export const useThemeColors = () => {
  const { theme } = useThemeContext();
  return getColors(theme === 'dark');
};

// Export colors for backward compatibility (light theme)
// This ensures colors is always available even if ThemeContext isn't ready
export const colors = lightColors;
