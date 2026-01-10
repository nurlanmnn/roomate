import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, TouchableOpacity, Image, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { authApi } from '../../api/authApi';
import { Avatar } from '../../components/ui/Avatar';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme';

export const AccountSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, refreshUser, logout } = useAuth();
  const { t } = useLanguage();
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const inputPositions = useRef<Record<string, number>>({});

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleInputLayout = (inputName: string, y: number) => {
    inputPositions.current[inputName] = y;
  };

  const scrollToInput = (inputName: string) => {
    const y = inputPositions.current[inputName];
    if (y !== undefined && scrollViewRef.current) {
      // Scroll so the input is roughly in the upper third of the screen
      scrollViewRef.current.scrollTo({ y: Math.max(0, y - 150), animated: true });
    }
  };

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
      Alert.alert(t('common.success'), t('accountSettingsScreen.profileUpdated'));
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
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
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.content} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity activeOpacity={1} onPress={Keyboard.dismiss}>
            <Text style={styles.title}>{t('accountSettingsScreen.title')}</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('accountSettingsScreen.profileSection')}</Text>
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
              {t('accountSettingsScreen.changeAvatar')}
            </Text>
            {avatarUri && avatarUri !== user?.avatarUrl && (
              <PrimaryButton
                title={t('common.save')}
                onPress={handleSaveAvatar}
                disabled={!canSaveAvatar}
                loading={savingAvatar}
                variant="secondary"
              />
            )}
            {(!avatarUri || avatarUri === user?.avatarUrl) && (
              <PrimaryButton
                title={t('accountSettingsScreen.changeAvatar')}
                onPress={handlePickImage}
                variant="secondary"
              />
            )}
            <View style={styles.spacer} />
            <View onLayout={(e) => handleInputLayout('name', e.nativeEvent.layout.y)}>
              <FormTextInput
                label={t('accountSettingsScreen.name')}
                value={name}
                onChangeText={setName}
                placeholder={t('accountSettingsScreen.name')}
                autoCapitalize="words"
                onFocus={() => scrollToInput('name')}
              />
            </View>
            <PrimaryButton title={t('common.save')} onPress={handleSaveName} disabled={!canSaveName} loading={savingName} />
          </View>

          <View 
            style={styles.section}
            onLayout={(e) => {
              // Store base Y of the password section
              const baseY = e.nativeEvent.layout.y;
              handleInputLayout('currentPassword', baseY + 60);
              handleInputLayout('newPassword', baseY + 140);
            }}
          >
            <Text style={styles.sectionTitle}>{t('accountSettingsScreen.changePassword')}</Text>
            <FormTextInput
              label={t('accountSettingsScreen.currentPassword')}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={t('accountSettingsScreen.currentPassword')}
              secureTextEntry
              onFocus={() => scrollToInput('currentPassword')}
            />
            <FormTextInput
              label={t('accountSettingsScreen.newPassword')}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('accountSettingsScreen.newPassword')}
              secureTextEntry
              onFocus={() => scrollToInput('newPassword')}
            />
            <PrimaryButton
              title={t('accountSettingsScreen.changePassword')}
              onPress={handleChangePassword}
              disabled={!canChangePassword}
              loading={changingPassword}
            />
          </View>

          <View 
            style={[styles.section, styles.dangerSection]}
            onLayout={(e) => handleInputLayout('deletePassword', e.nativeEvent.layout.y + 80)}
          >
            <Text style={[styles.sectionTitle, styles.dangerTitle]}>{t('accountSettingsScreen.dangerZone')}</Text>
            <Text style={styles.dangerText}>
              {t('accountSettingsScreen.deleteAccountConfirm')}
            </Text>
            <FormTextInput
              label={t('auth.password')}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder={t('auth.password')}
              secureTextEntry
              onFocus={() => scrollToInput('deletePassword')}
            />
            <PrimaryButton title={t('accountSettingsScreen.deleteAccount')} onPress={handleDeleteAccount} loading={deleting} variant="danger" />
          </View>
          {/* Extra space at bottom for keyboard */}
          <View style={styles.keyboardSpacer} />
        </ScrollView>
        {keyboardVisible && (
          <TouchableOpacity 
            style={styles.doneButton} 
            onPress={Keyboard.dismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.doneButtonText}>{t('common.done')}</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    flexGrow: 1,
  },
  keyboardSpacer: {
    height: 200,
  },
  doneButton: {
    position: 'absolute',
    right: spacing.md,
    bottom: Platform.OS === 'ios' ? 8 : spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
    ...(shadows.lg as object),
    zIndex: 100,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
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


