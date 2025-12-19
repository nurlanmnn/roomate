import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { householdsApi } from '../../api/householdsApi';
import { PrimaryButton } from '../../components/PrimaryButton';
import * as Sharing from 'expo-sharing';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme';
import { Avatar } from '../../components/ui/Avatar';

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
        <View style={styles.avatarRow}>
          <Avatar name={user?.name} uri={user?.avatarUrl} size={52} />
          <View style={styles.avatarMeta}>
            <Text style={styles.avatarName}>{user?.name}</Text>
            <Text style={styles.avatarEmail}>{user?.email}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{user?.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>
        {!user?.isEmailVerified && (
          <PrimaryButton
            title="Resend Verification Email"
            onPress={handleResendVerification}
          />
        )}
        <View style={styles.spacer} />
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.getParent()?.navigate('AccountSettings')}
        >
          <Text style={styles.linkRowText}>Account Settings</Text>
          <Text style={styles.linkRowChevron}>›</Text>
        </TouchableOpacity>
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

          <View style={styles.membersSection}>
            <Text style={styles.membersTitle}>Members</Text>
            {selectedHousehold.members.map((m) => {
              const isOwnerMember = m._id === selectedHousehold.ownerId;
              return (
                <View key={m._id} style={styles.memberRow}>
                  <View style={styles.memberLeft}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <Text style={styles.memberEmail}>{m.email}</Text>
                  </View>
                  {isOwnerMember && (
                    <View style={styles.ownerBadge}>
                      <Text style={styles.ownerBadgeText}>Owner</Text>
                    </View>
                  )}
                </View>
              );
            })}
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
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
  },
  section: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadows.sm as object),
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.md,
    color: colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  unverified: {
    color: colors.danger,
  },
  linkRow: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
  },
  linkRowText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  linkRowChevron: {
    fontSize: 22,
    color: colors.muted,
    marginLeft: spacing.md,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.md,
  },
  codeButton: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  codeButtonText: {
    color: colors.surface,
    fontWeight: fontWeights.semibold,
  },
  membersSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  membersTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  memberName: {
    fontSize: 15,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  memberEmail: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  ownerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ownerBadgeText: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.primaryDark,
  },
  ownerNote: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  spacer: {
    height: spacing.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarMeta: {
    flex: 1,
  },
  avatarName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
  },
  avatarEmail: {
    marginTop: spacing.xxs,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
});

