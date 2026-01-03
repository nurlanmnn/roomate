const lightColors = {
  // Base - Warm light grays instead of pure white
  background: '#F8F9FA',
  backgroundGradient: ['#F8F9FA', '#F5F6F8'],
  surface: '#FFFFFF',
  surfaceAlt: '#FBFCFD',
  surfaceElevated: '#FFFFFF',
  border: '#E8EAED',
  borderLight: '#F0F1F3',
  text: '#1A1C21',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  muted: '#9CA3AF',

  // Brand - Refined, muted premium green
  primary: '#22C55E',
  primaryDark: '#16A34A',
  primaryLight: '#4ADE80',
  primarySoft: '#D1FAE5',
  primaryUltraSoft: '#ECFDF5',

  // Secondary accent - Soft blue/teal for analytics, highlights
  accent: '#3B82F6',
  accentDark: '#2563EB',
  accentLight: '#60A5FA',
  accentSoft: '#DBEAFE',
  accentUltraSoft: '#EFF6FF',

  // Teal variant for insights/predictions
  teal: '#14B8A6',
  tealSoft: '#CCFBF1',
  tealUltraSoft: '#F0FDFA',

  // States
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  warningUltraSoft: '#FFFBEB',
  success: '#22C55E',
  successSoft: '#D1FAE5',

  // Shadows - Softer, more subtle
  shadow: 'rgba(0, 0, 0, 0.08)',
  shadowStrong: 'rgba(0, 0, 0, 0.12)',
};

const darkColors = {
  // Base - Dark grays and blacks
  background: '#0F0F0F',
  backgroundGradient: ['#0F0F0F', '#1A1A1A'],
  surface: '#1A1A1A',
  surfaceAlt: '#1F1F1F',
  surfaceElevated: '#242424',
  border: '#2A2A2A',
  borderLight: '#333333',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#707070',
  muted: '#707070',

  // Brand - Slightly brighter green for dark mode
  primary: '#4ADE80',
  primaryDark: '#22C55E',
  primaryLight: '#86EFAC',
  primarySoft: '#166534',
  primaryUltraSoft: '#0F3D1F',

  // Secondary accent
  accent: '#60A5FA',
  accentDark: '#3B82F6',
  accentLight: '#93C5FD',
  accentSoft: '#1E3A8A',
  accentUltraSoft: '#1E40AF',

  // Teal variant
  teal: '#5EEAD4',
  tealSoft: '#134E4A',
  tealUltraSoft: '#0F3D3A',

  // States
  danger: '#F87171',
  dangerSoft: '#7F1D1D',
  warning: '#FBBF24',
  warningSoft: '#78350F',
  warningUltraSoft: '#451A03',
  success: '#4ADE80',
  successSoft: '#166534',

  // Shadows - Lighter shadows for dark mode
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowStrong: 'rgba(0, 0, 0, 0.5)',
};

// Export a function that returns colors based on theme
export const getColors = (isDark: boolean) => {
  return isDark ? darkColors : lightColors;
};

// Default export for backward compatibility (will be overridden by ThemeProvider)
export const colors = lightColors;
