import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormTextInput } from '../../components/FormTextInput';
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
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

          <AppText style={[styles.title, { color: colors.text }]}>{t('auth.welcomeBack')}</AppText>
          <AppText style={[styles.subtitle, { color: colors.textSecondary }]}>{t('auth.login')}</AppText>

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
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <AppText style={[styles.linkText, { color: colors.primary }]}>{t('auth.signup')}</AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
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
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  forgotLink: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
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
