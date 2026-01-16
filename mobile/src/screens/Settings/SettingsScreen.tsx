import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Avatar } from '../../components/ui/Avatar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage, LANGUAGES } from '../../context/LanguageContext';
import type { LanguageCode } from '../../context/LanguageContext';
import { fontSizes, fontWeights, radii, shadows, spacing, useTheme, useThemeColors, TAB_BAR_HEIGHT } from '../../theme';

type SettingsScreenProps = {
  navigation: any;
  route?: any;
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: TAB_BAR_HEIGHT + spacing.xl,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      gap: spacing.md,
      backgroundColor: colors.surface,
      ...(shadows.sm as object),
    },
    profileInfo: {
      flex: 1,
      flexShrink: 1,
    },
    profileName: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.xxs,
    },
    profileEmail: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: spacing.xxs,
    },
    profileHousehold: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: colors.primary,
    },
    section: {
      marginTop: spacing.lg,
      marginHorizontal: spacing.md,
    },
    sectionTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.bold,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
      color: colors.textSecondary,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderRadius: radii.md,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: colors.borderLight,
      backgroundColor: colors.surface,
      ...(shadows.xs as object),
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.md,
    },
    optionIcon: {
      width: 48,
      height: 48,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionContent: {
      flex: 1,
      flexShrink: 1,
    },
    optionTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      marginBottom: spacing.xxs,
      color: colors.text,
    },
    optionDescription: {
      fontSize: fontSizes.sm,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    // Language modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
      paddingHorizontal: spacing.md,
      maxHeight: '60%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.xs,
    },
    modalTitle: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    languageOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: radii.md,
      marginBottom: spacing.xs,
      backgroundColor: colors.background,
    },
    languageOptionSelected: {
      backgroundColor: colors.primaryUltraSoft,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    languageFlag: {
      fontSize: 28,
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
    },
    checkIcon: {
      marginLeft: spacing.sm,
    },
  });

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const { selectedHousehold } = useHousehold();
  const colors = useThemeColors();
  const { theme, toggleTheme } = useTheme();
  const { language, changeLanguage, t } = useLanguage();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // If Settings was opened from HouseholdSelect (not inside a household), hide household-only rows
  const fromHouseholdSelect = route?.params?.fromHouseholdSelect || false;
  const showHouseholdOptions = !!selectedHousehold && !fromHouseholdSelect;

  const currentLanguage = LANGUAGES.find(lang => lang.code === language);

  const handleLanguageSelect = async (code: LanguageCode) => {
    await changeLanguage(code);
    setShowLanguageModal(false);
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ScreenHeader title={t('settings.title')} />

        <View style={styles.profileCard}>
          <Avatar name={user?.name} uri={user?.avatarUrl} size={64} />
          <View style={styles.profileInfo}>
            <AppText style={styles.profileName}>{user?.name}</AppText>
            <AppText style={styles.profileEmail}>{user?.email}</AppText>
            {selectedHousehold && <AppText style={styles.profileHousehold}>{selectedHousehold.name}</AppText>}
          </View>
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>{t('settings.title')}</AppText>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => navigation.navigate('AccountSettings')}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.optionIcon, { backgroundColor: colors.primaryUltraSoft }]}>
                <Ionicons name="person-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.optionContent}>
                <AppText style={styles.optionTitle}>{t('settings.accountSettings')}</AppText>
                <AppText style={styles.optionDescription}>{t('settings.accountDescription')}</AppText>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {showHouseholdOptions && (
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => navigation.navigate('HouseholdSettings')}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.optionIcon, { backgroundColor: colors.accentUltraSoft }]}>
                  <Ionicons name="home-outline" size={24} color={colors.accent} />
                </View>
                <View style={styles.optionContent}>
                  <AppText style={styles.optionTitle}>{t('settings.householdSettings')}</AppText>
                  <AppText style={styles.optionDescription}>{t('settings.householdDescription')}</AppText>
                </View>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>{t('settings.appearance')}</AppText>

          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <View style={[styles.optionIcon, { backgroundColor: colors.accentUltraSoft }]}>
                <Ionicons
                  name={theme === 'dark' ? 'moon' : 'sunny-outline'}
                  size={24}
                  color={colors.accent}
                />
              </View>
              <View style={styles.optionContent}>
                <AppText style={styles.optionTitle}>{t('settings.darkMode')}</AppText>
                <AppText style={styles.optionDescription}>
                  {theme === 'dark' ? t('settings.darkModeEnabled') : t('settings.lightModeEnabled')}
                </AppText>
              </View>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setShowLanguageModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.optionIcon, { backgroundColor: colors.primaryUltraSoft }]}>
                <Ionicons name="language-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.optionContent}>
                <AppText style={styles.optionTitle}>{t('settings.language')}</AppText>
                <AppText style={styles.optionDescription}>
                  {currentLanguage?.flag} {currentLanguage?.nativeName}
                </AppText>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>{t('settings.actions')}</AppText>
          <PrimaryButton title={t('settings.logOut')} onPress={handleLogout} variant="secondary" />
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>{t('settings.language')}</AppText>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
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
                      size={24}
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
    </SafeAreaView>
  );
};
