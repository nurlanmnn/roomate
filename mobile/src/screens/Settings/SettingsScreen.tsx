import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { householdsApi } from '../../api/householdsApi';
import { PrimaryButton } from '../../components/PrimaryButton';
import * as Sharing from 'expo-sharing';

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout, refreshUser } = useAuth();
  const { selectedHousehold, setSelectedHousehold } = useHousehold();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (selectedHousehold && user) {
      setIsOwner(selectedHousehold.ownerId === user._id);
    }
  }, [selectedHousehold, user]);

  useEffect(() => {
    refreshUser();
  }, []);

  const handleCopyCode = async () => {
    if (selectedHousehold) {
      await Clipboard.setStringAsync(selectedHousehold.joinCode);
      Alert.alert('Copied', 'Join code copied to clipboard');
    }
  };

  const handleShareCode = async () => {
    if (!selectedHousehold) return;

    const message = `Join my household "${selectedHousehold.name}" using code: ${selectedHousehold.joinCode}`;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(message);
      } else {
        Alert.alert('Share', message);
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleSwitchHousehold = () => {
    navigation.getParent()?.navigate('HouseholdSelect');
  };

  const handleLeaveHousehold = async () => {
    if (!selectedHousehold) return;

    Alert.alert('Leave Household', 'Are you sure you want to leave this household?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await householdsApi.leaveHousehold(selectedHousehold._id);
            setSelectedHousehold(null);
            navigation.getParent()?.navigate('HouseholdSelect');
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to leave household');
          }
        },
      },
    ]);
  };

  const handleResendVerification = async () => {
    if (!user || !user.email) return;

    try {
      const { authApi } = await import('../../api/authApi');
      await authApi.resendVerification(user.email);
      Alert.alert('Success', 'Verification email sent');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send verification email');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          // AppNavigator will automatically switch to AuthNavigator when user becomes null
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{user?.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email Verified</Text>
          <Text style={[styles.infoValue, !user?.isEmailVerified && styles.unverified]}>
            {user?.isEmailVerified ? 'Yes' : 'No'}
          </Text>
        </View>
        {!user?.isEmailVerified && (
          <PrimaryButton
            title="Resend Verification Email"
            onPress={handleResendVerification}
          />
        )}
      </View>

      {selectedHousehold && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Household</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{selectedHousehold.name}</Text>
          </View>
          {selectedHousehold.address && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{selectedHousehold.address}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Join Code</Text>
            <Text style={styles.infoValue}>{selectedHousehold.joinCode}</Text>
          </View>
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.codeButton} onPress={handleCopyCode}>
              <Text style={styles.codeButtonText}>Copy Code</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.codeButton} onPress={handleShareCode}>
              <Text style={styles.codeButtonText}>Share Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <PrimaryButton
          title="Switch Household"
          onPress={handleSwitchHousehold}
        />
        {selectedHousehold && !isOwner && (
          <>
            <View style={styles.spacer} />
            <PrimaryButton
              title="Leave Household"
              onPress={handleLeaveHousehold}
            />
          </>
        )}
        {selectedHousehold && isOwner && (
          <Text style={styles.ownerNote}>
            Note: Owners cannot leave the household
          </Text>
        )}
        <View style={styles.spacer} />
        <PrimaryButton
          title="Log Out"
          onPress={handleLogout}
        />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  unverified: {
    color: '#f44336',
  },
  codeActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  codeButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    alignItems: 'center',
  },
  codeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  ownerNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  spacer: {
    height: 12,
  },
});

