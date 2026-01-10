import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useLanguage } from '../../context/LanguageContext';

export const LandingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useLanguage();
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Image 
          source={require('../../../assets/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Roomate</Text>
        <Text style={styles.subtitle}>{t('auth.appTagline')}</Text>
        
        <View style={styles.buttonContainer}>
          <PrimaryButton
            title={t('auth.login')}
            onPress={() => navigation.navigate('Login')}
          />
          <View style={styles.spacer} />
          <PrimaryButton
            title={t('auth.createAccount')}
            onPress={() => navigation.navigate('Signup')}
            variant="outline"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 48,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
  },
  spacer: {
    height: 16,
  },
});

