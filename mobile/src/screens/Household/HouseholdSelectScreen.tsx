import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { householdsApi, Household } from '../../api/householdsApi';
import { useHousehold } from '../../context/HouseholdContext';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormTextInput } from '../../components/FormTextInput';

export const HouseholdSelectScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
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
    navigation.navigate('Main');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Household</Text>
      </View>

      {households.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Households</Text>
          {households.map((household) => (
            <TouchableOpacity
              key={household._id}
              style={styles.householdCard}
              onPress={() => handleSelectHousehold(household)}
            >
              <Text style={styles.householdName}>{household.name}</Text>
              {household.address && (
                <Text style={styles.householdAddress}>{household.address}</Text>
              )}
              <Text style={styles.joinCode}>Code: {household.joinCode}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <PrimaryButton
          title="Create New Household"
          onPress={() => setCreateModalVisible(true)}
        />
        <View style={styles.spacer} />
        <PrimaryButton
          title="Join Household with Code"
          onPress={() => setJoinModalVisible(true)}
        />
      </View>

      {/* Create Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Household</Text>
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
              />
              <View style={styles.spacer} />
              <PrimaryButton
                title="Create"
                onPress={handleCreateHousehold}
              />
            </View>
          </View>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Household</Text>
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
              />
              <View style={styles.spacer} />
              <PrimaryButton
                title="Join"
                onPress={handleJoinHousehold}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  householdCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  householdName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  householdAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  joinCode: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    padding: 24,
  },
  spacer: {
    height: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
});

