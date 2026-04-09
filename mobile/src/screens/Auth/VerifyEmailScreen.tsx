import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { OtpSixDigits } from '../../components/auth/OtpSixDigits';
import { authApi } from '../../api/authApi';
import { useLanguage } from '../../context/LanguageContext';

export const VerifyEmailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { email } = route.params;
  const { t } = useLanguage();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Alert.alert(t('common.error'), t('alerts.somethingWentWrong'));
      return;
    }

    setLoading(true);
    try {
      await authApi.verifyEmail(email, otpString);
      Alert.alert(t('common.success'), t('common.success'), [
        { text: t('common.ok'), onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await authApi.resendVerification(email);
      Alert.alert(t('common.success'), t('auth.codeSent'));
      setOtp(['', '', '', '', '', '']);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.content}>
        <Text style={styles.title}>{t('auth.verifyEmail')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.enterCode')}{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>

        <OtpSixDigits value={otp} onChange={setOtp} />

        <PrimaryButton
          title={t('auth.verifyEmail')}
          onPress={handleVerify}
          loading={loading}
          disabled={otp.join('').length !== 6}
        />

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>{t('auth.noAccount')} </Text>
          <TouchableOpacity onPress={handleResend} disabled={resendLoading}>
            <Text style={[styles.resendLink, resendLoading && styles.resendLinkDisabled]}>
              {resendLoading ? t('common.loading') : t('auth.resendCode')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  email: {
    fontWeight: '600',
    color: '#333',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: '#999',
  },
});

