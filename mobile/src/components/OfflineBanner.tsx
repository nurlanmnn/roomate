import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useThemeColors } from '../theme';
import { spacing, fontSizes, fontWeights, radii } from '../theme';
import { AppText } from './AppText';
import { useNetwork } from '../context/NetworkContext';

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetwork();
  const { t } = useLanguage();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  if (isOnline !== false) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityRole="alert"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: Math.max(insets.top, spacing.md),
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        backgroundColor: colors.warningUltraSoft,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        zIndex: 9999,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radii.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.warningSoft,
          }}
        >
          <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText
            style={{
              color: colors.text,
              fontSize: fontSizes.sm,
              fontWeight: fontWeights.bold,
            }}
          >
            {t('alerts.offlineBannerTitle')}
          </AppText>
          <AppText style={{ color: colors.textSecondary, fontSize: fontSizes.xs, marginTop: 2 }}>
            {t('alerts.offlineBannerBody')}
          </AppText>
        </View>
      </View>
    </View>
  );
};

