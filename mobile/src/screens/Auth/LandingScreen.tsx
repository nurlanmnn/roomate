import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AppText } from '../../components/AppText';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeColors, spacing, fontSizes, fontWeights } from '../../theme';

export const LandingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useLanguage();
  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <AppText style={[styles.title, { color: colors.text }]}>Roomate</AppText>
        <AppText style={[styles.tagline, { color: colors.textSecondary }]}>{t('auth.landingSubline')}</AppText>

        <View style={styles.buttonContainer}>
          <PrimaryButton title={t('auth.login')} onPress={() => navigation.navigate('Login')} />
          <View style={styles.spacer} />
          <PrimaryButton title={t('auth.createAccount')} onPress={() => navigation.navigate('Signup')} variant="outline" />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    padding: spacing.xl,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xxxl + 4,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  tagline: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.regular,
    textAlign: 'center',
    lineHeight: Math.round((fontSizes.lg as number) * 1.4),
    marginBottom: spacing.xxxl + spacing.lg,
    paddingHorizontal: spacing.md,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
  },
  spacer: {
    height: spacing.md,
  },
});
