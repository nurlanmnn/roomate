import { getColors, colors as lightColors } from './colors';
import { useTheme as useThemeContext } from '../context/ThemeContext';

export { spacing, radii } from './spacing';
export { fontSizes, fontWeights, lineHeights } from './typography';
export { shadows } from './shadows';
export { useTheme } from '../context/ThemeContext';

// Floating tab bar height constant - used for bottom padding on main screens
export const TAB_BAR_HEIGHT = 76;

// Export a hook to get theme-aware colors
export const useThemeColors = () => {
  const { theme } = useThemeContext();
  return getColors(theme === 'dark');
};

// Export colors for backward compatibility (light theme)
// This ensures colors is always available even if ThemeContext isn't ready
export const colors = lightColors;
