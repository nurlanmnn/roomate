import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useThemeColors, spacing, fontSizes, fontWeights, radii } from '../theme';
import { AppText } from './AppText';
import { useNetwork } from '../context/NetworkContext';

/** Clearance for the docked tab bar so the pill floats just above it. */
const TAB_BAR_CLEARANCE = 49;

/**
 * Small floating pill, centred above the tab bar, while the device is offline.
 * It ignores touches, so nothing underneath is blocked. The full explanation is in the
 * accessibility label; the visible text stays one short line in every language.
 */
export const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetwork();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  if (isOnline !== false) return null;

  const isDark = theme === 'dark';
  const bg = isDark ? colors.surfaceElevated : colors.ink;
  const fg = isDark ? colors.text : colors.onInk;

  return (
    <View
      pointerEvents="none"
      style={[styles.layer, { bottom: insets.bottom + TAB_BAR_CLEARANCE + spacing.sm }]}
    >
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${t('alerts.offlineBannerTitle')}. ${t('alerts.offlineBannerBody')}`}
        style={[
          styles.pill,
          { backgroundColor: bg, borderColor: isDark ? colors.border : bg },
        ]}
      >
        <Ionicons name="cloud-offline-outline" size={15} color={fg} />
        <AppText style={[styles.label, { color: fg }]} numberOfLines={1}>
          {t('alerts.offlineBannerTitle')}
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs - 2,
    maxWidth: '80%',
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    flexShrink: 1,
    fontSize: fontSizes.xs + 1,
    fontWeight: fontWeights.semibold,
  },
});
