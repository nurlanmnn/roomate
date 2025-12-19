import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import { Avatar } from '../../components/ui/Avatar';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme';

export const AccountSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, refreshUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [savingAvatar, setSavingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canSaveName = useMemo(() => {
    const trimmed = name.trim();
    return !!user && trimmed.length > 0 && trimmed !== user.name;
  }, [name, user]);

  const canSaveAvatar = useMemo(() => {
    const trimmed = avatarUrl.trim();
    return !!user && trimmed.length > 0 && trimmed !== (user.avatarUrl || '');
  }, [avatarUrl, user]);

  const canChangePassword = useMemo(() => {
    return currentPassword.length > 0 && newPassword.length >= 6;
  }, [currentPassword, newPassword]);

  const handleSaveName = async () => {
    if (!canSaveName) return;
    try {
      setSavingName(true);
      await authApi.updateProfile({ name: name.trim() });
      await refreshUser();
      Alert.alert('Saved', 'Your name has been updated.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveAvatar = async () => {
    if (!canSaveAvatar) return;
    try {
      setSavingAvatar(true);
      await authApi.updateProfile({ avatarUrl: avatarUrl.trim() });
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
      Alert.alert('Error', 'New password must be at least 6 characters.');
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Account Settings</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <View style={styles.avatarRow}>
              <Avatar name={user?.name} uri={user?.avatarUrl} size={72} />
              <View style={styles.avatarInfo}>
                <Text style={styles.avatarName}>{user?.name}</Text>
                <Text style={styles.avatarEmail}>{user?.email}</Text>
              </View>
            </View>
            <FormTextInput
              label="Profile Photo URL"
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="https://..."
              autoCapitalize="none"
              helperText="Paste a direct image URL (png/jpg). We'll show it as your avatar."
            />
            <PrimaryButton
              title="Save Photo"
              onPress={handleSaveAvatar}
              disabled={!canSaveAvatar}
              loading={savingAvatar}
              variant="secondary"
            />
            <View style={styles.spacer} />
            <FormTextInput
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoCapitalize="words"
            />
            <PrimaryButton title="Save Name" onPress={handleSaveName} disabled={!canSaveName} loading={savingName} />
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
            <PrimaryButton title="Delete Account" onPress={handleDeleteAccount} loading={deleting} />
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
  content: {
    padding: spacing.md,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  section: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...(shadows.sm as object),
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
    marginBottom: spacing.md,
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
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatarInfo: {
    flex: 1,
  },
  avatarName: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
  },
  avatarEmail: {
    marginTop: spacing.xxs,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  spacer: {
    height: spacing.md,
  },
});


