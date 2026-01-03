import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import { Avatar } from '../../components/ui/Avatar';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme';

export const AccountSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, refreshUser, logout } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl || null);
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
    return !!user && !!avatarUri && avatarUri !== (user.avatarUrl || '');
  }, [avatarUri, user]);

  const canChangePassword = useMemo(() => {
    return currentPassword.length > 0 && newPassword.length >= 8;
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

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      // Use expo-file-system to read the file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any,
      });
      
      // Determine the MIME type from the file extension or use a default
      let mimeType = 'image/jpeg';
      if (uri.toLowerCase().endsWith('.png')) {
        mimeType = 'image/png';
      } else if (uri.toLowerCase().endsWith('.gif')) {
        mimeType = 'image/gif';
      } else if (uri.toLowerCase().endsWith('.webp')) {
        mimeType = 'image/webp';
      }
      
      // Return as data URL
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('Error converting image:', error);
      throw new Error('Failed to convert image to base64');
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to select a photo.');
        return;
      }

      // Launch image picker with base64 option
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true, // Get base64 directly from ImagePicker to avoid deprecated FileSystem API
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Use base64 from ImagePicker if available
        if (asset.base64) {
          // Determine MIME type from URI
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
        } else {
          // Fallback to file system conversion (using legacy API)
          const base64DataUrl = await convertImageToBase64(asset.uri);
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Account Settings</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <View style={styles.avatarRow}>
              <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7}>
                <View style={styles.avatarContainer}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarPreview} />
                  ) : (
                    <Avatar name={user?.name} uri={user?.avatarUrl} size={72} />
                  )}
                  <View style={styles.avatarOverlay}>
                    <Text style={styles.avatarOverlayText}>📷</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <View style={styles.avatarInfo}>
                <Text style={styles.avatarName}>{user?.name}</Text>
                <Text style={styles.avatarEmail}>{user?.email}</Text>
              </View>
            </View>
            <Text style={styles.helperText}>
              Tap the photo to select a new profile picture from your device
            </Text>
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

const createStyles = (colors: any) => StyleSheet.create({
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
  avatarContainer: {
    position: 'relative',
  },
  avatarPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlayText: {
    fontSize: 14,
  },
  helperText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  spacer: {
    height: spacing.md,
  },
});


