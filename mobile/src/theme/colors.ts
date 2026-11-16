/**
 * House Number palette.
 *
 * Light: porcelain ground, cobalt enamel, ink text, marigold for the single loudest action.
 * Dark ("night enamel"): deep navy ground, brighter enamel, lemon marigold.
 *
 * `primary` is the interactive tint: safe as text/icon on `surface` and `background`,
 * and as a fill behind `onPrimary` text. `enamel` is the plaque/header field and always
 * carries `onEnamel` (white) content.
 */
const lightColors = {
  // Ground and surfaces
  background: '#F4F5F8',
  backgroundGradient: ['#F4F5F8', '#F4F5F8'],
  surface: '#FFFFFF',
  surfaceAlt: '#F8F9FB',
  surfaceElevated: '#FFFFFF',
  border: '#D5DAE6',
  borderLight: '#E4E7EE',

  // Ink
  text: '#10151F',
  textSecondary: '#535B6B',
  textTertiary: '#626A7C',
  muted: '#626A7C',
  ink: '#10151F',
  onInk: '#FFFFFF',

  // Enamel (brand / interactive)
  primary: '#1D3BA8',
  primaryDark: '#162E86',
  primaryLight: '#3D5BD0',
  primarySoft: '#DCE3F8',
  primaryUltraSoft: '#EEF1FB',
  onPrimary: '#FFFFFF',
  enamel: '#1D3BA8',
  enamelDeep: '#162E86',
  onEnamel: '#FFFFFF',
  onEnamelSecondary: '#D3DCFA',
  enamelKeyline: 'rgba(255,255,255,0.28)',

  // Marigold (the one loud accent; always carries ink text)
  marigold: '#F2B705',
  marigoldSoft: '#FDF3CF',
  onMarigold: '#10151F',

  // Secondary hues kept for charts and category coding
  accent: '#3D5BD0',
  accentDark: '#1D3BA8',
  accentLight: '#7C93E4',
  accentSoft: '#DCE3F8',
  accentUltraSoft: '#EEF1FB',
  teal: '#3E4A63',
  tealSoft: '#E1E5EE',
  tealUltraSoft: '#F0F2F7',

  // States
  danger: '#C42F17',
  dangerSoft: '#FBE4DF',
  warning: '#8F6100',
  warningSoft: '#FDF3CF',
  warningUltraSoft: '#FEF9E6',
  success: '#1F7A4D',
  successSoft: '#DDF1E6',

  // Balance direction (always paired with a sign and a word, never colour alone)
  owed: '#1D3BA8',
  owe: '#C42F17',

  shadow: 'rgba(16, 21, 31, 0.08)',
  shadowStrong: 'rgba(16, 21, 31, 0.16)',
};

const darkColors: typeof lightColors = {
  background: '#0A0F26',
  backgroundGradient: ['#0A0F26', '#0A0F26'],
  surface: '#131A3A',
  surfaceAlt: '#161D40',
  surfaceElevated: '#1A2248',
  border: '#2C3768',
  borderLight: '#252E57',

  text: '#FFFFFF',
  textSecondary: '#AAB3D3',
  textTertiary: '#8C96BB',
  muted: '#8C96BB',
  ink: '#FFFFFF',
  onInk: '#0A0F26',

  primary: '#7C98FF',
  primaryDark: '#5B7DF5',
  primaryLight: '#A3B7FF',
  primarySoft: '#1E2A5E',
  primaryUltraSoft: '#161F47',
  onPrimary: '#0A0F26',
  enamel: '#2B50D8',
  enamelDeep: '#2347C8',
  onEnamel: '#FFFFFF',
  onEnamelSecondary: '#D6DEFF',
  enamelKeyline: 'rgba(255,255,255,0.3)',

  marigold: '#FFD84A',
  marigoldSoft: '#3A3212',
  onMarigold: '#0A0F26',

  accent: '#A3B7FF',
  accentDark: '#7C98FF',
  accentLight: '#C4D1FF',
  accentSoft: '#1E2A5E',
  accentUltraSoft: '#161F47',
  teal: '#AAB3D3',
  tealSoft: '#252E57',
  tealUltraSoft: '#161D40',

  danger: '#FF8A76',
  dangerSoft: '#4A1D18',
  warning: '#F5C451',
  warningSoft: '#3A3212',
  warningUltraSoft: '#2A2510',
  success: '#5FD39A',
  successSoft: '#143D2B',

  owed: '#A3B7FF',
  owe: '#FF8A76',

  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowStrong: 'rgba(0, 0, 0, 0.5)',
};

export type ThemeColors = typeof lightColors;

export const getColors = (isDark: boolean): ThemeColors => {
  return isDark ? darkColors : lightColors;
};

// Light palette for the few call sites that cannot use the hook.
export const colors = lightColors;
