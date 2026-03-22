import React from 'react';
import { View, StyleSheet, Pressable, Share, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../AppText';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../../theme';

interface HomeInviteCardProps {
  joinCode: string;
  householdName: string;
}

/**
 * Prominent invite block: code in a badge + copy + native share.
 */
export const HomeInviteCard: React.FC<HomeInviteCardProps> = ({ joinCode, householdName }) => {
  const colors = useThemeColors();
  const { t } = useLanguage();

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.borderLight,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          ...(shadows.sm as object),
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.xs,
        },
        title: {
          fontSize: fontSizes.lg,
          fontWeight: fontWeights.bold,
          color: colors.text,
          flex: 1,
        },
        description: {
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          lineHeight: 20,
          marginBottom: spacing.md,
        },
        badge: {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.primaryUltraSoft,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radii.pill ?? 999,
          borderWidth: 1,
          borderColor: colors.primary + '40',
          marginBottom: spacing.md,
        },
        codeText: {
          fontSize: fontSizes.lg,
          fontWeight: fontWeights.bold,
          color: colors.primary,
          letterSpacing: 2,
          fontVariant: ['tabular-nums'],
        },
        actionsRow: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        actionBtn: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          borderRadius: radii.md,
          borderWidth: 1.5,
          borderColor: colors.primary,
          backgroundColor: colors.surface,
          minHeight: 48,
        },
        actionBtnPressed: {
          opacity: 0.85,
          transform: [{ scale: 0.98 }],
        },
        actionLabel: {
          fontSize: fontSizes.sm,
          fontWeight: fontWeights.semibold,
          color: colors.primary,
        },
      }),
    [colors]
  );

  const handleCopy = async () => {
    await Clipboard.setStringAsync(joinCode);
    Alert.alert(t('common.copied'), t('householdSettingsScreen.codeCopied'));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: String(t('householdSettingsScreen.shareMessage', { code: joinCode })),
        title: householdName,
      });
    } catch {
      /* dismissed */
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="people" size={22} color={colors.primary} />
        <AppText style={styles.title}>{t('home.setupInviteTitle')}</AppText>
      </View>
      <AppText style={styles.description}>{t('home.setupInviteDescription')}</AppText>
      <View style={styles.badge}>
        <AppText style={styles.codeText} selectable>
          {joinCode}
        </AppText>
      </View>
      <View style={styles.actionsRow}>
        <Pressable
          onPress={handleCopy}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('home.setupCopyCode')}
        >
          <Ionicons name="copy-outline" size={18} color={colors.primary} />
          <AppText style={styles.actionLabel}>{t('home.setupCopyCode')}</AppText>
        </Pressable>
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('home.setupShareInvite')}
        >
          <Ionicons name="share-social-outline" size={18} color={colors.primary} />
          <AppText style={styles.actionLabel}>{t('home.setupShareInvite')}</AppText>
        </Pressable>
      </View>
    </View>
  );
};
