import { Platform } from 'react-native';

// Shadow colors - using static values since shadows don't need to be theme-aware
// These are the light theme shadow colors
const shadowColor = 'rgba(0, 0, 0, 0.08)';
const shadowColorStrong = 'rgba(0, 0, 0, 0.12)';

export const shadows = {
  xs: Platform.select({
    ios: {
      shadowColor: shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
    },
    android: {
      elevation: 1,
    },
    default: {},
  }),
  sm: Platform.select({
    ios: {
      shadowColor: shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.9,
      shadowRadius: 8,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 16,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: shadowColorStrong,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 1,
      shadowRadius: 24,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
};




