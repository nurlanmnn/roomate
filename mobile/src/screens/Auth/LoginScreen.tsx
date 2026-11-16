import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { FormTextInput } from '../../components/FormTextInput';
import { AuthScreenLayout } from './AuthScreenLayout';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AppText } from '../../components/AppText';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeColors, spacing, fontSizes, fontWeights } from '../../theme';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const colors = useThemeColors();

  const handleLogin = async () => {
    const emailTrim = email.trim();
    if (!emailTrim || !password) {
      Alert.alert(t('common.error'), t('alerts.fillRequiredFields'));
      return;
    }

    setLoading(true);
    try {
      await login(emailTrim, password);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout title={t('auth.welcomeBack')} subtitle={t('auth.login')} onBack={() => navigation.navigate('Landing')}>
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

      <TouchableOpacity
        style={styles.forgotRow}
        onPress={() => navigation.navigate('ForgotPassword')}
        accessibilityRole="button"
      >
        <AppText style={[styles.forgotLink, { color: colors.primary }]}>{t('auth.forgotPassword')}</AppText>
      </TouchableOpacity>

      <PrimaryButton title={t('auth.login')} onPress={handleLogin} loading={loading} />

      <View style={styles.footer}>
        <AppText style={[styles.footerText, { color: colors.textSecondary }]}>{t('auth.noAccount')} </AppText>
        <TouchableOpacity accessibilityRole="button" style={styles.footerAction} onPress={() => navigation.navigate('Signup')}>
          <AppText style={[styles.linkText, { color: colors.primary }]}>{t('auth.signup')}</AppText>
        </TouchableOpacity>
      </View>
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  forgotRow: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-end', marginBottom: spacing.md, maxWidth: '100%' },
  forgotLink: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold },
  footer: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.xxs },
  footerText: { fontSize: fontSizes.sm, textAlign: 'center' },
  footerAction: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  linkText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, textAlign: 'center' },
});
