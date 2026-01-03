import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { householdsApi, Household } from '../../api/householdsApi';
import { useHousehold } from '../../context/HouseholdContext';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormTextInput } from '../../components/FormTextInput';
import { EmptyState } from '../../components/ui/EmptyState';
import { useThemeColors, spacing } from '../../theme';
import { AppText } from '../../components/AppText';

export const HouseholdSelectScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const colors = useThemeColors();
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
      Alert.alert('Error', error.response?.data?.error || 'Failed to load households');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHousehold = async () => {
    if (!householdName.trim()) {
      Alert.alert('Error', 'Please enter a household name');
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
      Alert.alert('Success', `Household created! Join code: ${household.joinCode}`, [
        { text: 'OK', onPress: () => handleSelectHousehold(household) },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create household');
    }
  };

  const handleJoinHousehold = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Error', 'Please enter a join code');
      return;
    }

    try {
      const household = await householdsApi.joinHousehold({ joinCode: joinCode.toUpperCase() });
      setHouseholds([...households, household]);
      setJoinModalVisible(false);
      setJoinCode('');
      handleSelectHousehold(household);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Invalid join code');
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
        <AppText style={styles.title}>Select Household</AppText>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings', { fromHouseholdSelect: true })}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {households.length > 0 ? (
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Your Households</AppText>
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
              <AppText style={styles.joinCode}>Code: {household.joinCode}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      ) : !loading ? (
        <View style={styles.emptyStateContainer}>
          <EmptyState
            icon="home-outline"
            title="No Household Yet"
            message="You're not part of any household. Create a new one or join an existing household using a code."
            variant="minimal"
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton
          title="Create New Household"
          onPress={() => setCreateModalVisible(true)}
          style={styles.actionButton}
        />
        <PrimaryButton
          title="Join Household with Code"
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
            <AppText style={styles.modalTitle}>Create Household</AppText>
            <FormTextInput
              label="Name"
              value={householdName}
              onChangeText={setHouseholdName}
              placeholder="e.g., Alafaya Commons 203"
            />
            <FormTextInput
              label="Address (Optional)"
              value={householdAddress}
              onChangeText={setHouseholdAddress}
              placeholder="Orlando, FL"
            />
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Cancel"
                onPress={() => setCreateModalVisible(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <View style={styles.buttonSpacer} />
              <PrimaryButton
                title="Create"
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
            <AppText style={styles.modalTitle}>Join Household</AppText>
            <FormTextInput
              label="Join Code"
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="Enter 6-character code"
            />
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Cancel"
                onPress={() => setJoinModalVisible(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <View style={styles.buttonSpacer} />
              <PrimaryButton
                title="Join"
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

