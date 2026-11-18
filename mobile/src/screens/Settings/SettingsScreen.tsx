import React, { useEffect, useState, useRef } from 'react';
import { AccessibilityInfo, Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';
import { Group, GroupRow } from '../../components/ui/Group';
import { Avatar } from '../../components/ui/Avatar';
import { SettingsSection } from '../../components/Settings/SettingsSection';
import { SettingsGroupCard } from '../../components/Settings/SettingsGroupCard';
import { SettingsRow } from '../../components/Settings/SettingsRow';
import { ToggleRow } from '../../components/Settings/ToggleRow';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage, LANGUAGES } from '../../context/LanguageContext';
import type { LanguageCode } from '../../context/LanguageContext';
import { useFocusEffect } from '@react-navigation/native';
import { fontSizes, fontWeights, radii, spacing, useTheme, useThemeColors } from '../../theme';
import { getPrivacyPolicyUrl } from '../../api/apiClient';

/** Canonical hosted policy (works when dev API URL is unreachable from the device, e.g. Expo Go + localhost). */
const PRIVACY_POLICY_PRODUCTION_URL = 'https://roomate-api.vercel.app/legal/privacy';

type SettingsScreenProps = {
  navigation: any;
  route?: any;
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const { selectedHousehold } = useHousehold();
  const colors = useThemeColors();
  const { theme, setTheme } = useTheme();
  const { language, changeLanguage, t } = useLanguage();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: !reduceMotion });
    }, [reduceMotion])
  );

  const fromHouseholdSelect = route?.params?.fromHouseholdSelect || false;
  const showHouseholdOptions = !!selectedHousehold && !fromHouseholdSelect;

  const currentLanguage = LANGUAGES.find((lang) => lang.code === language);

  const handleLanguageSelect = async (code: LanguageCode) => {
    await changeLanguage(code);
    setShowLanguageModal(false);
  };

  const openPrivacyPolicy = async () => {
    const primary = getPrivacyPolicyUrl();
    const open = async (url: string) => {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    };
    try {
      await open(primary);
    } catch {
      if (primary !== PRIVACY_POLICY_PRODUCTION_URL) {
        try {
          await open(PRIVACY_POLICY_PRODUCTION_URL);
          return;
        } catch {
          /* fall through */
        }
      }
      Alert.alert(t('common.error'), t('settings.privacyPolicyOpenError'));
    }
  };

  const handleLogout = () => {
    Alert.alert(t('settings.logOut'), t('settings.logOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logOut'),
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const styles = React.useMemo(
    () => StyleSheet.create({
      container: { flex: 1, backgroundColor: colors.background },
      scrollView: { flex: 1 },
      scrollContent: { paddingTop: spacing.md, paddingBottom: spacing.xl },
      profileGroup: { marginTop: spacing.md },
      languageValue: { fontSize: fontSizes.md, color: colors.textSecondary, textAlign: 'right' },
      modalOverlay: { flex: 1, justifyContent: 'flex-end' },
      modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.shadowStrong },
      modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xxl,
        maxHeight: '80%',
      },
      modalHeader: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm,
      },
      modalTitle: { flex: 1, fontSize: 20, fontWeight: fontWeights.bold, color: colors.text },
      closeButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
      languageOption: {
        flexDirection: 'row', alignItems: 'center', minHeight: 60,
        paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: spacing.sm,
      },
      languageOptionSelected: { backgroundColor: colors.primaryUltraSoft },
      languageInfo: { flex: 1, minWidth: 0 },
      languageName: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text },
      languageNativeName: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.xxs },
    }),
    [colors]
  );

  return (
    <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
      >
        <Group style={styles.profileGroup}>
          <GroupRow
            title={user?.name || '—'}
            titleLines={0}
            subtitle={[user?.email, showHouseholdOptions ? selectedHousehold?.name : null].filter(Boolean).join('\n')}
            leading={<Avatar name={user?.name} uri={user?.avatarUrl} size={44} />}
            accessibilityHint={t('settings.tapToEditProfile')}
            onPress={() => navigation.navigate('AccountSettings')}
            chevron
          />
        </Group>

        <SettingsSection title={t('settings.sectionAccountHousehold')}>
          <SettingsGroupCard>
            <SettingsRow
              icon="person-outline"
              iconBackgroundColor={colors.primaryUltraSoft}
              iconColor={colors.primary}
              title={t('settings.accountSettings')}
              onPress={() => navigation.navigate('AccountSettings')}
              isLast={!showHouseholdOptions}
            />
            {showHouseholdOptions && (
              <SettingsRow
                icon="home-outline"
                iconBackgroundColor={colors.accentUltraSoft}
                iconColor={colors.accent}
                title={t('settings.householdSettings')}
                onPress={() => navigation.navigate('HouseholdSettings')}
                isLast
              />
            )}
          </SettingsGroupCard>
        </SettingsSection>

        <SettingsSection title={t('settings.sectionPreferences')}>
          <SettingsGroupCard>
            <SettingsRow
              icon="notifications-outline"
              iconBackgroundColor={colors.primaryUltraSoft}
              iconColor={colors.primary}
              title={t('settings.notifications')}
              onPress={() => navigation.navigate('NotificationSettings')}
            />
            <ToggleRow
              icon={theme === 'dark' ? 'moon-outline' : 'sunny-outline'}
              iconBackgroundColor={colors.accentUltraSoft}
              iconColor={colors.accent}
              title={t('settings.darkMode')}
              subtitle=""
              value={theme === 'dark'}
              onValueChange={(isDark) => setTheme(isDark ? 'dark' : 'light')}
            />
            <GroupRow
              icon="language-outline"
              title={t('settings.language')}
              titleLines={0}
              trailing={
                currentLanguage ? <AppText style={styles.languageValue}>{currentLanguage.nativeName}</AppText> : undefined
              }
              onPress={() => setShowLanguageModal(true)}
              chevron
            />
          </SettingsGroupCard>
        </SettingsSection>

        <SettingsSection title={t('settings.sectionLegal')}>
          <SettingsGroupCard>
            <SettingsRow
              icon="document-text-outline"
              iconBackgroundColor={colors.primaryUltraSoft}
              iconColor={colors.primary}
              title={t('settings.privacyPolicy')}
              onPress={openPrivacyPolicy}
              isLast
            />
          </SettingsGroupCard>
        </SettingsSection>

        <SettingsSection title={t('settings.actions')}>
          <SettingsGroupCard>
            <GroupRow
              title={t('settings.logOut')}
              titleLines={0}
              icon="log-out-outline"
              iconTone="danger"
              destructive
              onPress={handleLogout}
            />
          </SettingsGroupCard>
        </SettingsSection>
      </ScrollView>

      <Modal
        visible={showLanguageModal}
        animationType={reduceMotion ? "none" : "slide"}
        transparent
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={() => setShowLanguageModal(false)}
          />
          <View style={styles.modalContent} accessibilityViewIsModal>
            <View style={styles.modalHeader}>
              <AppText accessibilityRole="header" style={styles.modalTitle}>{t('settings.language')}</AppText>
              <TouchableOpacity
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                onPress={() => setShowLanguageModal(false)}
              >
                <Ionicons name="close-outline" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Group>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    accessibilityRole="radio"
                    accessibilityLabel={`${lang.name}, ${lang.nativeName}`}
                    accessibilityState={{ checked: language === lang.code, selected: language === lang.code }}
                    style={[styles.languageOption, language === lang.code && styles.languageOptionSelected]}
                    onPress={() => handleLanguageSelect(lang.code)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.languageInfo}>
                      <AppText style={styles.languageName}>{lang.name}</AppText>
                      <AppText style={styles.languageNativeName}>{lang.nativeName}</AppText>
                    </View>
                    {language === lang.code && (
                      <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </Group>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SanctuaryScreenShell>
  );
};
