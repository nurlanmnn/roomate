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
  AccessibilityInfo,
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
import { useThemeColors, fonts, fontSizes, fontWeights, radii, spacing } from '../../theme';
import { AppText } from '../../components/AppText';
import { EnamelHeader, HeaderIconButton } from '../../components/ui/EnamelHeader';
import { Sheet } from '../../components/ui/Sheet';
import { Group, GroupRow, SectionHeading } from '../../components/ui/Group';
import { EmptyState } from '../../components/ui/EmptyState';
import { getCached, dedupedFetch, invalidateCache } from '../../utils/queryCache';

export const HouseholdSelectScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const styles = React.useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const [reduceMotion, setReduceMotion] = useState(true);
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

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
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
    // Reset rather than replace: Home pushes this screen on top of the old Main,
    // and replacing would leave the previous household's tabs mounted underneath.
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  return (
    <SanctuaryScreenShell edges={[]} innerStyle={styles.safeArea}>
      <EnamelHeader
        leading={<View>
          <AppText accessibilityRole="header" style={styles.title}>{t('household.selectHousehold')}</AppText>
          <AppText style={styles.subtitle}>{t('household.selectSubtitle')}</AppText>
        </View>}
        right={<HeaderIconButton icon="settings-outline"
          accessibilityLabel={t('settings.title')}
          onPress={() => navigation.navigate('Settings', { fromHouseholdSelect: true })} />}
      />
      <Sheet>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Household list */}
          {households.length > 0 ? (
            <View style={styles.section}>
              <SectionHeading title={t('household.yourHouseholds')} style={styles.sectionHeading} />
              <Group style={styles.householdGroup}>
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
              </Group>
            </View>
          ) : loading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <EmptyState variant="minimal" icon="home-outline"
              title={t('household.noHouseholds')}
              message={t('household.noHouseholdsDescription')} />
          )}

          {/* Actions section */}
          <View style={styles.actionsSection}>
            <SectionHeading title={t('household.createOrJoinSection')} style={styles.sectionHeading} />
            <Group style={styles.householdGroup}>
              <GroupRow title={t('household.createHousehold')} action titleLines={0}
                trailing={<Ionicons name="add" size={22} color={colors.primary} />}
                onPress={() => setCreateModalVisible(true)} />
              <GroupRow title={t('household.joinWithCode')} action titleLines={0}
                trailing={<Ionicons name="enter-outline" size={22} color={colors.primary} />}
                onPress={() => setJoinModalVisible(true)} />
            </Group>
          </View>
        </ScrollView>
      </Sheet>

      {/* Create Modal */}
      <Modal
        visible={createModalVisible}
        animationType={reduceMotion ? 'none' : 'fade'}
        transparent
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
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
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalScroll}>
              <Pressable accessible={false} accessibilityRole="button" accessibilityViewIsModal onPress={Keyboard.dismiss} style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <AppText accessibilityRole="header" style={styles.modalTitle}>{t('household.createHousehold')}</AppText>
                  <TouchableOpacity
                    style={styles.modalClose}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.cancel')}
                    onPress={() => setCreateModalVisible(false)}
                  >
                    <Ionicons name="close-outline" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <FormTextInput
                  label={t('householdSettingsScreen.householdName')}
                  value={householdName}
                  onChangeText={setHouseholdName}
                  placeholder={t('household.householdName')}
                />
                <FormTextInput
                  label={t('household.householdLocation')}
                  value={householdAddress}
                  onChangeText={setHouseholdAddress}
                  placeholder={t('household.householdLocation')}
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
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Join Modal */}
      <Modal
        visible={joinModalVisible}
        animationType={reduceMotion ? 'none' : 'fade'}
        transparent
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
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
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalScroll}>
              <Pressable accessible={false} accessibilityRole="button" accessibilityViewIsModal onPress={Keyboard.dismiss} style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <AppText accessibilityRole="header" style={styles.modalTitle}>{t('household.joinHousehold')}</AppText>
                  <TouchableOpacity
                    style={styles.modalClose}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.cancel')}
                    onPress={() => setJoinModalVisible(false)}
                  >
                    <Ionicons name="close-outline" size={22} color={colors.textSecondary} />
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
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SanctuaryScreenShell>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>, insetBottom: number) => StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingTop: spacing.xl, paddingBottom: Math.max(spacing.xl, insetBottom + spacing.lg) },
  title: { fontFamily: fonts.displayExtrabold, fontSize: 34, color: colors.onEnamel },
  subtitle: { fontSize: fontSizes.sm, color: colors.onEnamelSecondary, marginTop: spacing.xs },
  section: { paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  sectionHeading: { paddingTop: 0, paddingHorizontal: spacing.xxs },
  loadingBlock: { paddingVertical: spacing.xxxl, alignItems: 'center', justifyContent: 'center' },
  actionsSection: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  householdGroup: { marginHorizontal: 0 },
  modalOverlay: { flex: 1, backgroundColor: colors.shadowStrong, justifyContent: 'flex-end' },
  modalKeyboard: { width: '100%', maxHeight: '95%' },
  modalScroll: { flexGrow: 0 },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, paddingBottom: insetBottom + spacing.xl },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, justifyContent: 'space-between', marginBottom: spacing.lg },
  modalTitle: { flex: 1, fontSize: 20, fontWeight: fontWeights.bold, color: colors.text, paddingTop: spacing.xs },
  modalClose: { minWidth: 44, minHeight: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  currencyField: { marginTop: spacing.md },
  currencyLabel: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textSecondary, marginBottom: spacing.xs },
  currencyHint: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.xs },
  modalActions: { flexDirection: 'column', marginTop: spacing.lg, gap: spacing.sm },
  modalButton: { alignSelf: 'stretch' },
});
