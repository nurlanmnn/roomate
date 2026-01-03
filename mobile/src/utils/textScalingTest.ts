/**
 * Text Scaling Stress Test Utility
 * 
 * This utility helps test the app with larger text sizes to ensure
 * the UI remains functional and readable.
 * 
 * USAGE:
 * 1. Import this in your root component or App.tsx
 * 2. Call enableStressTest() in development mode
 * 3. Test with iOS Settings > Display & Brightness > Text Size (set to largest)
 * 4. Test with iOS Settings > Display & Brightness > Display Zoom (set to Zoomed)
 * 
 * For Android:
 * - Settings > Display > Font size (set to largest)
 * - Settings > Display > Display size (set to largest)
 */

import { PixelRatio } from 'react-native';

let stressTestEnabled = false;
let originalFontScale: number | null = null;

/**
 * Enable stress test mode - increases font scale for testing
 * Only works in development mode
 */
export const enableStressTest = () => {
  if (__DEV__) {
    stressTestEnabled = true;
    // Note: React Native doesn't allow changing PixelRatio.getFontScale() directly
    // This is a helper to remind developers to test manually
    console.log('📱 STRESS TEST MODE ENABLED');
    console.log('📱 Please test with:');
    console.log('   iOS: Settings > Display & Brightness > Text Size (largest)');
    console.log('   iOS: Settings > Display & Brightness > Display Zoom (Zoomed)');
    console.log('   Android: Settings > Display > Font size (largest)');
    console.log('   Android: Settings > Display > Display size (largest)');
  }
};

/**
 * Disable stress test mode
 */
export const disableStressTest = () => {
  stressTestEnabled = false;
  console.log('📱 Stress test mode disabled');
};

/**
 * Get current font scale multiplier for stress testing
 * Returns 1.5x in stress test mode, 1.0x otherwise
 */
export const getStressTestMultiplier = (): number => {
  if (!stressTestEnabled || !__DEV__) {
    return 1.0;
  }
  return 1.5; // 50% larger for stress testing
};

/**
 * Check if stress test is enabled
 */
export const isStressTestEnabled = (): boolean => {
  return stressTestEnabled && __DEV__;
};

/**
 * Instructions for manual testing
 */
export const getTestingInstructions = (): string => {
  return `
📱 TEXT SCALING STRESS TEST INSTRUCTIONS

iOS Testing:
1. Open iOS Settings
2. Go to Display & Brightness
3. Tap "Text Size"
4. Drag slider to the rightmost position (largest)
5. Go back and tap "Display Zoom"
6. Select "Zoomed"
7. Return to app and test all screens

Android Testing:
1. Open Android Settings
2. Go to Display
3. Tap "Font size" and set to "Largest"
4. Tap "Display size" and set to "Largest"
5. Return to app and test all screens

What to Test:
✓ All text is readable and not clipped
✓ Buttons remain tappable (min 44pt height)
✓ Cards expand vertically to fit content
✓ Lists scroll properly
✓ No horizontal overflow
✓ Long usernames/emails wrap or truncate properly
✓ Forms remain usable with large text
  `.trim();
};

