import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Group, GroupRow } from '../../components/ui/Group';
import { AppText } from '../../components/AppText';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { SettingsSection } from '../../components/Settings/SettingsSection';
import { SettingsGroupCard } from '../../components/Settings/SettingsGroupCard';
import { ToggleRow } from '../../components/Settings/ToggleRow';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { DEFAULT_NOTIFICATION_PREFERENCES, NotificationPreferences } from '../../api/authApi';
import {
  getPermissionStatus,
  registerPushTokenWithBackend,
  requestPermission,
} from '../../utils/notifications';
import { fontSizes, spacing, useThemeColors } from '../../theme';

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
      let cancelled = false;
      (async () => {
        const next = await getPermissionStatus();
        if (!cancelled) setPermission(next);
        if (!cancelled && next === 'granted') {
          registerPushTokenWithBackend().catch(() => {});
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    refreshPermission();
  }, [refreshPermission]);

  const handleToggle = async (
    key: keyof NotificationPreferences,
    next: boolean
  ): Promise<void> => {
    try {
      const updates: Partial<NotificationPreferences> = { [key]: next };
      // Category rows look off when master is off, but turning one back on
      // should re-enable the master switch too.
      if (key !== 'enabled' && next && !masterOn) {
        updates.enabled = true;
      }
      await updateNotificationPreferences(updates);
      if (updates.enabled === true || (key === 'enabled' && next)) {
        await registerPushTokenWithBackend();
      }
    } catch (error: unknown) {
      const ax = error as {
        response?: { status?: number; data?: { error?: string } };
        message?: string;
      };
      const status = ax.response?.status;
      const serverMsg = ax.response?.data?.error;
      let body = serverMsg || ax.message || t('notificationsScreen.saveError');
      if (status === 404) {
        body = `${body} ${t('notificationsScreen.saveErrorDeployHint')}`;
      }
      if (status === 429) {
        body = serverMsg || t('notificationsScreen.saveErrorRateLimit');
      }
      Alert.alert(t('common.error'), body);
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
    if (status === 'granted') {
      await registerPushTokenWithBackend();
    }
    if (status === 'denied') {
      // iOS only shows the system dialog once. After that, the user must
      // flip it in Settings — point them there explicitly.
      handleOpenIosSettings();
    }
  };

  const styles = React.useMemo(
    () => StyleSheet.create({
      container: { flex: 1 },
      scrollView: { flex: 1 },
      scrollContent: { paddingTop: spacing.md, paddingBottom: spacing.xl },
      headerSubtitle: {
        fontSize: fontSizes.sm, color: colors.textSecondary,
        paddingHorizontal: spacing.lg, marginBottom: spacing.md,
      },
      sectionHint: {
        fontSize: fontSizes.sm, color: colors.textSecondary,
        marginBottom: spacing.sm, marginHorizontal: spacing.lg,
      },
      groupSpacing: { marginTop: spacing.md },
    }),
    [colors]
  );

  // Categories appear off when master is off; turning one back on also
  // re-enables master in `handleToggle`.
  const masterOn = prefs.enabled !== false;

  const renderPermissionBanner = () => {
    if (Platform.OS !== 'ios') return null;

    if (permission === 'denied') {
      return (
        <Group>
          <GroupRow
            title={t('notificationsScreen.iosDeniedTitle')}
            subtitle={t('notificationsScreen.iosDeniedBody')}
            titleLines={0}
            icon="alert-circle-outline"
          />
          <GroupRow
            title={t('notificationsScreen.iosDeniedAction')}
            titleLines={0}
            onPress={handleOpenIosSettings}
            chevron
          />
        </Group>
      );
    }

    if (permission === 'undetermined') {
      return (
        <Group>
          <GroupRow
            title={t('notificationsScreen.iosUndeterminedTitle')}
            subtitle={t('notificationsScreen.iosUndeterminedBody')}
            titleLines={0}
            icon="notifications-outline"
          />
          <GroupRow
            title={t('notificationsScreen.iosUndeterminedAction')}
            titleLines={0}
            onPress={handleRequestPermission}
            chevron
          />
        </Group>
      );
    }

    return null;
  };

  return (
    <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <AppText style={styles.headerSubtitle}>
          {t('notificationsScreen.headerSubtitle')}
        </AppText>

        {renderPermissionBanner()}

        <View style={styles.groupSpacing}>
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
        </View>

        <SettingsSection title={t('notificationsScreen.categoriesSection')}>
          <AppText style={styles.sectionHint}>{t('notificationsScreen.categoriesHint')}</AppText>
          <SettingsGroupCard>
            <ToggleRow
              icon="cash-outline"
              iconBackgroundColor={colors.primaryUltraSoft}
              iconColor={colors.primary}
              title={t('notificationsScreen.expensesTitle')}
              subtitle={t('notificationsScreen.expensesSubtitle')}
              value={masterOn && prefs.expenses !== false}
              onValueChange={(v) => handleToggle('expenses', v)}
            />
            <ToggleRow
              icon="calendar-outline"
              iconBackgroundColor={colors.primaryUltraSoft}
              iconColor={colors.primary}
              title={t('notificationsScreen.calendarTitle')}
              subtitle={t('notificationsScreen.calendarSubtitle')}
              value={masterOn && prefs.calendar !== false}
              onValueChange={(v) => handleToggle('calendar', v)}
            />
            <ToggleRow
              icon="alarm-outline"
              iconBackgroundColor={colors.primaryUltraSoft}
              iconColor={colors.primary}
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
