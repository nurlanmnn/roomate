import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AuthScreenLayout } from './AuthScreenLayout';
import { useLanguage } from '../../context/LanguageContext';
import { spacing } from '../../theme';

export const LandingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useLanguage();
  return (
    <AuthScreenLayout landing subtitle={t('auth.landingSubline')}>
      <View style={styles.actions}>
        <PrimaryButton title={t('auth.login')} onPress={() => navigation.navigate('Login')} />
        <PrimaryButton title={t('auth.createAccount')} onPress={() => navigation.navigate('Signup')} variant="outline" />
      </View>
    </AuthScreenLayout>
  );
};
const styles = StyleSheet.create({ actions: { gap: spacing.md } });
