import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Keyboard,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Localization from 'expo-localization';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { householdsApi, Household } from '../../api/householdsApi';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage } from '../../context/LanguageContext';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormTextInput } from '../../components/FormTextInput';
import { HouseholdCard } from '../../components/Household/HouseholdCard';
import { CurrencyPicker } from '../../components/CurrencyPicker';
import { guessDefaultCurrencyFromLocale } from '../../constants/currencies';
import { useTheme, useThemeColors, fontSizes, fontWeights, spacing } from '../../theme';
import { AppText } from '../../components/AppText';
import { getCached, dedupedFetch, invalidateCache } from '../../utils/queryCache';

export const HouseholdSelectScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const styles = React.useMemo(() => createStyles(colors, isDark, insets.bottom), [colors, isDark, insets.bottom]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [householdAddress, setHouseholdAddress] = useState('');
  const [householdCurrency, setHouseholdCurrency] = useState<string>(() =>
    guessDefaultCurrencyFromLocale(Localization.getLocales()[0]?.languageTag)
  );
  const [joinCode, setJoinCode] = useState('');
  const { setSelectedHousehold } = useHousehold();

  useEffect(() => {
    loadHouseholds();
  }, []);

  const loadHouseholds = async () => {
    // Paint any cached list synchronously so the login → select transition
    // has no empty state flash if the prefetch from AuthContext is already
    // in flight or done.
    const cached = getCached<Household[]>('households:list');
    if (cached) {
      setHouseholds(cached);
      setLoading(false);
    }
    try {
      const data = await dedupedFetch<Household[]>(
        'households:list',
        () => householdsApi.getHouseholds()
      );
      setHouseholds(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      Alert.alert(t('common.error'), err.response?.data?.error || t('alerts.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHousehold = async () => {
    if (!householdName.trim()) {
      Alert.alert(t('common.error'), t('household.householdName'));
      return;
    }

    try {
      const household = await householdsApi.createHousehold({
        name: householdName,
        address: householdAddress || undefined,
        currency: householdCurrency,
      });
      invalidateCache('households:list');
      setHouseholds([...households, household]);
      setCreateModalVisible(false);
      setHouseholdName('');
      setHouseholdAddress('');
      Alert.alert(
        t('common.success'),
        `${t('household.householdCreated')}! ${t('householdSettingsScreen.inviteCode')}: ${household.joinCode}`,
        [{ text: t('common.ok'), onPress: () => handleSelectHousehold(household) }]
      );
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      Alert.alert(t('common.error'), err.response?.data?.error || t('alerts.somethingWentWrong'));
    }
  };

  const handleJoinHousehold = async () => {
    if (!joinCode.trim()) {
      Alert.alert(t('common.error'), t('household.enterCode'));
      return;
    }

    try {
      const household = await householdsApi.joinHousehold({ joinCode: joinCode.trim().toUpperCase() });
      invalidateCache('households:list');
      setHouseholds([...households, household]);
      setJoinModalVisible(false);
      setJoinCode('');
      handleSelectHousehold(household);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      Alert.alert(t('common.error'), err.response?.data?.error || t('household.invalidCode'));
    }
  };

  const handleSelectHousehold = (household: Household) => {
    setSelectedHousehold(household);
    navigation.replace('Main');
  };

  return (
    <SanctuaryScreenShell edges={['top']} innerStyle={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <AppText style={styles.title} numberOfLines={1}>
              {t('household.selectHousehold')}
            </AppText>
            <AppText style={styles.subtitle}>{t('household.selectSubtitle')}</AppText>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings', { fromHouseholdSelect: true })}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Household list */}
        {households.length > 0 ? (
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>{t('household.yourHouseholds')}</AppText>
            {households.map((household) => (
              <HouseholdCard
                key={household._id}
                household={household}
                onPress={() => handleSelectHousehold(household)}
                copiedMessage={t('common.copied')}
                memberCountOne={t('household.memberCountOne')}
                memberCount={({ count }) => t('household.memberCount', { count })}
              />
            ))}
          </View>
        ) : loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.emptyBlock}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="home-outline" size={48} color={colors.primary} />
            </View>
            <AppText style={styles.emptyTitle}>{t('household.noHouseholds')}</AppText>
            <AppText style={styles.emptyMessage}>{t('household.noHouseholdsDescription')}</AppText>
          </View>
        )}

        {/* Actions section */}
        <View style={styles.actionsSection}>
          <AppText style={styles.actionsSectionTitle}>{t('household.createOrJoinSection')}</AppText>
          <PrimaryButton
            title={t('household.createHousehold')}
            onPress={() => setCreateModalVisible(true)}
            style={styles.primaryAction}
          />
          <PrimaryButton
            title={t('household.joinWithCode')}
            onPress={() => setJoinModalVisible(true)}
            variant="outline"
            style={styles.secondaryAction}
          />
        </View>
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              Keyboard.dismiss();
              setCreateModalVisible(false);
            }}
          />
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            pointerEvents="box-none"
          >
            <Pressable onPress={Keyboard.dismiss} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <AppText style={styles.modalTitle}>{t('household.createHousehold')}</AppText>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setCreateModalVisible(false)}
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <FormTextInput
                label={t('householdSettingsScreen.householdName')}
                value={householdName}
                onChangeText={setHouseholdName}
                placeholder="e.g., Alafaya Commons 203"
              />
              <FormTextInput
                label={t('household.householdLocation')}
                value={householdAddress}
                onChangeText={setHouseholdAddress}
                placeholder="Orlando, FL"
              />
              <View style={styles.currencyField}>
                <AppText style={styles.currencyLabel}>{t('currency.label')}</AppText>
                <CurrencyPicker
                  value={householdCurrency}
                  onChange={setHouseholdCurrency}
                />
                <AppText style={styles.currencyHint}>{t('currency.createHint')}</AppText>
              </View>
              <View style={styles.modalActions}>
                <PrimaryButton
                  title={t('common.cancel')}
                  onPress={() => setCreateModalVisible(false)}
                  variant="outline"
                  style={styles.modalButton}
                />
                <PrimaryButton
                  title={t('common.create')}
                  onPress={handleCreateHousehold}
                  style={styles.modalButton}
                />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Join Modal */}
      <Modal
        visible={joinModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              Keyboard.dismiss();
              setJoinModalVisible(false);
            }}
          />
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            pointerEvents="box-none"
          >
            <Pressable onPress={Keyboard.dismiss} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <AppText style={styles.modalTitle}>{t('household.joinHousehold')}</AppText>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setJoinModalVisible(false)}
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <FormTextInput
                label={t('householdSettingsScreen.inviteCode')}
                value={joinCode}
                onChangeText={(v) => setJoinCode(v.toUpperCase())}
                placeholder={t('household.enterCode')}
                autoCapitalize="characters"
              />
              <View style={styles.modalActions}>
                <PrimaryButton
                  title={t('common.cancel')}
                  onPress={() => setJoinModalVisible(false)}
                  variant="outline"
                  style={styles.modalButton}
                />
                <PrimaryButton
                  title={t('household.joinHousehold')}
                  onPress={handleJoinHousehold}
                  style={styles.modalButton}
                />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SanctuaryScreenShell>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>, isDark: boolean, insetBottom: number) => {
  const palette = isDark
    ? {
        heading: '#EEF3FF',
        body: '#BAC6DB',
        muted: '#8FA0BC',
        glassStrong: 'rgba(31, 40, 62, 0.74)',
        glassSoft: 'rgba(28, 36, 56, 0.58)',
        edge: 'rgba(255,255,255,0.08)',
        cardShadow: 'rgba(3, 8, 18, 0.6)',
        actionsGlow: colors.primary,
        modalOverlay: 'rgba(5,10,22,0.55)',
        successButton: colors.primary,
        successShadow: colors.primaryDark,
        outlineTint: colors.primary,
        outlineBg: 'rgba(28, 39, 63, 0.55)',
      }
    : {
        heading: '#333333',
        body: '#666666',
        muted: '#9AA3B2',
        glassStrong: 'rgba(255,255,255,0.86)',
        glassSoft: 'rgba(255,255,255,0.62)',
        edge: 'rgba(255,255,255,0.9)',
        cardShadow: 'rgba(0,0,0,0.07)',
        actionsGlow: colors.primary,
        modalOverlay: 'rgba(110,122,145,0.22)',
        successButton: colors.primary,
        successShadow: colors.primaryDark,
        outlineTint: colors.primary,
        outlineBg: 'rgba(255,255,255,0.55)',
      };

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scrollView: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: Math.max(spacing.xl, insetBottom + spacing.lg),
      backgroundColor: 'transparent',
    },
    header: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    headerTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 34,
      fontWeight: fontWeights.extrabold,
      color: palette.heading,
      letterSpacing: -0.8,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: fontSizes.sm,
      color: palette.body,
      lineHeight: 20,
    },
    settingsButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: palette.glassStrong,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: palette.cardShadow,
      shadowOpacity: isDark ? 0.45 : 0.06,
      shadowRadius: 18,
      shadowOffset: { width: 8, height: 8 },
      elevation: 7,
      borderWidth: 1,
      borderColor: palette.edge,
    },
    section: {
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.xxl,
    },
    sectionTitle: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: isDark ? palette.muted : colors.primaryDark,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: spacing.md,
    },
    loadingBlock: {
      paddingVertical: spacing.xxxl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyBlock: {
      alignItems: 'center',
      paddingVertical: spacing.xxxl,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.lg,
    },
    emptyIconWrap: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: isDark ? palette.glassStrong : colors.primaryUltraSoft,
      borderWidth: isDark ? 1 : 1,
      borderColor: isDark ? palette.edge : 'rgba(34, 197, 94, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      shadowColor: isDark ? palette.cardShadow : colors.primary,
      shadowOpacity: isDark ? 0.4 : 0.14,
      shadowRadius: 16,
      shadowOffset: { width: 8, height: 8 },
      elevation: 5,
    },
    emptyTitle: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: palette.heading,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    emptyMessage: {
      fontSize: fontSizes.md,
      color: palette.body,
      textAlign: 'center',
      lineHeight: 22,
    },
    actionsSection: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      marginTop: spacing.sm,
      backgroundColor: palette.glassSoft,
      borderRadius: 28,
      marginHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(74, 222, 128, 0.2)' : 'rgba(34, 197, 94, 0.18)',
      shadowColor: palette.actionsGlow,
      shadowOpacity: isDark ? 0.22 : 0.14,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    actionsSectionTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: palette.heading,
      marginBottom: spacing.md,
    },
    primaryAction: {
      marginBottom: spacing.sm,
      backgroundColor: palette.successButton,
      borderRadius: 22,
      shadowColor: palette.successShadow,
      shadowOpacity: isDark ? 0.4 : 0.28,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      borderWidth: 1,
      borderColor: palette.edge,
    },
    secondaryAction: {
      borderColor: palette.outlineTint,
      borderWidth: 2,
      borderRadius: 22,
      backgroundColor: palette.outlineBg,
      shadowColor: palette.actionsGlow,
      shadowOpacity: isDark ? 0.2 : 0.15,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: palette.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalKeyboard: {
      width: '100%',
      maxWidth: 400,
    },
    modalContent: {
      backgroundColor: palette.glassStrong,
      borderRadius: 28,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: palette.edge,
      shadowColor: palette.cardShadow,
      shadowOpacity: isDark ? 0.45 : 0.06,
      shadowRadius: 20,
      shadowOffset: { width: 10, height: 10 },
      elevation: 8,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xl,
    },
    modalTitle: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: palette.heading,
    },
    modalClose: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: palette.glassSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currencyField: {
      marginTop: spacing.md,
    },
    currencyLabel: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: palette.body,
      marginBottom: spacing.xs,
    },
    currencyHint: {
      fontSize: fontSizes.xs,
      color: palette.muted,
      marginTop: spacing.xs,
      lineHeight: 16,
    },
    modalActions: {
      flexDirection: 'column',
      marginTop: spacing.lg,
      gap: spacing.md,
    },
    modalButton: {
      alignSelf: 'stretch',
    },
  });
};
