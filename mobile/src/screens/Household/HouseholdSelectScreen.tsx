import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Localization from 'expo-localization';
import { householdsApi, Household } from '../../api/householdsApi';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage } from '../../context/LanguageContext';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormTextInput } from '../../components/FormTextInput';
import { HouseholdCard } from '../../components/Household/HouseholdCard';
import { CurrencyPicker } from '../../components/CurrencyPicker';
import { guessDefaultCurrencyFromLocale } from '../../constants/currencies';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../../theme';
import { AppText } from '../../components/AppText';

export const HouseholdSelectScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
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
    try {
      const data = await householdsApi.getHouseholds();
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <AppText style={styles.title}>{t('household.selectHousehold')}</AppText>
            <AppText style={styles.subtitle}>{t('household.selectSubtitle')}</AppText>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings', { fromHouseholdSelect: true })}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
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
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCreateModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
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
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Join Modal */}
      <Modal
        visible={joinModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setJoinModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
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
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
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
      paddingBottom: spacing.xxl,
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
      fontSize: fontSizes.xxl,
      fontWeight: fontWeights.extrabold,
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    settingsButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.xs as object),
    },
    section: {
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.xxl,
    },
    sectionTitle: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.textTertiary,
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
      backgroundColor: colors.primaryUltraSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    emptyTitle: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    emptyMessage: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    actionsSection: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    actionsSectionTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    primaryAction: {
      marginBottom: spacing.sm,
    },
    secondaryAction: {},
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalKeyboard: {
      width: '100%',
      maxWidth: 400,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.lg as object),
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
      color: colors.text,
    },
    modalClose: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currencyField: {
      marginTop: spacing.md,
    },
    currencyLabel: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    currencyHint: {
      fontSize: fontSizes.xs,
      color: colors.textTertiary,
      marginTop: spacing.xs,
      lineHeight: 16,
    },
    modalActions: {
      flexDirection: 'row',
      marginTop: spacing.lg,
      gap: spacing.md,
    },
    modalButton: {
      flex: 1,
    },
  });
