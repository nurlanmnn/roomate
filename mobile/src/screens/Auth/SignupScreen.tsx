import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
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
    <SanctuaryScreenShell edges={['top', 'bottom']} innerStyle={styles.shellInner}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Landing')} accessibilityRole="button">
            <AppText style={[styles.backButtonText, { color: colors.primary }]}>← {t('common.back')}</AppText>
          </TouchableOpacity>

          <AppText style={[styles.title, { color: colors.text }]}>{t('auth.createAccount')}</AppText>
          <AppText style={[styles.subtitle, { color: colors.textSecondary }]}>{t('auth.getStarted')}</AppText>

          <FormTextInput label={t('auth.name')} value={name} onChangeText={setName} placeholder={t('auth.name')} />

          <FormTextInput
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
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
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <AppText style={[styles.linkText, { color: colors.primary }]}>{t('auth.login')}</AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SanctuaryScreenShell>
  );
};

const styles = StyleSheet.create({
  shellInner: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    marginBottom: spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: fontSizes.sm,
  },
  linkText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
});
