import React, { useState } from 'react';
import { StyleSheet, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AppText } from '../../components/AppText';
import { authApi } from '../../api/authApi';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeColors, spacing, fontSizes, fontWeights } from '../../theme';

export const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const colors = useThemeColors();

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
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Login')} accessibilityRole="button">
            <AppText style={[styles.backButtonText, { color: colors.primary }]}>← {t('common.back')}</AppText>
          </TouchableOpacity>

          <AppText style={[styles.title, { color: colors.text }]}>{t('auth.forgotPasswordTitle')}</AppText>
          <AppText style={[styles.subtitle, { color: colors.textSecondary }]}>{t('auth.forgotPasswordHint')}</AppText>

          <FormTextInput
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <PrimaryButton title={t('auth.sendResetCode')} onPress={handleSubmit} loading={loading} />
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
});
