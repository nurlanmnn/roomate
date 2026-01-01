import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { householdsApi } from '../../api/householdsApi';
import { authApi } from '../../api/authApi';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormTextInput } from '../../components/FormTextInput';
import * as Sharing from 'expo-sharing';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme';
import { Avatar } from '../../components/ui/Avatar';

export const SettingsScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const { user, logout, refreshUser } = useAuth();
  const { selectedHousehold, setSelectedHousehold } = useHousehold();
  const [isOwner, setIsOwner] = useState(false);
  
  // Check if Settings was accessed from HouseholdSelectScreen (not from within a household)
  const fromHouseholdSelect = route?.params?.fromHouseholdSelect || false;
  // Only show household options if we have a household AND we're not coming from HouseholdSelectScreen
  const showHouseholdOptions = selectedHousehold && !fromHouseholdSelect;
  
  // Account settings state
  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl || null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (selectedHousehold && user) {
      setIsOwner(selectedHousehold.ownerId === user._id);
    }
  }, [selectedHousehold, user]);

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatarUri(user.avatarUrl || null);
    }
  }, [user]);

  const canSaveName = useMemo(() => {
    const trimmed = name.trim();
    return !!user && trimmed.length > 0 && trimmed !== user.name;
  }, [name, user]);

  const canSaveAvatar = useMemo(() => {
    return !!user && !!avatarUri && avatarUri !== (user.avatarUrl || '');
  }, [avatarUri, user]);

  const canChangePassword = useMemo(() => {
    return currentPassword.length > 0 && newPassword.length >= 8;
  }, [currentPassword, newPassword]);

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

  const handleSaveName = async () => {
    if (!canSaveName) return;
    try {
      setSavingName(true);
      await authApi.updateProfile({ name: name.trim() });
      await refreshUser();
      Alert.alert('Saved', 'Your name has been updated.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to select a photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          let mimeType = 'image/jpeg';
          const uriLower = asset.uri.toLowerCase();
          if (uriLower.includes('.png')) {
            mimeType = 'image/png';
          } else if (uriLower.includes('.gif')) {
            mimeType = 'image/gif';
          } else if (uriLower.includes('.webp')) {
            mimeType = 'image/webp';
          }
          const base64DataUrl = `data:${mimeType};base64,${asset.base64}`;
          setAvatarUri(base64DataUrl);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSaveAvatar = async () => {
    if (!canSaveAvatar || !avatarUri) return;
    try {
      setSavingAvatar(true);
      await authApi.updateProfile({ avatarUrl: avatarUri });
      await refreshUser();
      Alert.alert('Saved', 'Your profile photo has been updated.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update profile photo');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    if (!canChangePassword) {
      Alert.alert('Error', 'New password must be at least 8 characters.');
      return;
    }

    Alert.alert(
      'Change Password',
      'Are you sure you want to change your password?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          style: 'destructive',
          onPress: async () => {
            try {
              setChangingPassword(true);
              await authApi.changePassword({ currentPassword, newPassword });
              setCurrentPassword('');
              setNewPassword('');
              Alert.alert('Success', 'Password changed.');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to change password');
            } finally {
              setChangingPassword(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Error', 'Please enter your password to confirm.');
      return;
    }

    Alert.alert(
      'Delete Account',
      'This will permanently delete your account. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await authApi.deleteAccount({ password: deletePassword });
              await logout();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete account');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.avatarRow}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7}>
            <View style={styles.avatarContainer}>
              {avatarUri && avatarUri !== user?.avatarUrl ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarPreview} />
              ) : (
                <Avatar name={user?.name} uri={user?.avatarUrl} size={52} />
              )}
              <View style={styles.avatarOverlay}>
                <Text style={styles.avatarOverlayText}>📷</Text>
              </View>
            </View>
          </TouchableOpacity>
          <View style={styles.avatarMeta}>
            <Text style={styles.avatarName}>{user?.name}</Text>
            <Text style={styles.avatarEmail}>{user?.email}</Text>
          </View>
        </View>
        {avatarUri && avatarUri !== user?.avatarUrl && (
          <PrimaryButton
            title="Save Photo"
            onPress={handleSaveAvatar}
            disabled={!canSaveAvatar}
            loading={savingAvatar}
            variant="secondary"
          />
        )}
        {(!avatarUri || avatarUri === user?.avatarUrl) && (
          <PrimaryButton
            title="Change Photo"
            onPress={handlePickImage}
            variant="secondary"
          />
        )}
        <View style={styles.spacer} />
        <FormTextInput
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          autoCapitalize="words"
        />
        <PrimaryButton 
          title="Save Name" 
          onPress={handleSaveName} 
          disabled={!canSaveName} 
          loading={savingName}
          variant="secondary"
        />
        {!user?.isEmailVerified && (
          <>
            <View style={styles.spacer} />
            <PrimaryButton
              title="Resend Verification Email"
              onPress={handleResendVerification}
              variant="secondary"
            />
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Change Password</Text>
        <FormTextInput
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          secureTextEntry
        />
        <FormTextInput
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password (min 6 chars)"
          secureTextEntry
        />
        <PrimaryButton
          title="Change Password"
          onPress={handleChangePassword}
          disabled={!canChangePassword}
          loading={changingPassword}
          variant="secondary"
        />
      </View>

      <View style={[styles.section, styles.dangerSection]}>
        <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
        <Text style={styles.dangerText}>
          To delete your account, confirm your password. If you own a household, you must transfer/delete it first.
        </Text>
        <FormTextInput
          label="Password"
          value={deletePassword}
          onChangeText={setDeletePassword}
          placeholder="Password"
          secureTextEntry
        />
        <PrimaryButton 
          title="Delete Account" 
          onPress={handleDeleteAccount} 
          loading={deleting}
          variant="secondary"
        />
      </View>

      {showHouseholdOptions && (
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
                  <Avatar name={m.name} uri={m.avatarUrl} size={40} />
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
        {showHouseholdOptions && (
          <>
            <PrimaryButton
              title="Switch Household"
              onPress={handleSwitchHousehold}
            />
            {!isOwner && (
              <>
                <View style={styles.spacer} />
                <PrimaryButton
                  title="Leave Household"
                  onPress={handleLeaveHousehold}
                />
              </>
            )}
            {isOwner && (
              <Text style={styles.ownerNote}>
                Note: Owners cannot leave the household
              </Text>
            )}
            <View style={styles.spacer} />
          </>
        )}
        <PrimaryButton
          title="Log Out"
          onPress={handleLogout}
        />
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarPreview: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlayText: {
    fontSize: 12,
  },
  dangerSection: {
    borderColor: '#ffdddd',
  },
  dangerTitle: {
    color: '#b00020',
  },
  dangerText: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
    fontSize: fontSizes.sm,
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
    gap: spacing.md,
  },
  memberLeft: {
    flex: 1,
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

