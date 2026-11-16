import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
  Image,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { authApi } from '../../api/authApi';
import { Avatar } from '../../components/ui/Avatar';
import { Group, GroupRow, FieldRow, GroupFooter, SectionHeading } from '../../components/ui/Group';
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

  // The header item is only rebuilt when its state changes; rebuilding it on every
  // render (each keystroke) makes the native header lose the item's size.
  const saveRef = React.useRef(handleSaveProfile);
  saveRef.current = handleSaveProfile;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => saveRef.current()}
          disabled={!canSaveProfile}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.save')}
          accessibilityState={{ disabled: !canSaveProfile, busy: savingProfile }}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          {savingProfile ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <AppText style={[styles.headerButtonText, { color: canSaveProfile ? colors.primary : colors.textTertiary }]}>
              {t('common.save')}
            </AppText>
          )}
        </Pressable>
      ),
    });
  }, [navigation, t, colors.primary, colors.textTertiary, styles, canSaveProfile, savingProfile]);

  const displayAvatar = avatarUri;
  const invalidEmail = email.trim().length > 0 && !emailLooksValid;
  const passwordsMismatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword;
  const passwordTooShort = newPassword.length > 0 && newPassword.length < 8;

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
        <View style={styles.identityBlock}>
          <Pressable
            onPress={handlePickImage}
            style={({ pressed }) => [styles.avatarTouch, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t('accountSettingsScreen.changeAvatar')}
          >
            <View style={styles.avatarWrap}>
              {displayAvatar && displayAvatar.startsWith('data:') ? (
                <Image source={{ uri: displayAvatar }} style={styles.avatarImg} />
              ) : (
                <Avatar name={name || user?.name} uri={displayAvatar || undefined} size={88} />
              )}
              <View style={styles.avatarFab}>
                <Ionicons name="camera-outline" size={18} color={colors.onPrimary} />
              </View>
            </View>
          </Pressable>
          <View style={styles.photoLinks}>
            <Pressable
              onPress={handlePickImage}
              accessibilityRole="button"
              style={({ pressed }) => [styles.photoLink, pressed && styles.pressed]}
            >
              <AppText style={[styles.photoLinkText, { color: colors.primary }]}>
                {t('accountSettingsScreen.changeAvatar')}
              </AppText>
            </Pressable>
            {avatarUri ? (
              <Pressable
                onPress={handleDeleteProfilePhoto}
                accessibilityRole="button"
                style={({ pressed }) => [styles.photoLink, pressed && styles.pressed]}
              >
                <AppText style={[styles.photoLinkText, { color: colors.danger }]}>
                  {t('accountSettingsScreen.deleteProfilePhoto')}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Group style={styles.profileGroup}>
          <FieldRow
            label={t('accountSettingsScreen.name')}
            value={name}
            onChangeText={setName}
            placeholder={t('accountSettingsScreen.name')}
            autoCapitalize="words"
          />
          <FieldRow
            label={t('accountSettingsScreen.email')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('accountSettingsScreen.email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {emailChanged && emailLooksValid ? (
            !codePendingForThisEmail ? (
              <GroupRow
                key="sendCode"
                action
                titleLines={0}
                title={t('accountSettingsScreen.sendVerificationCode')}
                onPress={handleRequestEmailCode}
                disabled={!canSendEmailCode}
                loading={sendingEmailCode}
              />
            ) : [
              <FieldRow
                key="verificationCode"
                label={t('accountSettingsScreen.verificationCode')}
                value={emailCode}
                onChangeText={(text) => setEmailCode(text.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                autoCapitalize="none"
                maxLength={6}
              />,
              <GroupRow
                key="confirmEmail"
                action
                titleLines={0}
                title={t('accountSettingsScreen.confirmNewEmail')}
                onPress={handleConfirmEmailChange}
                disabled={!canConfirmEmail}
                loading={confirmingEmail}
              />,
              <GroupRow
                key="resendCode"
                action
                titleLines={0}
                title={t('accountSettingsScreen.resendVerificationCode')}
                onPress={handleRequestEmailCode}
                loading={sendingEmailCode}
              />,
            ]
          ) : null}
        </Group>
        <GroupFooter tone={invalidEmail ? 'danger' : 'default'}>
          {invalidEmail
            ? t('accountSettingsScreen.invalidEmail')
            : codePendingForThisEmail
            ? t('accountSettingsScreen.codeSentCheckInbox')
            : emailChanged
            ? t('accountSettingsScreen.emailChangeHint')
            : t('accountSettingsScreen.profileHint')}
        </GroupFooter>

        <SectionHeading title={t('accountSettingsScreen.securitySection')} />
        <Group>
          <FieldRow
            label={t('accountSettingsScreen.currentPassword')}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="••••••••"
            autoCapitalize="none"
            textContentType="password"
          />
          <FieldRow
            label={t('accountSettingsScreen.newPassword')}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="••••••••"
            autoCapitalize="none"
            textContentType="newPassword"
          />
          <FieldRow
            label={t('accountSettingsScreen.confirmPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="••••••••"
            autoCapitalize="none"
            textContentType="newPassword"
          />
          <GroupRow
            action
            titleLines={0}
            title={t('accountSettingsScreen.updatePassword')}
            onPress={handleUpdatePassword}
            disabled={!passwordValid}
            loading={changingPassword}
          />
        </Group>
        <GroupFooter tone={passwordsMismatch || passwordTooShort ? 'danger' : 'default'}>
          {passwordsMismatch
            ? t('accountSettingsScreen.passwordsMismatch')
            : passwordTooShort
            ? t('accountSettingsScreen.passwordMinLength')
            : t('accountSettingsScreen.securityHint')}
        </GroupFooter>

        <Group style={styles.deleteGroup}>
          <GroupRow
            title={t('accountSettingsScreen.deleteAccount')}
            titleLines={0}
            destructive
            onPress={() => setDeleteModalVisible(true)}
          />
        </Group>
        <GroupFooter>{t('accountSettingsScreen.deleteAccountHint')}</GroupFooter>
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
    headerButton: {
      // The native header already gives the item a 44pt target; extra height pushes the label off centre.
      paddingHorizontal: spacing.xxs,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerButtonText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
    },
    identityBlock: {
      alignItems: 'center',
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    avatarTouch: {
      minWidth: 44,
      minHeight: 44,
    },
    avatarWrap: {
      position: 'relative',
    },
    avatarImg: {
      width: 88,
      height: 88,
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
      borderColor: colors.background,
    },
    photoLinks: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.lg,
      marginTop: spacing.xs,
    },
    photoLink: {
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
    },
    photoLinkText: {
      fontSize: fontSizes.md - 1,
      fontWeight: fontWeights.semibold,
      textAlign: 'center',
    },
    profileGroup: {
      marginTop: spacing.sm,
    },
    deleteGroup: {
      marginTop: spacing.xxl,
    },
    pressed: {
      opacity: 0.6,
    },
  });
