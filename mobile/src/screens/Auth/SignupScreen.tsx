import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { AuthScreenLayout } from './AuthScreenLayout';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AppText } from '../../components/AppText';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeColors, spacing, fontSizes, fontWeights } from '../../theme';

export const SignupScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const { t } = useLanguage();
  const colors = useThemeColors();

  const handleSignup = async () => {
    const nameTrim = name.trim();
    const emailTrim = email.trim();

    if (!nameTrim || !emailTrim || !password || !confirmPassword) {
      Alert.alert(t('common.error'), t('alerts.fillRequiredFields'));
      return;
    }

    if (password.length < 8) {
      Alert.alert(t('common.error'), t('auth.weakPassword'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await signup(nameTrim, emailTrim, password);
      navigation.navigate('VerifyEmail', { email: emailTrim });
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout title={t('auth.createAccount')} subtitle={t('auth.getStarted')} onBack={() => navigation.navigate('Landing')}>
      <FormTextInput label={t('auth.name')} value={name} onChangeText={setName} placeholder={t('auth.name')} />

      <FormTextInput
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.email')}
        keyboardType="email-address"
      />

      <FormTextInput
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.password')}
        secureTextEntry
      />

      <FormTextInput
        label={t('auth.confirmPassword')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder={t('auth.confirmPassword')}
        secureTextEntry
      />

      <PrimaryButton title={t('auth.signup')} onPress={handleSignup} loading={loading} />

      <View style={styles.footer}>
        <AppText style={[styles.footerText, { color: colors.textSecondary }]}>{t('auth.haveAccount')} </AppText>
        <TouchableOpacity accessibilityRole="button" style={styles.footerAction} onPress={() => navigation.navigate('Login')}>
          <AppText style={[styles.linkText, { color: colors.primary }]}>{t('auth.login')}</AppText>
        </TouchableOpacity>
      </View>
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  footer: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.xxs },
  footerText: { fontSize: fontSizes.sm, textAlign: 'center' },
  footerAction: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  linkText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, textAlign: 'center' },
});
