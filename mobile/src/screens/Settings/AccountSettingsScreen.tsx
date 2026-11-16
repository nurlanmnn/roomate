import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AppText } from '../../components/AppText';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { authApi } from '../../api/authApi';
import { Avatar } from '../../components/ui/Avatar';
import { SettingsSection } from '../../components/Settings/SettingsSection';
import { SettingsGroupCard } from '../../components/Settings/SettingsGroupCard';
import { GroupRow } from '../../components/ui/Group';
import { DeleteAccountModal } from '../../components/Settings/DeleteAccountModal';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../../theme';
import {
  alertOpenSettingsForPhotoLibrary,
  ensureMediaLibraryPermission,
} from '../../utils/mediaLibraryPermission';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapEmailChangeApiError(err: unknown, t: (key: string) => string): string {
  const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
  if (!msg) return t('alerts.somethingWentWrong');
  switch (msg) {
    case 'An account with this email already exists':
      return t('accountSettingsScreen.emailAlreadyInUse');
    case 'This is already your email address':
      return t('accountSettingsScreen.emailSameAsCurrent');
    case 'Invalid OTP':
      return t('accountSettingsScreen.otpInvalid');
    case 'OTP has expired':
      return t('accountSettingsScreen.otpExpired');
    case 'Failed to send verification email':
      return t('accountSettingsScreen.failedToSendVerificationCode');
    default:
      return msg;
  }
}

export const AccountSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, refreshUser, logout } = useAuth();
  const { t } = useLanguage();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollInset = useMemo(
    () => ({
      paddingTop: spacing.xs,
      paddingBottom: insets.bottom + spacing.lg,
    }),
    [insets.bottom]
  );

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl || null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [emailCode, setEmailCode] = useState('');
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const [confirmingEmail, setConfirmingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setAvatarUri(user.avatarUrl || null);
    }
  }, [user?._id, user?.name, user?.email, user?.avatarUrl]);

  const emailChanged = useMemo(() => {
    if (!user) return false;
    return email.trim().toLowerCase() !== user.email.toLowerCase();
  }, [email, user]);

  useEffect(() => {
    const normalized = email.trim().toLowerCase();
    if (codeSentTo && normalized !== codeSentTo) {
      setCodeSentTo(null);
      setEmailCode('');
    }
  }, [email, codeSentTo]);

  const emailLooksValid = useMemo(() => {
    const e = email.trim();
    if (!e) return false;
    return EMAIL_RE.test(e);
  }, [email]);

  const profileDirty = useMemo(() => {
    if (!user) return false;
    const nameChanged = name.trim() !== user.name;
    const avatarChanged = avatarUri !== (user.avatarUrl || null);
    return (nameChanged || avatarChanged) && name.trim().length > 0;
  }, [name, avatarUri, user]);

  const canSaveProfile = profileDirty && !savingProfile;

  const normalizedNewEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const codePendingForThisEmail = !!codeSentTo && codeSentTo === normalizedNewEmail;
  const canSendEmailCode = emailChanged && emailLooksValid && !sendingEmailCode;
  const canConfirmEmail =
    codePendingForThisEmail && emailCode.replace(/\D/g, '').length === 6 && !confirmingEmail;

  const passwordValid = useMemo(() => {
    if (currentPassword.length === 0) return false;
    if (newPassword.length < 8) return false;
    if (newPassword !== confirmPassword) return false;
    return true;
  }, [currentPassword, newPassword, confirmPassword]);

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });
    let mimeType = 'image/jpeg';
    if (uri.toLowerCase().endsWith('.png')) mimeType = 'image/png';
    else if (uri.toLowerCase().endsWith('.gif')) mimeType = 'image/gif';
    else if (uri.toLowerCase().endsWith('.webp')) mimeType = 'image/webp';
    return `data:${mimeType};base64,${base64}`;
  };

  const handlePickImage = async () => {
    try {
      const allowed = await ensureMediaLibraryPermission();
      if (!allowed) {
        alertOpenSettingsForPhotoLibrary(t, 'accountSettingsScreen.permissionNeeded');
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
          if (uriLower.includes('.png')) mimeType = 'image/png';
          else if (uriLower.includes('.gif')) mimeType = 'image/gif';
          else if (uriLower.includes('.webp')) mimeType = 'image/webp';
          setAvatarUri(`data:${mimeType};base64,${asset.base64}`);
        } else {
          const base64DataUrl = await convertImageToBase64(asset.uri);
          setAvatarUri(base64DataUrl);
        }
      }
    } catch {
      Alert.alert(t('common.error'), t('accountSettingsScreen.failedToPickImage'));
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !canSaveProfile) return;
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('accountSettingsScreen.name'));
      return;
    }

    try {
      setSavingProfile(true);
      const payload: { name?: string; avatarUrl?: string | null } = {};
      if (name.trim() !== user.name) payload.name = name.trim();
      if (avatarUri !== (user.avatarUrl || null)) payload.avatarUrl = avatarUri;

      const updated = await authApi.updateProfile(payload);
      await refreshUser();
      setAvatarUri(updated.avatarUrl || null);
      setEmail(updated.email);
      setName(updated.name);

      Alert.alert(t('common.success'), t('accountSettingsScreen.profileUpdated'));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      Alert.alert(t('common.error'), err.response?.data?.error || t('alerts.somethingWentWrong'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteProfilePhoto = () => {
    if (!avatarUri) return;
    setAvatarUri(null);
  };

  const handleRequestEmailCode = async () => {
    if (!user || !emailChanged || !emailLooksValid) return;
    try {
      setSendingEmailCode(true);
      await authApi.requestEmailChange(normalizedNewEmail);
      setCodeSentTo(normalizedNewEmail);
      setEmailCode('');
    } catch (error: unknown) {
      Alert.alert(t('common.error'), mapEmailChangeApiError(error, t));
    } finally {
      setSendingEmailCode(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    if (!user || !codePendingForThisEmail) return;
    const otp = emailCode.replace(/\D/g, '').slice(0, 6);
    if (otp.length !== 6) return;
    try {
      setConfirmingEmail(true);
      const updated = await authApi.confirmEmailChange(normalizedNewEmail, otp);
      await refreshUser();
      setEmail(updated.email);
      setName(updated.name);
      setAvatarUri(updated.avatarUrl || null);
      setCodeSentTo(null);
      setEmailCode('');
      Alert.alert(t('common.success'), t('accountSettingsScreen.emailChangedSuccess'));
    } catch (error: unknown) {
      Alert.alert(t('common.error'), mapEmailChangeApiError(error, t));
    } finally {
      setConfirmingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordValid) {
      if (newPassword !== confirmPassword) {
        Alert.alert(t('common.error'), t('accountSettingsScreen.passwordsMismatch'));
      } else {
        Alert.alert(t('common.error'), t('accountSettingsScreen.passwordMinLength'));
      }
      return;
    }

    try {
      setChangingPassword(true);
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Keyboard.dismiss();
      Alert.alert(t('common.success'), t('accountSettingsScreen.passwordChanged'));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      Alert.alert(t('common.error'), err.response?.data?.error || t('accountSettingsScreen.failedToChangePassword'));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async (password: string) => {
    try {
      setDeleting(true);
      await authApi.deleteAccount({ password });
      setDeleteModalVisible(false);
      await logout();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      Alert.alert(t('common.error'), err.response?.data?.error || t('accountSettingsScreen.failedToDeleteAccount'));
    } finally {
      setDeleting(false);
    }
  };

  const displayAvatar = avatarUri;

  return (
    <SanctuaryScreenShell edges={[]} innerStyle={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={scrollInset}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
          <SettingsSection title={t('accountSettingsScreen.profileSection')}>
            <AppText style={styles.sectionHint}>{t('accountSettingsScreen.profileHint')}</AppText>
            <SettingsGroupCard>
              <View style={styles.avatarBlock}>
                <TouchableOpacity
                  onPress={handlePickImage}
                  activeOpacity={0.85}
                  style={styles.avatarTouch}
                  accessibilityRole="button"
                  accessibilityLabel={t('accountSettingsScreen.changeAvatar')}
                >
                  <View style={styles.avatarWrap}>
                    {displayAvatar && displayAvatar.startsWith('data:') ? (
                      <Image source={{ uri: displayAvatar }} style={styles.avatarImg} />
                    ) : (
                      <Avatar name={name || user?.name} uri={displayAvatar || undefined} size={64} />
                    )}
                    <View style={styles.avatarFab}>
                      <Ionicons name="camera-outline" size={18} color={colors.onPrimary} />
                    </View>
                  </View>
                </TouchableOpacity>
                <View style={styles.avatarLabels}>
                  <AppText style={styles.inlineName}>
                    {name || user?.name || '—'}
                  </AppText>
                  <AppText style={styles.inlineEmail}>
                    {email || user?.email || ''}
                  </AppText>
                  <TouchableOpacity
                    onPress={handleDeleteProfilePhoto}
                    disabled={!avatarUri}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !avatarUri }}
                    activeOpacity={avatarUri ? 0.75 : 1}
                    style={styles.removePhotoButton}
                  >
                    <AppText style={[styles.removePhotoLabel, !avatarUri && styles.removePhotoLabelDisabled]}>
                      {t('accountSettingsScreen.deleteProfilePhoto')}
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.paddedFields}>
                <FormTextInput
                  label={t('accountSettingsScreen.name')}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('accountSettingsScreen.name')}
                  autoCapitalize="words"
                />
                <FormTextInput
                  label={t('accountSettingsScreen.email')}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('accountSettingsScreen.email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {email.trim().length > 0 && !emailLooksValid ? (
                  <AppText style={styles.fieldError}>{t('accountSettingsScreen.invalidEmail')}</AppText>
                ) : null}

                {emailChanged && emailLooksValid ? (
                  <View style={styles.emailChangeBlock}>
                    <AppText style={styles.emailChangeHint}>{t('accountSettingsScreen.emailChangeHint')}</AppText>
                    {!codePendingForThisEmail ? (
                      <PrimaryButton
                        title={t('accountSettingsScreen.sendVerificationCode')}
                        onPress={handleRequestEmailCode}
                        disabled={!canSendEmailCode}
                        loading={sendingEmailCode}
                        variant="secondary"
                        style={styles.emailCodeButton}
                      />
                    ) : (
                      <>
                        <AppText style={styles.codeSentHint}>{t('accountSettingsScreen.codeSentCheckInbox')}</AppText>
                        <FormTextInput
                          label={t('accountSettingsScreen.verificationCode')}
                          value={emailCode}
                          onChangeText={(text) => setEmailCode(text.replace(/\D/g, '').slice(0, 6))}
                          keyboardType="number-pad"
                          autoCapitalize="none"
                        />
                        <PrimaryButton
                          title={t('accountSettingsScreen.confirmNewEmail')}
                          onPress={handleConfirmEmailChange}
                          disabled={!canConfirmEmail}
                          loading={confirmingEmail}
                          variant="secondary"
                          style={styles.emailCodeButton}
                        />
                        <TouchableOpacity
                          onPress={handleRequestEmailCode}
                          disabled={sendingEmailCode}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: sendingEmailCode, busy: sendingEmailCode }}
                          activeOpacity={0.7}
                          style={styles.resendWrap}
                        >
                          <AppText style={styles.resendLink}>{t('accountSettingsScreen.resendVerificationCode')}</AppText>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ) : null}
              </View>
            </SettingsGroupCard>
            <PrimaryButton
              title={t('accountSettingsScreen.saveChanges')}
              onPress={handleSaveProfile}
              disabled={!canSaveProfile}
              loading={savingProfile}
              style={styles.sectionButton}
            />
          </SettingsSection>

          <SettingsSection title={t('accountSettingsScreen.securitySection')}>
            <AppText style={styles.sectionHint}>{t('accountSettingsScreen.securityHint')}</AppText>
            <SettingsGroupCard>
              <View style={styles.paddedFields}>
                <FormTextInput
                  label={t('accountSettingsScreen.currentPassword')}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <FormTextInput
                  label={t('accountSettingsScreen.newPassword')}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <FormTextInput
                  label={t('accountSettingsScreen.confirmPassword')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                {newPassword.length > 0 && newPassword !== confirmPassword ? (
                  <AppText style={styles.fieldError}>{t('accountSettingsScreen.passwordsMismatch')}</AppText>
                ) : null}
              </View>
            </SettingsGroupCard>
            <PrimaryButton
              title={t('accountSettingsScreen.updatePassword')}
              onPress={handleUpdatePassword}
              disabled={!passwordValid}
              loading={changingPassword}
              variant="secondary"
              style={styles.sectionButton}
            />
          </SettingsSection>

          <SettingsSection title={t('accountSettingsScreen.dangerZone')}>
            <AppText style={styles.sectionHint}>{t('accountSettingsScreen.deleteAccountHint')}</AppText>
            <SettingsGroupCard>
              <GroupRow
                title={t('accountSettingsScreen.deleteAccount')}
                icon="trash-outline"
                iconTone="danger"
                titleLines={0}
                destructive
                onPress={() => setDeleteModalVisible(true)}
              />
            </SettingsGroupCard>
          </SettingsSection>
      </ScrollView>

      <DeleteAccountModal
        visible={deleteModalVisible}
        onClose={() => !deleting && setDeleteModalVisible(false)}
        onConfirm={handleDeleteAccount}
        loading={deleting}
        title={t('accountSettingsScreen.deleteModalTitle')}
        body={t('accountSettingsScreen.deleteModalBody')}
        passwordLabel={t('accountSettingsScreen.enterPassword')}
        typePhraseLabel={t('accountSettingsScreen.typeDelete')}
        typePhraseHint={t('accountSettingsScreen.typeDeleteHint')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('accountSettingsScreen.deleteAccount')}
      />
    </SanctuaryScreenShell>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: { flex: 1 },
    sectionHint: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    avatarBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      gap: spacing.md,
    },
    avatarTouch: {
      minWidth: 44,
      minHeight: 44,
    },
    avatarWrap: {
      position: 'relative',
    },
    avatarImg: {
      width: 64,
      height: 64,
      borderRadius: radii.pill,
    },
    avatarFab: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 32,
      height: 32,
      borderRadius: radii.pill,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.surface,
    },
    avatarLabels: {
      flex: 1,
      minWidth: 0,
    },
    inlineName: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    inlineEmail: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
    },
    removePhotoButton: {
      alignSelf: 'flex-start',
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      marginTop: spacing.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    removePhotoLabel: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.danger,
    },
    removePhotoLabelDisabled: {
      color: colors.textTertiary,
    },
    paddedFields: {
      padding: spacing.md,
      paddingTop: spacing.lg,
    },
    fieldError: {
      fontSize: fontSizes.sm,
      color: colors.danger,
      marginTop: -spacing.sm,
      marginBottom: spacing.sm,
    },
    emailChangeBlock: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    emailChangeHint: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    codeSentHint: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    emailCodeButton: {
      marginTop: spacing.sm,
    },
    resendWrap: {
      alignSelf: 'flex-start',
      marginTop: spacing.sm,
      paddingVertical: spacing.xs,
      minHeight: 44,
      minWidth: 44,
      justifyContent: 'center',
    },
    resendLink: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.primary,
    },
    sectionButton: {
      marginTop: spacing.md,
      marginHorizontal: spacing.md,
    },
  });
