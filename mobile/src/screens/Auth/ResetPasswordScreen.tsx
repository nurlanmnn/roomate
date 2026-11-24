import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AuthScreenLayout } from './AuthScreenLayout';
import { AppText } from '../../components/AppText';
import { useThemeColors, fontSizes, fontWeights, spacing } from '../../theme';
import { FormTextInput } from '../../components/FormTextInput';
import { OtpSixDigits } from '../../components/auth/OtpSixDigits';
import { authApi } from '../../api/authApi';
import { useLanguage } from '../../context/LanguageContext';

export const ResetPasswordScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { email } = route.params as { email: string };
  const { t } = useLanguage();
  const colors = useThemeColors();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const handleReset = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Alert.alert(t('common.error'), t('alerts.somethingWentWrong'));
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      Alert.alert(t('common.error'), t('auth.weakPassword'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp: otpString, newPassword });
      Alert.alert(t('common.success'), t('auth.passwordResetSuccess'), [
        { text: t('common.ok'), onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
      setOtp(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await authApi.requestPasswordReset(email);
      Alert.alert(t('common.success'), t('auth.codeSent'));
      setOtp(['', '', '', '', '', '']);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
    } finally {
      setResendLoading(false);
    }
  };

  const otpComplete = otp.join('').length === 6;
  const canSubmit = otpComplete && newPassword.length >= 8 && confirmPassword.length >= 8;

  return (
    <AuthScreenLayout title={t('auth.resetPasswordTitle')} onBack={() => navigation.navigate('ForgotPassword')} subtitle={<>
      {t('auth.resetPasswordSubtitle')}{'\n'}
      <AppText style={[styles.email, { color: colors.text }]}>{email}</AppText>
    </>}>
      <OtpSixDigits value={otp} onChange={setOtp} />

      <FormTextInput
        label={t('auth.newPassword')}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
      />

      <FormTextInput
        label={t('auth.confirmPassword')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
      />

      <PrimaryButton
        title={t('auth.resetPassword')}
        onPress={handleReset}
        loading={loading}
        disabled={!canSubmit}
      />

      <View style={styles.resendContainer}>
        <AppText style={[styles.resendText, { color: colors.textSecondary }]}>{t('auth.didntReceiveCode')} </AppText>
        <TouchableOpacity onPress={handleResend} disabled={resendLoading} accessibilityRole="button" accessibilityState={{ disabled: resendLoading, busy: resendLoading }} style={styles.resendAction}>
          <AppText style={[styles.resendLink, { color: colors.primary }, resendLoading && styles.resendLinkDisabled]}>
            {resendLoading ? t('common.loading') : t('auth.resendCode')}
          </AppText>
        </TouchableOpacity>
      </View>
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  email: { fontWeight: fontWeights.semibold },
  resendContainer: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.xxs },
  resendText: { fontSize: fontSizes.sm, textAlign: 'center' },
  resendAction: { minHeight: 44, minWidth: 44, paddingHorizontal: spacing.xs, justifyContent: 'center', alignItems: 'center' },
  resendLink: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, textAlign: 'center' },
  resendLinkDisabled: { opacity: 0.5 },
});
