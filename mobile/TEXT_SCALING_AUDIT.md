# Text Scaling & Responsive Layout Audit

## Summary

This document outlines the comprehensive changes made to ensure the app is robust against iOS Dynamic Type, Display Zoom, and different screen sizes.

## Key Changes

### 1. AppText Component (`mobile/src/components/AppText.tsx`)
- **Changed**: Now allows font scaling by default (accessibility-first)
- **Added**: `disableScaling` prop for icons/logos only
- **Impact**: All text now respects system font size settings

### 2. Core Components Fixed

#### PrimaryButton (`mobile/src/components/PrimaryButton.tsx`)
- ✅ Changed `minHeight` from 52 to 44 (accessibility minimum)
- ✅ Uses `paddingVertical` for flexible height
- ✅ Text scales with system settings

#### FormTextInput (`mobile/src/components/FormTextInput.tsx`)
- ✅ Replaced `Text` with `AppText` for labels/helpers
- ✅ Multiline inputs use flexible `minHeight` (80) with padding
- ✅ Text wrapping enabled by default

#### Card Components
**ExpenseCard** (`mobile/src/components/ExpenseCard.tsx`):
- ✅ Added `flexShrink: 1` to text containers
- ✅ Header uses `flexWrap` for long descriptions
- ✅ Description truncates with `numberOfLines={2}`

**EventCard** (`mobile/src/components/EventCard.tsx`):
- ✅ Title truncates with `numberOfLines={2}`
- ✅ Added `flexShrink: 1` to prevent overflow

**GoalCard** (`mobile/src/components/GoalCard.tsx`):
- ✅ Title truncates with `numberOfLines={2}`
- ✅ Description has `flexShrink: 1`

**StatsCard** (`mobile/src/components/StatsCard.tsx`):
- ✅ Label truncates with `numberOfLines={2}`
- ✅ Icon container (56x56) remains fixed (appropriate for icons)

#### List Components
**ListRow** (`mobile/src/components/ui/ListRow.tsx`):
- ✅ Added `minHeight: 44` for touch target
- ✅ Title truncates with `numberOfLines={2}`
- ✅ Added `flexShrink: 1` to prevent overflow

**ShoppingItemRow** (`mobile/src/components/ShoppingItemRow.tsx`):
- ✅ Changed `alignItems` from `center` to `flex-start` for wrapping
- ✅ Added `minHeight: 44` to row
- ✅ Name truncates with `numberOfLines={2}`
- ✅ Touch targets (buttons) have `minHeight: 44` and `minWidth: 44`
- ✅ Checkbox container has proper touch target

**ScreenHeader** (`mobile/src/components/ui/ScreenHeader.tsx`):
- ✅ Title truncates with `numberOfLines={2}`
- ✅ Right button has `minHeight: 44` for touch target
- ✅ Added `flexShrink: 1` to prevent overflow

**BalanceSummary** (`mobile/src/components/BalanceSummary.tsx`):
- ✅ Added `flexShrink: 1` to text containers
- ✅ Text wraps naturally

### 3. Stress Test Utility

Created `mobile/src/utils/textScalingTest.ts`:
- Helper functions for development testing
- Instructions for manual testing on iOS and Android
- Can be imported and enabled in development mode

**Usage**:
```typescript
import { enableStressTest, getTestingInstructions } from '../utils/textScalingTest';

// In development
if (__DEV__) {
  enableStressTest();
  console.log(getTestingInstructions());
}
```

### 4. Fixed Dimensions Audit

#### ✅ Appropriate Fixed Sizes (Kept)
- Icon containers: 56x56, 96x96 (icons should be fixed)
- Avatar images: 72x72, 52x52 (images should be fixed)
- Checkboxes: 24x24 (UI elements should be fixed)
- OTP inputs: 50x60 (input fields can be fixed)

#### ✅ Changed to Flexible
- Button heights: Changed from fixed `height: 52` to `minHeight: 44`
- Card containers: All use padding, no fixed heights
- Text containers: All use `flexShrink: 1` for wrapping

## Testing Instructions

### iOS Testing
1. Open iOS Settings
2. Go to **Display & Brightness**
3. Tap **Text Size** → Drag slider to rightmost (largest)
4. Go back → Tap **Display Zoom** → Select **Zoomed**
5. Return to app and test all screens

### Android Testing
1. Open Android Settings
2. Go to **Display**
3. Tap **Font size** → Set to **Largest**
4. Tap **Display size** → Set to **Largest**
5. Return to app and test all screens

### What to Test
- ✅ All text is readable and not clipped
- ✅ Buttons remain tappable (min 44pt height)
- ✅ Cards expand vertically to fit content
- ✅ Lists scroll properly
- ✅ No horizontal overflow
- ✅ Long usernames/emails wrap or truncate properly
- ✅ Forms remain usable with large text
- ✅ Titles truncate gracefully (2 lines max)

## Remaining Considerations

### Screens to Monitor
The following screens may need additional testing:
- `CreateExpenseScreen` - Complex form layout
- `SettleUpScreen` - Balance calculations display
- `ShoppingListScreen` - Long item names
- `SettingsScreen` - Various form inputs
- `HouseholdSelectScreen` - List of households

### Future Improvements
1. Consider adding `maxFontSizeMultiplier` to prevent extreme scaling
2. Test with very long usernames/emails in production
3. Monitor user feedback for edge cases
4. Consider adding accessibility labels where needed

## Files Modified

### Components
- `mobile/src/components/AppText.tsx`
- `mobile/src/components/PrimaryButton.tsx`
- `mobile/src/components/FormTextInput.tsx`
- `mobile/src/components/ExpenseCard.tsx`
- `mobile/src/components/EventCard.tsx`
- `mobile/src/components/GoalCard.tsx`
- `mobile/src/components/StatsCard.tsx`
- `mobile/src/components/ShoppingItemRow.tsx`
- `mobile/src/components/BalanceSummary.tsx`
- `mobile/src/components/ui/ListRow.tsx`
- `mobile/src/components/ui/ScreenHeader.tsx`

### Utilities
- `mobile/src/utils/textScalingTest.ts` (new)

## Notes

- All changes maintain backward compatibility
- No breaking changes to component APIs
- Text scaling is now enabled by default (accessibility-first approach)
- Only icons/logos should use `disableScaling={true}`

