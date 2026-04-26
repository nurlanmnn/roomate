import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { SettingsSection } from '../../components/Settings/SettingsSection';
import { SettingsGroupCard } from '../../components/Settings/SettingsGroupCard';
import { ToggleRow } from '../../components/Settings/ToggleRow';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { DEFAULT_NOTIFICATION_PREFERENCES, NotificationPreferences } from '../../api/authApi';
import { getPermissionStatus, requestPermission } from '../../utils/notifications';
import { fontSizes, fontWeights, radii, spacing, useThemeColors } from '../../theme';

type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export const NotificationSettingsScreen: React.FC<{ navigation: any }> = () => {
  const { user, updateNotificationPreferences } = useAuth();
  const { t } = useLanguage();
  const colors = useThemeColors();

  const prefs: NotificationPreferences =
    user?.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES;

  const [permission, setPermission] = useState<PermissionState>('undetermined');

  const refreshPermission = useCallback(async () => {
    const next = await getPermissionStatus();
    setPermission(next);
  }, []);

  // Re-check on every focus — the user might bounce out to iOS Settings to
  // flip the OS-level toggle and come back. Without this they'd see the
  // banner long after they've granted permission.
  useFocusEffect(
    useCallback(() => {
      refreshPermission();
    }, [refreshPermission])
  );

  useEffect(() => {
    refreshPermission();
  }, [refreshPermission]);

  const handleToggle = async (
    key: keyof NotificationPreferences,
    next: boolean
  ): Promise<void> => {
    try {
      await updateNotificationPreferences({ [key]: next });
    } catch {
      Alert.alert(t('common.error'), t('notificationsScreen.saveError'));
    }
  };

  const handleOpenIosSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      /* no-op */
    }
  };

  const handleRequestPermission = async () => {
    const status = await requestPermission();
    setPermission(status);
    if (status === 'denied') {
      // iOS only shows the system dialog once. After that, the user must
      // flip it in Settings — point them there explicitly.
      handleOpenIosSettings();
    }
  };

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        scrollView: { flex: 1 },
        scrollContent: {
          paddingBottom: spacing.xxl,
        },
        headerSubtitle: {
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          paddingHorizontal: spacing.xl,
          marginTop: spacing.sm,
          lineHeight: 20,
        },
        sectionHint: {
          fontSize: fontSizes.xs,
          color: colors.textTertiary,
          marginTop: -spacing.xs,
          marginBottom: spacing.sm,
          marginHorizontal: spacing.xs,
          lineHeight: 16,
        },
        banner: {
          marginHorizontal: spacing.xl,
          marginTop: spacing.lg,
          padding: spacing.md,
          borderRadius: radii.md,
          backgroundColor: colors.warningSoft ?? colors.dangerSoft,
          flexDirection: 'row',
          alignItems: 'flex-start',
        },
        bannerInfo: {
          backgroundColor: colors.primaryUltraSoft,
        },
        bannerIcon: {
          marginRight: spacing.sm,
          marginTop: 2,
        },
        bannerText: {
          flex: 1,
        },
        bannerTitle: {
          fontSize: fontSizes.sm,
          fontWeight: fontWeights.semibold,
          color: colors.text,
          marginBottom: 2,
        },
        bannerBody: {
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          lineHeight: 18,
        },
        bannerAction: {
          marginTop: spacing.sm,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          borderRadius: radii.sm,
          alignSelf: 'flex-start',
          backgroundColor: colors.primary,
        },
        bannerActionText: {
          color: '#FFFFFF',
          fontSize: fontSizes.sm,
          fontWeight: fontWeights.semibold,
        },
      }),
    [colors]
  );

  // Categories are visually disabled (and locked OFF semantically) when the
  // master switch is off. Tapping them rolls them on AND flips master back
  // on — handled with the `effectiveEnabled` guard below.
  const masterOn = prefs.enabled !== false;

  const renderPermissionBanner = () => {
    if (Platform.OS !== 'ios') return null;

    if (permission === 'denied') {
      return (
        <View style={styles.banner}>
          <Ionicons
            name="alert-circle"
            size={20}
            color={colors.warning ?? colors.danger}
            style={styles.bannerIcon}
          />
          <View style={styles.bannerText}>
            <AppText style={styles.bannerTitle}>
              {t('notificationsScreen.iosDeniedTitle')}
            </AppText>
            <AppText style={styles.bannerBody}>
              {t('notificationsScreen.iosDeniedBody')}
            </AppText>
            <TouchableOpacity
              style={styles.bannerAction}
              onPress={handleOpenIosSettings}
              activeOpacity={0.8}
            >
              <AppText style={styles.bannerActionText}>
                {t('notificationsScreen.iosDeniedAction')}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (permission === 'undetermined') {
      return (
        <View style={[styles.banner, styles.bannerInfo]}>
          <Ionicons
            name="notifications-outline"
            size={20}
            color={colors.primary}
            style={styles.bannerIcon}
          />
          <View style={styles.bannerText}>
            <AppText style={styles.bannerTitle}>
              {t('notificationsScreen.iosUndeterminedTitle')}
            </AppText>
            <AppText style={styles.bannerBody}>
              {t('notificationsScreen.iosUndeterminedBody')}
            </AppText>
            <TouchableOpacity
              style={styles.bannerAction}
              onPress={handleRequestPermission}
              activeOpacity={0.8}
            >
              <AppText style={styles.bannerActionText}>
                {t('notificationsScreen.iosUndeterminedAction')}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <SanctuaryScreenShell edges={['top']} innerStyle={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <AppText style={styles.headerSubtitle}>
          {t('notificationsScreen.headerSubtitle')}
        </AppText>

        {renderPermissionBanner()}

        <SettingsSection title=" ">
          <SettingsGroupCard>
            <ToggleRow
              icon="notifications-outline"
              iconBackgroundColor={colors.primaryUltraSoft}
              iconColor={colors.primary}
              title={t('notificationsScreen.masterTitle')}
              subtitle={t('notificationsScreen.masterSubtitle')}
              value={masterOn}
              onValueChange={(v) => handleToggle('enabled', v)}
              isLast
            />
          </SettingsGroupCard>
        </SettingsSection>

        <SettingsSection title={t('notificationsScreen.categoriesSection')}>
          <AppText style={styles.sectionHint}>{t('notificationsScreen.categoriesHint')}</AppText>
          <SettingsGroupCard>
            <ToggleRow
              icon="cash-outline"
              iconBackgroundColor={colors.successSoft ?? colors.primaryUltraSoft}
              iconColor={colors.success ?? colors.primary}
              title={t('notificationsScreen.expensesTitle')}
              subtitle={t('notificationsScreen.expensesSubtitle')}
              value={masterOn && prefs.expenses !== false}
              onValueChange={(v) => handleToggle('expenses', v)}
            />
            <ToggleRow
              icon="calendar-outline"
              iconBackgroundColor={colors.accentUltraSoft}
              iconColor={colors.accent}
              title={t('notificationsScreen.calendarTitle')}
              subtitle={t('notificationsScreen.calendarSubtitle')}
              value={masterOn && prefs.calendar !== false}
              onValueChange={(v) => handleToggle('calendar', v)}
            />
            <ToggleRow
              icon="alarm-outline"
              iconBackgroundColor={colors.warningSoft ?? colors.dangerSoft}
              iconColor={colors.warning ?? colors.danger}
              title={t('notificationsScreen.debtsTitle')}
              subtitle={t('notificationsScreen.debtsSubtitle')}
              value={masterOn && prefs.debts !== false}
              onValueChange={(v) => handleToggle('debts', v)}
            />
            <ToggleRow
              icon="home-outline"
              iconBackgroundColor={colors.primaryUltraSoft}
              iconColor={colors.primary}
              title={t('notificationsScreen.householdTitle')}
              subtitle={t('notificationsScreen.householdSubtitle')}
              value={masterOn && prefs.household !== false}
              onValueChange={(v) => handleToggle('household', v)}
              isLast
            />
          </SettingsGroupCard>
        </SettingsSection>
      </ScrollView>
    </SanctuaryScreenShell>
  );
};
