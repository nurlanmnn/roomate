import React, { useState, useRef } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';
import { Avatar } from '../../components/ui/Avatar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ProfileHeaderCard } from '../../components/Settings/ProfileHeaderCard';
import { SettingsSection } from '../../components/Settings/SettingsSection';
import { SettingsGroupCard } from '../../components/Settings/SettingsGroupCard';
import { SettingsRow } from '../../components/Settings/SettingsRow';
import { ToggleRow } from '../../components/Settings/ToggleRow';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage, LANGUAGES } from '../../context/LanguageContext';
import type { LanguageCode } from '../../context/LanguageContext';
import { useFocusEffect } from '@react-navigation/native';
import { fontSizes, fontWeights, radii, spacing, useTheme, useThemeColors, TAB_BAR_HEIGHT } from '../../theme';
import { getPrivacyPolicyUrl } from '../../api/apiClient';

/** Canonical hosted policy (works when dev API URL is unreachable from the device, e.g. Expo Go + localhost). */
const PRIVACY_POLICY_PRODUCTION_URL = 'https://api.roomate.us/legal/privacy';

type SettingsScreenProps = {
  navigation: any;
  route?: any;
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const { selectedHousehold } = useHousehold();
  const colors = useThemeColors();
  const { theme, toggleTheme } = useTheme();
  const { language, changeLanguage, t } = useLanguage();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    React.useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, [])
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
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: 'transparent',
        },
        scrollView: {
          flex: 1,
        },
        scrollContent: {
          paddingBottom: TAB_BAR_HEIGHT + spacing.xl,
        },
        stackHeaderSpacer: {
          height: spacing.sm,
        },
        profileSpacer: {
          marginTop: spacing.xs,
        },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        },
        modalContent: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: radii.lg,
          borderTopRightRadius: radii.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxl,
          paddingHorizontal: spacing.xl,
          maxHeight: '62%',
        },
        modalHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
        },
        modalTitle: {
          fontSize: fontSizes.xl,
          fontWeight: fontWeights.bold,
          color: colors.text,
        },
        languageOption: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.sm,
          borderRadius: radii.md,
          marginBottom: spacing.xs,
          backgroundColor: colors.primaryUltraSoft,
        },
        languageOptionSelected: {
          backgroundColor: colors.primaryUltraSoft,
          borderWidth: 1,
          borderColor: colors.primary,
        },
        languageFlag: {
          fontSize: 26,
          marginRight: spacing.md,
        },
        languageInfo: {
          flex: 1,
        },
        languageName: {
          fontSize: fontSizes.md,
          fontWeight: fontWeights.semibold,
          color: colors.text,
        },
        languageNativeName: {
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          marginTop: 2,
        },
        checkIcon: {
          marginLeft: spacing.sm,
        },
        logoutRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
        },
        logoutIconWrap: {
          width: 36,
          height: 36,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
          backgroundColor: colors.dangerSoft,
        },
        logoutLabel: {
          flex: 1,
          fontSize: fontSizes.md,
          fontWeight: fontWeights.semibold,
          color: colors.danger,
        },
      }),
    [colors]
  );

  return (
    <SanctuaryScreenShell edges={['top']} innerStyle={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior={fromHouseholdSelect ? 'automatic' : 'never'}
      >
        {fromHouseholdSelect ? (
          <View style={styles.stackHeaderSpacer} />
        ) : (
          <ScreenHeader title={t('settings.title')} />
        )}

        <View style={styles.profileSpacer}>
          <ProfileHeaderCard
            name={user?.name}
            email={user?.email}
            householdName={showHouseholdOptions ? selectedHousehold?.name : null}
            avatarUri={user?.avatarUrl}
            editHint={t('settings.tapToEditProfile')}
            onPress={() => navigation.navigate('AccountSettings')}
          />
        </View>

        <SettingsSection title={t('settings.sectionAccountHousehold')}>
          <SettingsGroupCard>
            <SettingsRow
              icon="person-outline"
              iconBackgroundColor={colors.primaryUltraSoft}
              iconColor={colors.primary}
              title={t('settings.accountSettings')}
              subtitle={t('settings.accountDescription')}
              onPress={() => navigation.navigate('AccountSettings')}
              isLast={!showHouseholdOptions}
            />
            {showHouseholdOptions && (
              <SettingsRow
                icon="home-outline"
                iconBackgroundColor={colors.accentUltraSoft}
                iconColor={colors.accent}
                title={t('settings.householdSettings')}
                subtitle={t('settings.householdDescription')}
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
              subtitle={t('settings.notificationsDescription')}
              onPress={() => navigation.navigate('NotificationSettings')}
            />
            <ToggleRow
              icon={theme === 'dark' ? 'moon' : 'sunny-outline'}
              iconBackgroundColor={colors.accentUltraSoft}
              iconColor={colors.accent}
              title={t('settings.darkMode')}
              subtitle={
                theme === 'dark' ? t('settings.darkModeEnabled') : t('settings.lightModeEnabled')
              }
              value={theme === 'dark'}
              onValueChange={() => toggleTheme()}
            />
            <SettingsRow
              icon="language-outline"
              iconBackgroundColor={colors.primaryUltraSoft}
              iconColor={colors.primary}
              title={t('settings.language')}
              subtitle={
                currentLanguage
                  ? `${currentLanguage.flag} ${currentLanguage.nativeName}`
                  : undefined
              }
              onPress={() => setShowLanguageModal(true)}
              isLast
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
              subtitle={t('settings.privacyPolicyDescription')}
              onPress={openPrivacyPolicy}
              isLast
            />
          </SettingsGroupCard>
        </SettingsSection>

        <SettingsSection title={t('settings.actions')}>
          <SettingsGroupCard>
            <TouchableOpacity
              style={styles.logoutRow}
              onPress={handleLogout}
              activeOpacity={0.65}
            >
              <View style={styles.logoutIconWrap}>
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              </View>
              <AppText style={styles.logoutLabel}>{t('settings.logOut')}</AppText>
            </TouchableOpacity>
          </SettingsGroupCard>
        </SettingsSection>
      </ScrollView>

      <Modal
        visible={showLanguageModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>{t('settings.language')}</AppText>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    language === lang.code && styles.languageOptionSelected,
                  ]}
                  onPress={() => handleLanguageSelect(lang.code)}
                  activeOpacity={0.7}
                >
                  <AppText style={styles.languageFlag}>{lang.flag}</AppText>
                  <View style={styles.languageInfo}>
                    <AppText style={styles.languageName}>{lang.name}</AppText>
                    <AppText style={styles.languageNativeName}>{lang.nativeName}</AppText>
                  </View>
                  {language === lang.code && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={colors.primary}
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SanctuaryScreenShell>
  );
};
