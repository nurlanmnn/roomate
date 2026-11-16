import React, { useState } from 'react';
import { Alert } from 'react-native';
import { AuthScreenLayout } from './AuthScreenLayout';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { authApi } from '../../api/authApi';
import { useLanguage } from '../../context/LanguageContext';

export const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert(t('common.error'), t('alerts.fillRequiredFields'));
      return;
    }

    setLoading(true);
    try {
      await authApi.requestPasswordReset(trimmed);
      navigation.navigate('ResetPassword', { email: trimmed.toLowerCase() });
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout title={t('auth.forgotPasswordTitle')} subtitle={t('auth.forgotPasswordHint')} onBack={() => navigation.navigate('Login')}>
      <FormTextInput
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.email')}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <PrimaryButton title={t('auth.sendResetCode')} onPress={handleSubmit} loading={loading} />
    </AuthScreenLayout>
  );
};
