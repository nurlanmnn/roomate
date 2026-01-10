import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { householdsApi, Household } from '../../api/householdsApi';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage } from '../../context/LanguageContext';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormTextInput } from '../../components/FormTextInput';
import { EmptyState } from '../../components/ui/EmptyState';
import { useThemeColors, spacing } from '../../theme';
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
  const [joinCode, setJoinCode] = useState('');
  const { setSelectedHousehold } = useHousehold();

  useEffect(() => {
    loadHouseholds();
  }, []);

  const loadHouseholds = async () => {
    try {
      const data = await householdsApi.getHouseholds();
      setHouseholds(data);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
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
      });
      setHouseholds([...households, household]);
      setCreateModalVisible(false);
      setHouseholdName('');
      setHouseholdAddress('');
      Alert.alert(t('common.success'), `${t('household.householdCreated')}! ${t('householdSettingsScreen.inviteCode')}: ${household.joinCode}`, [
        { text: t('common.ok'), onPress: () => handleSelectHousehold(household) },
      ]);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
    }
  };

  const handleJoinHousehold = async () => {
    if (!joinCode.trim()) {
      Alert.alert(t('common.error'), t('household.enterCode'));
      return;
    }

    try {
      const household = await householdsApi.joinHousehold({ joinCode: joinCode.toUpperCase() });
      setHouseholds([...households, household]);
      setJoinModalVisible(false);
      setJoinCode('');
      handleSelectHousehold(household);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('household.invalidCode'));
    }
  };

  const handleSelectHousehold = (household: Household) => {
    setSelectedHousehold(household);
    // Navigate to Main tabs after selecting household
    navigation.replace('Main');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView}>
      <View style={styles.header}>
        <AppText style={styles.title}>{t('household.selectHousehold')}</AppText>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings', { fromHouseholdSelect: true })}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {households.length > 0 ? (
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>{t('household.yourHouseholds')}</AppText>
          {households.map((household) => (
            <TouchableOpacity
              key={household._id}
              style={styles.householdCard}
              onPress={() => handleSelectHousehold(household)}
            >
              <AppText style={styles.householdName}>{household.name}</AppText>
              {household.address && (
                <AppText style={styles.householdAddress}>{household.address}</AppText>
              )}
              <AppText style={styles.joinCode}>{t('householdSettingsScreen.inviteCode')}: {household.joinCode}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      ) : !loading ? (
        <View style={styles.emptyStateContainer}>
          <EmptyState
            icon="home-outline"
            title={t('household.noHouseholds')}
            message={t('household.createOrJoin')}
            variant="minimal"
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton
          title={t('household.createHousehold')}
          onPress={() => setCreateModalVisible(true)}
          style={styles.actionButton}
        />
        <PrimaryButton
          title={t('household.joinWithCode')}
          onPress={() => setJoinModalVisible(true)}
          variant="secondary"
          style={styles.actionButton}
        />
      </View>

      {/* Create Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <AppText style={styles.modalTitle}>{t('household.createHousehold')}</AppText>
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
            <View style={styles.modalActions}>
              <PrimaryButton
                title={t('common.cancel')}
                onPress={() => setCreateModalVisible(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <View style={styles.buttonSpacer} />
              <PrimaryButton
                title={t('common.create')}
                onPress={handleCreateHousehold}
                style={styles.modalButton}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Join Modal */}
      <Modal
        visible={joinModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <AppText style={styles.modalTitle}>{t('household.joinHousehold')}</AppText>
            <FormTextInput
              label={t('householdSettingsScreen.inviteCode')}
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder={t('household.enterCode')}
            />
            <View style={styles.modalActions}>
              <PrimaryButton
                title={t('common.cancel')}
                onPress={() => setJoinModalVisible(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <View style={styles.buttonSpacer} />
              <PrimaryButton
                title={t('household.joinHousehold')}
                onPress={handleJoinHousehold}
                style={styles.modalButton}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  settingsButton: {
    padding: 8,
    marginLeft: spacing.md,
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: colors.text,
  },
  householdCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  householdName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.text,
  },
  householdAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  joinCode: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  actions: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  actionButton: {
    marginBottom: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xl,
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
  buttonSpacer: {
    width: spacing.md,
  },
  emptyStateContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
});

