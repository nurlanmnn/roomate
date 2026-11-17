import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { EnamelHeader } from '../../components/ui/EnamelHeader';
import { RoomateMark } from '../../components/ui/RoomateMark';
import { Sheet } from '../../components/ui/Sheet';
import { useLanguage } from '../../context/LanguageContext';
import { fonts, fontSizes, fontWeights, spacing, useThemeColors } from '../../theme';

type AuthScreenLayoutProps = {
  title?: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  landing?: boolean;
  children: React.ReactNode;
};

/** The auth flow shares one enamel plaque and a scrollable, keyboard-safe form ground. */
export const AuthScreenLayout: React.FC<AuthScreenLayoutProps> = ({
  title, subtitle, onBack, landing = false, children,
}) => {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <SanctuaryScreenShell edges={[]}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView style={styles.fill} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <EnamelHeader leading={
            <View style={[styles.plaque, landing && styles.landingPlaque]}>
              {landing ? <View style={styles.mark}><RoomateMark size={72} /></View> : null}
              <AppText accessibilityRole="header" style={[styles.brand, { color: colors.onEnamel }]}>Roomate</AppText>
              <AppText style={[styles.description, { color: colors.onEnamelSecondary }]}>{t('auth.appTagline')}</AppText>
            </View>
          } />
          <Sheet>
            <View style={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
              {onBack ? (
                <Pressable onPress={onBack} accessibilityRole="button" style={styles.backButton}>
                  <Ionicons name="arrow-back-outline" size={22} color={colors.primary} />
                  <AppText style={[styles.backText, { color: colors.primary }]}>{t('common.back')}</AppText>
                </Pressable>
              ) : null}
              {title ? <AppText accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</AppText> : null}
              {subtitle ? <AppText style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</AppText> : null}
              {children}
            </View>
          </Sheet>
        </ScrollView>
      </KeyboardAvoidingView>
    </SanctuaryScreenShell>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  plaque: { paddingTop: spacing.lg, paddingBottom: spacing.lg },
  landingPlaque: { paddingTop: spacing.xxxl, paddingBottom: spacing.xxxl },
  mark: { marginBottom: spacing.lg },
  brand: { fontFamily: fonts.displayExtrabold, fontSize: 52 },
  description: { fontSize: fontSizes.md, marginTop: spacing.xs },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  backButton: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', marginBottom: spacing.md },
  backText: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, flexShrink: 1 },
  title: { fontSize: 22, fontWeight: fontWeights.bold, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSizes.md, marginBottom: spacing.xl },
});
